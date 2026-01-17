import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { generator } from "../generator/workflow-generator.js";
import { createLogicArtAdapter } from "../integration/logicart-adapter.js";
import { council } from "../council/council.js";
import { toolHandlers } from "../tools/handlers.js";
import { saveWorkflow, loadWorkflow, listWorkflows } from "../tools/persistence.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../public")));
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
    }
];
const SERVER_INFO = {
    name: "orchestrate",
    version: "0.1.0"
};
const SERVER_CAPABILITIES = {
    tools: {}
};
async function executeTool(name, args) {
    switch (name) {
        case "generate_workflow":
            return await generator.generate({ prompt: args.prompt });
        case "visualize_workflow":
            return { url: await createLogicArtAdapter({ serverUrl: "https://logic.art" }).visualize(args.workflow) };
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
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
function createJsonRpcResponse(id, result) {
    return { jsonrpc: "2.0", id, result };
}
function createJsonRpcError(id, code, message) {
    return { jsonrpc: "2.0", id, error: { code, message } };
}
async function handleJsonRpcRequest(request) {
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
            }
            catch (e) {
                return createJsonRpcError(id, -32000, e.message);
            }
        case "ping":
            return createJsonRpcResponse(id, {});
        default:
            return createJsonRpcError(id, -32601, `Method not found: ${method}`);
    }
}
const sseClients = new Map();
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
    const sessionId = req.query.sessionId;
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
    }
    else {
        res.status(204).send();
    }
});
app.get("/api/mcp/tools", (_, res) => res.json({ tools: MCP_TOOLS }));
app.post("/api/mcp/call", async (req, res) => {
    const { tool, params } = req.body;
    try {
        const result = await executeTool(tool, params);
        res.json({ result });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
const PORT = parseInt(process.env.PORT || "5000", 10);
app.listen(PORT, "0.0.0.0", () => console.log(`Orchestrate MCP on port ${PORT}`));
//# sourceMappingURL=server.js.map