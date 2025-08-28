import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
from sklearn.exceptions import InconsistentVersionWarning

# -------------------------------
# Suppress scikit-learn version warnings (optional)
# -------------------------------
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)

# -------------------------------
# Load model, scaler, and test data
# -------------------------------
knn_model = joblib.load("knn_model.pkl")
scaler = joblib.load("scaler.pkl")
X_test_scaled = joblib.load("X_test.pkl")  # Scaled features of test set
y_test = joblib.load("y_test.pkl")         # Targets of test set

# Compute metrics dynamically on test set
y_pred_test = knn_model.predict(X_test_scaled)
mae_test = mean_absolute_error(y_test, y_pred_test)
rmse_test = np.sqrt(mean_squared_error(y_test, y_pred_test))
r2_test = r2_score(y_test, y_pred_test)
corr_test = np.corrcoef(y_test, y_pred_test)[0, 1]

# -------------------------------
# FastAPI app
# -------------------------------
app = FastAPI(title="Concrete Strength Predictor API")

# -------------------------------
# CORS configuration using env variable
# -------------------------------
frontend_urls = os.getenv(
    "FRONTEND_URLS",
    "http://localhost:3000,http://127.0.0.1:3000"
)
origins = [url.strip() for url in frontend_urls.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# Input features
# -------------------------------
class Features(BaseModel):
    cement: float
    slag: float
    flyash: float
    water: float
    superplasticizer: float
    coarseagg: float
    fineagg: float
    age: float

# -------------------------------
# Prediction endpoint
# -------------------------------
@app.post("/predict")
def predict(features: Features, model: str = "KNN"):
    x = np.array([[features.cement, features.slag, features.flyash,
                   features.water, features.superplasticizer,
                   features.coarseagg, features.fineagg, features.age]])
    
    x_scaled = scaler.transform(x)

    if model == "KNN":
        prediction = knn_model.predict(x_scaled)
    else:
        return {"error": f"Model {model} not implemented yet."}

    return {"predicted_strength": float(prediction[0])}

# -------------------------------
# Model metrics endpoint
# -------------------------------
@app.get("/model-metrics")
def model_metrics(model: str = Query("KNN", description="Model name")):
    if model == "KNN":
        return {
            "mae": float(mae_test),
            "rmse": float(rmse_test),
            "r2": float(r2_test),
            "correlation": float(corr_test),
            "description": "KNN predicts the output based on nearest neighbors in the training data."
        }
    else:
        return {"error": f"Metrics for model {model} not implemented yet."}

# -------------------------------
# Root endpoint
# -------------------------------
@app.get("/")
def root():
    return {"message": "Welcome to Concrete Strength Prediction API"}
