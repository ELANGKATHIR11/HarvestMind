import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HarvestService } from '../services/harvest.service';

declare var html2canvas: any;
declare var jspdf: any;

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full lg:h-[calc(100vh-4rem)] max-w-5xl mx-auto bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
      <!-- Header -->
      <div class="bg-white border-b border-slate-100 px-4 md:px-8 py-4 md:py-6 flex items-center justify-between z-10 sticky top-0">
        <div class="flex items-center space-x-2 md:space-x-4">
           <button (click)="service.setView('analysis')" class="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
           </button>
           <div>
              <h1 class="text-lg md:text-2xl font-bold text-slate-800">Diagnostic Report</h1>
              <p class="text-xs md:text-sm text-slate-400 font-mono hidden md:block">ID: RPT-{{ getDateString() }}</p>
           </div>
        </div>
        
        <div class="flex items-center space-x-2 md:space-x-3">
           <button (click)="downloadPdf()" 
              [disabled]="isDownloading()"
              class="hidden md:flex items-center justify-center w-36 px-4 py-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors rounded-lg"
              [class.bg-slate-100]="isDownloading()"
              [class.cursor-not-allowed]="isDownloading()">
              @if (isDownloading()) {
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving PDF...</span>
              } @else {
                  <span>Download PDF</span>
              }
           </button>
           <button (click)="shareReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-bold transition-colors flex items-center space-x-2 text-sm md:text-base">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Share</span>
           </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
        @if (service.doctorReport(); as report) {
          <div id="reportContent" class="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
             
             <!-- Main Column -->
             <div class="lg:col-span-2 space-y-6">
                <!-- Executive Summary -->
                <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                   <h2 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Executive Summary</h2>
                   <p class="text-base md:text-lg text-slate-800 leading-relaxed font-medium">{{ report.summary }}</p>
                   
                   <div class="mt-6 flex flex-wrap gap-2">
                     <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2 py-1">Probable Causes:</h3>
                     @for (cause of report.likelyCauses; track $index) {
                       <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase">{{ cause }}</span>
                     }
                   </div>
                </div>

                <!-- Action Plan -->
                <div>
                  <h2 class="text-xl font-bold text-slate-800 mb-4 px-2">Recommended Action Plan</h2>
                  <div class="space-y-4">
                    @for (rec of report.recommendations; track $index) {
                      <div class="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 hover:shadow-md transition-shadow"
                           [class.border-red-500]="rec.priority === 'high'"
                           [class.border-yellow-500]="rec.priority === 'medium'"
                           [class.border-green-500]="rec.priority === 'low'">
                         <div class="flex flex-col md:flex-row justify-between md:items-center mb-2 gap-2">
                            <span class="w-fit px-3 py-1 rounded text-xs font-bold uppercase tracking-wide"
                                 [class.bg-red-100]="rec.priority === 'high'"
                                 [class.text-red-700]="rec.priority === 'high'"
                                 [class.bg-yellow-100]="rec.priority === 'medium'"
                                 [class.text-yellow-700]="rec.priority === 'medium'"
                                 [class.bg-green-100]="rec.priority === 'low'"
                                 [class.text-green-700]="rec.priority === 'low'">
                              {{ rec.priority }} Priority
                            </span>
                            <div class="w-fit flex items-center text-slate-500 text-sm font-mono bg-slate-50 px-3 py-1 rounded-lg">
                               <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                               </svg>
                               {{ rec.window }}
                            </div>
                         </div>
                         <p class="text-slate-800 text-lg mt-2">{{ rec.action }}</p>
                      </div>
                    }
                  </div>
                </div>
             </div>

             <!-- Sidebar Column -->
             <div class="space-y-6">
                <!-- Weather Context -->
                <div class="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                   <div class="flex items-center space-x-3 mb-4">
                     <div class="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                     </div>
                     <h3 class="font-bold text-blue-900">Environmental Context</h3>
                   </div>
                   <p class="text-sm text-blue-800 leading-relaxed">{{ report.weatherContext }}</p>
                </div>

                <!-- Provenance -->
                <div class="bg-slate-100 p-6 rounded-2xl border border-slate-200">
                   <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">AI Provenance & Citations</h3>
                   <ul class="space-y-3">
                     @for (source of report.provenance; track $index) {
                       <li class="flex items-start space-x-3">
                         <span class="block w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 shrink-0"></span>
                         <span class="text-xs text-slate-600 leading-relaxed">{{ source }}</span>
                       </li>
                     }
                   </ul>
                </div>
             </div>
          </div>
        }
      </div>
      
      <!-- Footer -->
      <div class="bg-white border-t border-slate-100 p-4 text-center hidden md:block">
        <button (click)="service.setView('dashboard')" class="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors">
          Return to Dashboard
        </button>
      </div>
    </div>
  `
})
export class ReportComponent {
  service = inject(HarvestService);
  isDownloading = signal(false);

  getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  async downloadPdf() {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);

    const reportContent = document.getElementById('reportContent');
    if (!reportContent) {
      console.error("Report content element not found!");
      this.isDownloading.set(false);
      return;
    }

    try {
      const canvas = await html2canvas(reportContent, { 
        scale: 2, // Higher scale for better quality
        useCORS: true,
        backgroundColor: '#f8fafc' // Tailwind slate-50 color
      });
      const imgData = canvas.toDataURL('image/png');

      const { jsPDF } = jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add new pages if the content is taller than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`HarvestMind-Report-${this.getDateString()}.pdf`);
    } catch (e) {
      console.error("Error generating PDF", e);
      alert("Sorry, there was an error generating the PDF.");
    } finally {
      this.isDownloading.set(false);
    }
  }

  async shareReport() {
    const report = this.service.doctorReport();
    if (!report) return;

    const shareData = {
      title: 'HarvestMind Doctor Report',
      text: `HarvestMind Report Summary: ${report.summary}`,
      url: 'https://harvestmind.app/report/demo-123'
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        alert(`Simulated Share:\n\n${shareData.text}\n\nLink: ${shareData.url}`);
      }
    } catch (err) {
      console.log('Share canceled or failed', err);
    }
  }
}