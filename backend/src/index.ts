/**
 * Main server file - Fastify + Socket.io
 */

import Fastify from "fastify";
import { Server as SocketIOServer } from "socket.io";
import cors from "@fastify/cors";
import { GameService } from "./services/gameService.js";
import { SocketService } from "./services/socketService.js";

const fastify = Fastify({
  logger: {
    level: "info",
  },
});

// Đăng ký CORS
await fastify.register(cors, {
  origin: true,
  credentials: true,
});

// Khởi tạo services
const gameService = new GameService();

// Tạo HTTP server từ Fastify
const server = fastify.server;

// Khởi tạo Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Khởi tạo Socket service
const socketService = new SocketService(io, gameService);

// Routes API cơ bản
fastify.get("/", async (request, reply) => {
  return {
    message: "AI vs Caro Backend Server",
    status: "running",
    timestamp: new Date().toISOString(),
  };
});

// API để lấy thông tin game
fastify.get("/api/game/:gameId", async (request, reply) => {
  const { gameId } = request.params as { gameId: string };
  const game = gameService.getGame(gameId);

  if (!game) {
    reply.code(404);
    return { error: "Game not found" };
  }

  return {
    game: gameService.getGameContext(game),
  };
});

// API để lấy danh sách tất cả games
fastify.get("/api/games", async (request, reply) => {
  const games = gameService.getAllGames();
  return {
    games: games.map((game) => gameService.getGameContext(game)),
  };
});

// API để tạo game mới (cho frontend - Human vs AI)
fastify.post("/api/game/create", async (request, reply) => {
  const { gameId } = request.body as { gameId?: string };
  const id = gameId || `game_${Date.now()}`;

  const existingGame = gameService.getGame(id);
  if (existingGame) {
    reply.code(400);
    return { error: "Game already exists" };
  }

  const game = gameService.createGame(id);
  return {
    message: "Human vs AI game created successfully",
    game: gameService.getGameContext(game),
    mode: "human-vs-ai",
  };
});

// API để tạo game AI vs AI
fastify.post("/api/game/create-ai-vs-ai", async (request, reply) => {
  const { gameId } = request.body as { gameId?: string };
  const id = gameId || `ai_game_${Date.now()}`;

  const existingGame = gameService.getGame(id);
  if (existingGame) {
    reply.code(400);
    return { error: "Game already exists" };
  }

  const game = gameService.createGame(id);
  return {
    message: "AI vs AI game created successfully",
    game: gameService.getGameContext(game),
    mode: "ai-vs-ai",
  };
});

// API để human player join game
fastify.post("/api/game/:gameId/join", async (request, reply) => {
  const { gameId } = request.params as { gameId: string };
  const { playerId, playerName } = request.body as {
    playerId: string;
    playerName: string;
  };

  const game = gameService.getGame(gameId);
  if (!game) {
    reply.code(404);
    return { error: "Game not found" };
  }

  const humanPlayer = {
    id: playerId,
    name: playerName,
    socketId: "", // Sẽ được cập nhật khi connect socket
    isAI: false,
    playerNumber: 1, // Human luôn là player 1
  };

  const success = gameService.addPlayer(gameId, humanPlayer);
  if (!success) {
    reply.code(400);
    return { error: "Cannot join game" };
  }

  return {
    message: "Joined game successfully",
    game: gameService.getGameContext(game),
  };
});

// API để human player thực hiện nước đi
fastify.post("/api/game/:gameId/move", async (request, reply) => {
  const { gameId } = request.params as { gameId: string };
  const { playerId, row, col } = request.body as {
    playerId: string;
    row: number;
    col: number;
  };

  const result = gameService.makeMove({ gameId, row, col, playerId });

  if (result.success && result.gameContext) {
    // Broadcast game update
    io.emit("game_update", {
      gameId,
      gameContext: result.gameContext,
    });

    // Tìm AI player có lượt tiếp theo (chỉ khi có gameContext)
    if (result.gameContext) {
      const game = gameService.getGame(gameId);
      const nextAI = game?.players.find(
        (p) => p.isAI && p.playerNumber === result.gameContext!.currentPlayer
      );

      if (nextAI) {
        // Nếu giờ là lượt AI và game vẫn đang chơi
        if (result.gameContext.gameStatus === "playing") {
          socketService.notifyAITurn(nextAI.id, result.gameContext);
        }
      }

      // Nếu game đã kết thúc, thông báo cho tất cả AI đang đợi
      if (result.gameContext.gameStatus !== "playing") {
        const allAIs = game?.players.filter((p) => p.isAI) || [];
        for (const ai of allAIs) {
          socketService.notifyAITurn(ai.id, result.gameContext!);
        }
      }
    }

    return {
      success: true,
      gameContext: result.gameContext,
    };
  } else {
    reply.code(400);
    return {
      success: false,
      message: result.message,
    };
  }
});

// Health check
fastify.get("/health", async (request, reply) => {
  return {
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
});

// Khởi động server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });

    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`📡 Socket.io ready for connections`);
    console.log(`🎮 Game service initialized`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Xử lý graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await fastify.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await fastify.close();
  process.exit(0);
});

start();
