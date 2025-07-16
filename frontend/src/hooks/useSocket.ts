/**
 * Hook để quản lý Socket.io connection
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameContext } from '@/types/game';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useSocket(serverUrl: string = 'http://localhost:3001'): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const connect = () => {
    if (socketRef.current?.connected) {
      return;
    }

    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to backend server');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from backend server');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect,
  };
}

interface UseGameSocketReturn extends UseSocketReturn {
  onGameUpdate: (callback: (data: { gameId: string; gameContext: GameContext }) => void) => void;
  offGameUpdate: () => void;
}

export function useGameSocket(serverUrl?: string): UseGameSocketReturn {
  const { socket, isConnected, connect, disconnect } = useSocket(serverUrl);

  const onGameUpdate = (callback: (data: { gameId: string; gameContext: GameContext }) => void) => {
    if (socket) {
      socket.on('game_update', callback);
    }
  };

  const offGameUpdate = () => {
    if (socket) {
      socket.off('game_update');
    }
  };

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    onGameUpdate,
    offGameUpdate,
  };
}
