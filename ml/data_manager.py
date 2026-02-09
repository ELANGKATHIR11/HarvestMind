import os
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image, ImageDraw, UnidentifiedImageError
import numpy as np
import random
import requests
import zipfile
import io
from pathlib import Path
from duckduckgo_search import DDGS
import time
import shutil

# Config
DATA_DIR = Path("workspace/data")
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"

class HarvestDataset(Dataset):
    """
    Standard dataset for HarvestMind.
    Loads images from a directory structure: root/class_name/image.jpg
    """
    def __init__(self, root_dir=None, samples=None, classes=None, transform=None):
        self.transform = transform
        
        # Mode A: Initialize from directory scanning
        if root_dir:
            self.root_dir = Path(root_dir)
            if not self.root_dir.exists():
                print(f"Error: Dataset directory {self.root_dir} does not exist.")
                self.classes = []
                self.samples = []
                return

            self.classes = sorted([d.name for d in self.root_dir.iterdir() if d.is_dir()])
            self.class_to_idx = {cls_name: i for i, cls_name in enumerate(self.classes)}
            self.samples = []
            
            for cls_name in self.classes:
                cls_dir = self.root_dir / cls_name
                # Support multiple image formats
                for ext in ["*.jpg", "*.jpeg", "*.png", "*.bmp", "*.JPG", "*.JPEG", "*.PNG", "*.webp"]:
                    for img_path in cls_dir.glob(ext):
                        self.samples.append((str(img_path), self.class_to_idx[cls_name]))
                                 
        # Mode B: Initialize from explicit list (e.g. subset)
        elif samples and classes:
             self.samples = samples
             self.classes = classes
             self.class_to_idx = {cls_name: i for i, cls_name in enumerate(self.classes)}
        else:
             self.samples = []
             self.classes = []

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        try:
            image = Image.open(img_path).convert("RGB")
            if self.transform:
                image = self.transform(image)
            return image, label
        except Exception:
            # Fallback for corrupted image in dataset
            print(f"Warning: Corrupt image at {img_path}")
            return torch.zeros(3, 224, 224), label

class TripletDataset(Dataset):
    """
    Produces (anchor, positive, negative) triplets for embedding training.
    """
    def __init__(self, base_dataset):
        self.base_dataset = base_dataset
        self.labels = [s[1] for s in base_dataset.samples]
        if not self.labels:
             self.label_to_indices = {}
             return

        self.label_to_indices = {label: np.where(np.array(self.labels) == label)[0]
                                 for label in set(self.labels)}

    def __len__(self):
        return len(self.base_dataset)

    def __getitem__(self, idx):
        anchor_img, anchor_label = self.base_dataset[idx]
        
        # Positive: same class
        pos_indices = self.label_to_indices[anchor_label]
        # Handle singleton classes
        if len(pos_indices) > 1:
            pos_idx = np.random.choice(pos_indices)
        else:
            pos_idx = idx
            
        pos_img, _ = self.base_dataset[pos_idx]
        
        # Negative: different class
        available_labels = list(set(self.labels) - {anchor_label})
        if available_labels:
            neg_label = np.random.choice(available_labels)
            neg_idx = np.random.choice(self.label_to_indices[neg_label])
            neg_img, _ = self.base_dataset[neg_idx]
        else:
            # Fallback if only 1 class exists
            neg_img = anchor_img 
        
        return anchor_img, pos_img, neg_img, anchor_label

def download_image(url, save_path):
    try:
        response = requests.get(url, timeout=4)
        if response.status_code != 200:
            return False
            
        # Verify it's actually an image
        content_type = response.headers.get('content-type', '')
        if 'image' not in content_type:
            return False
            
        image_bytes = io.BytesIO(response.content)
        image = Image.open(image_bytes)
        
        # Validation: Check size and convert
        if image.width < 100 or image.height < 100:
            return False # Too small (thumbnail)
            
        image = image.convert("RGB")
        image = image.resize((256, 256)) # Standardize
        image.save(save_path, "JPEG", quality=90)
        return True
    except Exception:
        return False

def clean_dataset(data_path):
    """
    Iterates through dataset and removes corrupt/unopenable images.
    """
    print(f"Validating dataset at {data_path}...")
    removed = 0
    for cls_dir in data_path.iterdir():
        if cls_dir.is_dir():
            for img_path in cls_dir.glob("*"):
                try:
                    with Image.open(img_path) as img:
                        img.verify() # Verify file integrity
                except Exception:
                    print(f"Removing corrupt file: {img_path.name}")
                    os.remove(img_path)
                    removed += 1
    print(f"Validation complete. Removed {removed} corrupt files.")

def mine_web_data(max_images_per_class=80):
    """
    Uses DuckDuckGo Search to find REAL images.
    Enhanced with multiple queries per class for variety.
    """
    print("--- STARTING WEB MINING FOR REAL DATASET ---")
    
    # Enhanced search queries
    search_config = {
        "healthy": [
            "tomato plant leaf healthy",
            "solanum lycopersicum healthy leaf",
            "tomato leaf green close up"
        ],
        "early_blight": [
            "tomato early blight leaf concentric rings",
            "alternaria solani tomato leaf symptoms",
            "early blight tomato lesions"
        ],
        "late_blight": [
            "tomato late blight leaf symptoms",
            "phytophthora infestans tomato leaf",
            "tomato late blight water soaked lesions"
        ],
        "bacterial_spot": [
            "tomato bacterial spot leaf",
            "xanthomonas campestris pv. vesicatoria tomato",
            "tomato leaf bacterial spot symptoms"
        ]
    }
    
    ddgs = DDGS()

    for cls, queries in search_config.items():
        cls_dir = RAW_DIR / cls
        cls_dir.mkdir(parents=True, exist_ok=True)
        
        current_count = len(list(cls_dir.glob("*")))
        if current_count >= max_images_per_class:
            print(f"Class '{cls}' has sufficient data ({current_count}). Skipping.")
            continue
            
        print(f"Mining class '{cls}'...")
        
        for query in queries:
            if current_count >= max_images_per_class:
                break
                
            print(f"  Query: '{query}'")
            try:
                # Fetch more results than needed to account for failures
                results = ddgs.images(
                    keywords=query,
                    max_results=50, 
                )
                
                for r in results:
                    if current_count >= max_images_per_class:
                        break
                        
                    image_url = r.get('image')
                    if not image_url: continue
                    
                    fname = f"{cls}_{int(time.time())}_{current_count}.jpg"
                    save_path = cls_dir / fname
                    
                    if download_image(image_url, save_path):
                        current_count += 1
                        print(f"    [{current_count}/{max_images_per_class}] Downloaded: {fname}")
                    
                    # Rate limiting
                    time.sleep(0.1)
                    
            except Exception as e:
                print(f"    Error during search '{query}': {e}")
                time.sleep(2) # Backoff

    print("--- WEB MINING COMPLETE ---")
    clean_dataset(RAW_DIR)

def prepare_data(custom_path=None, use_synthetic=False):
    """
    Orchestrates data preparation.
    """
    data_path = RAW_DIR
    
    # 1. Custom Path Override
    if custom_path:
        cp = Path(custom_path)
        if cp.exists() and cp.is_dir():
            print(f"--> Using CUSTOM dataset at: {cp}")
            data_path = cp
            use_synthetic = False
        else:
            print(f"--> Custom path '{custom_path}' invalid. Falling back.")

    # 2. Check Data Existence
    # We treat empty folders as 'non-existent'
    has_data = False
    if data_path.exists():
        total_imgs = sum([len(list(p.glob('*'))) for p in data_path.iterdir() if p.is_dir()])
        if total_imgs > 10:
            has_data = True
            
    if not has_data and not use_synthetic:
         print("--> Dataset scant. Triggering Web Mining...")
         mine_web_data()
         
    # 3. Validation Run (Just in case)
    if has_data:
        clean_dataset(data_path)

    # 4. Load Dataset
    print(f"Scanning dataset from {data_path}...")
    full_ds_scan = HarvestDataset(data_path) 
    
    # Emergency Fallback if mining failed (e.g. no internet in container)
    if len(full_ds_scan) == 0:
        print("!!! MINING FAILED (No Data). Using Synthetic Fallback. !!!")
        # In a real app, this would be a fatal error, but for the MVP we generate squares
        generate_synthetic_data()
        full_ds_scan = HarvestDataset(data_path)

    all_samples = full_ds_scan.samples
    classes = full_ds_scan.classes
    
    # Shuffle and Split
    random.shuffle(all_samples)
    split_idx = int(0.8 * len(all_samples))
    train_samples = all_samples[:split_idx]
    val_samples = all_samples[split_idx:]
    
    # 5. Transforms
    # Strong augmentation for web scraped data to prevent overfitting on specific watermarks/styles
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    train_ds = HarvestDataset(samples=train_samples, classes=classes, transform=train_transform)
    val_ds = HarvestDataset(samples=val_samples, classes=classes, transform=val_transform)
    
    print(f"Data Prepared: {len(train_ds)} training, {len(val_ds)} validation samples.")
    print(f"Classes found: {classes}")
    
    return train_ds, val_ds, classes

def generate_synthetic_data(num_samples=50):
    """Fallback generator"""
    print("Generating synthetic dataset (Fallback)...")
    classes = ["healthy", "early_blight", "bacterial_spot"]
    for cls in classes:
        cls_dir = RAW_DIR / cls
        cls_dir.mkdir(parents=True, exist_ok=True)
        for i in range(num_samples // len(classes)):
            img = Image.new('RGB', (224, 224), color=(34, 139, 34)) 
            draw = ImageDraw.Draw(img)
            draw.ellipse([50, 50, 174, 174], fill=(50, 205, 50))
            if cls != "healthy":
                draw.rectangle([80, 80, 120, 120], fill=(139, 69, 19))
            img.save(cls_dir / f"{cls}_synth_{i}.jpg")
