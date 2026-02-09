import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HarvestService } from '../services/harvest.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col space-y-6 md:space-y-8 animate-fade-in">
       
       <!-- Hero Section -->
       <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
          <!-- Background Decor -->
          <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-emerald-50 to-transparent opacity-50 pointer-events-none"></div>

          <div class="relative z-10">
             <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Farm Overview</h1>
             <p class="text-slate-500 mt-1 md:mt-2 text-sm md:text-base font-medium">Field Sector #04 • Tomato (Roma) • Week 12</p>
          </div>
          
          <div class="relative z-10 flex items-center gap-4 w-full md:w-auto">
            <div class="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 flex-1 md:flex-none justify-center md:justify-start">
               <span class="text-xl">⛅</span>
               <span class="font-bold text-sm">24°C Sunny</span>
            </div>
            <!-- Hide 'New Diagnosis' button on Mobile since it's in the FAB -->
            <button (click)="service.setView('camera')" 
               class="hidden md:flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
               </svg>
               <span>New Diagnosis</span>
            </button>
          </div>
       </div>

       <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <!-- Left Column: Sensors -->
          <div class="lg:col-span-2 space-y-4 md:space-y-6">
             <div class="flex items-center justify-between px-1">
               <h3 class="text-lg font-bold text-slate-800">Real-time Telemetry</h3>
               <div class="flex items-center space-x-2 text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                 <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                 <span>Live</span>
               </div>
             </div>

             <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                @for (sensor of service.sensors(); track sensor.id) {
                   <div class="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                      <div class="flex justify-between items-start mb-2 md:mb-4">
                         <div class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">{{ sensor.type }}</div>
                         <div [class]="'w-2 h-2 rounded-full ' + (sensor.status === 'normal' ? 'bg-green-500' : (sensor.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'))"></div>
                      </div>
                      <div class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{{ sensor.value }}<span class="text-sm md:text-lg font-medium text-slate-400 ml-1">{{sensor.unit}}</span></div>
                      <div class="hidden md:flex mt-4 text-xs font-medium text-slate-400 items-center">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Last updated: {{sensor.timestamp}}
                      </div>
                   </div>
                }
             </div>

             <!-- Chart Placeholder -->
             <div class="hidden md:flex bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[300px] items-center justify-center relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-slate-50 to-white"></div>
                <div class="relative z-10 text-center">
                   <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                   </svg>
                   <p class="text-slate-400 font-medium">Historical sensor trends visualization</p>
                </div>
             </div>
          </div>

          <!-- Right Column: Insights & Alerts -->
          <div class="space-y-4 md:space-y-6">
             <h3 class="text-lg font-bold text-slate-800 px-1">Action Items</h3>
             
             <!-- Alert Stack -->
             <div class="space-y-3 md:space-y-4">
                <div class="bg-white p-4 md:p-5 rounded-2xl border-l-4 border-red-500 shadow-sm flex items-start space-x-4 hover:shadow-md transition-shadow cursor-pointer">
                   <div class="bg-red-50 p-2 md:p-3 rounded-xl text-red-500 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                   </div>
                   <div>
                      <div class="flex items-center justify-between">
                        <p class="text-sm font-bold text-slate-800">Moisture Anomaly</p>
                        <span class="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">HIGH</span>
                      </div>
                      <p class="text-xs text-slate-500 mt-1 leading-relaxed">Spike detected in Sector 4B. Risk of root rot.</p>
                   </div>
                </div>

                <div class="bg-white p-4 md:p-5 rounded-2xl border-l-4 border-yellow-400 shadow-sm flex items-start space-x-4 hover:shadow-md transition-shadow cursor-pointer">
                   <div class="bg-yellow-50 p-2 md:p-3 rounded-xl text-yellow-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                   </div>
                   <div>
                      <div class="flex items-center justify-between">
                        <p class="text-sm font-bold text-slate-800">Gateway Latency</p>
                        <span class="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">MED</span>
                      </div>
                      <p class="text-xs text-slate-500 mt-1">LoRaWAN Gateway #2 high latency.</p>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  `
})
export class DashboardComponent {
  service = inject(HarvestService);
}