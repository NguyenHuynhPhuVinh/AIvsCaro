/**
 * Component hiển thị bàn cờ Caro
 */

"use client";

import { GameContext } from "@/types/game";

interface GameBoardProps {
  gameContext: GameContext;
  onCellClick: (row: number, col: number) => void;
  disabled?: boolean;
}

export default function GameBoard({
  gameContext,
  onCellClick,
  disabled = false,
}: GameBoardProps) {
  const { board, lastMove, currentPlayer, gameStatus } = gameContext;

  const getCellContent = (row: number, col: number) => {
    const value = board[row][col];
    if (value === 1) return "🔴"; // Human player
    if (value === 2) return "🔵"; // AI player
    return "";
  };

  const getCellClass = (row: number, col: number) => {
    let baseClass =
      "w-8 h-8 border border-gray-400 flex items-center justify-center text-lg cursor-pointer hover:bg-gray-100 transition-colors";

    // Highlight last move
    if (lastMove && lastMove.row === row && lastMove.col === col) {
      baseClass += " bg-yellow-200 hover:bg-yellow-300";
    }

    // Disable if game ended or not player's turn
    if (disabled || gameStatus !== "playing" || board[row][col] !== 0) {
      baseClass += " cursor-not-allowed opacity-60";
    }

    return baseClass;
  };

  const handleCellClick = (row: number, col: number) => {
    if (disabled || gameStatus !== "playing" || board[row][col] !== 0) {
      return;
    }
    onCellClick(row, col);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Game status */}
      <div className="text-center">
        <div className="text-lg font-semibold mb-2">
          {gameStatus === "waiting" && "⏳ Đang đợi AI kết nối..."}
          {gameStatus === "playing" && (
            <>{currentPlayer === 1 ? "🔴 Lượt của bạn" : "🔵 Lượt của AI"}</>
          )}
          {gameStatus === "won" && (
            <>{gameContext.winner === 1 ? "🎉 Bạn thắng!" : "🤖 AI thắng!"}</>
          )}
          {gameStatus === "draw" && "🤝 Hòa!"}
        </div>

        {lastMove && (
          <div className="text-sm text-gray-600">
            Nước đi cuối: ({lastMove.row}, {lastMove.col})
          </div>
        )}
      </div>

      {/* Board */}
      <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-0 border-2 border-gray-600 bg-white">
        {board.map((row, rowIndex) =>
          row.map((_, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellClass(rowIndex, colIndex)}
              onClick={() => handleCellClick(rowIndex, colIndex)}
              title={`(${rowIndex}, ${colIndex})`}
            >
              {getCellContent(rowIndex, colIndex)}
            </div>
          ))
        )}
      </div>

      {/* Game info */}
      <div className="text-center text-sm text-gray-600 space-y-1">
        <div>Game ID: {gameContext.gameId}</div>
        <div>Nước đi có thể: {gameContext.availableMoves.length}</div>
        <div className="flex items-center justify-center space-x-4">
          <span>
            🔴 Player 1 {gameContext.aiPlayer === 1 ? "(AI)" : "(Human)"}
          </span>
          <span>
            🔵 Player 2 {gameContext.aiPlayer === 2 ? "(AI)" : "(Human/AI)"}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Hỗ trợ Human vs AI và AI vs AI
        </div>
      </div>
    </div>
  );
}
