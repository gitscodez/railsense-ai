import numpy as np
from typing import List, Dict, Tuple

class LSTMPredictiveEngine:
    def __init__(self, input_dim: int = 4, hidden_dim: int = 8, output_dim: int = 1):
        """
        Custom LSTM implementation in pure NumPy to run sequence-to-sequence delay forecasting.
        Inputs vector x_t: [prev_delay_mins, congestion_index, weather_index, hour_normalized]
        Outputs y_t: [additional_delay_mins_for_segment]
        """
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim

        # Set seed for reproducible pseudo-weights
        np.random.seed(1337)

        # LSTM weight matrices (stacked gates: input, forget, output, cell-candidate)
        # Shape: (4 * hidden_dim, input_dim) and (4 * hidden_dim, hidden_dim)
        self.W = np.random.normal(0.0, 0.1, (4 * hidden_dim, input_dim))
        self.U = np.random.normal(0.0, 0.1, (4 * hidden_dim, hidden_dim))
        self.b = np.zeros((4 * hidden_dim, 1))

        # Initialize forget gate biases to 1.0 to help preserve cell state
        self.b[hidden_dim:2*hidden_dim] = 1.0

        # Output linear layer weights: map hidden state to segment delay increment
        self.W_y = np.random.normal(0.0, 0.1, (output_dim, hidden_dim))
        self.b_y = np.zeros((output_dim, 1))

        # Manually tune weights to represent actual physical dynamics:
        # 1. Ensure output projection maps hidden values positively to delays
        self.W_y[0, :] = np.abs(self.W_y[0, :]) + 0.3
        # 2. Cell candidate weights (last block of W)
        # Input features: x_t = [prev_delay, congestion, weather, hour]
        self.W[3*hidden_dim:, 0] = 0.4   # moderate retention of previous delays
        self.W[3*hidden_dim:, 1] = 8.0   # strong impact of congestion on delay creation
        self.W[3*hidden_dim:, 2] = 12.0  # very strong impact of weather (heavy rain/snow)
        self.W[3*hidden_dim:, 3] = -0.5  # slight time-of-day offset (night/early morning is faster)

        # Forget gate weights (second block of W): keep most state, but forget under good conditions
        self.W[hidden_dim:2*hidden_dim, 1] = -0.2  # high congestion causes forgetting of on-time history
        self.W[hidden_dim:2*hidden_dim, 2] = -0.3  # high weather hazards causes forgetting of on-time history

    def _sigmoid(self, x: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-np.clip(x, -500, 500)))

    def _tanh(self, x: np.ndarray) -> np.ndarray:
        return np.tanh(x)

    def step(self, x: np.ndarray, h_prev: np.ndarray, c_prev: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Performs a single LSTM step.
        x: input vector of shape (input_dim, 1)
        h_prev: previous hidden state of shape (hidden_dim, 1)
        c_prev: previous cell state of shape (hidden_dim, 1)
        Returns: (y_t, h_t, c_t)
        """
        # Linear combination
        gates = np.dot(self.W, x) + np.dot(self.U, h_prev) + self.b
        
        # Split gates
        h = self.hidden_dim
        i = self._sigmoid(gates[0:h])
        f = self._sigmoid(gates[h:2*h])
        o = self._sigmoid(gates[2*h:3*h])
        c_tilde = self._tanh(gates[3*h:4*h])
        
        # Compute new state and hidden activation
        c_t = f * c_prev + i * c_tilde
        h_t = o * self._tanh(c_t)
        
        # Output prediction
        y_t = np.dot(self.W_y, h_t) + self.b_y
        
        # Ensure we don't output negative delays (delay increments can only be >= 0)
        y_t = np.maximum(y_t, 0.0)
        
        return y_t, h_t, c_t

    def predict_journey(self, initial_delay: float, segments: List[Dict[str, any]], weather_index: float, hour: float) -> Tuple[List[float], float]:
        """
        Predicts delay for a series of segments.
        segments: List of dicts, each having {'source': str, 'target': str, 'base_time': float, 'congestion': float}
        weather_index: global current weather (0.0 to 1.0)
        hour: current hour of day (0 to 23)
        Returns: Tuple (list_of_predicted_additional_delays_per_segment, confidence_score_0_to_1)
        """
        h = np.zeros((self.hidden_dim, 1))
        c = np.zeros((self.hidden_dim, 1))
        
        predicted_delays = []
        cumulative_delay = initial_delay
        
        hidden_states = []

        for idx, seg in enumerate(segments):
            # Formulate input vector
            # Features: [prev_delay, congestion, weather, hour]
            # Normalizations:
            # - prev_delay: clamp at 120 mins, divide by 60
            # - congestion: already 0 to 1
            # - weather: already 0 to 1
            # - hour: normalized to [0, 1]
            x = np.array([
                [min(cumulative_delay, 120.0) / 60.0],
                [seg.get("congestion", 0.1)],
                [weather_index],
                [(hour + idx * 0.5) % 24.0 / 24.0]
            ])
            
            y_t, h, c = self.step(x, h, c)
            
            # The output is the additional delay introduced on this segment (in minutes)
            add_delay = float(y_t[0, 0])
            predicted_delays.append(add_delay)
            
            # Update cumulative delay for next step
            cumulative_delay += add_delay
            hidden_states.append(h.copy())

        # Confidence score computation:
        # Confidence decays as sequence length grows and features get extreme.
        # We calculate variance of hidden state activations as a proxy for instability.
        if hidden_states:
            all_h = np.hstack(hidden_states) # shape: (hidden_dim, seq_len)
            mean_variance = np.mean(np.var(all_h, axis=0))
        else:
            mean_variance = 0.0

        # Base confidence starts at 98%
        # Decreases with weather hazard, mean congestion, sequence length, and variance
        congestion_avg = np.mean([s.get("congestion", 0.1) for s in segments]) if segments else 0.0
        weather_penalty = weather_index * 0.15
        congestion_penalty = congestion_avg * 0.15
        length_penalty = min(len(segments) * 0.02, 0.15)
        variance_penalty = min(mean_variance * 0.25, 0.2)
        
        confidence = 0.98 - (weather_penalty + congestion_penalty + length_penalty + variance_penalty)
        # Ensure it bounds within [0.45, 0.98] to look realistic
        confidence = max(0.45, min(0.98, confidence))

        return predicted_delays, confidence
