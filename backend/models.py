from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class SensorSnapshot(BaseModel):
    id: str
    type: str
    value: float
    unit: str
    timestamp: str

class EmbeddingIngest(BaseModel):
    field_id: str
    timestamp: str
    embedding: List[float]
    metadata: Dict[str, Any]

class VRAGQuery(BaseModel):
    field_id: str
    timestamp: str
    sensor_snapshot: List[SensorSnapshot]
    query_text: str

class Recommendation(BaseModel):
    action: str
    window: str
    priority: str

class DoctorReport(BaseModel):
    summary: str
    likelyCauses: List[str]
    reasoning: List[str]
    recommendations: List[Recommendation]
    weatherContext: str
    confidence: float
    provenance: List[str]

class AlertResponse(BaseModel):
    alert: bool
    severity: str
    details: str
