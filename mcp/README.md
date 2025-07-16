# CaroMCP

## Giới thiệu

MCP giúp AI chơi Caro

## Cấu hình với Model Context Protocol (MCP)

### Claude Desktop

1. Mở Claude Desktop và vào Settings
2. Chọn mục Developer và bật Developer Mode
3. Tìm file cấu hình tại:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
4. Thêm cấu hình MCP vào file:

```json
{
  "mcpServers": {
    "CaroMCP": {
      "command": "node",
      "args": ["đường/dẫn/đến/build/index.js"]
    }
  }
}
```
