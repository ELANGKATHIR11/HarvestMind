import numpy as np
import os
from typing import List, Dict, Any

class VectorStore:
    def __init__(self):
        # In a real prod env, this would connect to Weaviate/Pinecone
        self.use_memory = True
        self.vectors: List[np.ndarray] = []
        self.metadata: List[Dict[str, Any]] = []
        print("Initialized In-Memory Vector Store for Prototype")

    def upsert(self, embedding: List[float], metadata: Dict[str, Any]):
        """Store vector and metadata."""
        # Normalize for cosine similarity
        vec = np.array(embedding)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        
        self.vectors.append(vec)
        self.metadata.append(metadata)
        return True

    def query(self, embedding: List[float], k: int = 3) -> List[Dict[str, Any]]:
        """Find top-k nearest neighbors using cosine similarity."""
        if not self.vectors:
            return []

        query_vec = np.array(embedding)
        norm = np.linalg.norm(query_vec)
        if norm > 0:
            query_vec = query_vec / norm

        # Compute cosine similarity (dot product of normalized vectors)
        scores = np.dot(self.vectors, query_vec)
        
        # Get top-k indices
        top_k_indices = np.argsort(scores)[-k:][::-1]
        
        results = []
        for idx in top_k_indices:
            score = float(scores[idx])
            meta = self.metadata[idx].copy()
            meta['score'] = score
            results.append(meta)
            
        return results

# Singleton instance
db = VectorStore()
