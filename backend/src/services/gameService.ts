/**
 * Service quản lý logic game Caro
 */

import { Game, Player, GameContext, MoveRequest } from '../types/game.js';

export class GameService {
  private games: Map<string, Game> = new Map();
  private readonly BOARD_SIZE = 15;
  private readonly WIN_LENGTH = 5;

  /**
   * Tạo game mới
   */
  createGame(gameId: string): Game {
    const game: Game = {
      id: gameId,
      players: [],
      board: this.createEmptyBoard(),
      currentPlayer: 1,
      status: 'waiting',
      boardSize: this.BOARD_SIZE,
      createdAt: new Date()
    };

    this.games.set(gameId, game);
    return game;
  }

  /**
   * Thêm player vào game
   */
  addPlayer(gameId: string, player: Player): boolean {
    const game = this.games.get(gameId);
    if (!game || game.players.length >= 2) {
      return false;
    }

    // Player đầu tiên là human (player 1), AI luôn là player 2
    player.playerNumber = game.players.length === 0 ? 1 : 2;
    game.players.push(player);

    // Nếu đủ 2 players thì bắt đầu game
    if (game.players.length === 2) {
      game.status = 'playing';
    }

    return true;
  }

  /**
   * Thực hiện nước đi
   */
  makeMove(moveRequest: MoveRequest): { success: boolean; message?: string; gameContext?: GameContext } {
    const game = this.games.get(moveRequest.gameId);
    if (!game) {
      return { success: false, message: 'Game không tồn tại' };
    }

    if (game.status !== 'playing') {
      return { success: false, message: 'Game chưa bắt đầu hoặc đã kết thúc' };
    }

    const player = game.players.find(p => p.id === moveRequest.playerId);
    if (!player) {
      return { success: false, message: 'Player không tồn tại trong game' };
    }

    if (player.playerNumber !== game.currentPlayer) {
      return { success: false, message: 'Không phải lượt của bạn' };
    }

    const { row, col } = moveRequest;
    if (!this.isValidMove(game, row, col)) {
      return { success: false, message: 'Nước đi không hợp lệ' };
    }

    // Thực hiện nước đi
    game.board[row][col] = player.playerNumber;
    game.lastMove = { row, col };

    // Kiểm tra thắng
    if (this.checkWin(game.board, row, col, player.playerNumber)) {
      game.status = 'won';
      game.winner = player.playerNumber;
    } else if (this.isBoardFull(game.board)) {
      game.status = 'draw';
    } else {
      // Chuyển lượt
      game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
    }

    return {
      success: true,
      gameContext: this.getGameContext(game)
    };
  }

  /**
   * Lấy game context
   */
  getGameContext(game: Game): GameContext {
    return {
      gameId: game.id,
      board: game.board.map(row => [...row]), // Deep copy
      currentPlayer: game.currentPlayer,
      aiPlayer: 2, // AI luôn là player 2
      gameStatus: game.status,
      winner: game.winner,
      lastMove: game.lastMove,
      availableMoves: this.getAvailableMoves(game.board),
      boardSize: game.boardSize
    };
  }

  /**
   * Lấy game theo ID
   */
  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  /**
   * Tạo bàn cờ trống
   */
  private createEmptyBoard(): number[][] {
    return Array(this.BOARD_SIZE).fill(null).map(() => Array(this.BOARD_SIZE).fill(0));
  }

  /**
   * Kiểm tra nước đi hợp lệ
   */
  private isValidMove(game: Game, row: number, col: number): boolean {
    return row >= 0 && row < this.BOARD_SIZE && 
           col >= 0 && col < this.BOARD_SIZE && 
           game.board[row][col] === 0;
  }

  /**
   * Kiểm tra thắng
   */
  private checkWin(board: number[][], row: number, col: number, player: number): boolean {
    const directions = [
      [0, 1],   // Ngang
      [1, 0],   // Dọc
      [1, 1],   // Chéo chính
      [1, -1]   // Chéo phụ
    ];

    for (const [dx, dy] of directions) {
      let count = 1; // Đếm ô hiện tại

      // Đếm về phía trước
      for (let i = 1; i < this.WIN_LENGTH; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (newRow < 0 || newRow >= this.BOARD_SIZE || 
            newCol < 0 || newCol >= this.BOARD_SIZE || 
            board[newRow][newCol] !== player) {
          break;
        }
        count++;
      }

      // Đếm về phía sau
      for (let i = 1; i < this.WIN_LENGTH; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (newRow < 0 || newRow >= this.BOARD_SIZE || 
            newCol < 0 || newCol >= this.BOARD_SIZE || 
            board[newRow][newCol] !== player) {
          break;
        }
        count++;
      }

      if (count >= this.WIN_LENGTH) {
        return true;
      }
    }

    return false;
  }

  /**
   * Kiểm tra bàn cờ đầy
   */
  private isBoardFull(board: number[][]): boolean {
    return board.every(row => row.every(cell => cell !== 0));
  }

  /**
   * Lấy danh sách nước đi có thể
   */
  private getAvailableMoves(board: number[][]): { row: number; col: number }[] {
    const moves: { row: number; col: number }[] = [];
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (board[row][col] === 0) {
          moves.push({ row, col });
        }
      }
    }
    return moves;
  }

  /**
   * Xóa game
   */
  removeGame(gameId: string): boolean {
    return this.games.delete(gameId);
  }

  /**
   * Lấy tất cả games
   */
  getAllGames(): Game[] {
    return Array.from(this.games.values());
  }
}
