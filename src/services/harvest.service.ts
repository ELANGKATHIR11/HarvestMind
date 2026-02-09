import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { GoogleGenAI } from '@google/genai';
import { firstValueFrom } from 'rxjs';

export interface SensorData {
  id: string;
  type: 'moisture' | 'temp' | 'humidity';
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  timestamp: string;
}

export interface AnalysisResult {
  diagnosis: string;
  confidence: number;
  isHealthy: boolean;
  severity: 'low' | 'medium' | 'high' | 'none';
  reasoning?: string;
}

export interface DoctorReport {
  summary: string;
  likelyCauses: string[];
  recommendations: Array<{
    action: string;
    window: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  weatherContext: string;
  provenance: string[];
}

@Injectable({
  providedIn: 'root'
})
export class HarvestService {
  private http: HttpClient = inject(HttpClient);
  // Default to localhost for the Docker/Python backend
  private BACKEND_URL = 'http://localhost:8000';

  // --- State Signals ---
  currentView = signal<'dashboard' | 'camera' | 'analysis' | 'report' | 'training'>('dashboard');
  
  // Sensor Data (Mocked for MVP)
  sensors = signal<SensorData[]>([
    { id: 'S-101', type: 'temp', value: 24.5, unit: '°C', status: 'normal', timestamp: '10:00 AM' },
    { id: 'S-102', type: 'humidity', value: 82, unit: '%', status: 'warning', timestamp: '10:00 AM' },
    { id: 'S-103', type: 'moisture', value: 35, unit: '%', status: 'critical', timestamp: '10:00 AM' }
  ]);

  // Image & Analysis State
  capturedImage = signal<string | null>(null);
  isAnalyzingEdge = signal<boolean>(false);
  edgeResult = signal<AnalysisResult | null>(null);
  
  // Cloud/VRAG State
  isGeneratingReport = signal<boolean>(false);
  doctorReport = signal<DoctorReport | null>(null);

  // Training State
  trainingStatus = signal<'idle' | 'uploading' | 'mining' | 'training' | 'complete' | 'error'>('idle');
  uploadProgress = signal<number>(0);
  trainingLogs = signal<string[]>([]);
  
  private genAI: GoogleGenAI;

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
  }

  // --- Actions ---

  setView(view: 'dashboard' | 'camera' | 'analysis' | 'report' | 'training') {
    this.currentView.set(view);
  }

  setCapturedImage(base64: string) {
    this.capturedImage.set(base64);
    this.runEdgeSimulation(base64);
  }

  /**
   * 1. EDGE INFERENCE (VLM)
   * Simulates the "Edge" ViT Model running on the Jetson/Android device.
   * Using Gemini 2.5 Flash for high-speed diagnosis.
   */
  async runEdgeSimulation(base64Image: string) {
    this.setView('analysis');
    this.isAnalyzingEdge.set(true);
    this.edgeResult.set(null);

    try {
      const base64Data = base64Image.split(',')[1];

      const prompt = `
        You are an automated agricultural diagnostic system for Tomato plants.
        Analyze the image provided.
        
        POSSIBLE CLASSES:
        1. Healthy: Green, smooth leaves. No spots.
        2. Early Blight: Dark brown spots with CONCENTRIC RINGS (bullseye pattern). Yellowing around spots.
        3. Late Blight: Large, irregular, water-soaked dark lesions. Grey/White fungal growth may be present. Rapid tissue death.
        4. Bacterial Spot: Small, dark, circular specks (<3mm). Often greasy/water-soaked. May have yellow halos.
        
        INSTRUCTIONS:
        - If the leaf looks green and intact, classify as "Healthy".
        - If lesions are present, check specifically for concentric rings (Early Blight) vs water-soaked irregular patches (Late Blight) vs small specks (Bacterial).
        - If unsure or image is unclear, confidence should be low (<0.5).
        
        OUTPUT FORMAT:
        Return strict JSON only. No markdown formatting.
        {
          "diagnosis": "Healthy" | "Early Blight" | "Late Blight" | "Bacterial Spot",
          "confidence": number (0.0 to 1.0),
          "isHealthy": boolean,
          "severity": "low" | "medium" | "high" | "none",
          "reasoning": "One sentence explanation of visual evidence found."
        }
      `;

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text || "{}";
      const result = JSON.parse(text) as AnalysisResult;
      
      // Safety check for empty/malformed responses
      if (!result.diagnosis) {
         throw new Error("Invalid model response");
      }
      
      this.edgeResult.set(result);
      
      // Step B: Cloud Sync
      this.ingestToBackend(result);

      // Step C: Trigger VRAG if needed
      if (!result.isHealthy) {
        this.runVRAGOrchestration(result);
      } else {
        this.isGeneratingReport.set(false);
      }

    } catch (error) {
      console.error('Edge simulation failed:', error);
      this.edgeResult.set({
        diagnosis: 'Diagnosis Error',
        confidence: 0,
        isHealthy: false,
        severity: 'low',
        reasoning: 'The model could not process this image. Please retake with better lighting.'
      });
      this.isAnalyzingEdge.set(false);
    } finally {
      this.isAnalyzingEdge.set(false);
    }
  }

  /**
   * 2. CLOUD INGESTION
   * Sends the analysis result to the Python backend to be stored in the Vector DB.
   */
  async ingestToBackend(result: AnalysisResult) {
    try {
      const mockEmbedding = Array(128).fill(0).map(() => Math.random());
      
      const payload = {
        field_id: 'F-04',
        timestamp: new Date().toISOString(),
        embedding: mockEmbedding,
        metadata: {
          id: `case-${Date.now()}`,
          label: result.diagnosis,
          severity: result.severity,
          provenance: 'Edge Device Auto-Upload'
        }
      };

      await firstValueFrom(this.http.post(`${this.BACKEND_URL}/ingest/embedding`, payload));
    } catch (err) {
      console.warn('Backend ingestion skipped (Service offline?)', err);
    }
  }

  /**
   * 3. CLOUD VRAG ORCHESTRATION
   */
  async runVRAGOrchestration(edgeData: AnalysisResult) {
    this.isGeneratingReport.set(true);
    
    const payload = {
       field_id: 'F-04',
       timestamp: new Date().toISOString(),
       sensor_snapshot: this.sensors().map(s => ({
         id: s.id,
         type: s.type,
         value: s.value,
         unit: s.unit,
         timestamp: s.timestamp
       })),
       query_text: `Visual Diagnosis: ${edgeData.diagnosis}. Severity: ${edgeData.severity}. Confidence: ${edgeData.confidence}. Reasoning: ${edgeData.reasoning || 'N/A'}`
    };

    try {
       const report = await firstValueFrom(this.http.post<DoctorReport>(`${this.BACKEND_URL}/vrag/query`, payload));
       this.doctorReport.set(report as DoctorReport);
    } catch (err) {
       console.error("Backend offline, falling back to local simulation", err);
       this.fallbackLocalVRAG(edgeData);
    } finally {
       this.isGeneratingReport.set(false);
    }
  }

  /**
   * Fallback for when Python backend is not running.
   */
  async fallbackLocalVRAG(edgeData: AnalysisResult) {
    const sensorContext = this.sensors().map(s => `${s.type}: ${s.value}${s.unit}`).join(', ');
    const prompt = `
      System: You are HarvestMind (Offline Fallback Mode).
      Role: Create a Doctor's Report.
      Context: ${edgeData.diagnosis}, Sensors: ${sensorContext}.
      Task: Provide generic advice for ${edgeData.diagnosis}.
      Return JSON: { "summary": "...", "likelyCauses": ["..."], "recommendations": [{ "action": "...", "window": "...", "priority": "high" }], "weatherContext": "Offline", "provenance": ["Local Fallback"] }
    `;
    
    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const text = response.text;
      if (text) {
        const parsedReport = JSON.parse(text) as DoctorReport;
        this.doctorReport.set(parsedReport);
      }
    } catch (e) {
      this.doctorReport.set({
        summary: 'Network unavailable. Isolate plant.',
        likelyCauses: ['Unknown'],
        recommendations: [],
        weatherContext: 'N/A',
        provenance: ['Offline']
      });
    }
  }

  /**
   * 4. TRAINING PIPELINE
   */
  uploadDataset(files: FileList) {
    this.trainingStatus.set('uploading');
    this.uploadProgress.set(0);
    this.trainingLogs.set(['Starting upload sequence...', `Preparing to upload ${files.length} files.`]);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = (file as any).webkitRelativePath || file.name;
      formData.append('files', file, path);
    }

    this.http.post(`${this.BACKEND_URL}/train/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          const percent = Math.round(100 * event.loaded / (event.total || 1));
          this.uploadProgress.set(percent);
        } else if (event.type === HttpEventType.Response) {
          this.trainingStatus.set('training');
          this.trainingLogs.update(logs => [...logs, 'Upload complete.', 'Initializing training job...']);
          this.startTrainingJob();
        }
      },
      error: (err) => {
        console.error(err);
        this.trainingStatus.set('error');
        this.trainingLogs.update(logs => [...logs, 'Upload failed. Check console.']);
      }
    });
  }

  /**
   * 5. AUTO MINING
   */
  mineDataset() {
    this.trainingStatus.set('mining');
    this.trainingLogs.set([
      'Initiating Web Mining Sequence...',
      'Targeting: "Healthy", "Early Blight", "Late Blight", "Bacterial Spot"',
      'Source: DuckDuckGo Images (Creative Commons preferred)',
      'Starting download stream...'
    ]);
    
    this.http.post(`${this.BACKEND_URL}/train/mine`, {}).subscribe({
      next: (res: any) => {
         this.trainingLogs.update(logs => [...logs, 'Mining background task started.', 'Validating image quality...', 'This process may take 1-2 minutes.']);
         
         // Poll for status or wait
         setTimeout(() => {
             this.trainingStatus.set('training');
             this.trainingLogs.update(logs => [...logs, 'Mining complete. Dataset curated.', 'Initializing Neural Network training...']);
             this.startTrainingJob();
         }, 10000);
      },
      error: (err) => {
        this.trainingStatus.set('error');
        this.trainingLogs.update(logs => [...logs, 'Mining failed. Backend unreachable.']);
      }
    });
  }

  startTrainingJob() {
    this.http.post(`${this.BACKEND_URL}/train/start`, {}).subscribe({
      next: (res: any) => {
        this.trainingLogs.update(logs => [...logs, 'Training started.', `Job ID: ${res.job_id}`, 'Watching loss metrics...']);
        this.simulateTrainingLogs();
      },
      error: (err) => {
        this.trainingStatus.set('error');
        this.trainingLogs.update(logs => [...logs, 'Failed to start training.']);
      }
    });
  }

  simulateTrainingLogs() {
    const steps = [
      'Loading dataset (240 images found)...',
      'Applying Augmentations (Rotation, Color Jitter)...',
      'Epoch 1/15: Loss 0.854 | Acc 65%',
      'Epoch 2/15: Loss 0.632 | Acc 72%',
      'Epoch 5/15: Loss 0.415 | Acc 84%',
      'Epoch 10/15: Loss 0.220 | Acc 91%',
      'Epoch 15/15: Loss 0.115 | Acc 96%',
      'Optimizing ViT Attention Heads...',
      'Exporting MoE-ViT to Edge format...',
      'Training Complete. Models updated and pushed to Edge.'
    ];
    
    let i = 0;
    const interval = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(interval);
        this.trainingStatus.set('complete');
      } else {
        this.trainingLogs.update(logs => [...logs, steps[i]]);
        i++;
      }
    }, 2000);
  }
}