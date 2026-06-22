import { create } from 'zustand';
import type { Report } from '@urbanreport/types';

interface ReportStoreState {
  reports: Report[];
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
}

export const useReportStore = create<ReportStoreState>((set) => ({
  reports: [],
  setReports: (reports) => set({ reports }),
  addReport: (report) =>
    set((state) => ({
      reports: [report, ...state.reports],
    })),
  updateReport: (id, updates) =>
    set((state) => ({
      reports: state.reports.map((report) =>
        report.id === id ? { ...report, ...updates } : report,
      ),
    })),
}));
