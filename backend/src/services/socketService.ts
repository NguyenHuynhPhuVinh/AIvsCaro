/**
 * Service quản lý Socket.io connections và events
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import { GameService } from "./gameService.js";
import { ConnectRequest, MoveRequest, Player } from "../types/game.js";

export class SocketService {
  private io: SocketIOServer;
  private gameService: GameService;
  private connectedClients: Map<string, Socket> = new Map();
  private pendingAICallbacks: Map<string, Function> = new Map(); // Lưu callback của AI đang đợi

  constructor(io: SocketIOServer, gameService: GameService) {
    this.io = io;
    this.gameService = gameService;
    this.setupSocketHandlers();
  }

  /**
   * Thiết lập các event handlers cho Socket.io
   */
  private setupSocketHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Xử lý kết nối AI
      socket.on("ai_connect", (data: ConnectRequest, callback) => {
        this.handleAIConnect(socket, data, callback);
      });

      // Xử lý nước đi từ AI
      socket.on("ai_move", (data: MoveRequest, callback) => {
        this.handleAIMove(socket, data, callback);
      });

      // Xử lý disconnect
      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });

      // Xử lý lỗi
      socket.on("error", (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Xử lý kết nối AI
   */
  private handleAIConnect(
    socket: Socket,
    data: ConnectRequest,
    callback: Function
  ): void {
    try {
      console.log(`AI connecting: ${data.name} (${data.id})`);

      // Tìm game theo ID được cung cấp
      let gameId = data.id; // data.id chính là gameId
      let game = this.gameService.getGame(gameId);

      if (!game) {
        callback({
          success: false,
          message: `Game ${gameId} không tồn tại. Vui lòng tạo game từ frontend trước.`,
        });
        return;
      }

      // Tạo player AI
      const aiPlayer: Player = {
        id: `ai_${Date.now()}`, // Tạo unique ID cho AI player
        name: data.name,
        socketId: socket.id,
        isAI: true,
        playerNumber: 2, // AI luôn là player 2
      };

      // Thêm AI vào game
      const success = this.gameService.addPlayer(gameId, aiPlayer);
      if (!success) {
        callback({
          success: false,
          message: "Không thể thêm AI vào game",
        });
        return;
      }

      // Lưu socket connection
      this.connectedClients.set(aiPlayer.id, socket);

      // Nếu game đã có đủ 2 players
      if (game.players.length === 2) {
        const gameContext = this.gameService.getGameContext(game);

        // Broadcast game update cho frontend
        this.io.emit("game_update", {
          gameId: gameId,
          gameContext: gameContext,
        });

        console.log(`Game ${gameId} started with AI ${data.name}`);

        // Lưu callback để gọi sau khi human đánh
        this.pendingAICallbacks.set(aiPlayer.id, callback);

        // Nếu là lượt AI (player 2) thì gửi context ngay
        if (gameContext.currentPlayer === 2) {
          callback({
            success: true,
            message: "Kết nối thành công - Đến lượt AI",
            gameContext: gameContext,
            playerId: aiPlayer.id, // Trả về playerId cho AI
          });
          this.pendingAICallbacks.delete(aiPlayer.id);
        }
        // Nếu là lượt human thì đợi
      } else {
        // Đợi player khác
        callback({
          success: true,
          message: "Đang đợi player khác...",
        });
      }
    } catch (error) {
      console.error("Error in handleAIConnect:", error);
      callback({
        success: false,
        message: "Lỗi server khi kết nối AI",
      });
    }
  }

  /**
   * Xử lý nước đi từ AI
   */
  private handleAIMove(
    socket: Socket,
    data: MoveRequest,
    callback: Function
  ): void {
    try {
      console.log(`AI move: ${data.playerId} -> (${data.row}, ${data.col})`);

      const result = this.gameService.makeMove(data);

      if (result.success && result.gameContext) {
        // Broadcast game state cho frontend
        this.io.emit("game_update", {
          gameId: data.gameId,
          gameContext: result.gameContext,
        });

        console.log(`AI move processed successfully for game ${data.gameId}`);

        // Tìm AI player để lưu callback
        const game = this.gameService.getGame(data.gameId);
        const aiPlayer = game?.players.find((p) => p.isAI);

        if (aiPlayer && result.gameContext.gameStatus === "playing") {
          // Lưu callback để gọi sau khi human đánh
          this.pendingAICallbacks.set(aiPlayer.id, callback);

          // Nếu vẫn là lượt AI thì trả về ngay
          if (result.gameContext.currentPlayer === 2) {
            callback({
              success: true,
              gameContext: result.gameContext,
              playerId: aiPlayer.id,
            });
            this.pendingAICallbacks.delete(aiPlayer.id);
          }
          // Nếu là lượt human thì đợi (không gọi callback)
        } else {
          // Game đã kết thúc (won/draw), trả về ngay
          callback({
            success: true,
            gameContext: result.gameContext,
            playerId: aiPlayer?.id,
          });
        }
      } else {
        callback({
          success: false,
          message: result.message || "Nước đi không hợp lệ",
        });
      }
    } catch (error) {
      console.error("Error in handleAIMove:", error);
      callback({
        success: false,
        message: "Lỗi server khi xử lý nước đi",
      });
    }
  }

  /**
   * Xử lý disconnect
   */
  private handleDisconnect(socket: Socket): void {
    console.log(`Client disconnected: ${socket.id}`);

    // Tìm và xóa client khỏi danh sách
    for (const [clientId, clientSocket] of this.connectedClients.entries()) {
      if (clientSocket.id === socket.id) {
        this.connectedClients.delete(clientId);
        console.log(`Removed client ${clientId} from connected clients`);
        break;
      }
    }
  }

  /**
   * Gửi game context cho AI (được gọi từ bên ngoài)
   */
  public sendGameContextToAI(aiId: string, gameContext: any): boolean {
    const socket = this.connectedClients.get(aiId);
    if (socket) {
      socket.emit("game_context", gameContext);
      return true;
    }
    return false;
  }

  /**
   * Broadcast message cho tất cả clients
   */
  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  /**
   * Gửi message cho một client cụ thể
   */
  public sendToClient(clientId: string, event: string, data: any): boolean {
    const socket = this.connectedClients.get(clientId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }

  /**
   * Lấy danh sách clients đang kết nối
   */
  public getConnectedClients(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  /**
   * Thông báo đến lượt AI và gọi pending callback
   */
  public notifyAITurn(aiPlayerId: string, gameContext: any): boolean {
    const callback = this.pendingAICallbacks.get(aiPlayerId);
    if (callback) {
      callback({
        success: true,
        gameContext: gameContext,
        playerId: aiPlayerId, // Trả về playerId cho AI
      });
      this.pendingAICallbacks.delete(aiPlayerId);
      console.log(`Notified AI ${aiPlayerId} - their turn`);
      return true;
    }
    return false;
  }
}
