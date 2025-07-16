"use client";

import { useState, useEffect } from "react";
import { useGameSocket } from "@/hooks/useSocket";
import { gameService } from "@/services/gameService";
import GameBoard from "@/components/GameBoard";
import { GameContext } from "@/types/game";

export default function Home() {
  const [gameContext, setGameContext] = useState<GameContext | null>(null);
  const [playerId] = useState(() => `player_${Date.now()}`);
  const [playerName] = useState("Human Player");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  const { socket, isConnected, connect, onGameUpdate, offGameUpdate } =
    useGameSocket();

  // Check server status on mount
  useEffect(() => {
    checkServerStatus();
  }, []);

  // Connect socket when component mounts
  useEffect(() => {
    connect();
    return () => {
      offGameUpdate();
    };
  }, [connect, offGameUpdate]);

  // Listen for game updates
  useEffect(() => {
    if (isConnected) {
      onGameUpdate((data) => {
        console.log("Game update received:", data);
        setGameContext(data.gameContext);
      });
    }
  }, [isConnected, onGameUpdate]);

  const checkServerStatus = async () => {
    try {
      const result = await gameService.healthCheck();
      setServerStatus(result.success ? "online" : "offline");
    } catch (error) {
      setServerStatus("offline");
    }
  };

  const createNewGame = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create game
      const gameId = `game_${Date.now()}`;
      const createResult = await gameService.createGame({ gameId });

      if (!createResult.success) {
        throw new Error(createResult.message);
      }

      // Join game as human player
      const joinResult = await gameService.joinGame(gameId, {
        playerId,
        playerName,
      });

      if (!joinResult.success) {
        throw new Error(joinResult.message);
      }

      setGameContext(joinResult.game!);
    } catch (error) {
      console.error("Error creating game:", error);
      setError(error instanceof Error ? error.message : "Lỗi không xác định");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellClick = async (row: number, col: number) => {
    if (!gameContext || gameContext.currentPlayer !== 1) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await gameService.makeMove(gameContext.gameId, {
        gameId: gameContext.gameId,
        row,
        col,
        playerId,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      if (result.gameContext) {
        setGameContext(result.gameContext);
      }
    } catch (error) {
      console.error("Error making move:", error);
      setError(error instanceof Error ? error.message : "Lỗi không xác định");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎮 AI vs Caro
          </h1>
          <p className="text-gray-600">Chơi Caro với AI thông qua MCP</p>

          {/* Server status */}
          <div className="mt-4 flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  serverStatus === "online"
                    ? "bg-green-500"
                    : serverStatus === "offline"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`}
              ></div>
              <span className="text-sm text-gray-600">
                Backend:{" "}
                {serverStatus === "online"
                  ? "Online"
                  : serverStatus === "offline"
                  ? "Offline"
                  : "Checking..."}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm text-gray-600">
                Socket: {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Game area */}
        <div className="max-w-4xl mx-auto">
          {!gameContext ? (
            <div className="text-center">
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Chưa có game nào. Tạo game mới để bắt đầu chơi với AI.
                </p>
                <button
                  onClick={createNewGame}
                  disabled={isLoading || serverStatus !== "online"}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? "Đang tạo game..." : "Tạo Game Mới"}
                </button>
              </div>

              {serverStatus === "offline" && (
                <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                  ⚠️ Backend server không khả dụng. Vui lòng kiểm tra kết nối.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Game controls */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={createNewGame}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Game Mới
                </button>

                <button
                  onClick={checkServerStatus}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Kiểm tra Server
                </button>
              </div>

              {/* Game board */}
              <GameBoard
                gameContext={gameContext}
                onCellClick={handleCellClick}
                disabled={isLoading || gameContext.currentPlayer !== 1}
              />

              {/* Instructions */}
              <div className="text-center text-sm text-gray-600 space-y-2">
                <p>
                  💡 <strong>Hướng dẫn:</strong> Tạo game → AI sẽ tự động kết
                  nối qua MCP → Bắt đầu chơi
                </p>
                <p>🔴 Bạn là Player 1 (đi trước) | 🔵 AI là Player 2</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
