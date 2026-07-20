from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import time

from app.network import get_network_data, STATIONS, find_trains_for_journey
from app.simulator import create_journey, update_journey_status, ACTIVE_JOURNEYS

app = FastAPI(
    title="RailSense AI Backend API",
    description="Real-time rail logistics platform with custom LSTM predictive delay forecasting based on Eastern Railway (India)."
)

# Enable CORS for frontend integration
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class JourneyRequest(BaseModel):
    start_station: str
    end_station: str
    train_number: str

@app.get("/api/stations")
def get_stations():
    """
    Returns all Eastern Railway station coordinates and connectivity links in the network.
    """
    return get_network_data()

@app.get("/api/trains/search")
def search_trains(start: str, end: str):
    """
    Returns outbound trains (start -> end) and return trains (end -> start) for the selected station pair.
    """
    start_code = start.upper()
    end_code = end.upper()
    
    if start_code not in STATIONS:
        raise HTTPException(status_code=400, detail=f"Invalid start station: {start_code}")
    if end_code not in STATIONS:
        raise HTTPException(status_code=400, detail=f"Invalid end station: {end_code}")
        
    result = find_trains_for_journey(start_code, end_code)
    return result

@app.post("/api/journey/create")
def start_new_journey(req: JourneyRequest):
    """
    Initializes a new simulated train tracking journey for a specific train (handles both outbound and return routes).
    """
    start = req.start_station.upper()
    end = req.end_station.upper()
    train_num = req.train_number
    
    if start not in STATIONS:
        raise HTTPException(status_code=400, detail=f"Invalid start station: {start}")
    if end not in STATIONS:
        raise HTTPException(status_code=400, detail=f"Invalid end station: {end}")
    if start == end:
        raise HTTPException(status_code=400, detail="Start and End station must be different.")
        
    journey_id = create_journey(start, end, train_num)
    if not journey_id:
        raise HTTPException(
            status_code=400, 
            detail=f"Failed to start journey. Verify train {train_num} operates between {start} and {end}."
        )
        
    return {"journey_id": journey_id, "status": "initiated"}

@app.get("/api/journey/status")
def get_journey_status(journey_id: str):
    """
    Updates simulation time and returns latest coordinates, speed, ETA, and LSTM segment-wise predictions.
    """
    status = update_journey_status(journey_id)
    if not status:
        raise HTTPException(status_code=404, detail="Journey not found.")
    return status

@app.post("/api/journey/inject-delay")
def inject_manual_delay(journey_id: str, segment_idx: int, delay_mins: float):
    """
    Enables user-triggered bottlenecks on current/future segments to demonstrate LSTM dynamic recalculations.
    """
    if journey_id not in ACTIVE_JOURNEYS:
        raise HTTPException(status_code=404, detail="Journey not found.")
        
    state = ACTIVE_JOURNEYS[journey_id]
    segments = state["segments"]
    
    if segment_idx < 0 or segment_idx >= len(segments):
        raise HTTPException(status_code=400, detail="Invalid segment index.")
        
    seg = segments[segment_idx]
    seg["delay_introduced"] += delay_mins
    seg["congestion"] = min(seg["congestion"] + 0.3, 0.9)  # Spike congestion
    state["accumulated_delay"] += delay_mins
    
    state["delay_events"].append({
        "timestamp": time.time(),
        "segment": f"{seg['source']}->{seg['target']}",
        "delay": delay_mins,
        "reason": f"Manual operational bottleneck injection of {delay_mins} mins."
    })
    
    return {"status": "success", "detail": f"Injected {delay_mins}m delay to segment {seg['source']}->{seg['target']}"}

@app.get("/api/health")
def health():
    return {"status": "healthy"}
