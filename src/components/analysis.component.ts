import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HarvestService } from '../services/harvest.service';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col lg:flex-row gap-6 h-full">
      
      <!-- Left Column: Visual (Top on Mobile) -->
      <div class="lg:w-1/2 flex flex-col h-[40vh] lg:h-[calc(100vh-4rem)]">
         <div class="flex-1 bg-slate-900 rounded-3xl overflow-hidden relative shadow-md group">
            @if (service.capturedImage()) {
              <img [src]="service.capturedImage()" class="w-full h-full object-contain" alt="Analyzed Plant">
            }
            <div class="absolute top-4 left-4 z-10">
              <button (click)="service.setView('camera')" class="bg-black/40 hover:bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-sm text-sm font-medium transition-colors flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Back</span>
              </button>
            </div>
         </div>
      </div>

      <!-- Right Column: Data (Bottom on Mobile) -->
      <div class="lg:w-1/2 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden h-fit lg:h-[calc(100vh-4rem)]">
        <div class="p-6 md:p-8 flex-1 overflow-y-auto">
          
           <h2 class="text-2xl font-extrabold text-slate-800 mb-6">Analysis Results</h2>

           <!-- Edge ViT Result -->
           <div class="mb-8">
             <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Edge Model Classification</h3>
             
             @if (service.isAnalyzingEdge()) {
               <div class="flex items-center space-x-4 p-6 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse">
                 <div class="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                 <div class="space-y-2 flex-1">
                    <div class="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div class="h-3 bg-slate-200 rounded w-1/2"></div>
                 </div>
               </div>
             } @else if (service.edgeResult(); as result) {
               <div class="p-6 rounded-2xl border-l-8 shadow-sm transition-all"
                    [class.border-green-500]="result.isHealthy"
                    [class.bg-green-50]="result.isHealthy"
                    [class.border-red-500]="!result.isHealthy"
                    [class.bg-red-50]="!result.isHealthy">
                    
                 <div class="flex justify-between items-start">
                   <div>
                      <h4 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{{ result.diagnosis }}</h4>
                      <div class="flex flex-wrap items-center gap-2 mt-2">
                        <span class="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border"
                              [class.border-green-200]="result.isHealthy"
                              [class.text-green-800]="result.isHealthy"
                              [class.bg-green-100]="result.isHealthy"
                              [class.border-red-200]="!result.isHealthy"
                              [class.text-red-800]="!result.isHealthy"
                              [class.bg-red-100]="!result.isHealthy">
                           {{ (result.confidence * 100).toFixed(1) }}% Confidence
                        </span>
                        <span class="text-sm font-medium text-slate-500">
                           Severity: {{ result.severity | titlecase }}
                        </span>
                      </div>
                   </div>
                 </div>
               </div>
             }
           </div>

           <!-- Cloud VRAG Result -->
           @if (service.edgeResult() && !service.edgeResult()?.isHealthy) {
             <div class="border-t border-slate-100 pt-8">
               <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Expert System Recommendation</h3>
               
               @if (service.isGeneratingReport()) {
                 <div class="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div class="relative w-12 h-12 mb-4">
                       <div class="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                       <div class="absolute inset-2 bg-blue-600 rounded-full"></div>
                    </div>
                    <p class="font-bold text-slate-700">Consulting Knowledge Base...</p>
                    <p class="text-sm text-slate-500 mt-1">Retrieving weather context & treatment protocols</p>
                 </div>
               } @else {
                  <div class="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 text-center">
                     <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                       </svg>
                     </div>
                     <h4 class="text-lg font-bold text-slate-800">Doctor's Report Ready</h4>
                     <p class="text-slate-500 mb-6">Full diagnostic report generated including provenance and weather correlation.</p>
                     
                     <button (click)="service.setView('report')" 
                             class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center space-x-2">
                       <span>View Full Report</span>
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                       </svg>
                     </button>
                  </div>
               }
             </div>
           } @else if (service.edgeResult()?.isHealthy) {
              <div class="border-t border-slate-100 pt-8 flex flex-col items-center justify-center text-center">
                 <div class="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                 </div>
                 <h3 class="text-xl font-bold text-slate-800">Plant is Healthy</h3>
                 <p class="text-slate-500 mt-2 max-w-xs">No pathogens detected. Continue standard monitoring protocols.</p>
                 <button (click)="service.setView('dashboard')" class="mt-6 text-emerald-600 font-bold hover:underline">Return to Dashboard</button>
              </div>
           }
        </div>
      </div>
    </div>
  `
})
export class AnalysisComponent {
  service = inject(HarvestService);
}