import express from "express";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { generator } from "../generator/workflow-generator.js";
import { createExecutor as _createExecutor, getExecutorByMessageId } from "../executor/workflow-executor.js";
import { createLogicArtAdapter } from "../integration/logicart-adapter.js";
import { council } from "../council/council.js";
import { toolHandlers } from "../tools/handlers.js";
import { saveWorkflow, loadWorkflow, listWorkflows } from "../tools/persistence.js";
import { QuackPoller, MY_INBOX, InboxState } from "../quack/poller.js";

const QUACK_URL = 'https://quack.us.com';

// ===== AUTO-SYNCING QUACK POLLER WITH GROK AGENT =====

let lastMessageCounts: Map<string, number> = new Map();
const processedGrokMessages: Set<string> = new Set();
const GROK_PUBLIC_INBOX = 'grok/main';

async function mirrorToPublicGrokInbox(task: string, context: string, replyTo?: string): Promise<void> {
  try {
    const response = await fetch(`${QUACK_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: GROK_PUBLIC_INBOX,
        from: MY_INBOX,
        task: task,
        context: context.substring(0, 500),
        replyTo: replyTo,
        priority: 'normal'
      })
    });
    const data = await response.json() as { success?: boolean };
    
    if (data.success) {
      console.log(`[Agent] Mirrored reply to public ${GROK_PUBLIC_INBOX} for Grok polling`);
    }
  } catch (error) {
    console.error('[Agent] Error mirroring to public inbox:', error);
  }
}

async function handleGrokMessage(msg: any): Promise<void> {
  if (processedGrokMessages.has(msg.id)) return;
  processedGrokMessages.add(msg.id);
  
  console.log(`[Agent] Processing Grok message: ${msg.task.substring(0, 50)}...`);
  
  const replyTask = `RE: ${msg.task.substring(0, 40)}... - Acknowledged`;
  const replyContext = `Message received from ${msg.from}.\n\nTask: ${msg.task}\n\nStatus: Acknowledged by Orchestrate Agent`;
  
  try {
    const response = await fetch(`${QUACK_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: msg.from,
        from: MY_INBOX,
        task: replyTask,
        context: replyContext,
        replyTo: msg.id,
        priority: 'normal'
      })
    });
    const data = await response.json() as { success?: boolean; messageId?: string };
    
    if (data.success) {
      console.log(`[Agent] Replied to ${msg.from}`);
      await mirrorToPublicGrokInbox(replyTask, replyContext, msg.id);
    }
  } catch (error) {
    console.error('[Agent] Error replying to Grok:', error);
  }
}

const globalQuackPoller = new QuackPoller((inboxes: Map<string, InboxState>) => {
  for (const [name, state] of inboxes.entries()) {
    const lastCount = lastMessageCounts.get(name) || 0;
    const currentCount = state.messages.length;
    
    if (currentCount > lastCount) {
      const newMessages = state.messages.slice(0, currentCount - lastCount);
      for (const msg of newMessages) {
        console.log(`[Quack] New message in ${name}: ${msg.task.substring(0, 50)}... (from: ${msg.from}, priority: ${msg.priority || 'normal'})`);
        
        if (name === MY_INBOX && (msg.from.startsWith('grok/') || msg.from.includes('xai'))) {
          handleGrokMessage(msg).catch(console.error);
        }
      }
    }
    
    lastMessageCounts.set(name, currentCount);
  }
});

// Start auto-syncing on server startup
setTimeout(() => {
  globalQuackPoller.start();
  console.log('[Quack] Auto-sync started - polling every 5 seconds');
}, 2000);

// ===== VOYAI SERVER-TO-SERVER SESSION HANDSHAKE =====

interface VoyaiSessionData {
  voyaiUserId: string;
  email: string;
  displayName?: string;
  hasBundle: boolean;
  tier: 'none' | 'bundle';
  features: {
    quack_control_room: boolean;
    quack_multi_inbox: boolean;
    quack_toast_notifications: boolean;
    logicart_cloud_history: boolean;
    logicart_rabbit_hole: boolean;
    logicart_github_sync: boolean;
    logicart_managed_credits: boolean;
    logicprocess_enabled: boolean;
  };
  subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'none';
  currentPeriodEnd?: string;
}

interface PendingSession {
  data: VoyaiSessionData;
  createdAt: number;
  expiresAt: number;
}

const pendingSessions = new Map<string, PendingSession>();

// Cleanup expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of pendingSessions.entries()) {
    if (now > session.expiresAt) {
      pendingSessions.delete(id);
      console.log(`[Voyai Session] Cleaned up expired session`);
    }
  }
}, 60000); // Every minute

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
    name: "execute_workflow",
    description: "Execute a workflow with optional inputs",
    inputSchema: {
      type: "object",
      properties: { 
        workflow: { type: "object", description: "Workflow definition with nodes and edges" },
        inputs: { type: "object", description: "Input values for the workflow" }
      },
      required: ["workflow"]
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
    case "execute_workflow":
      const { createExecutor } = await import("../executor/workflow-executor.js");
      const executor = createExecutor();
      const execution = await executor.execute(args.workflow, args.inputs || {});
      return execution;
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

const LOGIPROCESS_SECRET = process.env.LOGIPROCESS_SECRET || 'orchestrate-logiprocess-shared-key';
const MAX_TEMPLATE_SIZE = 50000;

function validateTemplateSchema(template: any): { valid: boolean; error?: string } {
  if (!template || typeof template !== 'object') {
    return { valid: false, error: 'Template must be an object' };
  }
  if (!template.id || typeof template.id !== 'string' || template.id.length > 100) {
    return { valid: false, error: 'Template ID required (string, max 100 chars)' };
  }
  if (!template.name || typeof template.name !== 'string' || template.name.length > 200) {
    return { valid: false, error: 'Template name required (string, max 200 chars)' };
  }
  if (!Array.isArray(template.nodes)) {
    return { valid: false, error: 'Template nodes must be an array' };
  }
  if (!Array.isArray(template.edges)) {
    return { valid: false, error: 'Template edges must be an array' };
  }
  const allowedFields = ['id', 'name', 'description', 'category', 'complexity', 'commands', 'integrations', 'nodes', 'edges', 'swimlanes', 'agentConfig'];
  const sanitized: any = {};
  for (const key of allowedFields) {
    if (template[key] !== undefined) {
      sanitized[key] = template[key];
    }
  }
  return { valid: true };
}

let templateWriteLock = false;

app.post("/api/process/import", async (req, res) => {
  try {
    const authHeader = req.headers['x-logiprocess-secret'] || req.headers['authorization'];
    if (authHeader !== LOGIPROCESS_SECRET && authHeader !== `Bearer ${LOGIPROCESS_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing secret" });
    }
    
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_TEMPLATE_SIZE) {
      return res.status(413).json({ error: `Payload too large (max ${MAX_TEMPLATE_SIZE} bytes)` });
    }
    
    const template = req.body;
    const validation = validateTemplateSchema(template);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    if (templateWriteLock) {
      return res.status(429).json({ error: "Template write in progress, try again" });
    }
    
    templateWriteLock = true;
    try {
      const fs = await import("fs/promises");
      const templatesPath = path.join(__dirname, "../../public/agent-templates.json");
      const data = await fs.readFile(templatesPath, "utf-8");
      const templates = JSON.parse(data);
      
      const allowedFields = ['id', 'name', 'description', 'category', 'complexity', 'commands', 'integrations', 'nodes', 'edges', 'swimlanes', 'agentConfig'];
      const sanitizedTemplate: any = {};
      for (const key of allowedFields) {
        if (template[key] !== undefined) {
          sanitizedTemplate[key] = template[key];
        }
      }
      
      const existingIndex = templates.templates.findIndex((t: any) => t.id === template.id);
      if (existingIndex >= 0) {
        templates.templates[existingIndex] = sanitizedTemplate;
      } else {
        templates.templates.push(sanitizedTemplate);
      }
      
      const tempPath = templatesPath + '.tmp';
      await fs.writeFile(tempPath, JSON.stringify(templates, null, 2));
      await fs.rename(tempPath, templatesPath);
      
      console.log(`[LogiProcess] Imported template: ${template.name}`);
      res.json({ success: true, message: `Template ${template.name} imported` });
    } finally {
      templateWriteLock = false;
    }
  } catch (e: any) {
    templateWriteLock = false;
    console.error("[LogiProcess] Import error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/templates", async (_, res) => {
  try {
    const fs = await import("fs/promises");
    const templatesPath = path.join(__dirname, "../../public/agent-templates.json");
    const data = await fs.readFile(templatesPath, "utf-8");
    res.json(JSON.parse(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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
    const success = await poller.sendMessage(req.body.to, req.body.task, req.body.context, {
      priority: req.body.priority,
      tags: req.body.tags,
      project: req.body.project,
      replyTo: req.body.replyTo
    });
    res.json({ success });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/quack/reject/:id", async (req, res) => {
  try {
    const poller = new QuackPoller();
    const success = await poller.rejectMessage(req.params.id);
    res.json({ success });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/quack/audit", async (req, res) => {
  try {
    const poller = new QuackPoller();
    const result = await poller.fetchAuditLogs({
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      action: req.query.action as string,
      actor: req.query.actor as string,
      targetType: req.query.targetType as string,
      targetId: req.query.targetId as string,
      since: req.query.since as string,
      until: req.query.until as string
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/quack/audit/stats", async (_, res) => {
  try {
    const poller = new QuackPoller();
    const result = await poller.fetchAuditStats();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/quack/agents", async (_, res) => {
  try {
    const poller = new QuackPoller();
    const agents = await poller.fetchAgents();
    res.json({ agents });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/quack/agents/:platform/:name/ping", async (req, res) => {
  try {
    const poller = new QuackPoller();
    const success = await poller.pingAgent(req.params.platform, req.params.name);
    res.json({ success });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/quack/threads", async (_, res) => {
  try {
    const poller = new QuackPoller();
    const threads = await poller.fetchThreads();
    res.json({ threads });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/quack/thread/:threadId", async (req, res) => {
  try {
    const poller = new QuackPoller();
    const thread = await poller.fetchThread(req.params.threadId);
    res.json(thread);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/quack/archive/:threadId", async (req, res) => {
  try {
    const poller = new QuackPoller();
    const success = await poller.archiveThread(req.params.threadId);
    res.json({ success });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/quack/archive", async (_, res) => {
  try {
    const poller = new QuackPoller();
    const threads = await poller.fetchArchivedThreads();
    res.json({ threads });
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

// Workflow callback endpoint - agents call this when they complete a task
app.post("/api/workflow-callback", async (req, res) => {
  const { message_id, execution_id, node_id, status, response, error } = req.body;
  
  console.log(`📬 Workflow callback received for message ${message_id}`);
  console.log(`   Execution: ${execution_id}, Node: ${node_id}, Status: ${status}`);
  
  try {
    const executor = getExecutorByMessageId(message_id);
    
    if (executor) {
      executor.handleAgentCallback(message_id, response, status);
      console.log(`✅ Callback routed to active executor`);
    } else {
      console.log(`⚠️ No active executor found for message ${message_id}`);
    }
    
    if (status === 'completed') {
      console.log(`✅ Agent completed task successfully`);
    } else if (status === 'failed') {
      console.log(`❌ Agent task failed: ${error}`);
    }
    
    res.json({ 
      success: true, 
      message: 'Callback received',
      message_id,
      execution_id,
      node_id,
      routed: !!executor
    });
  } catch (e: any) {
    console.error('Error processing workflow callback:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Voyai Bundle Status and Subscription endpoints
app.get("/api/orchestrate/status", async (_, res) => {
  // Return current bundle status
  // In production, this would check against Voyai's API
  res.json({
    active: true,
    plan: "orchestrate",
    features: ["quack_premium", "logicart_pro", "logicprocess"],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    usage: {
      quackMessages: 0,
      workflowRuns: 0,
      logicArtVisualizations: 0
    }
  });
});

app.post("/api/orchestrate/subscribe", async (req, res) => {
  const { email, plan } = req.body;
  
  if (!email || !plan) {
    return res.status(400).json({ success: false, message: "Email and plan required" });
  }
  
  const validPlans = ['orchestrate', 'enterprise'];
  if (!validPlans.includes(plan)) {
    return res.status(400).json({ success: false, message: `Invalid plan. Must be one of: ${validPlans.join(', ')}` });
  }
  
  // In production, this would create a Stripe checkout session
  const subscriptionId = `sub_${Date.now()}`;
  res.json({
    success: true,
    subscriptionId,
    checkoutUrl: `https://voyai.org/checkout/${subscriptionId}`,
    message: `Subscription created for ${email} on ${plan} plan`
  });
});

// ===== VOYAI SESSION ENDPOINTS =====

// Voyai calls this endpoint server-to-server to create a session
app.post("/api/voyai/session", (req, res) => {
  // Verify the request is from Voyai using API key
  const authHeader = req.headers.authorization;
  const expectedKey = process.env.VOYAI_API_KEY;
  
  if (!expectedKey) {
    console.error('[Voyai Session] VOYAI_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
    console.error('[Voyai Session] Unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const sessionData: VoyaiSessionData = req.body;
  
  // Validate required fields
  if (!sessionData.email || !sessionData.voyaiUserId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Generate a short, random session ID
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  // Store the session
  pendingSessions.set(sessionId, {
    data: sessionData,
    createdAt: Date.now(),
    expiresAt
  });
  
  console.log(`[Voyai Session] Created session ${sessionId.substring(0, 8)}... for ${sessionData.email}`);
  console.log(`[Voyai Session] User has bundle: ${sessionData.hasBundle}`);
  
  // Return session ID to Voyai
  res.json({
    success: true,
    data: {
      sessionId,
      expiresAt: new Date(expiresAt).toISOString()
    }
  });
});

// Orchestrate frontend calls this to claim the session
app.get("/api/voyai/claim-session", (req, res) => {
  const sessionId = req.query.session as string;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' });
  }
  
  const session = pendingSessions.get(sessionId);
  
  if (!session) {
    console.warn(`[Voyai Session] Session not found: ${sessionId.substring(0, 8)}...`);
    return res.status(404).json({ error: 'Session not found or expired' });
  }
  
  if (Date.now() > session.expiresAt) {
    pendingSessions.delete(sessionId);
    return res.status(410).json({ error: 'Session expired' });
  }
  
  // Delete the session (one-time use)
  pendingSessions.delete(sessionId);
  
  console.log(`[Voyai Session] Claimed session for ${session.data.email}`);
  
  // Return the user data
  res.json({
    success: true,
    user: session.data
  });
});

// Get current user session (for frontend to check if logged in)
app.get("/api/voyai/me", (req, res) => {
  // This is just a passthrough - actual user data is stored client-side
  // The frontend should call this after claiming a session to verify
  res.json({ 
    authenticated: false, 
    message: 'Check client-side localStorage for voyai_user'
  });
});

// Quack sync status endpoint
app.get("/api/quack/sync-status", (_req, res) => {
  const inboxes = globalQuackPoller.getInboxes();
  const inboxList: any[] = [];
  
  for (const [name, state] of inboxes.entries()) {
    inboxList.push({
      name,
      messageCount: state.messages.length,
      pendingCount: state.pendingCount,
      lastChecked: state.lastChecked
    });
  }
  
  res.json({
    syncing: true,
    pollInterval: 5000,
    inboxes: inboxList,
    lastMessageCounts: Object.fromEntries(lastMessageCounts)
  });
});

const PORT = parseInt(process.env.PORT || "5000", 10);
app.listen(PORT, "0.0.0.0", () => console.log(`Orchestrate MCP on port ${PORT}`));
