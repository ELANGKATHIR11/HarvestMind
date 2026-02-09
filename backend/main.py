from fastapi import FastAPI, HTTPException, Request, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import json
import shutil
import subprocess
from pathlib import Path
from models import *
from vector_store import db
from gemini_client import gemini

app = FastAPI(
    title="HarvestMind Backend",
    description="VRAG & Edge Inference Orchestrator",
    version="1.0.0"
)

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config for Data
DATA_WORKSPACE = Path("workspace/data/raw")
DATA_WORKSPACE.mkdir(parents=True, exist_ok=True)

@app.get("/health")
def health_check():
    return {"status": "ok", "gemini_configured": True}

@app.post("/ingest/embedding")
def ingest_embedding(data: EmbeddingIngest):
    """
    Ingest a vector embedding from the Edge device into the cloud store.
    """
    success = db.upsert(data.embedding, data.metadata)
    return {"status": "ingested", "id": data.metadata.get("id", "unknown")}

@app.post("/alerts/sensor")
def check_sensors(snapshot: List[SensorSnapshot]):
    """
    Simple isolation forest stub (rule-based for prototype).
    """
    alerts = []
    severity = "none"
    
    for s in snapshot:
        if s.type == "moisture" and s.value < 30:
            alerts.append(f"Low moisture detected: {s.value}{s.unit}")
            severity = "high"
        elif s.type == "temp" and s.value > 35:
            alerts.append(f"High temp detected: {s.value}{s.unit}")
            severity = "medium"

    return AlertResponse(
        alert=len(alerts) > 0,
        severity=severity,
        details="; ".join(alerts) if alerts else "Nominal"
    )

@app.post("/vrag/query")
def vrag_query(query: VRAGQuery):
    """
    Full Orchestration:
    1. Retrieve similar historical cases (Vectors)
    2. Aggregate Sensor Snapshot
    3. Ask Gemini (Doctor)
    """
    # 1. Mock embedding for query (in real app, we'd embed the query text/image)
    # For prototype, we use a random vector or 0-vector just to trigger the store
    mock_query_vec = [0.1] * 128 
    
    hits = db.query(mock_query_vec, k=3)
    
    # 2. Assemble Context
    sensor_context = ", ".join([f"{s.type}={s.value}{s.unit}" for s in query.sensor_snapshot])
    vector_context = json.dumps(hits, indent=2)
    
    full_context = f"""
    Current Sensors: {sensor_context}
    
    Similar Historical Cases:
    {vector_context}
    """
    
    # 3. Call Gemini
    report = gemini.generate_doctor_report(full_context, query.query_text)
    
    return report

# --- TRAINING ENDPOINTS ---

@app.post("/train/upload")
async def upload_dataset_files(files: List[UploadFile] = File(...)):
    """
    Receives files from a folder upload.
    Files are saved preserving their relative path if possible, or using filename.
    Expects filenames like 'healthy/img1.jpg' or just 'img1.jpg'.
    """
    count = 0
    for file in files:
        if not file.filename:
            continue
            
        # Security/Sanitization would go here.
        # file.filename coming from webkitRelativePath usually contains folders.
        # e.g. "dataset/healthy/img.jpg"
        
        # We try to extract the class name from the folder structure
        # Expected structure: root/class/image.ext
        file_path = DATA_WORKSPACE / file.filename
        
        # Ensure directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        count += 1
        
    return {"status": "uploaded", "files_processed": count}

def run_training_subprocess(mining_mode=False):
    """
    Executes the training script as a separate process.
    """
    print("Background Task: Starting Training Pipeline...")
    try:
        # Assuming ml/run_experiment.py is at ../ml/run_experiment.py relative to backend/
        # Adjust working directory to the 'ml' folder so it finds its modules
        ml_dir = Path("../ml").resolve()
        script_path = ml_dir / "run_experiment.py"
        
        if not script_path.exists():
            print(f"Error: Script not found at {script_path}")
            return

        cmd = ["python", "run_experiment.py"]
        # If mining mode is requested, we can pass an env var or arg, 
        # but since data_manager handles empty folders by mining automatically,
        # we just need to run it.
        
        subprocess.Popen(
            cmd, 
            cwd=str(ml_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print("Background Task: Training subprocess launched.")
    except Exception as e:
        print(f"Failed to launch training: {e}")

@app.post("/train/mine")
async def trigger_mining_and_training(background_tasks: BackgroundTasks):
    """
    Triggers web mining followed by training.
    """
    # Simply triggering the script will invoke prepare_data which now mines automatically if needed.
    # To force mining, one might need to clear the directory, but for MVP we assume additive or initial.
    background_tasks.add_task(run_training_subprocess, mining_mode=True)
    return {"status": "mining_started", "message": "Mining dataset from web & training initiated."}

@app.post("/train/start")
async def start_training(background_tasks: BackgroundTasks):
    """
    Triggers the ML training pipeline in the background.
    """
    background_tasks.add_task(run_training_subprocess)
    return {"status": "started", "job_id": f"job-{os.urandom(4).hex()}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)