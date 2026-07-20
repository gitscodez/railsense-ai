import heapq
from typing import Dict, List, Tuple, Optional

# Define the Eastern Railway (India) stations with their coordinates (lat, lon), display names, and typical platform numbers
STATIONS: Dict[str, Dict[str, any]] = {
    "HWH": {"name": "Howrah Junction", "lat": 22.5834, "lon": 88.3414, "platform": "PF 8"},
    "SDAH": {"name": "Sealdah Terminus", "lat": 22.5697, "lon": 88.3712, "platform": "PF 11"},
    "BWN": {"name": "Barddhaman Junction", "lat": 23.2324, "lon": 87.8630, "platform": "PF 3"},
    "DGR": {"name": "Durgapur Railway Station", "lat": 23.5257, "lon": 87.3213, "platform": "PF 2"},
    "ASN": {"name": "Asansol Junction", "lat": 23.6889, "lon": 86.9661, "platform": "PF 5"},
    "BHP": {"name": "Bolpur Shantiniketan", "lat": 23.6698, "lon": 87.6974, "platform": "PF 1"},
    "RPH": {"name": "Rampurhat Junction", "lat": 24.1681, "lon": 87.7812, "platform": "PF 2"},
    "MLDT": {"name": "Malda Town Station", "lat": 25.0116, "lon": 88.1368, "platform": "PF 3"},
    "BGP": {"name": "Bhagalpur Junction", "lat": 25.2443, "lon": 87.0115, "platform": "PF 1"},
    "JMP": {"name": "Jamalpur Junction", "lat": 25.3134, "lon": 86.4952, "platform": "PF 3"},
}

# Define adjacency list: {station_code: [(neighbor_code, base_time_mins, distance_km)]}
GRAPH: Dict[str, List[Tuple[str, float, float]]] = {
    "HWH": [("BWN", 70.0, 95.0)],
    "SDAH": [("BWN", 75.0, 102.0)],
    "BWN": [("HWH", 70.0, 95.0), ("SDAH", 75.0, 102.0), ("DGR", 45.0, 64.0), ("BHP", 40.0, 52.0)],
    "DGR": [("BWN", 45.0, 64.0), ("ASN", 35.0, 42.0)],
    "ASN": [("DGR", 35.0, 42.0), ("JMP", 210.0, 180.0)],
    "BHP": [("BWN", 40.0, 52.0), ("RPH", 65.0, 73.0)],
    "RPH": [("BHP", 65.0, 73.0), ("MLDT", 130.0, 124.0), ("BGP", 150.0, 152.0)],
    "MLDT": [("RPH", 130.0, 124.0)],
    "BGP": [("RPH", 150.0, 152.0), ("JMP", 50.0, 53.0)],
    "JMP": [("BGP", 50.0, 53.0), ("ASN", 210.0, 180.0)],
}

# Database of 28 trains operating on these Eastern Railway routes (Outbound & Return counterpart vice-versa runs)
TRAINS = [
    # Outbound Runs (Start -> End)
    { "number": "13017", "name": "Mayurakshi Express", "type": "Express", "route": ["HWH", "BWN", "BHP", "RPH"], "base_speed": 65.0, "departure_time": "16:10", "reliability": 0.85 },
    { "number": "13015", "name": "Kavi Guru Express", "type": "Express", "route": ["HWH", "BWN", "BHP", "RPH", "BGP", "JMP"], "base_speed": 60.0, "departure_time": "10:40", "reliability": 0.80 },
    { "number": "13153", "name": "Gour Express", "type": "Express", "route": ["SDAH", "BWN", "BHP", "RPH", "MLDT"], "base_speed": 68.0, "departure_time": "22:15", "reliability": 0.90 },
    { "number": "12301", "name": "Howrah Rajdhani Express", "type": "Rajdhani", "route": ["HWH", "BWN", "DGR", "ASN"], "base_speed": 110.0, "departure_time": "16:50", "reliability": 0.98 },
    { "number": "12023", "name": "Howrah Patna Shatabdi Express", "type": "Shatabdi", "route": ["HWH", "BWN", "DGR", "ASN"], "base_speed": 100.0, "departure_time": "14:15", "reliability": 0.96 },
    { "number": "13117", "name": "Dhano Dhanye Express", "type": "Express", "route": ["SDAH", "BWN", "DGR", "ASN"], "base_speed": 62.0, "departure_time": "16:10", "reliability": 0.86 },
    { "number": "12377", "name": "Padatik Express", "type": "Superfast", "route": ["SDAH", "BWN", "BHP", "RPH", "MLDT"], "base_speed": 80.0, "departure_time": "23:20", "reliability": 0.94 },
    { "number": "12345", "name": "Saraighat Express", "type": "Superfast", "route": ["HWH", "BWN", "BHP", "RPH", "MLDT"], "base_speed": 85.0, "departure_time": "15:45", "reliability": 0.94 },
    { "number": "13011", "name": "Howrah Malda Town Intercity", "type": "Express", "route": ["HWH", "BWN", "BHP", "RPH", "MLDT"], "base_speed": 60.0, "departure_time": "11:25", "reliability": 0.82 },
    { "number": "12339", "name": "Coalfield Express", "type": "Superfast", "route": ["HWH", "BWN", "DGR", "ASN"], "base_speed": 75.0, "departure_time": "17:20", "reliability": 0.92 },
    { "number": "12341", "name": "Agnibina Express", "type": "Superfast", "route": ["HWH", "BWN", "DGR", "ASN"], "base_speed": 74.0, "departure_time": "18:20", "reliability": 0.93 },
    { "number": "13021", "name": "Mithila Express", "type": "Express", "route": ["HWH", "BWN", "DGR", "ASN"], "base_speed": 58.0, "departure_time": "15:45", "reliability": 0.82 },
    { "number": "12383", "name": "Sealdah Asansol Intercity", "type": "Express", "route": ["SDAH", "BWN", "DGR", "ASN"], "base_speed": 65.0, "departure_time": "17:10", "reliability": 0.88 },
    { "number": "13071", "name": "Howrah Jamalpur Express", "type": "Express", "route": ["HWH", "BWN", "BHP", "RPH", "BGP", "JMP"], "base_speed": 72.0, "departure_time": "21:35", "reliability": 0.85 },

    # Return Runs (End -> Start)
    { "number": "13018", "name": "Mayurakshi Express (Return)", "type": "Express", "route": ["RPH", "BHP", "BWN", "HWH"], "base_speed": 65.0, "departure_time": "05:45", "reliability": 0.85 },
    { "number": "13016", "name": "Kavi Guru Express (Return)", "type": "Express", "route": ["JMP", "BGP", "RPH", "BHP", "BWN", "HWH"], "base_speed": 60.0, "departure_time": "20:30", "reliability": 0.80 },
    { "number": "13154", "name": "Gour Express (Return)", "type": "Express", "route": ["MLDT", "RPH", "BHP", "BWN", "SDAH"], "base_speed": 68.0, "departure_time": "21:50", "reliability": 0.90 },
    { "number": "12302", "name": "Howrah Rajdhani Express (Return)", "type": "Rajdhani", "route": ["ASN", "DGR", "BWN", "HWH"], "base_speed": 110.0, "departure_time": "08:30", "reliability": 0.98 },
    { "number": "12024", "name": "Howrah Patna Shatabdi Express (Return)", "type": "Shatabdi", "route": ["ASN", "DGR", "BWN", "HWH"], "base_speed": 100.0, "departure_time": "09:40", "reliability": 0.96 },
    { "number": "13118", "name": "Dhano Dhanye Express (Return)", "type": "Express", "route": ["ASN", "DGR", "BWN", "SDAH"], "base_speed": 62.0, "departure_time": "07:40", "reliability": 0.86 },
    { "number": "12378", "name": "Padatik Express (Return)", "type": "Superfast", "route": ["MLDT", "RPH", "BHP", "BWN", "SDAH"], "base_speed": 80.0, "departure_time": "18:45", "reliability": 0.94 },
    { "number": "12346", "name": "Saraighat Express (Return)", "type": "Superfast", "route": ["MLDT", "RPH", "BHP", "BWN", "HWH"], "base_speed": 85.0, "departure_time": "19:10", "reliability": 0.94 },
    { "number": "13012", "name": "Howrah Malda Town Intercity (Return)", "type": "Express", "route": ["MLDT", "RPH", "BHP", "BWN", "HWH"], "base_speed": 60.0, "departure_time": "04:30", "reliability": 0.82 },
    { "number": "12340", "name": "Coalfield Express (Return)", "type": "Superfast", "route": ["ASN", "DGR", "BWN", "HWH"], "base_speed": 75.0, "departure_time": "05:55", "reliability": 0.92 },
    { "number": "12342", "name": "Agnibina Express (Return)", "type": "Superfast", "route": ["ASN", "DGR", "BWN", "HWH"], "base_speed": 74.0, "departure_time": "05:30", "reliability": 0.93 },
    { "number": "13022", "name": "Mithila Express (Return)", "type": "Express", "route": ["ASN", "DGR", "BWN", "HWH"], "base_speed": 58.0, "departure_time": "17:00", "reliability": 0.82 },
    { "number": "12384", "name": "Sealdah Asansol Intercity (Return)", "type": "Express", "route": ["ASN", "DGR", "BWN", "SDAH"], "base_speed": 65.0, "departure_time": "06:45", "reliability": 0.88 },
    { "number": "13072", "name": "Howrah Jamalpur Express (Return)", "type": "Express", "route": ["JMP", "BGP", "RPH", "BHP", "BWN", "HWH"], "base_speed": 72.0, "departure_time": "19:30", "reliability": 0.85 }
]

def dijkstra(start: str, end: str) -> Optional[Tuple[List[str], float, float]]:
    """
    Computes the shortest path from start to end based on base_time_mins.
    Returns: Tuple of (path_stations_list, total_time_mins, total_distance_km)
    """
    if start not in STATIONS or end not in STATIONS:
        return None

    pq = [(0.0, start, [start], 0.0)]
    visited = {}

    while pq:
        curr_time, curr_node, path, curr_dist = heapq.heappop(pq)

        if curr_node == end:
            return path, curr_time, curr_dist

        if curr_node in visited and visited[curr_node] <= curr_time:
            continue

        visited[curr_node] = curr_time

        for neighbor, time_weight, dist_weight in GRAPH.get(curr_node, []):
            if neighbor not in visited:
                heapq.heappush(pq, (
                    curr_time + time_weight,
                    neighbor,
                    path + [neighbor],
                    curr_dist + dist_weight
                ))

    return None

def find_trains_for_journey(start: str, end: str) -> Dict[str, List[dict]]:
    """
    Finds scheduled trains matching Start -> End (outbound) AND End -> Start (return/vice-versa).
    """
    outbound = []
    return_trains = []
    
    for train in TRAINS:
        # Check Outbound direction
        try:
            start_idx = train["route"].index(start)
            end_idx = train["route"].index(end)
            if start_idx < end_idx:
                sub_route = train["route"][start_idx:end_idx + 1]
                outbound.append({
                    "number": train["number"],
                    "name": train["name"],
                    "type": train["type"],
                    "sub_route": sub_route,
                    "base_speed": train["base_speed"],
                    "departure_time": train["departure_time"],
                    "reliability": train["reliability"]
                })
        except ValueError:
            pass

        # Check Return direction
        try:
            r_start_idx = train["route"].index(end)
            r_end_idx = train["route"].index(start)
            if r_start_idx < r_end_idx:
                r_sub_route = train["route"][r_start_idx:r_end_idx + 1]
                return_trains.append({
                    "number": train["number"],
                    "name": train["name"],
                    "type": train["type"],
                    "sub_route": r_sub_route,
                    "base_speed": train["base_speed"],
                    "departure_time": train["departure_time"],
                    "reliability": train["reliability"]
                })
        except ValueError:
            pass
            
    return {
        "outbound": outbound,
        "return_trains": return_trains
    }

def get_network_data() -> Dict[str, any]:
    """
    Returns the network nodes and links for mapping and visualization.
    """
    links = []
    seen_edges = set()
    for source, neighbors in GRAPH.items():
        for target, time_w, dist_w in neighbors:
            edge_key = tuple(sorted([source, target]))
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                links.append({
                    "source": source,
                    "target": target,
                    "base_time": time_w,
                    "distance": dist_w
                })
    return {
        "stations": STATIONS,
        "links": links
    }
