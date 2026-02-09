# HarvestMind ML Workspace

This folder contains the complete machine learning pipeline for HarvestMind.

## Quick Start

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run Pipeline**:
   ```bash
   python run_experiment.py
   ```

## Using Your Custom Dataset (F:\diseases)

The system is configured to automatically look for a dataset at `F:/diseases`.
Structure your folders like this:

```
F:\diseases\
    ├── healthy\
    │   ├── img1.jpg
    │   └── ...
    ├── early_blight\
    │   ├── img2.jpg
    │   └── ...
    └── late_blight\
        ├── img3.jpg
        └── ...
```

If this folder exists, the pipeline will ignore synthetic data generation and train specifically on your images.

## Components

- **data_manager.py**: Handles data loading. Supports custom paths and automatic fallbacks.
- **models.py**: Contains the `TripletEmbeddingNet` (MobileNetV3) and `MoEViT` (Mixture-of-Experts Vision Transformer).
- **train_pipeline.py**: PyTorch training loops for embedding and classification. Exports `.pt` files.
- **vrag_engine.py**: Vector Retrieval Augmented Generation. Indexes embeddings using FAISS and connects to Gemini API.
- **run_experiment.py**: Main entry point that orchestrates training, indexing, and a final inference demo.

## Outputs

After running, check the `workspace` folder:
- `workspace/data`: Raw and processed images.
- `workspace/models`: Trained `.pt` and edge-ready models.
- `workspace/reports`: Evaluation markdown and JSON logs.