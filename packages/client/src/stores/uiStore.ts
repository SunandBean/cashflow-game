import { create } from 'zustand';

interface UIStore {
  showFinancialStatement: boolean;
  showCardModal: boolean;
  showDevicePass: boolean;
  currentModal: string | null;
  diceRolling: boolean;
  toggleFinancialStatement: () => void;
  setShowCardModal: (show: boolean) => void;
  setShowDevicePass: (show: boolean) => void;
  setDiceRolling: (rolling: boolean) => void;
  setCurrentModal: (modal: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  showFinancialStatement: false,
  showCardModal: false,
  showDevicePass: false,
  currentModal: null,
  diceRolling: false,

  toggleFinancialStatement: () =>
    set((s) => ({ showFinancialStatement: !s.showFinancialStatement })),

  setShowCardModal: (show: boolean) => set({ showCardModal: show }),

  setShowDevicePass: (show: boolean) => set({ showDevicePass: show }),

  setDiceRolling: (rolling: boolean) => set({ diceRolling: rolling }),

  setCurrentModal: (modal: string | null) => set({ currentModal: modal }),
}));
