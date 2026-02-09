import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './components/dashboard.component';
import { CameraComponent } from './components/camera.component';
import { AnalysisComponent } from './components/analysis.component';
import { ReportComponent } from './components/report.component';
import { TrainingComponent } from './components/training.component';
import { HarvestService } from './services/harvest.service';

/**
 * ARCHITECTURE NOTE:
 * In a full production deployment:
 * - This Angular PWA serves as the universal frontend.
 * - Mobile Native wrappers (Kotlin/Swift) would load this via WebView or Capacitor
 *   to access native hardware APIs (Camera/Sensors) with high performance.
 * - Backend services (Node.js/Firebase) would handle the API requests mocked in HarvestService.
 */

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    DashboardComponent, 
    CameraComponent, 
    AnalysisComponent, 
    ReportComponent,
    TrainingComponent
  ],
  template: `
    <div class="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      <!-- DESKTOP: Sidebar Navigation (Hidden on Mobile) -->
      <aside class="hidden md:flex w-72 bg-slate-900 text-slate-300 flex-col shrink-0 shadow-2xl z-20 transition-all">
        <!-- Logo Area -->
        <div class="p-8 pb-4">
           <div class="flex items-center space-x-3 text-white mb-8">
             <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
             </div>
             <span class="font-bold text-2xl tracking-tight">HarvestMind</span>
           </div>
           
           <div class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pl-1">Menu</div>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 px-4 space-y-2">
           <button (click)="service.setView('dashboard')"
              [class]="service.currentView() === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'hover:bg-white/5 hover:text-white'"
              class="w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span class="font-medium">Dashboard</span>
           </button>

           <button (click)="service.setView('camera')"
              [class]="service.currentView() === 'camera' || service.currentView() === 'analysis' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'hover:bg-white/5 hover:text-white'"
              class="w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <span class="font-medium">Diagnostic Tool</span>
           </button>

           <button (click)="service.setView('report')"
              [class]="service.currentView() === 'report' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'hover:bg-white/5 hover:text-white'"
              class="w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="font-medium">Reports</span>
           </button>

           <div class="pt-4 mt-4 border-t border-white/5">
             <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 pl-1">Admin</div>
             <button (click)="service.setView('training')"
                [class]="service.currentView() === 'training' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-white/5 hover:text-white'"
                class="w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span class="font-medium">Model Training</span>
             </button>
           </div>
        </nav>
        
        <!-- User Profile -->
        <div class="p-6 border-t border-white/5">
           <!-- User Profile Blank -->
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-hidden relative flex flex-col h-full bg-slate-50/50">
         <div class="flex-1 overflow-y-auto scroll-smooth pb-24 md:pb-0">
            <!-- Dynamic Padding based on device -->
            <div class="h-full w-full p-4 md:p-8 max-w-[1600px] mx-auto">
              @switch (service.currentView()) {
                @case ('dashboard') { <app-dashboard></app-dashboard> }
                @case ('camera') { <app-camera></app-camera> }
                @case ('analysis') { <app-analysis></app-analysis> }
                @case ('report') { <app-report></app-report> }
                @case ('training') { <app-training></app-training> }
              }
            </div>
         </div>

         <!-- MOBILE: Bottom Navigation (Fixed) -->
         <nav class="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
            <button (click)="service.setView('dashboard')" 
               [class.text-emerald-600]="service.currentView() === 'dashboard'" 
               [class.text-slate-400]="service.currentView() !== 'dashboard'"
               class="flex flex-col items-center space-y-1 transition-colors w-16">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
               </svg>
               <span class="text-[10px] font-bold uppercase tracking-wider">Home</span>
            </button>
            
            <!-- Mobile Floating Action Button (FAB) -->
            <div class="-mt-12 relative group">
               <div class="absolute inset-0 bg-emerald-400 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
               <button (click)="service.setView('camera')" class="relative bg-slate-900 text-white rounded-full p-4 shadow-xl border-4 border-slate-50 transform group-hover:-translate-y-1 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
               </button>
            </div>

            <button (click)="service.setView('report')" 
               [class.text-emerald-600]="service.currentView() === 'report'"
               [class.text-slate-400]="service.currentView() !== 'report'"
               class="flex flex-col items-center space-y-1 transition-colors w-16">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
               </svg>
               <span class="text-[10px] font-bold uppercase tracking-wider">Report</span>
            </button>
         </nav>

      </main>
    </div>
  `
})
export class AppComponent {
  service = inject(HarvestService);
}