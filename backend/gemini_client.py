import os
import json
from google import genai
from google.genai import types
from models import DoctorReport

class GeminiClient:
    def __init__(self):
        api_key = "AIzaSyBX3OP6A8ULs29FL3FeFQXSz1auBlLyvaI"
        self.client = genai.Client(api_key=api_key)

    def generate_doctor_report(self, context: str, user_query: str) -> dict:
        if not self.client:
            raise ValueError("Gemini Client not initialized.")

        prompt = f"""
        System: You are HarvestMind, an expert agricultural AI doctor.
        Role: Analyze the provided Field Context and generate a JSON Doctor's Report.
        
        Field Context:
        {context}
        
        User Query: {user_query}
        
        Task:
        1. Analyze the sensor data and retrieved similar cases.
        2. Determine the likely pathology or stressor.
        3. Recommend time-sensitive actions.
        4. Return VALID JSON only.
        
        JSON Schema:
        {{
          "summary": "string",
          "likelyCauses": ["string"],
          "reasoning": ["string"],
          "recommendations": [
            {{ "action": "string", "window": "string", "priority": "high|medium|low" }}
          ],
          "weatherContext": "string",
          "confidence": float (0-1),
          "provenance": ["string (cite vector IDs or sensor IDs)"]
        }}
        """

        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type='application/json'
                )
            )
            
            if response.text:
                return json.loads(response.text)
            else:
                raise ValueError("Empty response from Gemini")

        except Exception as e:
            print(f"Gemini Inference Error: {e}")
            # Return fallback for prototype continuity
            return {
                "summary": "Analysis interrupted due to model error.",
                "likelyCauses": ["Unknown Error"],
                "reasoning": [str(e)],
                "recommendations": [],
                "weatherContext": "N/A",
                "confidence": 0.0,
                "provenance": ["System Error"]
            }

gemini = GeminiClient()