import React from "react";
import { BarChart3, Train } from "lucide-react";

interface MetricsPanelProps {
  trainNumber: string;
  trainName: string;
  trainType: string;
  confidenceScore: number;       // 0.0 to 1.0
  totalBaseTime: number;         // Scheduled travel mins
  recalibratedTotalTime: number; // Actual/predicted travel mins
  accumulatedDelay: number;      // Mins delay so far
  predictedRemainingDelay: number; // Downstream LSTM delay
  speedKmh: number;
  lat: number;
  lon: number;
  liveStatusMessage?: string;    // Human-readable location description
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  trainNumber,
  trainName,
  trainType,
  confidenceScore,
  totalBaseTime,
  recalibratedTotalTime,
  accumulatedDelay,
  predictedRemainingDelay,
  speedKmh,
  lat,
  lon,
  liveStatusMessage,
}) => {
  // Radial calculations for SVG gauge
  const confidencePercent = Math.round(confidenceScore * 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidencePercent / 100) * circumference;

  // Format time (e.g. 95 -> 1h 35m)
  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const delayTotal = accumulatedDelay + predictedRemainingDelay;

  return (
    <div className="panel-card">
      <div className="panel-card-title">
        <BarChart3 size={16} className="logo-icon" />
        Logistics & AI Forecasts
      </div>

      {/* Train Info Header */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px"
        }}
      >
        <Train size={18} className="logo-icon" />
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>
            {trainNumber} - {trainName}
          </span>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Class: <strong>{trainType}</strong>
          </span>
        </div>
      </div>

      {/* Live Status Message Alert Strip (WIMT style) */}
      {liveStatusMessage && (
        <div 
          style={{
            padding: "10px 12px",
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            borderLeft: "4px solid var(--color-success)",
            borderRadius: "0 8px 8px 0",
            fontSize: "0.82rem",
            fontWeight: 600,
            lineHeight: 1.45,
            color: "var(--color-success)",
            textShadow: "0 0 6px rgba(16, 185, 129, 0.2)"
          }}
        >
          {liveStatusMessage}
        </div>
      )}

      {/* AI Confidence radial gauge */}
      <div
        className="metric-box"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: "16px",
          gridColumn: "span 2",
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.03) 0%, rgba(26, 26, 34, 0.5) 100%)",
        }}
      >
        <div className="confidence-gauge-container">
          <svg className="radial-svg" width="72" height="72">
            <circle className="radial-track" cx="36" cy="36" r={radius} />
            <circle
              className="radial-fill"
              cx="36"
              cy="36"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="confidence-text-container">
            <div className="confidence-percentage">{confidencePercent}%</div>
            <div className="confidence-description">
              AI Confidence Score<br />
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                {confidencePercent > 80
                  ? "High data stability"
                  : confidencePercent > 60
                  ? "Moderate routing fluctuations"
                  : "Elevated risk uncertainty"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        {/* Dynamic ETA */}
        <div className="metric-box">
          <div className="metric-label">Recalibrated ETA</div>
          <div className="metric-value cyan">
            {formatMins(recalibratedTotalTime)}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
            Sched: {formatMins(totalBaseTime)}
          </div>
        </div>

        {/* Total Delay */}
        <div className="metric-box">
          <div className="metric-label">Forecasted Delay</div>
          <div className={`metric-value ${delayTotal > 15 ? "danger" : delayTotal > 5 ? "warning" : ""}`}>
            +{formatMins(delayTotal)}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "flex", gap: "4px" }}>
            <span>Act: +{Math.round(accumulatedDelay)}m</span>
            <span>|</span>
            <span>Pred: +{Math.round(predictedRemainingDelay)}m</span>
          </div>
        </div>

        {/* Speed (km/h) */}
        <div className="metric-box">
          <div className="metric-label">Live Speed</div>
          <div className="metric-value">
            {speedKmh} <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>km/h</span>
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
            Indian Railways route
          </div>
        </div>

        {/* GPS Coordinates */}
        <div className="metric-box">
          <div className="metric-label">Live GPS Coordinate</div>
          <div className="metric-value" style={{ fontSize: "0.85rem", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2px" }}>
            <div>Lat: {lat.toFixed(4)}</div>
            <div>Lon: {lon.toFixed(4)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default MetricsPanel;
