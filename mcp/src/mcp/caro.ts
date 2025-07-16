/**
 * Module đăng ký công cụ MCP cho game Caro
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SocketClient } from "../services/socketClient.js";
import { ConnectRequest, MoveRequest } from "../types/caro.js";

// Khởi tạo socket client
const socketClient = new SocketClient();

// Lưu playerId để sử dụng cho các tool khác
let currentPlayerId: string | null = null;

/**
 * Đăng ký các công cụ MCP cho game Caro
 * @param server Server MCP
 */
export function registerCaroTools(server: McpServer) {
  // Tool 1: Kết nối với backend và đợi game context
  server.tool(
    "connect_to_caro_game",
    "Kết nối AI với backend game Caro và đợi nhận game context. Tool này sẽ blocking wait cho đến khi nhận được phản hồi từ backend. Hỗ trợ AI vs AI.",
    {
      id: z.string().describe("ID của game (ví dụ: game_1752668409034)"),
      name: z.string().describe("Tên của AI player"),
      preferredPlayerNumber: z
        .number()
        .int()
        .min(1)
        .max(2)
        .optional()
        .describe(
          "Player number mong muốn (1 hoặc 2). Player 1 đi trước, Player 2 đi sau. Optional - nếu không chọn sẽ tự động assign."
        ),
    },
    async ({ id, name, preferredPlayerNumber }) => {
      try {
        // Sử dụng client mặc định
        const request: ConnectRequest = { id, name, preferredPlayerNumber };
        const response = await socketClient.connectToGame(request);

        if (response.success) {
          // Lưu playerId để sử dụng cho các tool khác
          if ((response as any).playerId) {
            currentPlayerId = (response as any).playerId;
          }

          // Nếu có gameContext thì hiển thị đầy đủ, nếu không thì chỉ hiển thị thông báo
          if (response.gameContext) {
            return {
              content: [
                {
                  type: "text",
                  text: `🎮 Kết nối thành công với game Caro!

**📋 LUẬT CHƠI CARO:**
- Bàn cờ 15x15 ô
- 🔴 Player 1 - đi trước (có thể là Human hoặc AI)
- 🔵 Player 2 - đi sau (có thể là Human hoặc AI)
- **ĐIỀU KIỆN THẮNG: Tạo được 5 quân liên tiếp** (ngang/dọc/chéo)
- Không có cấm thủ, chơi tự do
- **HỖ TRỢ AI vs AI**: Có thể có 2 AI cùng chơi với nhau

**🧠 CHIẾN THUẬT CHO AI:**
- **NGHIÊM TÚC**: Đây là trận đấu thực sự, hãy suy luận kỹ lưỡng
- **MỤC TIÊU**: Dùng hết khả năng để THẮNG, không chơi đùa
- **ƯU TIÊN**: 1) Chặn đối thủ tạo 4 liên tiếp 2) Tạo cơ hội thắng cho mình 3) Kiểm soát trung tâm
- **PHÂN TÍCH**: Luôn đánh giá toàn bộ bàn cờ trước khi đánh
- **CHIẾN LƯỢC**: Tạo nhiều hướng tấn công đồng thời, ép đối thủ phải phòng thủ

**Thông tin game hiện tại:**
- Game ID: ${response.gameContext.gameId}
- Trạng thái: ${response.gameContext.gameStatus}
- Lượt hiện tại: Player ${response.gameContext.currentPlayer}
- AI này là Player: ${preferredPlayerNumber || "Auto-assigned"}
- AI Player ID: ${(response as any).playerId || "Chưa có"}
- Kích thước bàn cờ: ${response.gameContext.boardSize}x${
                    response.gameContext.boardSize
                  }

**Bàn cờ hiện tại:**
${formatBoard(response.gameContext.board)}

**Nước đi có thể:** ${response.gameContext.availableMoves.length} vị trí

${
  (response as any).playerId &&
  response.gameContext.currentPlayer ===
    (preferredPlayerNumber || response.gameContext.aiPlayer)
    ? `🤖 Đến lượt AI này! Hãy sử dụng tool 'make_caro_move' với:
- gameId: ${response.gameContext.gameId}
- playerId: ${(response as any).playerId || currentPlayerId}
- row: [0-14]
- col: [0-14]`
    : "⏳ Đang đợi player khác đánh..."
}

**Message:** ${response.message || "Không có thông báo"}`,
                },
              ],
            };
          } else {
            // Chưa có gameContext - trường hợp này không nên xảy ra với blocking wait
            // Nhưng để phòng trường hợp lỗi
            return {
              content: [
                {
                  type: "text",
                  text: `⚠️ Kết nối thành công nhưng chưa nhận được game context.

**Message:** ${response.message || "Không có thông báo"}
**Player ID:** ${(response as any).playerId || "Chưa có"}`,
                },
              ],
            };
          }
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
      gameId: z.string().describe("ID của game"),
      row: z.number().int().min(0).max(14).describe("Hàng (0-14)"),
      col: z.number().int().min(0).max(14).describe("Cột (0-14)"),
      playerId: z.string().describe("ID của AI player"),
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
