import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from models import TripletEmbeddingNet, MoEViT
from data_manager import prepare_data, TripletDataset
import time
from pathlib import Path
import json

# Setup
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODELS_DIR = Path("workspace/models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR = Path("workspace/logs")
LOGS_DIR.mkdir(parents=True, exist_ok=True)

def train_triplet(train_loader, epochs=10):
    print(f"\n--- Training Triplet Network on {DEVICE} ---")
    model = TripletEmbeddingNet().to(DEVICE)
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    # Scheduler: Reduce LR when loss plateaus
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)
    criterion = nn.TripletMarginLoss(margin=1.0)
    
    model.train()
    for epoch in range(epochs):
        total_loss = 0
        for batch_idx, (anchor, pos, neg, _) in enumerate(train_loader):
            anchor, pos, neg = anchor.to(DEVICE), pos.to(DEVICE), neg.to(DEVICE)
            
            optimizer.zero_grad()
            emb_a = model(anchor)
            emb_p = model(pos)
            emb_n = model(neg)
            
            loss = criterion(emb_a, emb_p, emb_n)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            
        scheduler.step()
        print(f"Epoch {epoch+1}/{epochs}, Loss: {total_loss/len(train_loader):.4f}, LR: {scheduler.get_last_lr()[0]:.6f}")
        
    torch.save(model.state_dict(), MODELS_DIR / "triplet_encoder.pt")
    print("Triplet Model Saved.")
    return model

def train_classifier(train_loader, val_loader, num_classes, epochs=15):
    print(f"\n--- Training MoE ViT Classifier on {DEVICE} ---")
    model = MoEViT(num_classes=num_classes).to(DEVICE)
    optimizer = optim.Adam(model.parameters(), lr=0.0005)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)
    criterion = nn.CrossEntropyLoss()
    
    for epoch in range(epochs):
        model.train()
        train_loss = 0
        correct = 0
        total = 0
        
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
        scheduler.step()

        # Validation
        model.eval()
        val_acc = 0
        with torch.no_grad():
            v_correct = 0
            v_total = 0
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                outputs = model(imgs)
                _, predicted = outputs.max(1)
                v_total += labels.size(0)
                v_correct += predicted.eq(labels).sum().item()
            if v_total > 0:
                val_acc = 100. * v_correct / v_total
            
        print(f"Epoch {epoch+1}/{epochs} | Loss: {train_loss/len(train_loader):.3f} | Acc: {100.*correct/total:.2f}% | Val Acc: {val_acc:.2f}% | LR: {scheduler.get_last_lr()[0]:.6f}")
        
    torch.save(model.state_dict(), MODELS_DIR / "moe_vit.pt")
    print("MoE ViT Saved.")
    return model

def export_models(triplet_model, vit_model):
    print("\n--- Exporting Models to TorchScript (Edge Ready) ---")
    dummy_input = torch.randn(1, 3, 224, 224).to(DEVICE)
    
    # Export Triplet
    triplet_model.eval()
    traced_triplet = torch.jit.trace(triplet_model, dummy_input)
    traced_triplet.save(MODELS_DIR / "triplet_encoder_edge.pt")
    
    # Export ViT
    vit_model.eval()
    traced_vit = torch.jit.trace(vit_model, dummy_input)
    traced_vit.save(MODELS_DIR / "moe_vit_edge.pt")
    print("Models exported to workspace/models/")

def run_training_job(dataset_path=None):
    # Pass dataset_path to prepare_data
    # If dataset_path is None, use_synthetic defaults to True in logic below
    use_synth = (dataset_path is None)
    train_ds, val_ds, classes = prepare_data(custom_path=dataset_path, use_synthetic=use_synth)
    
    # Save Manifest
    manifest = {
        "classes": classes,
        "train_samples": len(train_ds),
        "val_samples": len(val_ds),
        "source": dataset_path if dataset_path else "Synthetic/PlantVillage"
    }
    
    DATA_DIR = Path("workspace/data")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    with open(DATA_DIR / "manifest.json", "w") as f:
        json.dump(manifest, f)
        
    # DataLoaders
    # Increase batch size slightly for stability if GPU available, else 16
    batch_size = 32 if torch.cuda.is_available() else 16
    train_loader_cls = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader_cls = DataLoader(val_ds, batch_size=batch_size)
    
    # Triplet Dataset
    triplet_ds = TripletDataset(train_ds)
    train_loader_trip = DataLoader(triplet_ds, batch_size=batch_size, shuffle=True)
    
    # Train
    triplet_model = train_triplet(train_loader_trip, epochs=10) # Embedding training
    vit_model = train_classifier(train_loader_cls, val_loader_cls, len(classes), epochs=15) # Classifier training
    
    # Export
    export_models(triplet_model, vit_model)
    
    return triplet_model, vit_model, classes