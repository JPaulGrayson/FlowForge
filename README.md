# FlowForge

Visual workflow orchestration powered by AI. Design workflows in natural language, execute with Claude tools, visualize with LogicArt.

## Quick Start

npm install
npm run build
npm run server

## Claude Desktop Integration

Add to Claude Desktop config:

{
  "mcpServers": {
    "flowforge": {
      "transport": "http",
      "url": "http://localhost:5001/api/mcp"
    }
  }
}

## MCP Tools

- generate_workflow - Create workflow from natural language
- execute_workflow - Run a workflow  
- visualize_workflow - Get LogicArt visualization URL

## API Endpoints

- GET /api/mcp/tools - List available tools
- POST /api/mcp/call - Execute a tool
- GET /api/mcp/events/:id - SSE stream for real-time updates

## License

MIT
