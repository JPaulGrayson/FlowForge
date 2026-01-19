# Orchestrate

Visual workflow orchestration powered by AI. Design workflows in natural language, execute with Claude tools, visualize with LogicArt.

## Overview

Orchestrate is an MCP (Model Context Protocol) server that enables Claude Desktop and Cowork to:
- Generate workflows from natural language
- Visualize workflows via LogicArt/LogiProcess integration
- Manage agent messages via Quack Control Room
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
│   ├── quack/             # Quack agent messaging integration
│   │   └── poller.ts      # QuackPoller service for inbox management
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
2. **LogicArt/LogiProcess Integration**: Generate visual flowchart URLs
3. **Quack Control Room**: Agent-to-agent messaging with workflow actions
4. **AI Council**: Query Claude, GPT-4, Gemini simultaneously
5. **Dashboard**: Web UI for workflows, control room, and tools
6. **Persistence**: Save/load workflow definitions

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard UI |
| `/api/mcp/sse` | GET | SSE connection |
| `/api/mcp/sse` | POST | JSON-RPC requests |
| `/api/mcp/tools` | GET | List MCP tools |
| `/api/mcp/call` | POST | Execute tool |
| `/api/quack/inboxes` | GET | List all agent inboxes |
| `/api/quack/inbox/:name` | GET | Get specific inbox |
| `/api/quack/approve/:id` | POST | Approve a message |
| `/api/quack/status/:id` | POST | Update message status |
| `/api/quack/send` | POST | Send message to agent |

## Quack Integration

Quack (quack.us.com) enables agent-to-agent messaging with workflow management:

**Monitored Inboxes**: claude, replit, cursor, gpt, gemini, grok, copilot, antigravity

**Message Workflow**: pending → approved → in_progress → completed/failed

**MCP Tools**:
- `quack_check_inbox` - Check specific inbox for messages
- `quack_list_inboxes` - List all inboxes with pending counts
- `quack_approve` - Approve a pending message
- `quack_update_status` - Update message status
- `quack_send` - Send task to another agent

**Control Room**: Dashboard tab for viewing agent tiles, message counts, and managing message workflows with approve/start/complete/fail actions.

## Recent Changes

- 2026-01-19: Added Quack Control Room with agent messaging
- 2026-01-19: Added 5 Quack MCP tools for agent coordination
- 2026-01-16: Added SSE endpoint with full MCP JSON-RPC protocol
- 2026-01-16: Created dashboard UI
- 2026-01-16: Added example workflows and documentation
- 2026-01-16: Fixed TypeScript PORT type issue

## Configuration

- Server runs on port 5000 (or PORT env var)
- Production deployment: Autoscale with `node dist/mcp/server.js`
- Claude Desktop config in docs/README.md
