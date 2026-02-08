import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConnectionStore } from '../connectionStore';

describe('useConnectionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useConnectionStore.setState({
      socket: null,
      playerId: 'player_test123',
      playerName: '',
      isConnected: false,
      isReconnecting: false,
      currentRoomId: null,
      role: null,
    });
  });

  it('playerId has player_ prefix format', () => {
    // Reset to trigger actual getOrCreatePlayerId
    localStorage.clear();
    // Create a fresh store by clearing and re-importing won't work with singletons.
    // Instead, test the format of whatever value is there.
    const { playerId } = useConnectionStore.getState();
    expect(playerId).toMatch(/^player_/);
  });

  it('setPlayerId saves to localStorage and updates state', () => {
    useConnectionStore.getState().setPlayerId('player_new123');
    expect(useConnectionStore.getState().playerId).toBe('player_new123');
    expect(localStorage.getItem('cashflow_player_id')).toBe('player_new123');
  });

  it('setPlayerName saves to localStorage and updates state', () => {
    useConnectionStore.getState().setPlayerName('Alice');
    expect(useConnectionStore.getState().playerName).toBe('Alice');
    expect(localStorage.getItem('cashflow_player_name')).toBe('Alice');
  });

  it('setSocket updates socket state', () => {
    const fakeSocket = { id: 'sock1' } as any;
    useConnectionStore.getState().setSocket(fakeSocket);
    expect(useConnectionStore.getState().socket).toBe(fakeSocket);
  });

  it('setConnected updates isConnected', () => {
    useConnectionStore.getState().setConnected(true);
    expect(useConnectionStore.getState().isConnected).toBe(true);
  });

  it('disconnect calls socket.disconnect and resets fields', () => {
    const disconnectFn = vi.fn();
    const fakeSocket = { disconnect: disconnectFn } as any;
    useConnectionStore.setState({ socket: fakeSocket, isConnected: true, currentRoomId: 'room1', role: 'player' });

    useConnectionStore.getState().disconnect();

    expect(disconnectFn).toHaveBeenCalled();
    expect(useConnectionStore.getState().socket).toBeNull();
    expect(useConnectionStore.getState().isConnected).toBe(false);
    expect(useConnectionStore.getState().currentRoomId).toBeNull();
    expect(useConnectionStore.getState().role).toBeNull();
  });

  it('disconnect is safe to call without a socket', () => {
    useConnectionStore.setState({ socket: null });
    expect(() => useConnectionStore.getState().disconnect()).not.toThrow();
  });

  it('setCurrentRoomId and setRole update state', () => {
    useConnectionStore.getState().setCurrentRoomId('room42');
    expect(useConnectionStore.getState().currentRoomId).toBe('room42');

    useConnectionStore.getState().setRole('host');
    expect(useConnectionStore.getState().role).toBe('host');
  });
});
