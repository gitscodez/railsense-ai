import React from "react";
import { ShieldCheck } from "lucide-react";

interface SegmentAnalytic {
  source: string;
  target: string;
  status: string;
  predicted_delay: number;
  risk_level: string;
}

interface DelayEvent {
  segment: string;
  delay: number;
  reason: string;
}

interface ActionableInsightsProps {
  segmentAnalytics: SegmentAnalytic[];
  weatherIndex: number;
  confidenceScore: number;
  delayEvents: DelayEvent[];
  isFinished: boolean;
}

export const ActionableInsights: React.FC<ActionableInsightsProps> = ({
  segmentAnalytics,
  weatherIndex,
  confidenceScore,
  delayEvents,
  isFinished,
}) => {
  // Generate recommendations dynamically based on state
  const getInsights = () => {
    const insights: { type: "info" | "warning" | "danger"; text: string }[] = [];

    if (isFinished) {
      insights.push({
        type: "info",
        text: "Journey completed. AI predictive logging recorded and archived in platform analytics database.",
      });
      return insights;
    }

    // 1. Weather warnings
    if (weatherIndex >= 0.7) {
      insights.push({
        type: "danger",
        text: `Severe weather alert (Index: ${weatherIndex}). Heavy snow/wind restrictions applied. Speeds reduced across the Northeast Corridor.`,
      });
    } else if (weatherIndex >= 0.3) {
      insights.push({
        type: "warning",
        text: `Precipitation tracking active (Index: ${weatherIndex}). Friction delay coefficients modified in LSTM node projections.`,
      });
    }

    // 2. Downstream Bottlenecks (LSTM predictions)
    const bottlenecks = segmentAnalytics.filter(
      (seg) => seg.status === "upcoming" && seg.risk_level === "high"
    );
    const modBottlenecks = segmentAnalytics.filter(
      (seg) => seg.status === "upcoming" && seg.risk_level === "medium"
    );

    bottlenecks.forEach((b) => {
      insights.push({
        type: "danger",
        text: `LSTM predicts major cascading delay (+${Math.round(
          b.predicted_delay
        )}m) on segment ${b.source} ➔ ${b.target}. Alternative recommendation: Consider switching to local commuter shuttle at ${
          b.source
        } to bypass.`,
      });
    });

    modBottlenecks.forEach((b) => {
      insights.push({
        type: "warning",
        text: `Increasing track friction on segment ${b.source} ➔ ${b.target}. ETA recalculated. Ensure connection buffers at ${
          b.target
        } exceed 15 mins.`,
      });
    });

    // 3. Current Live Event Log
    if (delayEvents.length > 0) {
      const latest = delayEvents[delayEvents.length - 1];
      insights.push({
        type: "warning",
        text: `Active Incident: ${latest.reason}`,
      });
    }

    // 4. Base state / High Confidence On-time
    if (insights.length === 0 && confidenceScore > 0.85) {
      insights.push({
        type: "info",
        text: "Optimal route status. Graph weights stable. LSTM predicts high probability of on-time arrival at target station.",
      });
    } else if (insights.length === 0) {
      insights.push({
        type: "info",
        text: "Track speeds nominal. LSTM sequence-to-sequence predictions updated. Keep app open for live coordinate polling.",
      });
    }

    // 5. Low confidence disclaimer
    if (confidenceScore < 0.65 && !isFinished) {
      insights.push({
        type: "warning",
        text: `Low AI Confidence (${Math.round(
          confidenceScore * 100
        )}%). Real-time network anomalies detected. Recalibrating route graph.`,
      });
    }

    return insights.slice(0, 4); // Limit to top 4 insights for UI fit
  };

  const insightsList = getInsights();

  return (
    <div className="panel-card" style={{ flex: 1, minHeight: 0 }}>
      <div className="panel-card-title">
        <ShieldCheck size={16} className="logo-icon" />
        AI Actionable Insights
      </div>

      <div className="insights-feed">
        {insightsList.map((item, index) => (
          <div key={index} className={`insight-item ${item.type}`}>
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
};
export default ActionableInsights;
