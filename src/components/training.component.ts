import { Component, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HarvestService } from '../services/harvest.service';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full lg:h-[calc(100vh-4rem)] max-w-5xl mx-auto space-y-6">
      
      <!-- Header -->
      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Model Training Center</h1>
          <p class="text-slate-500 mt-1">Manage datasets and retrain your Edge ViT models.</p>
        </div>
        <div class="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-500">
           Current Model: v2.4 (Active)
        </div>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
         
         <!-- Left Column: Actions -->
         <div class="flex flex-col space-y-6">
            
            <!-- Option 1: Auto-Mine (Recommended) -->
            <div class="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
               <!-- Decorative bg -->
               <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
               
               <div class="relative z-10">
                   <div class="flex items-center space-x-3 mb-4">
                      <div class="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h3 class="font-bold text-lg">Auto-Mine Dataset</h3>
                   </div>
                   
                   <p class="text-indigo-100 text-sm mb-6">
                      Use DuckDuckGo Search to automatically find, download, and curate real-world images of Tomato diseases. Fixes "Zero Accuracy" issues.
                   </p>
                   
                   @if (service.trainingStatus() === 'idle' || service.trainingStatus() === 'error') {
                      <button (click)="service.mineDataset()" class="w-full bg-white text-indigo-700 font-bold py-3 rounded-xl shadow-md hover:bg-indigo-50 transition-colors flex items-center justify-center space-x-2">
                         <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                         </svg>
                         <span>Start Web Mining & Train</span>
                      </button>
                   } @else if (service.trainingStatus() === 'mining') {
                      <div class="w-full bg-white/10 border border-white/20 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 animate-pulse">
                         <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                           <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         <span>Mining Web Data...</span>
                      </div>
                   } @else {
                      <div class="w-full bg-white/10 border border-white/20 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2">
                         <span>Mining Complete.</span>
                      </div>
                   }
               </div>
            </div>

            <!-- Option 2: Upload (Legacy) -->
            <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col">
               <h3 class="font-bold text-slate-800 mb-4">Manual Dataset Upload</h3>
               
               <div class="flex-1 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center p-8 text-center transition-colors hover:bg-slate-100 hover:border-slate-300 relative group cursor-pointer"
                    (click)="folderInput.click()">
                  
                  <div class="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                     </svg>
                  </div>
                  
                  @if (selectedFileCount() === 0) {
                     <h4 class="text-lg font-bold text-slate-700">Select Dataset Folder</h4>
                     <p class="text-sm text-slate-400 mt-2 max-w-xs">Supports formatted folders (Healthy, Blight, etc.).</p>
                  } @else {
                     <h4 class="text-lg font-bold text-emerald-600">{{ selectedFileCount() }} Files Selected</h4>
                     <p class="text-sm text-slate-400 mt-2">Ready to upload.</p>
                  }

                  <!-- Input: Note webkitdirectory attribute for folder selection -->
                  <input #folderInput type="file" webkitdirectory directory multiple class="hidden" (change)="onFolderSelected($event)">
               </div>

               @if (selectedFileCount() > 0 && service.trainingStatus() === 'idle') {
                 <button (click)="upload()" class="mt-4 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Upload & Train</span>
                 </button>
               }
            </div>
         </div>

         <!-- Right: Status & Logs -->
         <div class="flex flex-col bg-slate-900 rounded-3xl shadow-lg border border-slate-800 overflow-hidden">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
               <h3 class="font-bold text-white flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" 
                        [class.bg-slate-500]="service.trainingStatus() === 'idle'"
                        [class.bg-purple-500]="service.trainingStatus() === 'mining'"
                        [class.bg-yellow-400]="service.trainingStatus() === 'uploading'"
                        [class.bg-blue-500]="service.trainingStatus() === 'training'"
                        [class.bg-green-500]="service.trainingStatus() === 'complete'"
                        [class.bg-red-500]="service.trainingStatus() === 'error'"></span>
                  System Terminal
               </h3>
               @if (service.trainingStatus() === 'uploading') {
                 <span class="text-xs font-mono text-yellow-400">{{ service.uploadProgress() }}% Uploading</span>
               }
            </div>
            
            <div class="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-2 max-h-[500px]" #logContainer>
               @if (service.trainingLogs().length === 0) {
                 <div class="text-slate-600 italic">Waiting for job initiation...</div>
               }
               @for (log of service.trainingLogs(); track $index) {
                 <div class="text-slate-300 border-l-2 border-slate-700 pl-3">
                    <span class="text-slate-500 text-xs mr-2">[{{ getTime() }}]</span>
                    {{ log }}
                 </div>
               }
               @if (service.trainingStatus() === 'training') {
                 <div class="animate-pulse text-blue-400">_ Processing Neural Networks...</div>
               }
               @if (service.trainingStatus() === 'mining') {
                 <div class="animate-pulse text-purple-400">_ Indexing Web Results...</div>
               }
            </div>
         </div>

      </div>
    </div>
  `
})
export class TrainingComponent {
  service = inject(HarvestService);
  selectedFileCount = signal(0);
  files: FileList | null = null;
  @ViewChild('logContainer') private logContainer!: ElementRef;

  onFolderSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.files = input.files;
      this.selectedFileCount.set(input.files.length);
      this.service.trainingLogs.set([`Selected folder with ${input.files.length} files.`]);
    }
  }

  upload() {
    if (this.files) {
      this.service.uploadDataset(this.files);
    }
  }

  getTime() {
    return new Date().toLocaleTimeString();
  }
  
  // Auto-scroll logs
  ngAfterViewChecked() {
    if (this.logContainer) {
      this.logContainer.nativeElement.scrollTop = this.logContainer.nativeElement.scrollHeight;
    }
  }
}