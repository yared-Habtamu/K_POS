/// <reference types="vite/client" />

interface PosDesktopApi {
  getQueuedSales: () => Promise<any[]>;
  saveSale: (sale: Record<string, unknown>) => Promise<{ id: string }>;
  markSynced: (id: string) => Promise<{ ok: boolean }>;
  getCachedProducts: () => Promise<any[]>;
  setCachedProducts: (
    products: any[],
  ) => Promise<{ ok: boolean; count: number }>;
  runSyncNow: () => Promise<{
    ok: boolean;
    skipped?: boolean;
    reason?: string;
    syncedCount?: number;
    failedCount?: number;
    lastSyncAt?: number | null;
    lastSyncError?: string | null;
  }>;
  getSyncStatus: () => Promise<{
    pendingCount: number;
    isSyncing: boolean;
    lastSyncAt: number | null;
    lastSyncError: string | null;
  }>;
}

interface Window {
  posApi?: PosDesktopApi;
}
