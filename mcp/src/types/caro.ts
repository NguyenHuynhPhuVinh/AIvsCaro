/**
 * Các kiểu dữ liệu cho game Caro trong MCP
 */

export interface GameContext {
  gameId: string;
  board: number[][]; // 0: empty, 1: player1, 2: player2 (AI)
  currentPlayer: number; // 1 hoặc 2
  aiPlayer: number; // AI là player nào (luôn là 2)
  gameStatus: 'waiting' | 'playing' | 'won' | 'draw';
  winner?: number;
  lastMove?: { row: number; col: number };
  availableMoves: { row: number; col: number }[];
  boardSize: number;
}

export interface ConnectRequest {
  id: string;
  name: string;
}

export interface MoveRequest {
  gameId: string;
  row: number;
  col: number;
  playerId: string;
}

export interface ConnectResponse {
  success: boolean;
  message?: string;
  gameContext?: GameContext;
}

export interface MoveResponse {
  success: boolean;
  message?: string;
  gameContext?: GameContext;
}
