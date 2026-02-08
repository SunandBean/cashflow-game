export interface RoomPlayer {
  id: string;
  name: string;
  socketId: string;
  isReady: boolean;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt?: number;
  mode?: 'online' | 'companion';
}
