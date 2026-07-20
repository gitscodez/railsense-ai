import React from "react";
import { GitCommit, Flame } from "lucide-react";

interface StationAnalytic {
  station_code: string;
  station_name: string;
  platform: string;
  distance_km: number;
  stop_duration: number;
  congestion: number;
  status: "completed" | "active" | "upcoming" | string;
  scheduled_arr: string;
  scheduled_dep: string;
  estimated_arr: string;
  estimated_dep: string;
  delay_mins: number;
  risk_level: "low" | "medium" | "high" | string;
}

interface SegmentAnalyticsProps {
  segmentAnalytics: StationAnalytic[];
  journeyId: string | null;
  onInjectDelay: (segmentIdx: number, delayMins: number) => void;
  isFinished: boolean;
}

export const SegmentAnalytics: React.FC<SegmentAnalyticsProps> = ({
  segmentAnalytics,
  journeyId,
  onInjectDelay,
  isFinished,
}) => {
  return (
    <div className="panel-card">
      <div className="panel-card-title">
        <GitCommit size={16} className="logo-icon" />
        Train Route Timeline
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: "10px" }}>
        {segmentAnalytics.map((seg, idx) => {
          const isCompleted = seg.status === "completed";
          const isActive = seg.status === "active";
          const isDelayed = seg.delay_mins > 0;

          return (
            <div key={idx} style={{ display: "flex", flexDirection: "column" }}>
              {/* Timeline Row */}
              <div style={{ display: "flex", alignItems: "stretch", position: "relative" }}>
                
                {/* Left Column: Scheduled & Estimated Times */}
                <div
                  style={{
                    width: "85px",
                    minWidth: "85px",
                    textAlign: "right",
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: "2px",
                    paddingRight: "8px",
                  }}
                >
                  {/* Arrival Time */}
                  <div>
                    {seg.scheduled_arr !== "--:--" && (
                      isDelayed ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "0.68rem" }}>
                            A: {seg.scheduled_arr}
                          </span>
                          <span style={{ color: "var(--color-danger)", fontWeight: 700, fontSize: "0.75rem" }}>
                            {seg.estimated_arr}
                          </span>
                        </div>
                      ) : (
                        <span>A: {seg.scheduled_arr}</span>
                      )
                    )}
                  </div>

                  {/* Departure Time */}
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {seg.scheduled_dep !== "--:--" && (
                      isDelayed ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "0.65rem" }}>
                            D: {seg.scheduled_dep}
                          </span>
                          <span style={{ color: "var(--color-danger)", fontSize: "0.72rem" }}>
                            {seg.estimated_dep}
                          </span>
                        </div>
                      ) : (
                        <span>D: {seg.scheduled_dep}</span>
                      )
                    )}
                  </div>
                </div>

                {/* Middle Column: Vertical Connectors and Station Node */}
                <div
                  style={{
                    width: "24px",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  {/* Connecting track line to NEXT station */}
                  {idx < segmentAnalytics.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "24px",
                        bottom: "-24px",
                        width: "3px",
                        backgroundColor: isCompleted
                          ? "var(--color-success)"
                          : isActive
                          ? "var(--color-cyan)"
                          : "var(--border-color)",
                        boxShadow: isCompleted
                          ? "0 0 6px rgba(16, 185, 129, 0.2)"
                          : isActive
                          ? "0 0 6px rgba(6, 182, 212, 0.2)"
                          : "none",
                        zIndex: 1,
                      }}
                    />
                  )}

                  {/* Station dot node */}
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: isCompleted
                        ? "var(--color-success)"
                        : isActive
                        ? "var(--color-cyan)"
                        : "var(--bg-tertiary)",
                      border: `2.5px solid ${
                        isCompleted
                          ? "var(--color-success)"
                          : isActive
                          ? "#ffffff"
                          : "var(--text-muted)"
                      }`,
                      zIndex: 2,
                      marginTop: "16px",
                      boxShadow: isCompleted
                        ? "var(--shadow-neon-green)"
                        : isActive
                        ? "var(--shadow-neon-cyan)"
                        : "none",
                      outline: isActive ? "3px solid rgba(6, 182, 212, 0.2)" : "none",
                    }}
                  />
                </div>

                {/* Right Column: Station details, platforms, and distance milestones */}
                <div
                  style={{
                    flex: 1,
                    padding: "10px 0 10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: isActive ? "var(--color-cyan)" : isCompleted ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      {seg.station_name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "1px 5px",
                        borderRadius: "4px",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      {seg.platform}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    <span>{seg.distance_km} km milestone</span>
                    {seg.stop_duration > 0 ? (
                      <span>Stop: {seg.stop_duration}m</span>
                    ) : (
                      <span>Terminus</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Delay Injector (displayed under the active/upcoming segments to inject delays on the track leading to this station) */}
              {journeyId && !isFinished && idx > 0 && (seg.status === "active" || seg.status === "upcoming") && (
                <div
                  style={{
                    marginLeft: "109px",
                    marginRight: "0px",
                    marginBottom: "12px",
                    marginTop: "-4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "rgba(239, 68, 68, 0.03)",
                    border: "1px dashed rgba(239, 68, 68, 0.25)",
                    borderRadius: "6px",
                    padding: "5px 8px",
                  }}
                >
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Flame size={12} className="warning" /> Track delay ahead:
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => onInjectDelay(idx - 1, 10)}
                      className="btn-secondary btn-small"
                      style={{ padding: "1px 5px", fontSize: "0.65rem", height: "18px", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      +10m
                    </button>
                    <button
                      onClick={() => onInjectDelay(idx - 1, 20)}
                      className="btn-secondary btn-small"
                      style={{ padding: "1px 5px", fontSize: "0.65rem", height: "18px", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      +20m
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default SegmentAnalytics;
