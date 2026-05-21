import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserRole } from "@/types";

type SettingsState = {
  preferredPrinter?: string | null;
  printerByRole: Partial<Record<UserRole, string | null>>;
  getPreferredPrinter: (role?: UserRole | null) => string | null;
  setPreferredPrinter: (name: string | null) => void;
  setPrinterForRole: (role: UserRole, name: string | null) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      preferredPrinter: null,
      printerByRole: {},
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
    }),
    {
      name: "kiya-pos-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        preferredPrinter: s.preferredPrinter,
        printerByRole: s.printerByRole,
      }),
    },
  ),
);

export default useSettingsStore;
