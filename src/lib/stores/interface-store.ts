import { create } from "zustand";

type InterfaceState = {
  navigationOpen: boolean;
  setNavigationOpen: (open: boolean) => void;
};

export const useInterfaceStore = create<InterfaceState>((set) => ({
  navigationOpen: false,
  setNavigationOpen: (navigationOpen) => set({ navigationOpen }),
}));
