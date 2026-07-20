import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, AlertTriangle, Search, Train as TrainIcon } from "lucide-react";

interface Station {
  name: string;
  lat: number;
  lon: number;
}

interface Train {
  number: string;
  name: string;
  type: string;
  sub_route: string[];
  base_speed: number;
  departure_time: string;
  reliability: number;
}

interface JourneySelectorProps {
  stations: Record<string, Station>;
  availableTrains: { outbound: Train[]; returnTrains: Train[] };
  onStartJourney: (start: string, end: string, trainNumber: string) => void;
  onResetJourney: () => void;
  onSearchTrains: (start: string, end: string) => void;
  activeJourneyId: string | null;
  isLoading: boolean;
}

const ALL_TRAINS_LIST = [
  // Outbound Runs
  { number: "13017", name: "Mayurakshi Express", type: "Express", route: ["HWH", "BWN", "BHP", "RPH"], base_speed: 65, departure_time: "16:10" },
  { number: "13015", name: "Kavi Guru Express", type: "Express", route: ["HWH", "BWN", "BHP", "RPH", "BGP", "JMP"], base_speed: 60, departure_time: "10:40" },
  { number: "13153", name: "Gour Express", type: "Express", route: ["SDAH", "BWN", "BHP", "RPH", "MLDT"], base_speed: 68, departure_time: "22:15" },
  { number: "12301", name: "Howrah Rajdhani Express", type: "Rajdhani", route: ["HWH", "BWN", "DGR", "ASN"], base_speed: 110, departure_time: "16:50" },
  { number: "12023", name: "Howrah Patna Shatabdi Express", type: "Shatabdi", route: ["HWH", "BWN", "DGR", "ASN"], base_speed: 100, departure_time: "14:15" },
  { number: "13117", name: "Dhano Dhanye Express", type: "Express", route: ["SDAH", "BWN", "DGR", "ASN"], base_speed: 62, departure_time: "16:10" },
  { number: "12377", name: "Padatik Express", type: "Superfast", route: ["SDAH", "BWN", "BHP", "RPH", "MLDT"], base_speed: 80, departure_time: "23:20" },
  { number: "12345", name: "Saraighat Express", type: "Superfast", route: ["HWH", "BWN", "BHP", "RPH", "MLDT"], base_speed: 85, departure_time: "15:45" },
  { number: "13011", name: "Howrah Malda Town Intercity", type: "Express", route: ["HWH", "BWN", "BHP", "RPH", "MLDT"], base_speed: 60, departure_time: "11:25" },
  { number: "12339", name: "Coalfield Express", type: "Superfast", route: ["HWH", "BWN", "DGR", "ASN"], base_speed: 75, departure_time: "17:20" },
  { number: "12341", name: "Agnibina Express", type: "Superfast", route: ["HWH", "BWN", "DGR", "ASN"], base_speed: 74, departure_time: "18:20" },
  { number: "13021", name: "Mithila Express", type: "Express", route: ["HWH", "BWN", "DGR", "ASN"], base_speed: 58, departure_time: "15:45" },
  { number: "12383", name: "Sealdah Asansol Intercity", type: "Express", route: ["SDAH", "BWN", "DGR", "ASN"], base_speed: 65, departure_time: "17:10" },
  { number: "13071", name: "Howrah Jamalpur Express", type: "Express", route: ["HWH", "BWN", "BHP", "RPH", "BGP", "JMP"], base_speed: 72, departure_time: "21:35" },
  
  // Return Runs (Vice-Versa)
  { number: "13018", name: "Mayurakshi Express (Return)", type: "Express", route: ["RPH", "BHP", "BWN", "HWH"], base_speed: 65, departure_time: "05:45" },
  { number: "13016", name: "Kavi Guru Express (Return)", type: "Express", route: ["JMP", "BGP", "RPH", "BHP", "BWN", "HWH"], base_speed: 60, departure_time: "20:30" },
  { number: "13154", name: "Gour Express (Return)", type: "Express", route: ["MLDT", "RPH", "BHP", "BWN", "SDAH"], base_speed: 68, departure_time: "21:50" },
  { number: "12302", name: "Howrah Rajdhani Express (Return)", type: "Rajdhani", route: ["ASN", "DGR", "BWN", "HWH"], base_speed: 110, departure_time: "08:30" },
  { number: "12024", name: "Howrah Patna Shatabdi Express (Return)", type: "Shatabdi", route: ["ASN", "DGR", "BWN", "HWH"], base_speed: 100, departure_time: "09:40" },
  { number: "13118", name: "Dhano Dhanye Express (Return)", type: "Express", route: ["ASN", "DGR", "BWN", "SDAH"], base_speed: 62, departure_time: "07:40" },
  { number: "12378", name: "Padatik Express (Return)", type: "Superfast", route: ["MLDT", "RPH", "BHP", "BWN", "SDAH"], base_speed: 80, departure_time: "18:45" },
  { number: "12346", name: "Saraighat Express (Return)", type: "Superfast", route: ["MLDT", "RPH", "BHP", "BWN", "HWH"], base_speed: 85, departure_time: "19:10" },
  { number: "13012", name: "Howrah Malda Town Intercity (Return)", type: "Express", route: ["MLDT", "RPH", "BHP", "BWN", "HWH"], base_speed: 60, departure_time: "04:30" },
  { number: "12340", name: "Coalfield Express (Return)", type: "Superfast", route: ["ASN", "DGR", "BWN", "HWH"], base_speed: 75, departure_time: "05:55" },
  { number: "12342", name: "Agnibina Express (Return)", type: "Superfast", route: ["ASN", "DGR", "BWN", "HWH"], base_speed: 74, departure_time: "05:30" },
  { number: "13022", name: "Mithila Express (Return)", type: "Express", route: ["ASN", "DGR", "BWN", "HWH"], base_speed: 58, departure_time: "17:00" },
  { number: "12384", name: "Sealdah Asansol Intercity (Return)", type: "Express", route: ["ASN", "DGR", "BWN", "SDAH"], base_speed: 65, departure_time: "06:45" },
  { number: "13072", name: "Howrah Jamalpur Express (Return)", type: "Express", route: ["JMP", "BGP", "RPH", "BHP", "BWN", "HWH"], base_speed: 72, departure_time: "19:30" }
];

// Searchable Autocomplete Combobox for Stations
interface SearchableSelectProps {
  id: string;
  label: string;
  placeholder: string;
  options: Record<string, Station>;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled,
}) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && options[value]) {
      setSearch(`${options[value].name} (${value})`);
    } else {
      setSearch("");
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (value && options[value]) {
          setSearch(`${options[value].name} (${value})`);
        } else {
          setSearch("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, options]);

  const filteredOptions = Object.entries(options).filter(([code, station]) => {
    const term = search.toLowerCase();
    return (
      station.name.toLowerCase().includes(term) ||
      code.toLowerCase().includes(term)
    );
  });

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setSearch("");
    }
  };

  const handleSelectOption = (code: string) => {
    onChange(code);
    setSearch(`${options[code].name} (${code})`);
    setIsOpen(false);
  };

  return (
    <div className="form-group" style={{ position: "relative" }} ref={containerRef}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          id={id}
          type="text"
          className="form-select"
          style={{ width: "100%", paddingRight: "34px", textOverflow: "ellipsis" }}
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={handleInputFocus}
          disabled={disabled}
          autoComplete="off"
        />
        <Search size={15} style={{ position: "absolute", right: "12px", color: "var(--text-muted)", pointerEvents: "none" }} />
      </div>

      {isOpen && !disabled && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            marginTop: "4px",
            maxHeight: "180px",
            overflowY: "auto",
            zIndex: 1000,
            listStyle: "none",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)"
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map(([code, station]) => (
              <li
                key={code}
                onClick={() => handleSelectOption(code)}
                style={{
                  padding: "10px 14px",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border-color)",
                  transition: "background-color 0.15s",
                  display: "flex",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span>{station.name}</span>
                <span style={{ color: "var(--color-cyan)", fontWeight: 700 }}>{code}</span>
              </li>
            ))
          ) : (
            <li style={{ padding: "10px 14px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              No stations found
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export const JourneySelector: React.FC<JourneySelectorProps> = ({
  stations,
  availableTrains,
  onStartJourney,
  onResetJourney,
  onSearchTrains,
  activeJourneyId,
  isLoading,
}) => {
  const [searchMode, setSearchMode] = useState<"route" | "train">("route");
  
  // Search by Route state
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selectedTrain, setSelectedTrain] = useState<string>("");
  const [selectedDirection, setSelectedDirection] = useState<"outbound" | "return">("outbound");
  
  // Search by Train state
  const [trainQuery, setTrainQuery] = useState("");
  const [isTrainListOpen, setIsTrainListOpen] = useState(false);
  const [selectedTrainObj, setSelectedTrainObj] = useState<any>(null);
  
  const [error, setError] = useState<string | null>(null);
  const trainContainerRef = useRef<HTMLDivElement>(null);

  // Trigger search in Route mode when start and end stations are selected
  useEffect(() => {
    setError(null);
    setSelectedTrain("");
    if (searchMode === "route" && start && end) {
      if (start === end) {
        setError("Start and destination stations cannot be the same.");
      } else {
        onSearchTrains(start, end);
      }
    }
  }, [start, end, searchMode]);

  // Click outside listener for train autocomplete list
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (trainContainerRef.current && !trainContainerRef.current.contains(event.target as Node)) {
        setIsTrainListOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter trains based on query (number or name)
  const filteredTrains = ALL_TRAINS_LIST.filter((t) => {
    const query = trainQuery.toLowerCase();
    return (
      t.number.includes(query) ||
      t.name.toLowerCase().includes(query)
    );
  });

  const handleSelectTrainObj = (t: any) => {
    setSelectedTrainObj(t);
    setTrainQuery(`${t.number} - ${t.name}`);
    setIsTrainListOpen(false);
  };

  const handleRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!start || !end) {
      setError("Please choose both an origin and destination station.");
      return;
    }

    if (start === end) {
      setError("Start and destination stations cannot be the same.");
      return;
    }

    if (!selectedTrain) {
      setError("Please select a train to track from the list.");
      return;
    }

    // If Outbound, track Start -> End. If Return, track End -> Start.
    if (selectedDirection === "outbound") {
      onStartJourney(start, end, selectedTrain);
    } else {
      onStartJourney(end, start, selectedTrain);
    }
  };

  const handleTrainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTrainObj) {
      setError("Please search and select a train first.");
      return;
    }

    const trainStart = selectedTrainObj.route[0];
    const trainEnd = selectedTrainObj.route[selectedTrainObj.route.length - 1];
    onStartJourney(trainStart, trainEnd, selectedTrainObj.number);
  };

  const hasOutbound = availableTrains?.outbound?.length > 0;
  const hasReturn = availableTrains?.returnTrains?.length > 0;

  return (
    <div className="panel-card">
      <div className="panel-card-title">
        <Play size={16} className="logo-icon" />
        Journey Configuration
      </div>

      {activeJourneyId ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              padding: "10px 12px",
              backgroundColor: "rgba(6, 182, 212, 0.05)",
              border: "1px solid rgba(6, 182, 212, 0.2)",
              borderRadius: "8px",
              fontSize: "0.85rem",
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: "var(--color-cyan)", fontWeight: 700 }}>
              Tracking System Active
            </span>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "4px" }}>
              Journey ID: <code style={{ color: "#fff" }}>{activeJourneyId}</code>
            </div>
          </div>
          <button onClick={onResetJourney} className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
            <RotateCcw size={15} />
            Reset Platform
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Tab Selection */}
          <div
            style={{
              display: "flex",
              backgroundColor: "var(--bg-secondary)",
              padding: "4px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
            }}
          >
            <button
              onClick={() => {
                setSearchMode("route");
                setError(null);
              }}
              style={{
                flex: 1,
                padding: "6px",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: searchMode === "route" ? "var(--bg-tertiary)" : "transparent",
                color: searchMode === "route" ? "var(--color-cyan)" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              Search by Route
            </button>
            <button
              onClick={() => {
                setSearchMode("train");
                setError(null);
              }}
              style={{
                flex: 1,
                padding: "6px",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: searchMode === "train" ? "var(--bg-tertiary)" : "transparent",
                color: searchMode === "train" ? "var(--color-cyan)" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              Search by Train
            </button>
          </div>

          {searchMode === "route" ? (
            /* Search by Route form */
            <form onSubmit={handleRouteSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <SearchableSelect
                id="start-station-input"
                label="Origin Station"
                placeholder="Type starting station..."
                options={stations}
                value={start}
                onChange={setStart}
                disabled={isLoading}
              />

              <SearchableSelect
                id="end-station-input"
                label="Destination Station"
                placeholder="Type destination..."
                options={stations}
                value={end}
                onChange={setEnd}
                disabled={isLoading}
              />

              {/* List of Available Trains on Route (Outbound & Return) */}
              {start && end && start !== end && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                  
                  {/* OUTBOUND SECTION */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span className="form-label" style={{ fontSize: "0.68rem", color: "var(--color-cyan)" }}>
                      Outbound Trains ({start} ➔ {end})
                    </span>
                    {hasOutbound ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {availableTrains.outbound.map((train) => (
                          <div
                            key={train.number}
                            onClick={() => {
                              setSelectedTrain(train.number);
                              setSelectedDirection("outbound");
                            }}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              border: "1px solid",
                              borderColor: selectedTrain === train.number && selectedDirection === "outbound" ? "var(--color-cyan)" : "transparent",
                              backgroundColor: selectedTrain === train.number && selectedDirection === "outbound" ? "rgba(6, 182, 212, 0.05)" : "var(--bg-tertiary)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              transition: "all 0.15s"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: selectedTrain === train.number && selectedDirection === "outbound" ? "var(--color-cyan)" : "#fff" }}>
                                {train.number} - {train.name}
                              </span>
                              <span style={{ fontSize: "0.68rem", backgroundColor: "rgba(255,255,255,0.06)", padding: "2px 5px", borderRadius: "4px", color: "var(--text-secondary)" }}>
                                {train.type}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)" }}>
                              <span>Departs: <strong>{train.departure_time}</strong></span>
                              <span>Speed: {train.base_speed} km/h</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "8px", border: "1px dashed var(--border-color)", borderRadius: "6px", textAlign: "center" }}>
                        No outbound runs scheduled.
                      </div>
                    )}
                  </div>

                  {/* RETURN SECTION (Vice Versa) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span className="form-label" style={{ fontSize: "0.68rem", color: "var(--color-success)" }}>
                      Return Trains ({end} ➔ {start})
                    </span>
                    {hasReturn ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {availableTrains.returnTrains.map((train) => (
                          <div
                            key={train.number}
                            onClick={() => {
                              setSelectedTrain(train.number);
                              setSelectedDirection("return");
                            }}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              border: "1px solid",
                              borderColor: selectedTrain === train.number && selectedDirection === "return" ? "var(--color-success)" : "transparent",
                              backgroundColor: selectedTrain === train.number && selectedDirection === "return" ? "rgba(16, 185, 129, 0.05)" : "var(--bg-tertiary)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              transition: "all 0.15s"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: selectedTrain === train.number && selectedDirection === "return" ? "var(--color-success)" : "#fff" }}>
                                {train.number} - {train.name}
                              </span>
                              <span style={{ fontSize: "0.68rem", backgroundColor: "rgba(255,255,255,0.06)", padding: "2px 5px", borderRadius: "4px", color: "var(--text-secondary)" }}>
                                {train.type}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)" }}>
                              <span>Departs: <strong>{train.departure_time}</strong></span>
                              <span>Speed: {train.base_speed} km/h</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "8px", border: "1px dashed var(--border-color)", borderRadius: "6px", textAlign: "center" }}>
                        No return runs scheduled.
                      </div>
                    )}
                  </div>
                  
                </div>
              )}

              {error && (
                <div style={{ display: "flex", gap: "6px", alignItems: "center", color: "var(--color-danger)", fontSize: "0.75rem" }}>
                  <AlertTriangle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !selectedTrain}
                style={{ opacity: !selectedTrain ? 0.5 : 1 }}
              >
                {isLoading ? "Configuring..." : "Initiate Predictive Tracking"}
              </button>
            </form>
          ) : (
            /* Search by Train form */
            <form onSubmit={handleTrainSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group" style={{ position: "relative" }} ref={trainContainerRef}>
                <label className="form-label" htmlFor="train-number-input">Train Number or Name</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    id="train-number-input"
                    type="text"
                    className="form-select"
                    style={{ width: "100%", paddingRight: "34px" }}
                    placeholder="e.g. 12302 or Gour..."
                    value={trainQuery}
                    onChange={(e) => {
                      setTrainQuery(e.target.value);
                      setIsTrainListOpen(true);
                      setSelectedTrainObj(null);
                    }}
                    onFocus={() => {
                      setIsTrainListOpen(true);
                      setTrainQuery("");
                      setSelectedTrainObj(null);
                    }}
                    autoComplete="off"
                  />
                  <TrainIcon size={15} style={{ position: "absolute", right: "12px", color: "var(--text-muted)", pointerEvents: "none" }} />
                </div>

                {isTrainListOpen && (
                  <ul
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      backgroundColor: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      marginTop: "4px",
                      maxHeight: "160px",
                      overflowY: "auto",
                      zIndex: 1000,
                      listStyle: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)"
                    }}
                  >
                    {filteredTrains.length > 0 ? (
                      filteredTrains.map((train) => (
                        <li
                          key={train.number}
                          onClick={() => handleSelectTrainObj(train)}
                          style={{
                            padding: "10px 14px",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            borderBottom: "1px solid var(--border-color)",
                            transition: "background-color 0.15s",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <div>
                            <strong>{train.number}</strong> - {train.name}
                          </div>
                          <div style={{ color: "var(--color-cyan)", fontSize: "0.72rem" }}>
                            {train.type}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li style={{ padding: "10px 14px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        No matching trains found
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {selectedTrainObj && (
                <div
                  style={{
                    padding: "10px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Scheduled Route:</span>
                    <span style={{ color: "var(--color-cyan)", fontWeight: 700 }}>{selectedTrainObj.type}</span>
                  </div>
                  <div style={{ fontWeight: 600, display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center", lineHeight: 1.3 }}>
                    {selectedTrainObj.route.map((code: string, i: number) => (
                      <React.Fragment key={code}>
                        <span>{code}</span>
                        {i < selectedTrainObj.route.length - 1 && <span style={{ color: "var(--text-muted)" }}>&rarr;</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    <span>Departure Terminus: <strong>{selectedTrainObj.departure_time}</strong></span>
                    <span>Max Speed: {selectedTrainObj.base_speed} km/h</span>
                  </div>
                </div>
              )}

              {error && (
                <div style={{ display: "flex", gap: "6px", alignItems: "center", color: "var(--color-danger)", fontSize: "0.75rem" }}>
                  <AlertTriangle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !selectedTrainObj}
                style={{ opacity: !selectedTrainObj ? 0.5 : 1 }}
              >
                {isLoading ? "Configuring..." : "Initiate Predictive Tracking"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
export default JourneySelector;
