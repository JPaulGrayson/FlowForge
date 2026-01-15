import express from "express";
import { generator } from "../generator/workflow-generator.js";
import { createExecutor } from "../executor/workflow-executor.js";
import { createLogicArtAdapter } from "../integration/logicart-adapter.js";
import { council } from "../council/council.js";
import { toolHandlers } from "../tools/handlers.js";
import { saveWorkflow, loadWorkflow, listWorkflows } from "../tools/persistence.js";
const app = express();
app.use(express.json());
const tools = [
  { name: "generate_workflow", description: "Generate workflow from natural language" },
  { name: "execute_workflow", description: "Execute a workflow" },
  { name: "visualize_workflow", description: "Get LogicArt URL" },
  { name: "council_query", description: "Query multiple AI models" },
  { name: "save_workflow", description: "Save workflow" },
  { name: "load_workflow", description: "Load workflow" },
  { name: "list_workflows", description: "List workflows" },
  { name: "web_search", description: "Search web" },
  { name: "summarize", description: "Summarize text" }
];
app.get("/api/mcp/tools", (_, res) => res.json({ tools }));
app.post("/api/mcp/call", async (req, res) => {
  const { tool, params } = req.body;
  try {
    if (tool === "generate_workflow") res.json({ result: await generator.generate({ prompt: params.prompt }) });
    else if (tool === "visualize_workflow") res.json({ result: { url: await createLogicArtAdapter({ serverUrl: "https://logic.art" }).visualize(params.workflow) } });
    else if (tool === "council_query") res.json({ result: await council.query(params) });
    else if (tool === "save_workflow") res.json({ result: await saveWorkflow(params.workflow) });
    else if (tool === "load_workflow") res.json({ result: await loadWorkflow(params.id) });
    else if (tool === "list_workflows") res.json({ result: await listWorkflows() });
    else if (tool === "web_search") res.json({ result: await toolHandlers.web_search(params) });
    else if (tool === "summarize") res.json({ result: await toolHandlers.summarize(params) });
    else res.status(400).json({ error: "Unknown tool" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.listen(5001, () => console.log("FlowForge MCP on port 5001"));
