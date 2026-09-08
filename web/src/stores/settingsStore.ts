import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserRole } from "@/types";

type SettingsState = {
  preferredPrinter?: string | null;
  printerByRole: Partial<Record<UserRole, string | null>>;
  printNodeId: number | null;
  _syncedFromDB: boolean;
  getPreferredPrinter: (role?: UserRole | null) => string | null;
  setPreferredPrinter: (name: string | null) => void;
  setPrinterForRole: (role: UserRole, name: string | null) => void;
  setPrintNodeId: (id: number | null) => void;
  syncFromDB: (printNodeId: number | null) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      preferredPrinter: null,
      printerByRole: {},
      printNodeId: null,
      _syncedFromDB: false,
      getPreferredPrinter: (role) => {
        if (role && get().printerByRole[role])
          return get().printerByRole[role] || null;
        return get().preferredPrinter || null;
      },
      setPreferredPrinter: (name) => set({ preferredPrinter: name }),
      setPrinterForRole: (role, name) =>
        set((state) => ({
          printerByRole: { ...state.printerByRole, [role]: name },
          preferredPrinter: state.preferredPrinter || name,
        })),
      setPrintNodeId: (id) => set({ printNodeId: typeof id === "number" ? id : null }),
      syncFromDB: (printNodeId) => {
        const safeId = typeof printNodeId === "number" ? printNodeId : null;
        const current = get().printNodeId;
        if (safeId !== null) {
          set({ printNodeId: safeId, _syncedFromDB: true });
        } else if (current === null) {
          set({ _syncedFromDB: true });
        } else {
          set({ _syncedFromDB: true });
        }
      },
    }),
    {
      name: "kiya-pos-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        preferredPrinter: s.preferredPrinter,
        printerByRole: s.printerByRole,
        printNodeId: s.printNodeId,
      }),
      merge: (persistedState, currentState) => {
        const stored = persistedState as Record<string, any> | undefined;
        return {
          ...currentState,
          ...(stored || {}),
          printNodeId: typeof stored?.printNodeId === "number" ? stored.printNodeId : null,
        };
      },
    },
  ),
);

export default useSettingsStore;
