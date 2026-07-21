# RailSense AI 🚄🤖

RailSense AI is an intelligent, full-stack rail logistics platform that transforms reactive train tracking into proactive journey management. It integrates real-time GPS coordinates with a backend LSTM-based predictive delay engine to calculate segment-wise analytics, platform availability, and cascading delays before they occur.

The visual dashboard is built with **React** and **Leaflet.js**, mimicking the features of the popular **"Where is my Train"** mobile app.

---

## 🌟 Key Features

* **Timetables & Platforms (WIMT Style):** Displays station-wise scheduled vs. estimated timings. If a train is delayed, scheduled times are crossed out in red, accompanied by typical platform allocations (e.g., `PF 3`) and kilometer milestones.
* **Bidirectional Search (Vice-Versa):** Search for any station combination on the Eastern Railway network to get outbound trains (Origin ➔ Destination) and return trains (Destination ➔ Origin) in separate lists.
* **LSTM Predictive Engine:** Integrates a mock Recurrent Neural Network (RNN) that forecasts downstream delay cascades based on congestion levels, weather metrics, and train type reliability indices.
* **Interactive Leaflet HUD Map:** Visualizes the railway network with styled vector steel tracks. Active segments are color-coded in real-time (Cyan for active, Green for low-risk, Amber/Red for bottlenecks).
* **Robust Client Fallback:** If the backend FastAPI server goes offline, the frontend automatically transitions into **Client Simulation Mode**, running Dijkstra routing and local simulation ticks in the browser.

---

## 🛠️ Technology Stack

* **Frontend:** React, TypeScript, Vite, Leaflet.js, Lucide Icons, Vanilla CSS
* **Backend:** FastAPI, Uvicorn, Python, NumPy, Pydantic

---

## 🚀 Running Locally

### Prerequisites
Make sure you have Node.js and Python 3 installed.

### 1. Launch the Backend API
Run the startup script in the root directory:
```bash
chmod +x start_backend.sh
./start_backend.sh
