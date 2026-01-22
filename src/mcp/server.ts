import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { generator } from "../generator/workflow-generator.js";
import { createExecutor as _createExecutor } from "../executor/workflow-executor.js";
import { createLogicArtAdapter } from "../integration/logicart-adapter.js";
import { council } from "../council/council.js";
import { toolHandlers } from "../tools/handlers.js";
import { saveWorkflow, loadWorkflow, listWorkflows } from "../tools/persistence.js";
import { QuackPoller, MY_INBOX } from "../quack/poller.js";

const QUACK_URL = 'https://quack.us.com';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, "../../public")));
app.use("/docs", express.static(path.join(__dirname, "../../docs")));

const MCP_TOOLS = [
  {
    name: "generate_workflow",
    description: "Generate workflow from natural language prompt",
    inputSchema: {
      type: "object",
      properties: { prompt: { type: "string", description: "Natural language description of the workflow" } },
      required: ["prompt"]
    }
  },
  {
    name: "visualize_workflow",
    description: "Get LogicArt visualization URL for a workflow",
    inputSchema: {
      type: "object",
      properties: { workflow: { type: "object", description: "Workflow object with nodes and edges" } },
      required: ["workflow"]
    }
  },
  {
    name: "council_query",
    description: "Query multiple AI models for consensus",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, models: { type: "array", items: { type: "string" } } },
      required: ["query"]
    }
  },
  {
    name: "save_workflow",
    description: "Save a workflow to storage",
    inputSchema: {
      type: "object",
      properties: { workflow: { type: "object" } },
      required: ["workflow"]
    }
  },
  {
    name: "load_workflow",
    description: "Load a workflow by ID",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"]
    }
  },
  {
    name: "list_workflows",
    description: "List all saved workflows",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "web_search",
    description: "Search the web",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"]
    }
  },
  {
    name: "summarize",
    description: "Summarize text",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"]
    }
  },
  {
    name: "quack_check_inbox",
    description: "Check a Quack inbox for pending messages",
    inputSchema: {
      type: "object",
      properties: {
        inbox: { type: "string", description: "Inbox name (claude, replit, cursor, gpt, gemini, grok, copilot, antigravity)" }
      },
      required: ["inbox"]
    }
  },
  {
    name: "quack_approve",
    description: "Approve a pending message to allow the receiving agent to proceed",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "The ID of the message to approve" }
      },
      required: ["messageId"]
    }
  },
  {
    name: "quack_update_status",
    description: "Update the status of a message (in_progress, completed, failed)",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "The ID of the message to update" },
        status: { type: "string", enum: ["in_progress", "completed", "failed"], description: "The new status" }
      },
      required: ["messageId", "status"]
    }
  },
  {
    name: "quack_send",
    description: "Send a message to another agent via Quack",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Destination inbox (replit, cursor, claude, gpt, gemini, grok, copilot, antigravity)" },
        task: { type: "string", description: "The task or message to send" },
        context: { type: "string", description: "Optional context or background information" }
      },
      required: ["to", "task"]
    }
  },
  {
    name: "quack_list_inboxes",
    description: "List all monitored Quack inboxes with their pending message counts",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

const SERVER_INFO = {
  name: "orchestrate",
  version: "0.1.0"
};

const SERVER_CAPABILITIES = {
  tools: {}
};

async function executeTool(name: string, args: any): Promise<any> {
  switch (name) {
    case "generate_workflow":
      return await generator.generate({ prompt: args.prompt });
    case "visualize_workflow":
      const serverUrl = args.target === 'logiprocess' ? "https://logic.art/process" : "https://logic.art";
      return { url: await createLogicArtAdapter({ serverUrl }).visualize(args.workflow) };
    case "council_query":
      return await council.query(args);
    case "save_workflow":
      return await saveWorkflow(args.workflow);
    case "load_workflow":
      return await loadWorkflow(args.id);
    case "list_workflows":
      return await listWorkflows();
    case "web_search":
      return await toolHandlers.web_search(args);
    case "summarize":
      return await toolHandlers.summarize(args);
    case "quack_check_inbox":
      const quackPoller = new QuackPoller();
      return await quackPoller.checkInbox(args.inbox);
    case "quack_approve":
      const approvePoller = new QuackPoller();
      const approved = await approvePoller.approveMessage(args.messageId);
      return { success: approved, message: approved ? 'Message approved' : 'Failed to approve' };
    case "quack_update_status":
      const statusPoller = new QuackPoller();
      const updated = await statusPoller.updateStatus(args.messageId, args.status);
      return { success: updated, message: updated ? `Status updated to ${args.status}` : 'Failed to update' };
    case "quack_send":
      const sendPoller = new QuackPoller();
      const sent = await sendPoller.sendMessage(args.to, args.task, args.context);
      return { success: sent, message: sent ? 'Message sent' : 'Failed to send' };
    case "quack_list_inboxes":
      const listPoller = new QuackPoller();
      const inboxes = await listPoller.checkAllInboxes();
      return Array.from(inboxes.entries()).map(([name, state]) => ({
        name,
        pendingCount: state.pendingCount,
        messageCount: state.messages.length,
        lastChecked: state.lastChecked
      }));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function createJsonRpcResponse(id: string | number, result: any) {
  return { jsonrpc: "2.0", id, result };
}

function createJsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleJsonRpcRequest(request: any): Promise<any> {
  const { id, method, params } = request;

  switch (method) {
    case "initialize":
      return createJsonRpcResponse(id, {
        protocolVersion: "2024-11-05",
        serverInfo: SERVER_INFO,
        capabilities: SERVER_CAPABILITIES
      });

    case "initialized":
      return null;

    case "tools/list":
      return createJsonRpcResponse(id, { tools: MCP_TOOLS });

    case "tools/call":
      try {
        const result = await executeTool(params.name, params.arguments || {});
        return createJsonRpcResponse(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        });
      } catch (e: any) {
        return createJsonRpcError(id, -32000, e.message);
      }

    case "ping":
      return createJsonRpcResponse(id, {});

    default:
      return createJsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

const sseClients: Map<string, { res: express.Response; messageEndpoint: string }> = new Map();

app.get("/api/mcp/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const clientId = Date.now().toString();
  const messageEndpoint = `/api/mcp/message?sessionId=${clientId}`;
  
  sseClients.set(clientId, { res, messageEndpoint });

  res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 30000);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseClients.delete(clientId);
  });
});

app.post("/api/mcp/message", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const client = sseClients.get(sessionId);
  
  if (!client) {
    return res.status(404).json(createJsonRpcError(null, -32000, "Session not found"));
  }

  const request = req.body;
  const response = await handleJsonRpcRequest(request);

  if (response) {
    client.res.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
  }

  res.status(202).json({ status: "accepted" });
});

app.post("/api/mcp/sse", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const request = req.body;
  const response = await handleJsonRpcRequest(request);
  
  if (response) {
    res.json(response);
  } else {
    res.status(204).send();
  }
});

app.get("/api/mcp/tools", (_, res) => res.json({ tools: MCP_TOOLS }));

app.get("/api/workflows", async (_, res) => {
  try {
    const workflows = await listWorkflows();
    res.json({ workflows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/workflows/:id", async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.params.id);
    res.json({ workflow });
  } catch (e: any) {
    res.status(404).json({ error: "Workflow not found" });
  }
});

app.post("/api/workflows", async (req, res) => {
  try {
    const id = await saveWorkflow(req.body);
    res.json({ success: true, id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/examples/:name", async (req, res) => {
  const { name } = req.params;
  const filePath = path.join(__dirname, `../examples/${name}.json`);
  try {
    const fs = await import("fs/promises");
    const data = await fs.readFile(filePath, "utf-8");
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(404).json({ error: "Example not found" });
  }
});

app.get("/api/examples", async (_, res) => {
  const examplesDir = path.join(__dirname, "../examples");
  try {
    const fs = await import("fs/promises");
    const files = await fs.readdir(examplesDir);
    const examples = await Promise.all(
      files.filter(f => f.endsWith(".json")).map(async f => {
        const data = await fs.readFile(path.join(examplesDir, f), "utf-8");
        return JSON.parse(data);
      })
    );
    res.json({ examples });
  } catch (e) {
    res.status(500).json({ error: "Failed to load examples" });
  }
});

app.post("/api/mcp/call", async (req, res) => {
  const { tool, params } = req.body;
  try {
    const result = await executeTool(tool, params);
    res.json({ result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Quack Control Room API endpoints
app.get("/api/quack/inboxes", async (_, res) => {
  try {
    const poller = new QuackPoller();
    const inboxes = await poller.checkAllInboxes();
    const result = Array.from(inboxes.entries()).map(([name, state]) => ({
      name,
      pendingCount: state.pendingCount,
      messages: state.messages,
      lastChecked: state.lastChecked
    }));
    res.json({ inboxes: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/quack/inbox/:name", async (req, res) => {
  try {
    const poller = new QuackPoller();
    const inbox = await poller.checkInbox(req.params.name);
    res.json(inbox);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/quack/approve/:id", async (req, res) => {
  try {
    const poller = new QuackPoller();
    const success = await poller.approveMessage(req.params.id);
    res.json({ success });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/quack/status/:id", async (req, res) => {
  try {
    const poller = new QuackPoller();
    const success = await poller.updateStatus(req.params.id, req.body.status);
    res.json({ success });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/quack/send", async (req, res) => {
  try {
    const poller = new QuackPoller();
    const success = await poller.sendMessage(req.body.to, req.body.task, req.body.context);
    res.json({ success });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint to receive tasks from other agents via Quack
app.post("/api/task", async (req, res) => {
  const { messageId, from, task, context } = req.body;
  console.log(`📨 Quack task from ${from}: ${task}`);
  
  try {
    // Log the incoming task for processing
    console.log(`📋 Task context: ${context || 'none'}`);
    
    // TODO: Add custom task processing logic here based on what was requested
    // For now, acknowledge receipt and mark as in_progress
    
    // Mark the task as complete when done
    await fetch(`${QUACK_URL}/api/complete/${messageId}`, { method: 'POST' });
    
    res.json({ 
      success: true, 
      message: `Task received and processed`,
      inbox: MY_INBOX
    });
  } catch (error: any) {
    console.error('Error processing Quack task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper endpoint to check my inbox
app.get("/api/quack/my-inbox", async (_, res) => {
  try {
    const response = await fetch(`${QUACK_URL}/api/inbox/${MY_INBOX}?autoApprove=true`);
    const data = await response.json() as Record<string, unknown>;
    res.json({ inbox: MY_INBOX, ...data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = parseInt(process.env.PORT || "5000", 10);
app.listen(PORT, "0.0.0.0", () => console.log(`Orchestrate MCP on port ${PORT}`));
