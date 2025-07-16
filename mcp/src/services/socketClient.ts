/**
 * Socket.io client service để kết nối với backend
 */

import { io, Socket } from 'socket.io-client';
import { ConnectRequest, MoveRequest, ConnectResponse, MoveResponse, GameContext } from '../types/caro.js';

export class SocketClient {
  private socket: Socket | null = null;
  private serverUrl: string;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  /**
   * Kết nối đến server
   */
  private async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          console.log('Connected to backend server');
          this.isConnected = true;
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('Disconnected from backend server');
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.socket.on('error', (error) => {
          console.error('Socket error:', error);
        });

      } catch (error) {
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Kết nối AI với backend và đợi game context
   */
  async connectToGame(request: ConnectRequest): Promise<ConnectResponse> {
    try {
      // Đảm bảo socket đã kết nối
      if (!this.isConnected) {
        await this.connect();
      }

      if (!this.socket) {
        throw new Error('Socket not initialized');
      }

      console.log(`Connecting AI ${request.name} (${request.id}) to game...`);

      // Gửi yêu cầu kết nối và đợi phản hồi
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000); // 30 giây timeout

        this.socket!.emit('ai_connect', request, (response: ConnectResponse) => {
          clearTimeout(timeout);
          
          if (response.success) {
            console.log('AI connected successfully:', response.message);
            if (response.gameContext) {
              console.log('Received game context:', {
                gameId: response.gameContext.gameId,
                currentPlayer: response.gameContext.currentPlayer,
                gameStatus: response.gameContext.gameStatus
              });
            }
          } else {
            console.error('AI connection failed:', response.message);
          }
          
          resolve(response);
        });
      });

    } catch (error) {
      console.error('Error in connectToGame:', error);
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Thực hiện nước đi và đợi phản hồi
   */
  async makeMove(request: MoveRequest): Promise<MoveResponse> {
    try {
      if (!this.isConnected || !this.socket) {
        throw new Error('Not connected to server');
      }

      console.log(`Making move: (${request.row}, ${request.col}) for player ${request.playerId}`);

      // Gửi nước đi và đợi phản hồi
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Move timeout'));
        }, 15000); // 15 giây timeout

        this.socket!.emit('ai_move', request, (response: MoveResponse) => {
          clearTimeout(timeout);
          
          if (response.success) {
            console.log('Move successful');
            if (response.gameContext) {
              console.log('Received updated game context:', {
                gameId: response.gameContext.gameId,
                currentPlayer: response.gameContext.currentPlayer,
                gameStatus: response.gameContext.gameStatus,
                lastMove: response.gameContext.lastMove
              });
            }
          } else {
            console.error('Move failed:', response.message);
          }
          
          resolve(response);
        });
      });

    } catch (error) {
      console.error('Error in makeMove:', error);
      return {
        success: false,
        message: `Move error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Lắng nghe event từ server
   */
  onGameContext(callback: (context: GameContext) => void): void {
    if (this.socket) {
      this.socket.on('game_context', callback);
    }
  }

  /**
   * Lắng nghe khi đến lượt AI
   */
  onYourTurn(callback: (context: GameContext) => void): void {
    if (this.socket) {
      this.socket.on('your_turn', callback);
    }
  }

  /**
   * Lắng nghe game update
   */
  onGameUpdate(callback: (data: { gameId: string; gameContext: GameContext }) => void): void {
    if (this.socket) {
      this.socket.on('game_update', callback);
    }
  }

  /**
   * Ngắt kết nối
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionPromise = null;
      console.log('Disconnected from server');
    }
  }

  /**
   * Kiểm tra trạng thái kết nối
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Lấy socket instance (để debug)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}
