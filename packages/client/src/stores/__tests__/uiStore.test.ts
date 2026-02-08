import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      showFinancialStatement: false,
      showCardModal: false,
      showDevicePass: false,
      currentModal: null,
      diceRolling: false,
    });
  });

  it('has correct initial state', () => {
    const state = useUIStore.getState();
    expect(state.showFinancialStatement).toBe(false);
    expect(state.showCardModal).toBe(false);
    expect(state.showDevicePass).toBe(false);
    expect(state.currentModal).toBeNull();
    expect(state.diceRolling).toBe(false);
  });

  it('toggleFinancialStatement toggles from false to true', () => {
    useUIStore.getState().toggleFinancialStatement();
    expect(useUIStore.getState().showFinancialStatement).toBe(true);
  });

  it('toggleFinancialStatement toggles from true to false', () => {
    useUIStore.setState({ showFinancialStatement: true });
    useUIStore.getState().toggleFinancialStatement();
    expect(useUIStore.getState().showFinancialStatement).toBe(false);
  });

  it('setShowCardModal sets showCardModal', () => {
    useUIStore.getState().setShowCardModal(true);
    expect(useUIStore.getState().showCardModal).toBe(true);
    useUIStore.getState().setShowCardModal(false);
    expect(useUIStore.getState().showCardModal).toBe(false);
  });

  it('setShowDevicePass sets showDevicePass', () => {
    useUIStore.getState().setShowDevicePass(true);
    expect(useUIStore.getState().showDevicePass).toBe(true);
  });

  it('setDiceRolling sets diceRolling', () => {
    useUIStore.getState().setDiceRolling(true);
    expect(useUIStore.getState().diceRolling).toBe(true);
  });

  it('setCurrentModal sets and clears the modal', () => {
    useUIStore.getState().setCurrentModal('deal');
    expect(useUIStore.getState().currentModal).toBe('deal');
    useUIStore.getState().setCurrentModal(null);
    expect(useUIStore.getState().currentModal).toBeNull();
  });
});
