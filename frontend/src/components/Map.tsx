import React, { useEffect, useRef } from "react";
import L from "leaflet";

interface Station {
  name: string;
  lat: number;
  lon: number;
}

interface Link {
  source: string;
  target: string;
  base_time: number;
  distance: number;
}

interface SegmentAnalytic {
  source: string;
  target: string;
  status: string;
  risk_level: string;
}

interface MapProps {
  stations: Record<string, Station>;
  links: Link[];
  path: string[];
  currentLat: number;
  currentLon: number;
  segmentAnalytics: SegmentAnalytic[];
  isFinished: boolean;
}

export const Map: React.FC<MapProps> = ({
  stations,
  links,
  path,
  currentLat,
  currentLon,
  segmentAnalytics,
  isFinished,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const trainMarkerRef = useRef<L.Marker | null>(null);
  const pathPolylinesRef = useRef<L.Polyline[]>([]);
  const networkLinesRef = useRef<L.Polyline[]>([]);
  const stationMarkersRef = useRef<L.CircleMarker[]>([]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center map around Eastern Railway (India) core segment coordinates
    const map = L.map(mapContainerRef.current, {
      center: [23.9, 87.7],
      zoom: 7.5,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add dark OSM tiles (filtered in CSS for neon HUD look)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    // Auto-fit to show all stations at startup
    if (Object.keys(stations).length > 0) {
      const latlngs = Object.values(stations).map((s) => [s.lat, s.lon] as L.LatLngTuple);
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds.pad(0.12));
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [stations]);

  // Draw Static Network with double-layered railway track aesthetics
  useEffect(() => {
    const map = mapRef.current;
    if (!map || Object.keys(stations).length === 0) return;

    // Clear old elements
    networkLinesRef.current.forEach((line) => line.remove());
    networkLinesRef.current = [];
    stationMarkersRef.current.forEach((marker) => marker.remove());
    stationMarkersRef.current = [];

    // 1. Draw Network Connections (realistic railway track styling)
    links.forEach((link) => {
      const src = stations[link.source];
      const tgt = stations[link.target];
      if (src && tgt) {
        // Base track tie layer
        const tieLine = L.polyline(
          [[src.lat, src.lon], [tgt.lat, tgt.lon]],
          {
            color: "rgba(255, 255, 255, 0.05)",
            weight: 5,
            opacity: 0.9,
          }
        ).addTo(map);
        networkLinesRef.current.push(tieLine);

        // Dashed steel track overlay
        const steelLine = L.polyline(
          [[src.lat, src.lon], [tgt.lat, tgt.lon]],
          {
            color: "rgba(255, 255, 255, 0.12)",
            weight: 2,
            opacity: 0.8,
            dashArray: "6, 6",
          }
        ).addTo(map);
        networkLinesRef.current.push(steelLine);
      }
    });

    // 2. Draw Station Nodes
    Object.entries(stations).forEach(([code, station]) => {
      const isHub = ["HWH", "SDAH", "MLDT", "ASN", "JMP"].includes(code);
      
      const marker = L.circleMarker([station.lat, station.lon], {
        radius: isHub ? 6.5 : 4.5,
        fillColor: isHub ? "#06b6d4" : "rgba(30, 41, 59, 0.9)",
        color: isHub ? "#ffffff" : "rgba(6, 182, 212, 0.65)",
        weight: isHub ? 2.5 : 1.8,
        fillOpacity: 1,
      }).addTo(map);

      // Bind HUD style permanent station labels
      marker.bindTooltip(
        `<div style="font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 0.65rem; color: #fff;">
          ${code}
         </div>`,
        {
          direction: "top",
          permanent: true,
          opacity: 0.85,
          offset: [0, -3],
          className: "station-permanent-tooltip"
        }
      );

      // Station detail interactive tooltip
      marker.bindPopup(
        `<div style="font-family: 'Inter', sans-serif; font-size: 11px; line-height: 1.45; padding: 4px;">
          <strong style="color: var(--color-cyan); font-size: 12px;">${station.name}</strong><br/>
          <strong>Station Code:</strong> ${code}<br/>
          <strong>Typical Platform:</strong> ${(station as any).platform || "N/A"}
         </div>`
      );
      
      stationMarkersRef.current.push(marker);
    });
  }, [stations, links]);

  // Draw Active Journey Path and Color-Coded Segments
  useEffect(() => {
    const map = mapRef.current;
    if (!map || Object.keys(stations).length === 0) return;

    // Clear old path polylines
    pathPolylinesRef.current.forEach((poly) => poly.remove());
    pathPolylinesRef.current = [];

    if (path.length === 0) return;

    // Draw active segments using their real-time delay analytics
    segmentAnalytics.forEach((seg) => {
      const src = stations[seg.source];
      const tgt = stations[seg.target];
      if (!src || !tgt) return;

      let color = "#3b82f6";
      let weight = 4.5;
      let opacity = 0.85;

      if (seg.status === "completed") {
        color = "#475569";
        weight = 3.5;
        opacity = 0.55;
      } else if (seg.status === "active") {
        color = "#06b6d4";
        weight = 5.5;
        opacity = 0.95;
      } else if (seg.status === "upcoming") {
        if (seg.risk_level === "high") {
          color = "#ef4444";
          weight = 5.5;
        } else if (seg.risk_level === "medium") {
          color = "#f59e0b";
          weight = 4.5;
        } else {
          color = "#10b981";
          weight = 4.5;
        }
      }

      const polyline = L.polyline(
        [[src.lat, src.lon], [tgt.lat, tgt.lon]],
        {
          color,
          weight,
          opacity,
          lineCap: "round",
        }
      ).addTo(map);

      polyline.bindTooltip(
        `<div style="font-family: 'Inter', sans-serif; font-size: 11px; padding: 2px;">
          <strong>Segment:</strong> ${seg.source} &rarr; ${seg.target}<br/>
          <strong>Status:</strong> ${seg.status}<br/>
          <strong>Risk Analysis:</strong> <span style="color: ${
            seg.risk_level === "high" ? "#ef4444" : seg.risk_level === "medium" ? "#f59e0b" : "#10b981"
          }; font-weight: bold">${seg.risk_level.toUpperCase()}</span>
         </div>`
      );

      pathPolylinesRef.current.push(polyline);
    });

    // Fit map bounds to active path
    if (pathPolylinesRef.current.length > 0) {
      const group = L.featureGroup(pathPolylinesRef.current);
      map.fitBounds(group.getBounds().pad(0.18));
    }
  }, [path, stations, segmentAnalytics]);

  // Update Train Marker GPS Position
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (currentLat === 0 && currentLon === 0) {
      if (trainMarkerRef.current) {
        trainMarkerRef.current.remove();
        trainMarkerRef.current = null;
      }
      return;
    }

    const position: L.LatLngExpression = [currentLat, currentLon];

    if (!trainMarkerRef.current) {
      // Create glowing pulsator train marker
      const trainIcon = L.divIcon({
        className: "custom-train-marker",
        html: `
          <style>
            .train-glow-pulse {
              width: 18px;
              height: 18px;
              background-color: #06b6d4;
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 0 12px #06b6d4, 0 0 24px #06b6d4;
              animation: train-pulse-anim 1.2s infinite alternate;
              transform-origin: center;
            }
            @keyframes train-pulse-anim {
              0% { transform: scale(0.9); box-shadow: 0 0 8px #06b6d4; }
              100% { transform: scale(1.35); box-shadow: 0 0 18px #06b6d4, 0 0 28px #06b6d4; }
            }
          </style>
          <div class="train-glow-pulse"></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      trainMarkerRef.current = L.marker(position, { icon: trainIcon }).addTo(map);
      trainMarkerRef.current.bindTooltip(
        `<div style="font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 800; color: #06b6d4;">
          GPS TRACKING
         </div>`,
        { permanent: true, direction: "right", offset: [12, 0] }
      );
    } else {
      trainMarkerRef.current.setLatLng(position);
    }

    if (!isFinished) {
      map.panTo(position, { animate: true, duration: 1.0 });
    }
  }, [currentLat, currentLon, isFinished]);

  return (
    <div className="map-view-container">
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};
export default Map;
