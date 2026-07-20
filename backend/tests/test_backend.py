import unittest
import numpy as np
import sys
import os

# Adjust path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.network import dijkstra, find_trains_for_journey, STATIONS
from app.lstm_engine import LSTMPredictiveEngine

class TestRailSenseBackend(unittest.TestCase):
    def test_routing_dijkstra_er(self):
        # Route Howrah to Rampurhat (HWH -> RPH) should find a path
        result = dijkstra("HWH", "RPH")
        self.assertIsNotNone(result)
        path, time_mins, dist_km = result
        self.assertEqual(path[0], "HWH")
        self.assertEqual(path[-1], "RPH")
        self.assertIn("BWN", path)
        self.assertIn("BHP", path)
        self.assertGreater(time_mins, 0)
        self.assertGreater(dist_km, 0)

        # Route Sealdah to Malda Town (SDAH -> MLDT)
        result_mldt = dijkstra("SDAH", "MLDT")
        self.assertIsNotNone(result_mldt)
        path_mldt, _, _ = result_mldt
        self.assertEqual(path_mldt[0], "SDAH")
        self.assertEqual(path_mldt[-1], "MLDT")

    def test_train_route_matching_bidirectional(self):
        # HWH to RPH should return 13017 (Mayurakshi) outbound and 13018 (Mayurakshi Return) inbound
        result = find_trains_for_journey("HWH", "RPH")
        self.assertIn("outbound", result)
        self.assertIn("return_trains", result)
        
        outbound_trains = result["outbound"]
        return_trains = result["return_trains"]
        
        self.assertGreater(len(outbound_trains), 0)
        self.assertGreater(len(return_trains), 0)
        
        out_numbers = [t["number"] for t in outbound_trains]
        self.assertIn("13017", out_numbers) # Mayurakshi Express Outbound
        
        ret_numbers = [t["number"] for t in return_trains]
        self.assertIn("13018", ret_numbers) # Mayurakshi Express Return
        self.assertNotIn("12301", out_numbers) # Rajdhani goes ASN way

    def test_lstm_forward(self):
        engine = LSTMPredictiveEngine()
        x = np.array([[0.1], [0.2], [0.0], [0.5]])
        h = np.zeros((8, 1))
        c = np.zeros((8, 1))
        
        y_t, h_t, c_t = engine.step(x, h, c)
        
        self.assertEqual(y_t.shape, (1, 1))
        self.assertEqual(h_t.shape, (8, 1))
        self.assertEqual(c_t.shape, (8, 1))
        self.assertGreaterEqual(y_t[0, 0], 0.0)

    def test_lstm_journey_predictions(self):
        engine = LSTMPredictiveEngine()
        
        # Simulate a route from HWH to RPH (3 segments)
        segments = [
            {"source": "HWH", "target": "BWN", "congestion": 0.1},
            {"source": "BWN", "target": "BHP", "congestion": 0.6},
            {"source": "BHP", "target": "RPH", "congestion": 0.2}
        ]
        
        delays_clear, conf_clear = engine.predict_journey(
            initial_delay=0.0,
            segments=segments,
            weather_index=0.0,
            hour=12.0
        )
        
        delays_storm, conf_storm = engine.predict_journey(
            initial_delay=0.0,
            segments=segments,
            weather_index=0.8,
            hour=12.0
        )
        
        self.assertEqual(len(delays_clear), 3)
        self.assertEqual(len(delays_storm), 3)
        self.assertGreater(sum(delays_storm), sum(delays_clear))
        self.assertLess(conf_storm, conf_clear)

if __name__ == '__main__':
    unittest.main()
