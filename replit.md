# FlowForge

Visual workflow orchestration powered by AI. Design workflows in natural language, execute with Claude tools, visualize with LogicArt.

## Overview

FlowForge is an MCP (Model Context Protocol) server that enables Claude Desktop and Cowork to:
- Generate workflows from natural language
- Visualize workflows via LogicArt integration
- Query multiple AI models via Council
- Save/load/list workflows
- Search the web and summarize content

## Project Structure

```
/
├── src/
│   ├── mcp/server.ts      # Main MCP server with SSE/JSON-RPC
│   ├── types/workflow.ts   # TypeScript workflow definitions
│   ├── generator/         # Workflow generation from prompts
│   ├── executor/          # Workflow execution engine
│   ├── integration/       # LogicArt adapter
│   ├── council/           # Multi-AI query system
│   ├── tools/             # Tool handlers & persistence
│   └── examples/          # Example workflow JSON files
├── public/                # Dashboard static files
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── docs/                  # Documentation
│   ├── README.md
│   └── COWORK_GUIDE.md
└── workflows/             # Saved workflow storage
```

## Key Features

1. **MCP Protocol Support**: Full JSON-RPC 2.0 over SSE for Claude Desktop/Cowork
2. **LogicArt Integration**: Generate visual flowchart URLs
3. **AI Council**: Query Claude, GPT-4, Gemini simultaneously
4. **Dashboard**: Web UI for viewing saved workflows and tools
5. **Persistence**: Save/load workflow definitions

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard UI |
| `/api/mcp/sse` | GET | SSE connection |
| `/api/mcp/sse` | POST | JSON-RPC requests |
| `/api/mcp/tools` | GET | List MCP tools |
| `/api/mcp/call` | POST | Execute tool |

## Recent Changes

- 2026-01-16: Added SSE endpoint with full MCP JSON-RPC protocol
- 2026-01-16: Created dashboard UI
- 2026-01-16: Added example workflows and documentation
- 2026-01-16: Fixed TypeScript PORT type issue

## Configuration

- Server runs on port 5000 (or PORT env var)
- Production deployment: Autoscale with `node dist/mcp/server.js`
- Claude Desktop config in docs/README.md
