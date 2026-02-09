# HarvestMind Backend Prototype

This is the Python FastAPI backend for HarvestMind. It handles Vector RAG ingestion and GenAI reasoning.

## Setup & Run

1. **Environment Variables**
   You MUST set the `GEMINI_API_KEY`.
   ```bash
   export GEMINI_API_KEY="AIza..."
   ```

2. **Run with Docker**
   ```bash
   cd backend
   docker build -t harvest-backend .
   docker run -p 8000:8000 -e GEMINI_API_KEY=$GEMINI_API_KEY harvest-backend
   ```

3. **Local Dev (No Docker)**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

## API Usage (Curl)

**1. Ingest an Embedding (Simulating Edge Upload)**
```bash
curl -X POST http://localhost:8000/ingest/embedding \
  -H "Content-Type: application/json" \
  -d '{
    "field_id": "F-04",
    "timestamp": "2023-10-27T10:00:00Z",
    "embedding": [0.1, 0.2, 0.3], 
    "metadata": { "id": "vec-1", "label": "Early Blight", "provenance": "Manual Label" }
  }'
```

**2. Query VRAG (Doctor's Report)**
```bash
curl -X POST http://localhost:8000/vrag/query \
  -H "Content-Type: application/json" \
  -d '{
    "field_id": "F-04",
    "timestamp": "2023-10-27T12:00:00Z",
    "sensor_snapshot": [
       {"id":"s1", "type":"moisture", "value":28, "unit":"%", "timestamp":"now"}
    ],
    "query_text": "Leaves showing dark concentric rings."
  }'
```
