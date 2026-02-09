import { Component, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HarvestService } from '../services/harvest.service';

@Component({
  selector: 'app-camera',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- MAIN CONTAINER -->
    <!-- Mobile: Fixed Full Screen Black Background -->
    <!-- Desktop: Card Layout, White Background, Rounded -->
    <div class="
         fixed inset-0 z-50 flex flex-col bg-black 
         md:relative md:z-0 md:bg-white md:rounded-3xl md:shadow-sm md:border md:border-slate-100 md:overflow-hidden md:h-[calc(100vh-4rem)]
         transition-all duration-300">
      
      <!-- DESKTOP HEADER (Hidden on Mobile) -->
      <div class="hidden md:flex p-6 border-b border-slate-100 justify-between items-center bg-white z-10">
         <div>
            <h2 class="text-xl font-bold text-slate-800">Diagnostic Tool</h2>
            <p class="text-sm text-slate-500">Upload plant imagery for ViT analysis</p>
         </div>
         @if (previewUrl()) {
           <div class="flex space-x-3">
             <button (click)="retake()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Clear</button>
             <button (click)="analyze()" class="px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-emerald-700 flex items-center space-x-2">
               <span>Run Analysis</span>
               <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
             </button>
           </div>
         }
      </div>

      <!-- MOBILE HEADER (Absolute Overlay) -->
      <div class="md:hidden absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent pt-safe">
         <button (click)="service.setView('dashboard')" class="text-white p-2 rounded-full hover:bg-white/10">
           <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
         <span class="text-white font-medium tracking-wider text-sm opacity-90">SCANNER</span>
         <div class="w-8"></div>
      </div>

      <!-- VIEWPORT AREA -->
      <div class="flex-1 relative flex items-center justify-center overflow-hidden bg-black md:bg-slate-50/50"
           [class.bg-emerald-50]="isDragging()"
           [class.border-emerald-400]="isDragging()"
           (dragover)="onDragOver($event)"
           (dragleave)="onDragLeave($event)"
           (drop)="onDrop($event)">

         <!-- Desktop D&D Overlay -->
         @if (isDragging()) {
           <div class="absolute inset-4 border-4 border-dashed border-emerald-400 rounded-2xl flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 text-emerald-500 mb-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <h3 class="text-2xl font-bold text-emerald-700">Drop to analyze</h3>
           </div>
         }

         <!-- PREVIEW IMAGE -->
         @if (previewUrl()) {
           <div class="relative w-full h-full md:max-w-4xl bg-black md:rounded-2xl overflow-hidden md:shadow-2xl flex items-center justify-center group">
              <img [src]="previewUrl()" class="w-full h-full object-contain" />
              
              <!-- Desktop Replace Button -->
              <div class="hidden md:flex absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center">
                 <button (click)="fileInput.click()" class="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full backdrop-blur-md font-medium border border-white/20">Replace Image</button>
              </div>
           </div>
         } @else {
           <!-- EMPTY STATE (Responsive) -->
           
           <!-- Mobile Viewfinder Lines -->
           <div class="md:hidden absolute inset-0 border-2 border-white/20 rounded-lg m-8 pointer-events-none">
             <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
             <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
             <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
             <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
           </div>

           <!-- Desktop Placeholder -->
           <div class="hidden md:block text-center max-w-lg">
              <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 class="text-2xl font-bold text-slate-800 mb-2">Upload Plant Sample</h3>
              <p class="text-slate-500 mb-8">Drag and drop leaf images here, or browse files.</p>
              <button (click)="fileInput.click()" class="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl">Browse Files</button>
           </div>

           <!-- Mobile Instruction Text -->
           <div class="md:hidden absolute bottom-32 text-center w-full px-8 pointer-events-none">
              <p class="text-white font-medium text-lg drop-shadow-md">Align leaf within frame</p>
           </div>
         }
      </div>

      <!-- MOBILE CONTROLS (Footer) -->
      <div class="md:hidden bg-black p-8 pb-12 flex justify-center items-center space-x-12 z-20">
         @if (!previewUrl()) {
           <button class="p-3 bg-white/10 rounded-full text-white"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
           
           <!-- Shutter Button -->
           <button (click)="fileInput.click()" 
             class="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-all">
             <div class="w-16 h-16 bg-white rounded-full"></div>
           </button>
           
           <button class="p-3 bg-white/10 rounded-full text-white"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></button>
         } @else {
           <button (click)="retake()" class="text-white font-medium px-6 py-2 rounded-full border border-white/30 hover:bg-white/10">Retake</button>
           <button (click)="analyze()" class="bg-emerald-500 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:bg-emerald-400 active:scale-95 transition-all flex items-center space-x-2">
             <span>Analyze</span>
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
           </button>
         }
      </div>

      <!-- Hidden Input -->
      <input #fileInput type="file" accept="image/*" capture="environment" (change)="onFileSelected($event)" class="hidden">
    </div>
  `
})
export class CameraComponent {
  service = inject(HarvestService);
  previewUrl = signal<string | null>(null);
  isDragging = signal<boolean>(false);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    
    if (event.dataTransfer?.files?.length) {
      const file = event.dataTransfer.files[0];
      if (file.type.match(/image\/*/)) {
        this.processFile(file);
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  processFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  retake() {
    this.previewUrl.set(null);
  }

  analyze() {
    if (this.previewUrl()) {
      this.service.setCapturedImage(this.previewUrl()!);
    }
  }
}