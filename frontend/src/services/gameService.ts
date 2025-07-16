/**
 * Service để giao tiếp với backend API
 */

import { CreateGameRequest, JoinGameRequest, MoveRequest, GameResponse, GameContext } from '@/types/game';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class GameService {
  /**
   * Tạo game mới
   */
  async createGame(request: CreateGameRequest): Promise<GameResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: data.error || 'Lỗi khi tạo game',
        };
      }

      return {
        success: true,
        message: data.message,
        game: data.game,
      };
    } catch (error) {
      console.error('Error creating game:', error);
      return {
        success: false,
        message: 'Lỗi kết nối server',
      };
    }
  }

  /**
   * Join game
   */
  async joinGame(gameId: string, request: JoinGameRequest): Promise<GameResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/${gameId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: data.error || 'Lỗi khi join game',
        };
      }

      return {
        success: true,
        message: data.message,
        game: data.game,
      };
    } catch (error) {
      console.error('Error joining game:', error);
      return {
        success: false,
        message: 'Lỗi kết nối server',
      };
    }
  }

  /**
   * Thực hiện nước đi
   */
  async makeMove(gameId: string, request: MoveRequest): Promise<GameResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/${gameId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Lỗi khi thực hiện nước đi',
        };
      }

      return {
        success: true,
        gameContext: data.gameContext,
      };
    } catch (error) {
      console.error('Error making move:', error);
      return {
        success: false,
        message: 'Lỗi kết nối server',
      };
    }
  }

  /**
   * Lấy thông tin game
   */
  async getGame(gameId: string): Promise<GameResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/game/${gameId}`);
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: data.error || 'Lỗi khi lấy thông tin game',
        };
      }

      return {
        success: true,
        game: data.game,
      };
    } catch (error) {
      console.error('Error getting game:', error);
      return {
        success: false,
        message: 'Lỗi kết nối server',
      };
    }
  }

  /**
   * Lấy danh sách tất cả games
   */
  async getAllGames(): Promise<{ success: boolean; games?: GameContext[]; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/games`);
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: 'Lỗi khi lấy danh sách games',
        };
      }

      return {
        success: true,
        games: data.games,
      };
    } catch (error) {
      console.error('Error getting games:', error);
      return {
        success: false,
        message: 'Lỗi kết nối server',
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: 'Server không khả dụng',
        };
      }

      return {
        success: true,
        message: data.status,
      };
    } catch (error) {
      console.error('Error health check:', error);
      return {
        success: false,
        message: 'Không thể kết nối server',
      };
    }
  }
}

export const gameService = new GameService();
