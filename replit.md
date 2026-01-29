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
│   ├── app.js
│   └── agent-templates.json  # Agent template definitions
├── docs/                  # Documentation
│   ├── README.md
│   └── COWORK_GUIDE.md
└── workflows/             # Saved workflow storage
```

## Key Features

1. **LogicProcess (Build Mode)**: Visual node editor for creating workflow templates with drag-and-drop
2. **CoWork (Run Mode)**: Simplified UI for end users to run workflows with their own data
3. **MCP Protocol Support**: Full JSON-RPC 2.0 over SSE for Claude Desktop/Cowork
4. **Quack Control Room**: Agent-to-agent messaging with workflow actions
5. **Agent Template Gallery**: 12 pre-built agent templates with categories, complexity ratings, and LogiProcess integration
6. **AI Council**: Query Claude, GPT-4, Gemini, Grok simultaneously
7. **LogicArt Integration**: Generate visual flowchart URLs
8. **Persistence**: Save/load workflow definitions

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
| `/api/quack/my-inbox` | GET | Check Orchestrate's own inbox |
| `/api/task` | POST | Receive tasks from other agents |
| `/api/orchestrate/status` | GET | Check bundle status and features |
| `/api/orchestrate/subscribe` | POST | Create bundle subscription |
| `/api/voyai/session` | POST | Server-to-server session creation (Voyai calls this) |
| `/api/voyai/claim-session` | GET | Frontend claims session with `?session=<id>` |
| `/api/voyai/me` | GET | Check current auth status |
| `/api/templates` | GET | Get all agent templates |
| `/api/process/import` | POST | Receive edited templates from LogiProcess (requires secret) |
| `/api/workflow-callback` | POST | Receive agent responses for workflows |

## Quack Integration

Quack (quack.us.com) enables agent-to-agent messaging with workflow management:

**My Inbox**: `replit/orchestrate` - This app's inbox for receiving tasks from other agents

**Monitored Inboxes**: claude, replit, cursor, gpt, gemini, grok, copilot, antigravity

**Message Workflow**: pending → approved → in_progress → completed/failed

**MCP Tools**:
- `quack_check_inbox` - Check specific inbox for messages
- `quack_list_inboxes` - List all inboxes with pending counts
- `quack_approve` - Approve a pending message
- `quack_update_status` - Update message status
- `quack_send` - Send task to another agent

**Control Room**: Unified dashboard with Quick Actions, Activity Feed, Active Workflows, and Settings.

## Control Room Features

### Quick Actions Bar
- **Send Quack**: Open modal to send message to any agent inbox
- **New Workflow**: Navigate to LogicProcess Build Mode
- **Analyze Code**: Open LogicArt code analysis modal
- **Run Template**: Dropdown to run any saved template
- **Refresh All**: Refresh inboxes and workflow status

### Activity Feed
Real-time stream of all events across the system with filters:
- Quack messages (new, approved, completed)
- Workflow events (started, waiting, completed, failed)
- LogicArt analysis completions

### Active Workflows Panel
Shows currently running workflows with:
- Progress bar showing current step
- Status badge (Running, Waiting, Paused)
- Quick actions: View, Pause, Cancel, Review Now

### Settings Page
- **API Keys (BYOK)**: Enter own keys for Anthropic, OpenAI, Google
- **Webhooks**: Configure auto-dispatch and completion URLs
- **Notifications**: Sound, toast, email preferences
- **Appearance**: Theme and default tab selection

## LogicProcess Node Types

| Type | Description |
|------|-------------|
| Trigger | Starts workflow (manual, scheduled, webhook) |
| AI Agent | Sends task to agent via Quack |
| Transform | Modify data between nodes (filter, map, format) |
| Condition | Branch based on result |
| Human Review | Pause for approval |
| Output | Save results (file, notification, etc.) |

## CoWork Execution Flow

1. User selects workflow template
2. Form generated from runtime inputs
3. User fills in data and clicks "Run Workflow"
4. Each node executes: AI Agent nodes send Quack messages, Human Review nodes pause for approval
5. Results displayed in execution view

## Voyai Authentication

Server-to-server session handshake for reliable authentication:

1. User visits orchestrate.us.com, clicks "Log in with Voyai"
2. Redirects to voyai.org/login with return URL
3. Voyai authenticates user, calls `/api/voyai/session` server-to-server
4. Voyai redirects user to orchestrate.us.com/?session=<id>
5. Frontend claims session via `/api/voyai/claim-session`
6. User data stored in localStorage, session cleaned from URL

**Environment Variables Required**:
- `VOYAI_API_KEY`: Shared secret for server-to-server communication

**Frontend Functions**:
- `voyaiLogin()` - Redirect to Voyai login
- `voyaiLogout()` - Clear local session
- `getVoyaiUser()` - Get current user data
- `hasVoyaiFeature(feature)` - Check if user has a specific feature
- `requireVoyaiAuth()` - Redirect to login if not authenticated
- `requireVoyaiBundle()` - Redirect to subscribe if no bundle

## Agent Dispatch (Distributed Workflow Execution)

Orchestrate can dispatch workflow steps to external agents via Quack:

1. **Agent Node Type**: Workflows can include `agent` nodes that send prompts to Internet agents
2. **Quack Dispatch**: When executing an agent node, Orchestrate sends the prompt to the target agent's inbox via Quack
3. **Response Handling**: Uses polling + callback to wait for agent completion
4. **Callback Endpoint**: `/api/workflow-callback` receives agent responses

**Agent Node Config**:
```json
{
  "type": "agent",
  "config": {
    "agentInbox": "agent/autonomous",
    "prompt": "Summarize this document: {{input}}",
    "timeout": 60000
  }
}
```

**Execution Flow**:
1. WorkflowExecutor detects agent node
2. Sends prompt to agent via Quack API
3. Polls for response or waits for callback
4. Passes result to next node in workflow

**External Widget**: Quack Widget loads from `quack.us.com/quack-widget.js` at runtime, ensuring Orchestrate automatically gets Quack updates without redeployment.

## Agent Template Gallery

The Template Gallery provides 12 pre-built agent templates based on common use cases:

### Categories

| Category | Icon | Description |
|----------|------|-------------|
| Brokerage | 💹 | Agents that compare and transact across providers |
| Utility | 🔧 | General-purpose workhorses for common tasks |
| Coordination | 🎯 | Agents that manage other agents or resources |
| Domain | 🎨 | Specialized agents for specific industries |

### Available Templates

| Template | Category | Complexity | Description |
|----------|----------|------------|-------------|
| Compute Broker | Brokerage | Medium | Aggregate GPU compute prices, route jobs to cheapest provider |
| Table Broker | Brokerage | Medium | Find and book restaurant reservations |
| Prediction Trader | Brokerage | High | Monitor prediction markets, identify arbitrage |
| Echo Agent | Utility | Low | Simple ping/pong reference implementation |
| Research Agent | Utility | Medium | Web search, gather info, summarize findings |
| Data Transform | Utility | Low | Convert data between formats (JSON, CSV, XML) |
| Scheduler Agent | Coordination | Medium | Manage calendars, find mutual availability |
| Moderator Agent | Coordination | Medium | Review content, flag issues, enforce guidelines |
| Orchestrator Agent | Coordination | High | Break tasks into subtasks, delegate to agents |
| Code Review | Domain | Medium | Analyze code, identify issues, suggest improvements |
| Meeting Summarizer | Domain | Medium | Process transcripts, extract action items |
| Price Monitor | Domain | Low | Track prices, alert on thresholds |

### Template Schema (BPMN-compatible)

```json
{
  "id": "template-id",
  "name": "Template Name",
  "description": "What it does",
  "category": "brokerage|utility|coordination|domain",
  "complexity": "low|medium|high",
  "commands": ["cmd1", "cmd2"],
  "integrations": ["API1", "API2"],
  "nodes": [{ "id": "...", "type": "event|task|gateway", "label": "...", "x": 0, "y": 0 }],
  "edges": [{ "source": "...", "target": "...", "label": "..." }],
  "swimlanes": [{ "id": "...", "label": "..." }],
  "agentConfig": { "agentId": "...", "capabilities": [], "inputSchema": {}, "outputSchema": {} }
}
```

### LogiProcess Integration

- **Edit in LogiProcess**: Click button to open template in LogicArt's visual editor
- **URL Format**: `https://logic.art/process?template=<base64EncodedJSON>`
- **Import Endpoint**: `POST /api/process/import` (requires `x-logiprocess-secret` header)
- **Environment Variable**: `LOGIPROCESS_SECRET` (default: `orchestrate-logiprocess-shared-key`)

## Recent Changes

- 2026-01-29: Added Agent Template Gallery with 12 templates (Compute Broker, Table Broker, Research Agent, etc.)
- 2026-01-29: Added /api/process/import endpoint for LogiProcess to send edited templates (secured with shared secret)
- 2026-01-29: Added /api/templates endpoint to fetch template definitions via API
- 2026-01-29: Added category filters, complexity badges, preview modals to Template Gallery UI
- 2026-01-29: Added "Edit in LogiProcess" button that passes template via base64 URL param
- 2026-01-29: Added agent node type for distributed workflow execution via Quack
- 2026-01-29: Enhanced WorkflowExecutor with Quack dispatch for AI agent steps
- 2026-01-29: Added /api/workflow-callback endpoint for agent response handling
- 2026-01-29: Switched to external Quack widget (loads from quack.us.com at runtime)
- 2026-01-29: Repositioned Control Room subtabs for better visibility
- 2026-01-28: Added embedded Quack Widget tab in Control Room with auto-sync
- 2026-01-28: Added server-side auto-polling (every 5 seconds) with /api/quack/sync-status endpoint
- 2026-01-28: Enhanced Quack integration with audit trail, agent registry, and thread management
- 2026-01-28: Added Control Room subtabs (Inboxes, Quack Widget, Audit Trail, Agents, Threads)
- 2026-01-28: Added priority badges and tags display on messages
- 2026-01-28: New API endpoints: /api/quack/audit, /api/quack/agents, /api/quack/threads, /api/quack/archive
- 2026-01-28: Added Grok (xAI) integration to AI Council - uses OpenAI-compatible API at api.x.ai
- 2026-01-28: Added Grok API key field in BYOK Settings (xAI API Key)
- 2026-01-24: Implemented server-to-server Voyai session handshake (replaces broken redirect auth)
- 2026-01-24: Added Voyai session endpoints for reliable authentication
- 2026-01-24: Added frontend auth UI with login/logout and bundle status display
- 2026-01-22: Added Voyai authentication check - redirects to voyai.org/login if not authenticated
- 2026-01-22: Added Quack task receiving endpoint (`/api/task`) and my-inbox endpoint
- 2026-01-20: Enhanced Control Room with Quick Actions, Activity Feed, Active Workflows panel
- 2026-01-20: Added Settings page with API Keys, Webhooks, Notifications configuration
- 2026-01-20: Added LogicProcess visual node editor (Build Mode)
- 2026-01-20: Added CoWork execution UI (Run Mode)
- 2026-01-20: Added Template Library with 5 pre-built workflows
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
