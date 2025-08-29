import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

interface FormData {
  cement: string;
  slag: string;
  flyash: string;
  water: string;
  superplasticizer: string;
  coarseagg: string;
  fineagg: string;
  age: string;
}

type ModelType = "KNN";

interface MetricsResponse {
  mae: number;
  rmse: number;
  r2: number;
  correlation: number;
  description: string;
}

interface PredictionResponse {
  predicted_strength: number;
}

const units: Record<keyof FormData, string> = {
  cement: "kg/m³",
  slag: "kg/m³",
  flyash: "kg/m³",
  water: "kg/m³",
  superplasticizer: "kg/m³",
  coarseagg: "kg/m³",
  fineagg: "kg/m³",
  age: "days"
};

const labels: Record<keyof FormData, string> = {
  cement: "Cement",
  slag: "Blast Furnace Slag",
  flyash: "Fly Ash",
  water: "Water",
  superplasticizer: "Superplasticizer",
  coarseagg: "Coarse Aggregate",
  fineagg: "Fine Aggregate",
  age: "Age"
};

const models: { value: ModelType; label: string }[] = [
  { value: "KNN", label: "KNN" },
];

function App() {
  const [formData, setFormData] = useState<FormData>({
    cement: "", slag: "", flyash: "", water: "", superplasticizer: "",
    coarseagg: "", fineagg: "", age: ""
  });

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [model, setModel] = useState<ModelType>("KNN");
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    setWaiting(true);
    setError(false);
    setErrorMessage(null);

    try {
      const response = await fetch(`${backendUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, model }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        setError(true);
        setErrorMessage(errText || `HTTP ${response.status}`);
        setWaiting(false);
        return;
      }

      const data = await response.json();

      if ("error" in data) {
        setError(true);
        setErrorMessage(data.error);
        setPrediction(null);
        setWaiting(false);
      } else {
        setPrediction({
          predicted_strength: parseFloat(data.predicted_strength.toFixed(2))
        });
        setWaiting(false);
      }
    } catch (err) {
      console.error(err);
      setError(true);
      setWaiting(false);
    }
  };

  const handleInfo = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    setWaiting(true);
    setError(false);
    setErrorMessage(null);

    try {
      const response = await fetch(`${backendUrl}/model-metrics?model=${model}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        setError(true);
        setErrorMessage(errText || `HTTP ${response.status}`);
        setWaiting(false);
        return;
      }

      const data = await response.json();

      if ("error" in data) {
        setError(true);
        setErrorMessage(data.error);
        setMetrics(null);
        setWaiting(false);
      } else {
        setMetrics({
          mae: parseFloat(data.mae.toFixed(2)),
          rmse: parseFloat(data.rmse.toFixed(2)),
          r2: parseFloat(data.r2.toFixed(2)),
          correlation: parseFloat(data.correlation.toFixed(2)),
          description: data.description
        });
        setWaiting(false);
      }
    } catch (error) {
      console.error(error);
      setError(true);
      setWaiting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Concrete Compressive Strength Predictor</h2>

        <div className="flex items-center mb-5 justify-between">
          <div className="flex items-center space-x-2">
            <label className="font-medium">ML Model:</label>
            <select
              className="border rounded px-2 py-1"
              value={model}
              onChange={(e) => setModel(e.target.value as ModelType)}
            >
              {models.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleInfo}
            className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
          >
            Info
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {Object.keys(formData).map((key) => (
            <div key={key} className="flex flex-col">
              <label className="mb-1 font-medium">
                {labels[key as keyof FormData]} ({units[key as keyof FormData]})
              </label>
              <input
                type="number"
                name={key}
                value={(formData as any)[key]}
                onChange={handleChange}
                min={0}
                step={key === "age" ? 1 : "any"}
                required
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          ))}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Predict
          </button>
        </form>

        {prediction !== null && (
          <h3 className="mt-5 text-center text-xl font-semibold text-gray-700">
            Predicted Strength: {prediction.predicted_strength.toFixed(2)} MPa
          </h3>
        )}
      </div>

      {metrics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-3">{model} Model Info</h3>
            <p className="mb-2">{metrics.description}</p>
            <ul className="list-disc pl-5 mb-3">
              <li>MAE: {metrics.mae.toFixed(2)}</li>
              <li>RMSE: {metrics.rmse.toFixed(2)}</li>
              <li>R²: {metrics.r2.toFixed(2)}</li>
              <li>Correlation (r): {metrics.correlation.toFixed(2)}</li>
            </ul>
            <button
              className="mt-2 bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
              onClick={() => setMetrics(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {waiting && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center">
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2 flex items-center justify-center space-x-2">
              <span>Please wait </span>
              <div className="w-6 h-6 rounded-full border-4 border-t-transparent animate-spin bg-gradient-to-r from-blue-500 to-purple-500"></div>
            </h3>
            <p>
              Server might be spinning up{" "}
              {["⚡", "⏳", "💤", "🚀", "☕"][Math.floor(Math.random() * 5)]}
            </p>
          </div>
        </div>
      </div>
    )}

    {error && !waiting && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center">
          <h3 className="text-lg font-semibold mb-2 text-red-600">
            {errorMessage ?? "No Response"}
          </h3>
          <p className="mb-4">
            {errorMessage ? "" : "Please try again later!"}
          </p>
          <button
            className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
            onClick={() => {
              setWaiting(false);
              setError(false);
              setErrorMessage(null);
            }}
          >
            OK
          </button>
        </div>
      </div>
    )}
  </div>
  );
}

export default App;
