/**
 * Module đăng ký công cụ MCP cho game Caro
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SocketClient } from "../services/socketClient.js";
import { ConnectRequest, MoveRequest } from "../types/caro.js";

// Khởi tạo socket client
const socketClient = new SocketClient();

/**
 * Đăng ký các công cụ MCP cho game Caro
 * @param server Server MCP
 */
export function registerCaroTools(server: McpServer) {
  // Tool 1: Kết nối với backend và đợi game context
  server.tool(
    "connect_to_caro_game",
    "Kết nối AI với backend game Caro và đợi nhận game context. Tool này sẽ blocking wait cho đến khi nhận được phản hồi từ backend.",
    {
      id: {
        type: "string",
        description: "ID của game (ví dụ: game_1752668409034)",
      },
      name: {
        type: "string",
        description: "Tên của AI player",
      },
    },
    async ({ id, name }) => {
      try {
        // Sử dụng client mặc định
        const request: ConnectRequest = { id, name };
        const response = await socketClient.connectToGame(request);

        if (response.success && response.gameContext) {
          return {
            content: [
              {
                type: "text",
                text: `🎮 Kết nối thành công với game Caro!

**Thông tin game:**
- Game ID: ${response.gameContext.gameId}
- Trạng thái: ${response.gameContext.gameStatus}
- Lượt hiện tại: Player ${response.gameContext.currentPlayer}
- AI là Player: ${response.gameContext.aiPlayer}
- Kích thước bàn cờ: ${response.gameContext.boardSize}x${
                  response.gameContext.boardSize
                }

**Bàn cờ hiện tại:**
${formatBoard(response.gameContext.board)}

**Nước đi có thể:** ${response.gameContext.availableMoves.length} vị trí

${
  response.gameContext.currentPlayer === response.gameContext.aiPlayer
    ? "🤖 Đến lượt AI! Hãy sử dụng tool 'make_caro_move' để đánh."
    : "⏳ Đang đợi player khác..."
}

**Message:** ${response.message || "Không có thông báo"}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `❌ Kết nối thất bại: ${
                  response.message || "Lỗi không xác định"
                }`,
              },
            ],
          };
        }
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `💥 Lỗi khi kết nối: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // Tool 2: Thực hiện nước đi và đợi phản hồi
  server.tool(
    "make_caro_move",
    "Thực hiện nước đi trong game Caro và đợi phản hồi từ backend. Tool này sẽ blocking wait cho đến khi nhận được kết quả.",
    {
      gameId: {
        type: "string",
        description: "ID của game",
      },
      row: {
        type: "number",
        description: "Hàng (0-14)",
      },
      col: {
        type: "number",
        description: "Cột (0-14)",
      },
      playerId: {
        type: "string",
        description: "ID của AI player",
      },
    },
    async ({ gameId, row, col, playerId }) => {
      try {
        const request: MoveRequest = { gameId, row, col, playerId };
        const response = await socketClient.makeMove(request);

        if (response.success && response.gameContext) {
          const context = response.gameContext;
          let statusMessage = "";

          switch (context.gameStatus) {
            case "won":
              statusMessage =
                context.winner === context.aiPlayer
                  ? "🎉 AI THẮNG!"
                  : "😔 AI THUA!";
              break;
            case "draw":
              statusMessage = "🤝 HÒA!";
              break;
            case "playing":
              statusMessage =
                context.currentPlayer === context.aiPlayer
                  ? "🤖 Vẫn là lượt AI!"
                  : "⏳ Đang đợi player khác...";
              break;
            default:
              statusMessage = `Trạng thái: ${context.gameStatus}`;
          }

          return {
            content: [
              {
                type: "text",
                text: `✅ Nước đi thành công! AI đã đánh vào (${row}, ${col})

**Trạng thái game:** ${statusMessage}

**Bàn cờ sau nước đi:**
${formatBoard(context.board)}

**Thông tin:**
- Lượt hiện tại: Player ${context.currentPlayer}
- Nước đi cuối: ${
                  context.lastMove
                    ? `(${context.lastMove.row}, ${context.lastMove.col})`
                    : "Chưa có"
                }
- Nước đi có thể: ${context.availableMoves.length} vị trí

${
  context.gameStatus === "playing" && context.currentPlayer === context.aiPlayer
    ? "🤖 Vẫn là lượt AI! Hãy tiếp tục đánh."
    : ""
}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `❌ Nước đi thất bại: ${
                  response.message || "Lỗi không xác định"
                }`,
              },
            ],
          };
        }
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `💥 Lỗi khi thực hiện nước đi: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // Tool 3: Ngắt kết nối
  server.tool(
    "disconnect_from_caro_game",
    "Ngắt kết nối khỏi backend game Caro",
    {},
    async () => {
      try {
        socketClient.disconnect();
        return {
          content: [
            {
              type: "text",
              text: "🔌 Đã ngắt kết nối khỏi game Caro",
            },
          ],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `💥 Lỗi khi ngắt kết nối: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );
}

/**
 * Format bàn cờ để hiển thị
 */
function formatBoard(board: number[][]): string {
  const symbols = ["⬜", "🔴", "🔵"]; // 0: empty, 1: player1, 2: player2(AI)
  let result = "   ";

  // Header với số cột
  for (let i = 0; i < board[0].length; i++) {
    result += `${i.toString().padStart(2)} `;
  }
  result += "\n";

  // Các hàng
  for (let i = 0; i < board.length; i++) {
    result += `${i.toString().padStart(2)} `;
    for (let j = 0; j < board[i].length; j++) {
      result += `${symbols[board[i][j]]} `;
    }
    result += "\n";
  }

  return result;
}
