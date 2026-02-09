import os
import torch
import numpy as np
import faiss
from google import genai
from google.genai import types
import json
from pathlib import Path
from models import TripletEmbeddingNet

class VRAGSystem:
    def __init__(self, model_path, classes):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load embedding model
        self.model = TripletEmbeddingNet()
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
        
        self.classes = classes
        self.index = None
        self.metadata_store = []
        
        # Gemini Setup
        api_key = "AIzaSyBX3OP6A8ULs29FL3FeFQXSz1auBlLyvaI"
        self.client = genai.Client(api_key=api_key)

    def index_dataset(self, dataset):
        """
        Create Vector Database (FAISS) from dataset.
        """
        print("Indexing dataset for VRAG...")
        embeddings = []
        
        # In a real scenario, we'd batch this. Doing one-by-one for simplicity here.
        for i in range(len(dataset)):
            img, label_idx = dataset[i]
            img = img.unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                emb = self.model(img).cpu().numpy()
            
            embeddings.append(emb)
            self.metadata_store.append({
                "id": i,
                "label": self.classes[label_idx],
                "provenance": "Training Set"
            })
            
        embeddings = np.vstack(embeddings)
        d = embeddings.shape[1]
        
        # FAISS Index
        self.index = faiss.IndexFlatL2(d)
        self.index.add(embeddings)
        print(f"Indexed {len(embeddings)} vectors.")

    def retrieve(self, img_tensor, k=3):
        with torch.no_grad():
            query_emb = self.model(img_tensor.unsqueeze(0).to(self.device)).cpu().numpy()
            
        distances, indices = self.index.search(query_emb, k)
        
        results = []
        for idx in indices[0]:
            if idx < len(self.metadata_store):
                results.append(self.metadata_store[idx])
        return results

    def generate_report(self, img_tensor, sensor_data, label_prediction):
        # 1. Retrieve Context
        similar_cases = self.retrieve(img_tensor)
        
        # 2. Build Prompt
        prompt = f"""
        Role: Agricultural AI Doctor.
        Task: Diagnose tomato plant health.
        
        Context:
        - Visual Classifier: {label_prediction}
        - Sensor Data: {sensor_data}
        - Similar Historical Cases: {json.dumps(similar_cases)}
        
        Output Requirements:
        Return ONLY valid JSON with this structure:
        {{
            "summary": "string",
            "causes": ["string"],
            "reasoning": ["string"],
            "recommendations": [
                {{"action": "string", "window": "string", "priority": "high"}}
            ],
            "confidence": 0.95,
            "provenance": ["string"]
        }}
        """
        
        # 3. Call Gemini
        if self.client:
            try:
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type='application/json')
                )
                return json.loads(response.text)
            except Exception as e:
                print(f"Gemini Error: {e}")
                return self._mock_report(label_prediction)
        else:
            return self._mock_report(label_prediction)

    def _mock_report(self, label):
        return {
            "summary": f"Detected potential {label}. (Gemini Offline)",
            "causes": ["Fungal infection", "High humidity"],
            "recommendations": [{"action": "Apply fungicide", "window": "24h", "priority": "high"}],
            "confidence": 0.85,
            "provenance": ["Visual Model"]
        }