import time
import random
from typing import Dict, List, Tuple, Optional
from app.network import STATIONS, GRAPH, TRAINS
from app.lstm_engine import LSTMPredictiveEngine

lstm_engine = LSTMPredictiveEngine()

# In-memory storage for active journeys
ACTIVE_JOURNEYS: Dict[str, dict] = {}

# Simulation configuration (1 real second = 1 simulated minute)
SPEED_FACTOR = 60.0 

def time_str_to_mins(time_str: str) -> float:
    parts = time_str.split(":")
    return float(parts[0]) * 60.0 + float(parts[1])

def mins_to_time_str(mins: float) -> str:
    h = int(mins // 60) % 24
    m = int(mins % 60)
    return f"{h:02d}:{m:02d}"

def calculate_journey_schedule_and_milestones(train_dep_time: str, path: List[str], segments: List[dict]) -> Tuple[dict, dict]:
    """
    Computes scheduled arrival and departure times and cumulative km milestones
    for all stations along the path.
    """
    schedule = {}
    milestones = {}
    
    current_mins = time_str_to_mins(train_dep_time)
    
    # Starting station
    start_code = path[0]
    schedule[start_code] = {
        "scheduled_arr": "--:--",
        "scheduled_dep": train_dep_time,
        "stop_duration": 0
    }
    milestones[start_code] = 0.0
    
    cumulative_dist = 0.0
    
    for idx, seg in enumerate(segments):
        target = seg["target"]
        
        # Arrival time = departure of previous + travel time
        arrival_mins = current_mins + seg["base_time"]
        
        # Determine stop duration based on station importance (Junctions get longer stops)
        is_junction = target in ["BWN", "ASN", "MLDT", "BGP", "HWH", "SDAH"]
        stop_duration = 10 if is_junction else 2
        
        # If it's the final terminus station, stop duration is N/A
        if idx == len(segments) - 1:
            departure_str = "--:--"
            stop_duration = 0
            current_mins = arrival_mins
        else:
            departure_mins = arrival_mins + stop_duration
            departure_str = mins_to_time_str(departure_mins)
            current_mins = departure_mins
            
        schedule[target] = {
            "scheduled_arr": mins_to_time_str(arrival_mins),
            "scheduled_dep": departure_str,
            "stop_duration": stop_duration
        }
        
        cumulative_dist += seg["distance"]
        milestones[target] = round(cumulative_dist, 1)
        
    return schedule, milestones

def create_journey(start: str, end: str, train_number: str) -> Optional[str]:
    """
    Creates a new journey for a specific train from start to end station,
    initializes simulated conditions, and stores it in ACTIVE_JOURNEYS.
    """
    train = next((t for t in TRAINS if t["number"] == train_number), None)
    if not train:
        return None
        
    try:
        start_idx = train["route"].index(start)
        end_idx = train["route"].index(end)
        if start_idx >= end_idx:
            return None
        sub_route = train["route"][start_idx:end_idx + 1]
    except ValueError:
        return None

    journey_id = f"J-{train_number}-{int(time.time())}"
    
    # Initialize segment conditions along the train's sub-route
    segments = []
    for i in range(len(sub_route) - 1):
        source = sub_route[i]
        target = sub_route[i+1]
        
        base_time = 0.0
        dist = 0.0
        for neighbor, t, d in GRAPH[source]:
            if neighbor == target:
                base_time = t
                dist = d
                break
        
        congestion = round(random.uniform(0.05, 0.25), 2)
        
        segments.append({
            "source": source,
            "target": target,
            "base_time": base_time,
            "distance": dist,
            "congestion": congestion,
            "delay_introduced": 0.0,
            "completed": False
        })
        
    # Calculate Scheduled Times & Distance Milestones
    schedule, milestones = calculate_journey_schedule_and_milestones(train["departure_time"], sub_route, segments)
    
    weather_index = round(random.choice([0.0, 0.1, 0.3, 0.6, 0.8]), 2)
    start_hour = float(random.randint(6, 21))
    
    ACTIVE_JOURNEYS[journey_id] = {
        "journey_id": journey_id,
        "train_number": train["number"],
        "train_name": train["name"],
        "train_type": train["type"],
        "base_speed": train["base_speed"],
        "reliability": train["reliability"],
        "start_station": start,
        "end_station": end,
        "path": sub_route,
        "segments": segments,
        "schedule": schedule,
        "milestones": milestones,
        "weather_index": weather_index,
        "start_hour": start_hour,
        "start_time": time.time(),
        "current_segment_idx": 0,
        "segment_progress": 0.0,
        "accumulated_delay": 0.0,
        "is_finished": False,
        "lat": STATIONS[start]["lat"],
        "lon": STATIONS[start]["lon"],
        "delay_events": [],
    }
    
    return journey_id

def make_live_location_status(state: dict) -> str:
    """
    Generates a natural-language description of the train's current location.
    Matches the 'Where is my Train' app status messages.
    """
    if state["is_finished"]:
        dest_name = STATIONS[state["end_station"]]["name"]
        return f"Arrived at destination station {dest_name} ({state['end_station']}). Journey completed."

    current_idx = state["current_segment_idx"]
    seg = state["segments"][current_idx]
    progress = state["segment_progress"]
    
    src_name = STATIONS[seg["source"]]["name"]
    tgt_name = STATIONS[seg["target"]]["name"]
    
    segment_dist = seg["distance"]
    remaining_km = round(segment_dist * (1.0 - progress), 1)
    
    if progress < 0.05:
        # Just departed or stopped
        if state["accumulated_delay"] > 0:
            return f"Departed from {src_name} ({seg['source']}) | Running late by {int(state['accumulated_delay'])} mins."
        else:
            return f"Departed from {src_name} ({seg['source']}) on-time."
    elif progress > 0.95:
        return f"Approaching {tgt_name} ({seg['target']}) | PF typical: {STATIONS[seg['target']]['platform']}."
    else:
        return f"Between {src_name} and {tgt_name} | {remaining_km} km to {seg['target']} | Speed: {state.get('speed_kmh', 60.0)} km/h."

def update_journey_status(journey_id: str) -> Optional[dict]:
    """
    Updates the simulation state of the journey based on elapsed real-time,
    applying train-specific reliability adjustments, and computes LSTM predictions.
    """
    if journey_id not in ACTIVE_JOURNEYS:
        return None
    
    state = ACTIVE_JOURNEYS[journey_id]
    if state["is_finished"]:
        # Recalculate speed to 0.0
        state["speed_kmh"] = 0.0
        payload = compile_journey_payload(state, [], 1.0)
        payload["live_status_message"] = make_live_location_status(state)
        return payload

    # 1. Calculate elapsed simulated minutes
    real_elapsed = time.time() - state["start_time"]
    simulated_elapsed_mins = (real_elapsed * SPEED_FACTOR) / 60.0

    # 2. Advance train position along segments
    segments = state["segments"]
    current_idx = state["current_segment_idx"]
    
    accumulated_sim_time = 0.0
    
    for idx, seg in enumerate(segments):
        # Dynamically inject delay if we enter a segment and haven't triggered it yet
        if idx == current_idx and seg["delay_introduced"] == 0.0:
            is_junction = seg["source"] in ["BWN", "ASN", "MLDT", "BGP"]
            
            # Scale the delay probability based on train's reliability index:
            base_threshold = 0.35 * (2.0 - state["reliability"] * 1.8)
            threshold = base_threshold * 1.5 if (state["weather_index"] > 0.2 or is_junction) else base_threshold
            
            if random.random() < threshold:
                delay = round(random.uniform(5.0, 30.0), 1)
                seg["delay_introduced"] = delay
                state["accumulated_delay"] += delay
                
                event_msg = f"Delay of {delay} mins encountered on segment {seg['source']} -> {seg['target']}"
                if state["weather_index"] >= 0.6:
                    event_msg += " due to heavy monsoonal rain speed restrictions."
                    seg["congestion"] = min(seg["congestion"] + 0.45, 0.9)
                elif is_junction:
                    event_msg += " due to platform congestion at junction."
                    seg["congestion"] = min(seg["congestion"] + 0.35, 0.85)
                else:
                    event_msg += " due to block section signaling clearance."
                
                state["delay_events"].append({
                    "timestamp": time.time(),
                    "segment": f"{seg['source']}->{seg['target']}",
                    "delay": delay,
                    "reason": event_msg
                })
                
        actual_segment_duration = seg["base_time"] + seg["delay_introduced"]
        
        # Check if train is in this segment
        if simulated_elapsed_mins < (accumulated_sim_time + actual_segment_duration):
            current_idx = idx
            progress = (simulated_elapsed_mins - accumulated_sim_time) / actual_segment_duration
            state["current_segment_idx"] = current_idx
            state["segment_progress"] = progress
            
            # Interpolate coordinates
            src = STATIONS[seg["source"]]
            tgt = STATIONS[seg["target"]]
            state["lat"] = src["lat"] + progress * (tgt["lat"] - src["lat"])
            state["lon"] = src["lon"] + progress * (tgt["lon"] - src["lon"])
            break
        else:
            seg["completed"] = True
            accumulated_sim_time += actual_segment_duration
    else:
        state["is_finished"] = True
        state["current_segment_idx"] = len(segments) - 1
        state["segment_progress"] = 1.0
        state["lat"] = STATIONS[state["end_station"]]["lat"]
        state["lon"] = STATIONS[state["end_station"]]["lon"]
        
    # Update Speed (km/h)
    if not state["is_finished"]:
        active_seg = segments[current_idx]
        speed_multiplier = (1.0 - active_seg["congestion"] * 0.4) * (1.0 - state["weather_index"] * 0.25)
        state["speed_kmh"] = round(state["base_speed"] * speed_multiplier, 1)
    else:
        state["speed_kmh"] = 0.0
        
    # 3. Predict downstream delays using LSTM
    remaining_segs = []
    if not state["is_finished"]:
        remaining_segs = segments[current_idx:]
    
    current_hour = (state["start_hour"] + simulated_elapsed_mins / 60.0) % 24.0
    adjusted_weather = state["weather_index"] * (1.1 - state["reliability"])
    lstm_predictions, confidence = lstm_engine.predict_journey(
        initial_delay=state["accumulated_delay"],
        segments=remaining_segs,
        weather_index=adjusted_weather,
        hour=current_hour
    )
    
    payload = compile_journey_payload(state, lstm_predictions, confidence)
    payload["live_status_message"] = make_live_location_status(state)
    return payload

def compile_journey_payload(state: dict, lstm_predictions: List[float], confidence: float) -> dict:
    """
    Assembles the detailed journey state and LSTM predictions into a structured dashboard payload.
    """
    segments = state["segments"]
    current_idx = state["current_segment_idx"]
    is_finished = state["is_finished"]
    schedule = state["schedule"]
    milestones = state["milestones"]
    
    segment_analytics = []
    
    # 1. Build stations list along the path (not just segments) to align with timeline
    path = state["path"]
    
    for idx, station_code in enumerate(path):
        is_completed = idx < current_idx or (is_finished and idx == len(path) - 1)
        is_active = idx == current_idx and not is_finished
        
        status = "upcoming"
        if is_completed:
            status = "completed"
        elif is_active:
            status = "active"
            
        sched_arr = schedule[station_code]["scheduled_arr"]
        sched_dep = schedule[station_code]["scheduled_dep"]
        stop_dur = schedule[station_code]["stop_duration"]
        
        # Calculate Estimated/Actual Arrival & Departure times
        # If there is a delay, estimated = scheduled + delay
        # At station `idx`, delay = accumulated_delay (if completed/active) or predicted_delay (if upcoming)
        if idx <= current_idx:
            station_delay = state["accumulated_delay"]
        else:
            # Match upcoming segment predictions
            pred_idx = idx - current_idx - 1
            station_delay = lstm_predictions[pred_idx] if pred_idx < len(lstm_predictions) else 0.0
            
        estimated_arr = sched_arr
        estimated_dep = sched_dep
        
        if station_delay > 0:
            if sched_arr != "--:--":
                arr_mins = time_str_to_mins(sched_arr) + station_delay
                estimated_arr = mins_to_time_str(arr_mins)
            if sched_dep != "--:--":
                dep_mins = time_str_to_mins(sched_dep) + station_delay
                estimated_dep = mins_to_time_str(dep_mins)
                
        risk_level = "low"
        if station_delay > 15.0:
            risk_level = "high"
        elif station_delay > 5.0:
            risk_level = "medium"

        # Find congestion value of segment entering this station (N/A for start station)
        congestion = 0.0
        if idx > 0 and idx - 1 < len(segments):
            congestion = segments[idx - 1]["congestion"]

        segment_analytics.append({
            "station_code": station_code,
            "station_name": STATIONS[station_code]["name"],
            "platform": STATIONS[station_code]["platform"],
            "distance_km": milestones[station_code],
            "stop_duration": stop_dur,
            "congestion": congestion,
            "status": status,
            "scheduled_arr": sched_arr,
            "scheduled_dep": sched_dep,
            "estimated_arr": estimated_arr,
            "estimated_dep": estimated_dep,
            "delay_mins": station_delay,
            "risk_level": risk_level
        })

    # Calculate dynamic ETA
    total_base_time = sum(s["base_time"] for s in segments)
    future_predicted_delay_sum = sum(lstm_predictions[1:]) if len(lstm_predictions) > 1 else 0.0
    if not is_finished and current_idx < len(segments):
        current_pred = lstm_predictions[0] if lstm_predictions else 0.0
        future_predicted_delay_sum += max(0.0, current_pred - state["accumulated_delay"])
        
    recalibrated_total_delay = state["accumulated_delay"] + future_predicted_delay_sum
    recalibrated_total_time = total_base_time + recalibrated_total_delay

    return {
        "journey_id": state["journey_id"],
        "train_number": state["train_number"],
        "train_name": state["train_name"],
        "train_type": state["train_type"],
        "start_station": state["start_station"],
        "end_station": state["end_station"],
        "path": state["path"],
        "is_finished": is_finished,
        "weather_index": state["weather_index"],
        "current_segment_idx": current_idx,
        "segment_progress": state["segment_progress"],
        "lat": state["lat"],
        "lon": state["lon"],
        "accumulated_delay": state["accumulated_delay"],
        "predicted_remaining_delay": future_predicted_delay_sum,
        "confidence_score": round(confidence, 2),
        "total_base_time": total_base_time,
        "recalibrated_total_time": recalibrated_total_time,
        "speed_kmh": state.get("speed_kmh", 0.0),
        "segment_analytics": segment_analytics,
        "delay_events": state["delay_events"]
    }
