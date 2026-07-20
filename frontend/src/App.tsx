import { useState, useEffect, useRef } from "react";
import { Train, CloudSun, Compass, ShieldAlert } from "lucide-react";
import { Map } from "./components/Map";
import { JourneySelector } from "./components/JourneySelector";
import { MetricsPanel } from "./components/MetricsPanel";
import { SegmentAnalytics } from "./components/SegmentAnalytics";
import { ActionableInsights } from "./components/ActionableInsights";

const BACKEND_URL = "http://localhost:8000";

interface Station {
  name: string;
  lat: number;
  lon: number;
  platform: string;
}

interface Link {
  source: string;
  target: string;
  base_time: number;
  distance: number;
}

interface TrainData {
  number: string;
  name: string;
  type: string;
  route: string[];
  base_speed: number;
  departure_time: string;
  reliability: number;
}

// Fallback Eastern Railway station coordinates
const FALLBACK_STATIONS: Record<string, Station> = {
  "HWH": { name: "Howrah Junction", lat: 22.5834, lon: 88.3414, platform: "PF 8" },
  "SDAH": { name: "Sealdah Terminus", lat: 22.5697, lon: 88.3712, platform: "PF 11" },
  "BWN": { name: "Barddhaman Junction", lat: 23.2324, lon: 87.8630, platform: "PF 3" },
  "DGR": { name: "Durgapur Railway Station", lat: 23.5257, lon: 87.3213, platform: "PF 2" },
  "ASN": { name: "Asansol Junction", lat: 23.6889, lon: 86.9661, platform: "PF 5" },
  "BHP": { name: "Bolpur Shantiniketan", lat: 23.6698, lon: 87.6974, platform: "PF 1" },
  "RPH": { name: "Rampurhat Junction", lat: 24.1681, lon: 87.7812, platform: "PF 2" },
  "MLDT": { name: "Malda Town Station", lat: 25.0116, lon: 88.1368, platform: "PF 3" },
  "BGP": { name: "Bhagalpur Junction", lat: 25.2443, lon: 87.0115, platform: "PF 1" },
  "JMP": { name: "Jamalpur Junction", lat: 25.3134, lon: 86.4952, platform: "PF 3" },
};

const FALLBACK_LINKS: Link[] = [
  { source: "HWH", target: "BWN", base_time: 70, distance: 95 },
  { source: "SDAH", target: "BWN", base_time: 75, distance: 102 },
  { source: "BWN", target: "DGR", base_time: 45, distance: 64 },
  { source: "DGR", target: "ASN", base_time: 35, distance: 42 },
  { source: "BWN", target: "BHP", base_time: 40, distance: 52 },
  { source: "BHP", target: "RPH", base_time: 65, distance: 73 },
  { source: "RPH", target: "MLDT", base_time: 130, distance: 124 },
  { source: "RPH", target: "BGP", base_time: 150, distance: 152 },
  { source: "BGP", target: "JMP", base_time: 50, distance: 53 },
  { source: "JMP", target: "ASN", base_time: 210, distance: 180 },
];

const FALLBACK_TRAINS: TrainData[] = [
  // Outbound Runs
  { number: "13017", name: "Mayurakshi Express", type: "Express", route: ["HWH", "BWN", "BHP", "RPH"], base_speed: 65.0, departure_time: "16:10", reliability: 0.85 },
  { number: "13015", name: "Kavi Guru Express", type: "Express", route: ["HWH", "BWN", "BHP", "RPH", "BGP", "JMP"], base_speed: 60.0, departure_time: "10:40", reliability: 0.80 },
  { number: "13153", name: "Gour Express", type: "Express", route: ["SDAH", "BWN", "BHP", "RPH", "MLDT"], base_speed: 68.0, departure_time: "22:15", reliability: 0.90 },
  { number: "12301", name: "Howrah Rajdhani Express", type: "Rajdhani", route: ["HWH", "BWN", "DGR", "ASN"], base_speed: 110.0, departure_time: "16:50", reliability: 0.98 },
  { number: "12023", name: "Howrah Patna Shatabdi Express", type: "Shatabdi", route: ["HWH", "BWN", "DGR", "ASN"], base_speed: 100.0, departure_time: "14:15", reliability: 0.96 },
  { number: "13117", name: "Dhano Dhanye Express", type: "Express", route: ["SDAH", "BWN", "DGR", "ASN"], base_speed: 62.0, departure_time: "16:10", reliability: 0.86 },
  { number: "12377", name: "Padatik Express", type: "Superfast", route: ["SDAH", "BWN", "BHP", "RPH", "MLDT"], base_speed: 80.0, departure_time: "23:20", reliability: 0.94 },
  { number: "12345", name: "Saraighat Express", type: "Superfast", route: ["HWH", "BWN", "BHP", "RPH", "MLDT"], base_speed: 85.0, departure_time: "15:45", reliability: 0.94 },
  { number: "13011", name: "Howrah Malda Town Intercity", type: "Express", route: ["HWH", "BWN", "BHP", "RPH", "MLDT"], base_speed: 60.0, departure_time: "11:25", reliability: 0.82 },
  { number: "12339", name: "Coalfield Express", type: "Superfast", route: ["HWH", "BWN", "DGR", "ASN"], base_speed: 75.0, departure_time: "17:20", reliability: 0.92 },
  { number: "12341", name: "Agnibina Express", type: "Superfast", route: ["HWH", "BWN", "DGR", "ASN"], base_speed: 74.0, departure_time: "18:20", reliability: 0.93 },
  { number: "13021", name: "Mithila Express", type: "Express", route: ["HWH", "BWN", "DGR", "ASN"], base_speed: 58.0, departure_time: "15:45", reliability: 0.82 },
  { number: "12383", name: "Sealdah Asansol Intercity", type: "Express", route: ["SDAH", "BWN", "DGR", "ASN"], base_speed: 65.0, departure_time: "17:10", reliability: 0.88 },
  { number: "13071", name: "Howrah Jamalpur Express", type: "Express", route: ["HWH", "BWN", "BHP", "RPH", "BGP", "JMP"], base_speed: 72.0, departure_time: "21:35", reliability: 0.85 },
  
  // Return Runs (Vice-Versa)
  { number: "13018", name: "Mayurakshi Express (Return)", type: "Express", route: ["RPH", "BHP", "BWN", "HWH"], base_speed: 65.0, departure_time: "05:45", reliability: 0.85 },
  { number: "13016", name: "Kavi Guru Express (Return)", type: "Express", route: ["JMP", "BGP", "RPH", "BHP", "BWN", "HWH"], base_speed: 60.0, departure_time: "20:30", reliability: 0.80 },
  { number: "13154", name: "Gour Express (Return)", type: "Express", route: ["MLDT", "RPH", "BHP", "BWN", "SDAH"], base_speed: 68.0, departure_time: "21:50", reliability: 0.90 },
  { number: "12302", name: "Howrah Rajdhani Express (Return)", type: "Rajdhani", route: ["ASN", "DGR", "BWN", "HWH"], base_speed: 110.0, departure_time: "08:30", reliability: 0.98 },
  { number: "12024", name: "Howrah Patna Shatabdi Express (Return)", type: "Shatabdi", route: ["ASN", "DGR", "BWN", "HWH"], base_speed: 100.0, departure_time: "09:40", reliability: 0.96 },
  { number: "13118", name: "Dhano Dhanye Express (Return)", type: "Express", route: ["ASN", "DGR", "BWN", "SDAH"], base_speed: 62.0, departure_time: "07:40", reliability: 0.86 },
  { number: "12378", name: "Padatik Express (Return)", type: "Superfast", route: ["MLDT", "RPH", "BHP", "BWN", "SDAH"], base_speed: 80.0, departure_time: "18:45", reliability: 0.94 },
  { number: "12346", name: "Saraighat Express (Return)", type: "Superfast", route: ["MLDT", "RPH", "BHP", "BWN", "HWH"], base_speed: 85.0, departure_time: "19:10", reliability: 0.94 },
  { number: "13012", name: "Howrah Malda Town Intercity (Return)", type: "Express", route: ["MLDT", "RPH", "BHP", "BWN", "HWH"], base_speed: 60.0, departure_time: "04:30", reliability: 0.82 },
  { number: "12340", name: "Coalfield Express (Return)", type: "Superfast", route: ["ASN", "DGR", "BWN", "HWH"], base_speed: 75.0, departure_time: "05:55", reliability: 0.92 },
  { number: "12342", name: "Agnibina Express (Return)", type: "Superfast", route: ["ASN", "DGR", "BWN", "HWH"], base_speed: 74.0, departure_time: "05:30", reliability: 0.93 },
  { number: "13022", name: "Mithila Express (Return)", type: "Express", route: ["ASN", "DGR", "BWN", "HWH"], base_speed: 58.0, departure_time: "17:00", reliability: 0.82 },
  { number: "12384", name: "Sealdah Asansol Intercity (Return)", type: "Express", route: ["ASN", "DGR", "BWN", "SDAH"], base_speed: 65.0, departure_time: "06:45", reliability: 0.88 },
  { number: "13072", name: "Howrah Jamalpur Express (Return)", type: "Express", route: ["JMP", "BGP", "RPH", "BHP", "BWN", "HWH"], base_speed: 72.0, departure_time: "19:30", reliability: 0.85 }
];

const timeStrToMins = (timeStr: string): number => {
  const parts = timeStr.split(":");
  return parseFloat(parts[0]) * 60.0 + parseFloat(parts[1]);
};

const minsToTimeStr = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

export default function App() {
  const [stations, setStations] = useState<Record<string, Station>>(FALLBACK_STATIONS);
  const [links, setLinks] = useState<Link[]>(FALLBACK_LINKS);
  const [availableTrains, setAvailableTrains] = useState<{ outbound: any[]; returnTrains: any[] }>({ outbound: [], returnTrains: [] });
  
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [journeyStatus, setJourneyStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendOffline, setIsBackendOffline] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clientSimulationRef = useRef<any>(null);

  // 1. Fetch static rail network on mount
  useEffect(() => {
    async function fetchNetwork() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/stations`);
        if (res.ok) {
          const data = await res.json();
          setStations(data.stations);
          setLinks(data.links);
          setIsBackendOffline(false);
        } else {
          console.warn("Failed to fetch ER network from backend, utilizing fallback.");
          setIsBackendOffline(true);
        }
      } catch (err) {
        console.warn("Backend API offline, running in offline ER fallback mode.");
        setIsBackendOffline(true);
      }
    }
    fetchNetwork();
  }, []);

  // 2. Poll/Update journey status loop
  useEffect(() => {
    if (activeJourneyId) {
      if (isBackendOffline) {
        clientTick();
        pollingRef.current = setInterval(clientTick, 1500);
      } else {
        fetchStatus();
        pollingRef.current = setInterval(fetchStatus, 1500);
      }
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [activeJourneyId, isBackendOffline]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const fetchStatus = async () => {
    if (!activeJourneyId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/journey/status?journey_id=${activeJourneyId}`);
      if (res.ok) {
        const data = await res.json();
        setJourneyStatus(data);
        if (data.is_finished) {
          stopPolling();
        }
      } else {
        console.warn("Failed to fetch status, falling back to local simulation mode.");
        setIsBackendOffline(true);
      }
    } catch (err) {
      console.warn("Lost connection to backend, falling back to local simulation mode.");
      setIsBackendOffline(true);
    }
  };

  // Search Trains on Route
  const handleSearchTrains = async (start: string, end: string) => {
    if (!start || !end) return;

    if (isBackendOffline) {
      searchTrainsLocal(start, end);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/trains/search?start=${start}&end=${end}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableTrains({
          outbound: data.outbound,
          returnTrains: data.return_trains
        });
      } else {
        searchTrainsLocal(start, end);
      }
    } catch (err) {
      searchTrainsLocal(start, end);
    }
  };

  const searchTrainsLocal = (start: string, end: string) => {
    const outbound: any[] = [];
    const returnTrains: any[] = [];
    
    FALLBACK_TRAINS.forEach((train) => {
      // Outbound path check (origin -> destination)
      const startIdx = train.route.indexOf(start);
      const endIdx = train.route.indexOf(end);
      if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
        outbound.push({
          number: train.number,
          name: train.name,
          type: train.type,
          sub_route: train.route.slice(startIdx, endIdx + 1),
          base_speed: train.base_speed,
          departure_time: train.departure_time,
          reliability: train.reliability
        });
      }

      // Return path check (destination -> origin)
      const rStartIdx = train.route.indexOf(end);
      const rEndIdx = train.route.indexOf(start);
      if (rStartIdx !== -1 && rEndIdx !== -1 && rStartIdx < rEndIdx) {
        returnTrains.push({
          number: train.number,
          name: train.name,
          type: train.type,
          sub_route: train.route.slice(rStartIdx, rEndIdx + 1),
          base_speed: train.base_speed,
          departure_time: train.departure_time,
          reliability: train.reliability
        });
      }
    });

    setAvailableTrains({ outbound, returnTrains });
  };

  // Calculate client side schedules
  const calculateLocalScheduleAndMilestones = (trainDepTime: string, path: string[], segments: any[]) => {
    const schedule: Record<string, any> = {};
    const milestones: Record<string, number> = {};
    
    let currentMins = timeStrToMins(trainDepTime);
    
    // Start station
    const startCode = path[0];
    schedule[startCode] = {
      scheduled_arr: "--:--",
      scheduled_dep: trainDepTime,
      stop_duration: 0
    };
    milestones[startCode] = 0.0;
    
    let cumulativeDist = 0.0;
    
    segments.forEach((seg, idx) => {
      const target = seg.target;
      const arrMins = currentMins + seg.base_time;
      const isJunction = ["BWN", "ASN", "MLDT", "BGP", "HWH", "SDAH"].includes(target);
      const stopDuration = isJunction ? 10 : 2;
      
      let depStr = "--:--";
      let stop = stopDuration;
      
      if (idx === segments.length - 1) {
        stop = 0;
        currentMins = arrMins;
      } else {
        const depMins = arrMins + stopDuration;
        depStr = minsToTimeStr(depMins);
        currentMins = depMins;
      }
      
      schedule[target] = {
        scheduled_arr: minsToTimeStr(arrMins),
        scheduled_dep: depStr,
        stop_duration: stop
      };
      
      cumulativeDist += seg.distance;
      milestones[target] = Math.round(cumulativeDist * 10) / 10;
    });
    
    return { schedule, milestones };
  };

  // Start Journey (handles bidirectional routing)
  const handleStartJourney = async (start: string, end: string, trainNumber: string) => {
    setIsLoading(true);
    
    // Attempt backend first
    try {
      const res = await fetch(`${BACKEND_URL}/api/journey/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_station: start, end_station: end, train_number: trainNumber }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveJourneyId(data.journey_id);
        setIsBackendOffline(false);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Backend failed, starting local simulation.");
    }

    // Backend offline fallback simulation
    setIsBackendOffline(true);
    const train = FALLBACK_TRAINS.find((t) => t.number === trainNumber);
    if (!train) {
      alert("Selected train not found.");
      setIsLoading(false);
      return;
    }

    const startIdx = train.route.indexOf(start);
    const endIdx = train.route.indexOf(end);
    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
      alert("Invalid route boundaries for selected train.");
      setIsLoading(false);
      return;
    }

    const subRoute = train.route.slice(startIdx, endIdx + 1);

    // Build segments
    const segments = [];
    for (let i = 0; i < subRoute.length - 1; i++) {
      const source = subRoute[i];
      const target = subRoute[i + 1];
      const link = FALLBACK_LINKS.find(
        (l) => (l.source === source && l.target === target) || (l.source === target && l.target === source)
      );
      segments.push({
        source,
        target,
        base_time: link ? link.base_time : 45.0,
        distance: link ? link.distance : 40.0,
        congestion: Math.round((0.05 + Math.random() * 0.2) * 100) / 100,
        delay_introduced: 0.0,
        completed: false,
      });
    }

    const { schedule, milestones } = calculateLocalScheduleAndMilestones(train.departure_time, subRoute, segments);

    clientSimulationRef.current = {
      journey_id: `LOCAL-${trainNumber}-${Date.now()}`,
      train_number: train.number,
      train_name: train.name,
      train_type: train.type,
      base_speed: train.base_speed,
      reliability: train.reliability,
      start_station: start,
      end_station: end,
      path: subRoute,
      segments,
      schedule,
      milestones,
      weather_index: Math.round([0.0, 0.1, 0.4, 0.7][Math.floor(Math.random() * 4)] * 100) / 100,
      current_segment_idx: 0,
      segment_progress: 0.0,
      accumulated_delay: 0.0,
      is_finished: false,
      delay_events: [],
      start_time_ms: Date.now(),
    };

    setActiveJourneyId(clientSimulationRef.current.journey_id);
    setIsLoading(false);
  };

  // Client Simulation Update Tick
  const clientTick = () => {
    const sim = clientSimulationRef.current;
    if (!sim) return;

    if (sim.is_finished) {
      updateClientPayload();
      return;
    }

    const currentSegment = sim.segments[sim.current_segment_idx];
    const segmentDuration = currentSegment.base_time + currentSegment.delay_introduced;

    // Random delay injection (scaled by reliability factor)
    const delayProb = 0.35 * (2.0 - sim.reliability * 1.8);
    const isJunction = ["BWN", "ASN", "MLDT"].includes(currentSegment.source);
    const threshold = isJunction || sim.weather_index > 0.2 ? delayProb * 1.5 : delayProb;

    if (currentSegment.delay_introduced === 0.0 && Math.random() < threshold) {
      const delay = Math.round((5 + Math.random() * 18) * 10) / 10;
      currentSegment.delay_introduced = delay;
      currentSegment.congestion = Math.min(currentSegment.congestion + 0.3, 0.85);
      sim.accumulated_delay += delay;

      sim.delay_events.push({
        segment: `${currentSegment.source}➔${currentSegment.target}`,
        delay,
        reason: isJunction
          ? `Junction yard congestion delay on segment ${currentSegment.source}➔${currentSegment.target}`
          : `Block section clearing speed restrictions at ${currentSegment.source}`,
      });
    }

    // Increment progress
    sim.segment_progress += 1.0 / segmentDuration;

    if (sim.segment_progress >= 1.0) {
      currentSegment.completed = true;
      sim.segment_progress = 0.0;
      sim.current_segment_idx += 1;

      if (sim.current_segment_idx >= sim.segments.length) {
        sim.is_finished = true;
        sim.current_segment_idx = sim.segments.length - 1;
        sim.segment_progress = 1.0;
        stopPolling();
      }
    }

    // Update coordinates
    const curIdx = sim.current_segment_idx;
    const curSeg = sim.segments[curIdx];
    const srcStat = FALLBACK_STATIONS[curSeg.source];
    const tgtStat = FALLBACK_STATIONS[curSeg.target];
    const prog = sim.segment_progress;

    sim.lat = srcStat.lat + prog * (tgtStat.lat - srcStat.lat);
    sim.lon = srcStat.lon + prog * (tgtStat.lon - srcStat.lon);

    updateClientPayload();
  };

  const getLiveLocationMessageLocal = (sim: any) => {
    if (sim.is_finished) {
      const destName = FALLBACK_STATIONS[sim.end_station].name;
      return `Arrived at destination station ${destName} (${sim.end_station}). Journey completed.`;
    }
    const curIdx = sim.current_segment_idx;
    const seg = sim.segments[curIdx];
    const progress = sim.segment_progress;
    
    const srcName = FALLBACK_STATIONS[seg.source].name;
    const tgtName = FALLBACK_STATIONS[seg.target].name;
    const remainingKm = Math.round(seg.distance * (1.0 - progress) * 10) / 10;
    
    if (progress < 0.05) {
      return sim.accumulated_delay > 0
        ? `Departed from ${srcName} (${seg.source}) | Running late by ${Math.round(sim.accumulated_delay)} mins.`
        : `Departed from ${srcName} (${seg.source}) on-time.`;
    } else if (progress > 0.95) {
      return `Approaching ${tgtName} (${seg.target}) | Platform typical: ${FALLBACK_STATIONS[seg.target].platform}.`;
    } else {
      const speed = Math.round(sim.base_speed * (1.0 - seg.congestion * 0.4) * (1.0 - sim.weather_index * 0.25));
      return `Between ${srcName} and ${tgtName} | ${remainingKm} km to ${seg.target} | Speed: ${speed} km/h.`;
    }
  };

  // Compile local simulation state into dashboard status payload
  const updateClientPayload = () => {
    const sim = clientSimulationRef.current;
    if (!sim) return;

    const segments = sim.segments;
    const currentIdx = sim.current_segment_idx;
    const isFinished = sim.is_finished;
    const schedule = sim.schedule;
    const milestones = sim.milestones;

    const segment_analytics = sim.path.map((station_code: string, idx: number) => {
      const isCompleted = idx < currentIdx || (isFinished && idx === sim.path.length - 1);
      const isActive = idx === currentIdx && !isFinished;
      
      let status = "upcoming";
      if (isCompleted) status = "completed";
      else if (isActive) status = "active";
      
      const sched_arr = schedule[station_code].scheduled_arr;
      const sched_dep = schedule[station_code].scheduled_dep;
      const stop_dur = schedule[station_code].stop_duration;
      
      let station_delay = 0.0;
      if (idx <= currentIdx) {
        station_delay = sim.accumulated_delay;
      } else {
        const pred_idx = idx - currentIdx - 1;
        station_delay = Math.max(
          0.0,
          Math.round(
            (sim.accumulated_delay * 0.3 * (1.1 - sim.reliability) + sim.weather_index * 15.0 - pred_idx * 1.5) * 10
          ) / 10
        );
      }
      
      let estimated_arr = sched_arr;
      let estimated_dep = sched_dep;
      
      if (station_delay > 0) {
        if (sched_arr !== "--:--") {
          estimated_arr = minsToTimeStr(timeStrToMins(sched_arr) + station_delay);
        }
        if (sched_dep !== "--:--") {
          estimated_dep = minsToTimeStr(timeStrToMins(sched_dep) + station_delay);
        }
      }
      
      let risk_level = "low";
      if (station_delay > 15.0) risk_level = "high";
      else if (station_delay > 5.0) risk_level = "medium";
      
      let congestion = 0.0;
      if (idx > 0 && idx - 1 < segments.length) {
        congestion = segments[idx - 1].congestion;
      }

      return {
        station_code,
        station_name: FALLBACK_STATIONS[station_code].name,
        platform: FALLBACK_STATIONS[station_code].platform,
        distance_km: milestones[station_code],
        stop_duration: stop_dur,
        congestion,
        status,
        scheduled_arr: sched_arr,
        scheduled_dep: sched_dep,
        estimated_arr,
        estimated_dep,
        delay_mins: station_delay,
        risk_level,
      };
    });

    const total_base_time = segments.reduce((sum: number, s: any) => sum + s.base_time, 0);
    const future_predicted_delay_sum = segment_analytics
      .slice(isFinished ? currentIdx : currentIdx + 1)
      .reduce((sum: number, s: any) => sum + s.delay_mins, 0);

    const recalibrated_total_time = total_base_time + sim.accumulated_delay + future_predicted_delay_sum;

    const avgCongestion = segments.reduce((sum: number, s: any) => sum + s.congestion, 0) / segments.length;
    const confidence = Math.max(
      0.45,
      Math.min(
        0.98,
        0.98 - (sim.weather_index * 0.12 + avgCongestion * 0.15 + (segments.length - currentIdx) * 0.02 + (1.0 - sim.reliability) * 0.1)
      )
    );

    let speed = 0.0;
    if (!isFinished) {
      const activeSeg = segments[currentIdx];
      speed = Math.round(sim.base_speed * (1.0 - activeSeg.congestion * 0.45) * (1.0 - sim.weather_index * 0.25) * 10) / 10;
    }

    setJourneyStatus({
      journey_id: sim.journey_id,
      train_number: sim.train_number,
      train_name: sim.train_name,
      train_type: sim.train_type,
      start_station: sim.start_station,
      end_station: sim.end_station,
      path: sim.path,
      is_finished: isFinished,
      weather_index: sim.weather_index,
      current_segment_idx: currentIdx,
      segment_progress: sim.segment_progress,
      lat: sim.lat,
      lon: sim.lon,
      accumulated_delay: sim.accumulated_delay,
      predicted_remaining_delay: future_predicted_delay_sum,
      confidence_score: confidence,
      total_base_time,
      recalibrated_total_time,
      speed_kmh: speed,
      segment_analytics,
      delay_events: sim.delay_events,
      live_status_message: getLiveLocationMessageLocal(sim),
    });
  };

  const handleResetJourney = () => {
    stopPolling();
    setActiveJourneyId(null);
    setJourneyStatus(null);
    clientSimulationRef.current = null;
    setAvailableTrains({ outbound: [], returnTrains: [] });
  };

  const handleInjectDelay = async (segmentIdx: number, delayMins: number) => {
    if (!activeJourneyId) return;

    if (isBackendOffline) {
      const sim = clientSimulationRef.current;
      if (!sim) return;
      
      const seg = sim.segments[segmentIdx];
      if (seg) {
        seg.delay_introduced += delayMins;
        seg.congestion = Math.min(seg.congestion + 0.3, 0.9);
        sim.accumulated_delay += delayMins;
        
        sim.delay_events.push({
          segment: `${seg.source}➔${seg.target}`,
          delay: delayMins,
          reason: `Manual operational bottleneck injection of ${delayMins} mins.`,
        });
        updateClientPayload();
      }
      return;
    }

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/journey/inject-delay?journey_id=${activeJourneyId}&segment_idx=${segmentIdx}&delay_mins=${delayMins}`,
        { method: "POST" }
      );
      if (res.ok) {
        await fetchStatus();
      }
    } catch (err) {
      console.error("Error communicating delay injection to backend:", err);
    }
  };

  const getWeatherInfo = (idx: number) => {
    if (idx >= 0.8) return { name: "Monsoonal Cyclone Alert", class: "storm" };
    if (idx >= 0.6) return { name: "Heavy Monsoon Rain", class: "storm" };
    if (idx >= 0.3) return { name: "Light Precipitation", class: "rain" };
    return { name: "Clear Conditions", class: "clear" };
  };

  const weather = journeyStatus ? getWeatherInfo(journeyStatus.weather_index) : null;

  return (
    <div className="dashboard-container">
      {/* Top Header Bar */}
      <header className="dashboard-header">
        <div className="logo-section">
          <Train className="logo-icon" size={24} />
          <h1 className="logo-text">RailSense AI</h1>
        </div>

        <div className="header-meta">
          {weather && (
            <div className="weather-badge">
              <CloudSun size={15} />
              <span>Weather: <strong>{weather.name}</strong></span>
              <span className={`weather-dot ${weather.class}`} />
            </div>
          )}
          
          {isBackendOffline ? (
            <div className="weather-badge" style={{ borderColor: "rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.03)" }}>
              <ShieldAlert size={15} className="danger" />
              <span style={{ color: "var(--color-danger)" }}>Mode: <strong>CLIENT SIMULATION (Offline)</strong></span>
            </div>
          ) : (
            <div className="weather-badge" style={{ borderColor: "rgba(6,182,212,0.3)" }}>
              <Compass size={15} className="logo-icon" />
              <span>Telemetry: <strong>{activeJourneyId ? "ONLINE" : "STANDBY"}</strong></span>
            </div>
          )}
        </div>
      </header>

      {/* Main Dashboard Screen */}
      <main className="dashboard-body">
        {/* Left pane: Leaflet Map */}
        <div className="map-view-container">
          <Map
            stations={stations}
            links={links}
            path={journeyStatus?.path || []}
            currentLat={journeyStatus?.lat || 0}
            currentLon={journeyStatus?.lon || 0}
            segmentAnalytics={journeyStatus?.segment_analytics || []}
            isFinished={journeyStatus?.is_finished || false}
          />

          {/* Onboarding Overlay when no journey is active */}
          {!activeJourneyId && (
            <div className="initial-state-overlay">
              <h2 className="overlay-title">Eastern Railway Journey Intelligence</h2>
              <p className="overlay-subtitle">
                Welcome to RailSense AI. Define an origin and destination station in the side configuration panel. 
                Our platform filters and lists scheduled train runs along Eastern Railway (India) routes. 
                Choose a train to start real-time tracking, graph pathfinding, and LSTM delay predictions.
              </p>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <span className="weather-badge">1. Search ER Origin & Destination</span>
                <span className="weather-badge">2. Choose Scheduled Train</span>
                <span className="weather-badge">3. Watch LSTM Recalibrations</span>
              </div>
            </div>
          )}
        </div>

        {/* Right pane: Side Panel metrics and control feed */}
        <section className="sidebar-panel">
          {/* 1. Selector */}
          <JourneySelector
            stations={stations}
            availableTrains={availableTrains}
            onStartJourney={handleStartJourney}
            onResetJourney={handleResetJourney}
            onSearchTrains={handleSearchTrains}
            activeJourneyId={activeJourneyId}
            isLoading={isLoading}
          />

          {/* 2. Metrics & Analytics panels shown only when journey is initialized */}
          {journeyStatus && (
            <>
              <MetricsPanel
                trainNumber={journeyStatus.train_number}
                trainName={journeyStatus.train_name}
                trainType={journeyStatus.train_type}
                confidenceScore={journeyStatus.confidence_score}
                totalBaseTime={journeyStatus.total_base_time}
                recalibratedTotalTime={journeyStatus.recalibrated_total_time}
                accumulatedDelay={journeyStatus.accumulated_delay}
                predictedRemainingDelay={journeyStatus.predicted_remaining_delay}
                speedKmh={journeyStatus.speed_kmh}
                lat={journeyStatus.lat}
                lon={journeyStatus.lon}
                liveStatusMessage={journeyStatus.live_status_message}
              />

              <SegmentAnalytics
                segmentAnalytics={journeyStatus.segment_analytics}
                journeyId={activeJourneyId}
                onInjectDelay={handleInjectDelay}
                isFinished={journeyStatus.is_finished}
              />

              <ActionableInsights
                segmentAnalytics={journeyStatus.segment_analytics}
                weatherIndex={journeyStatus.weather_index}
                confidenceScore={journeyStatus.confidence_score}
                delayEvents={journeyStatus.delay_events}
                isFinished={journeyStatus.is_finished}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
