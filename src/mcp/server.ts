import express from "express";
import { generator } from "../generator/workflow-generator.js";
import { createExecutor } from "../executor/workflow-executor.js";
import { createLogicArtAdapter } from "../integration/logicart-adapter.js";
const app = express();
app.use(express.json());
const sseClients: Map<string, express.Response> = new Map();
const tools = [
  { name: "generate_workflow", description: "Generate workflow from natural language" },
  { name: "execute_workflow", description: "Execute a workflow" },
  { name: "visualize_workflow", description: "Get LogicArt visualization URL" }
];
app.get("/api/mcp/tools", (_, res) => res.json({ tools }));
app.get("/api/mcp/events/:id", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  sseClients.set(req.params.id, res);
  req.on("close", () => sseClients.delete(req.params.id));
});
const send = (id: string, evt: string, data: any) => { const c = sseClients.get(id); if (c) c.write("event: " + evt + "\ndata: " + JSON.stringify(data) + "\n\n"); };
app.post("/api/mcp/call", async (req, res) => {
  const { tool, params, sessionId } = req.body;
  try {
    if (tool === "generate_workflow") { res.json({ result: await generator.generate({ prompt: params.prompt }) }); }
    else if (tool === "visualize_workflow") {
      const url = await createLogicArtAdapter({ serverUrl: "https://logic.art" }).visualize(params.workflow);
      res.json({ result: { url } });
    }
    else { res.status(400).json({ error: "Unknown tool" }); }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.listen(5001, () => console.log("FlowForge MCP server on port 5001"));
