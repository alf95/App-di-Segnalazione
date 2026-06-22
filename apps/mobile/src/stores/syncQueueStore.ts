import { create } from 'zustand';

interface SyncQueueStoreState {
  pendingCount: number;
  isSyncing: boolean;
  setPendingCount: (n: number) => void;
  setIsSyncing: (b: boolean) => void;
}

export const useSyncQueueStore = create<SyncQueueStoreState>((set) => ({
  pendingCount: 0,
  isSyncing: false,
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
}));
