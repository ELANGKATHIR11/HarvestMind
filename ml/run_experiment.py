import torch
from train_pipeline import run_training_job
from vrag_engine import VRAGSystem
from data_manager import prepare_data
import json
from pathlib import Path
from sklearn.ensemble import IsolationForest
import numpy as np
import os

def main():
    print("=== HARVESTMIND ML PIPELINE STARTED ===")
    
    # User specified dataset path
    user_dataset_path = "F:/diseases"
    active_dataset_path = None
    
    if os.path.exists(user_dataset_path):
        print(f"!!! FOUND USER DATASET AT: {user_dataset_path} !!!")
        active_dataset_path = user_dataset_path
    else:
        print(f"User dataset not found at {user_dataset_path}. Using synthetic data.")

    # 1. Train Models
    print("\nSTEP 1: Training Models...")
    # Pass the detected path to training job
    triplet_model, vit_model, classes = run_training_job(dataset_path=active_dataset_path)
    
    # 2. Train Isolation Forest (Anomaly Detection)
    print("\nSTEP 2: Training Anomaly Detector...")
    # Synthetic sensor logs: [moisture, temp, humidity]
    # Normal data: Moisture 30-60%, Temp 20-30C
    X_train = np.random.normal(loc=[45, 25, 60], scale=[5, 2, 5], size=(1000, 3))
    iso_forest = IsolationForest(contamination=0.01)
    iso_forest.fit(X_train)
    # Save (mock pickle)
    print("Isolation Forest trained and ready.")

    # 3. Initialize VRAG
    print("\nSTEP 3: Initializing VRAG System...")
    # Reload data to index it (pass the same path!)
    use_synth = (active_dataset_path is None)
    train_ds, val_ds, _ = prepare_data(custom_path=active_dataset_path, use_synthetic=use_synth)
    
    vrag = VRAGSystem("workspace/models/triplet_encoder.pt", classes)
    vrag.index_dataset(train_ds)
    
    # 4. End-to-End Demo
    print("\nSTEP 4: Running Inference Demo...")
    
    if len(val_ds) > 0:
        # Pick a random validation image
        demo_img, demo_label_idx = val_ds[0]
        true_label = classes[demo_label_idx]
        
        # Visual Classification
        with torch.no_grad():
            logits = vit_model(demo_img.unsqueeze(0).to(vrag.device))
            pred_idx = torch.argmax(logits).item()
            pred_label = classes[pred_idx]
            
        print(f"Image True Label: {true_label}")
        print(f"Model Prediction: {pred_label}")
        
        # Anomaly Check
        sensor_snapshot = [42.0, 26.5, 62.0] # Normal data
        anomaly_score = iso_forest.decision_function([sensor_snapshot])[0]
        is_anomaly = anomaly_score < 0
        print(f"Sensor Check: {'Anomaly' if is_anomaly else 'Normal'}")
        
        # VRAG Call
        print("Querying Gemini for Doctor's Report...")
        report = vrag.generate_report(demo_img, sensor_snapshot, pred_label)
        
        print("\n=== DOCTOR'S REPORT ===")
        print(json.dumps(report, indent=2))
        
        # Save Report
        Path("workspace/reports").mkdir(parents=True, exist_ok=True)
        with open("workspace/reports/evaluation.md", "w") as f:
            f.write("# HarvestMind Evaluation\n")
            f.write(f"## Visual Classifier\nPredicted: {pred_label} (True: {true_label})\n")
            f.write("## Doctor's Report\n")
            f.write(f"```json\n{json.dumps(report, indent=2)}\n```")
            
        print("\nPipeline Complete. Artifacts in workspace/")
    else:
        print("Validation dataset empty. Skipping inference demo.")

if __name__ == "__main__":
    main()