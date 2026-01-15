import express from "express";
import { generator } from "../generator/workflow-generator.js";
import { createExecutor } from "../executor/workflow-executor.js";
import { createLogicArtAdapter } from "../integration/logicart-adapter.js";

const app = express();
app.use(express.json());

const tools = [
  { name: "generate_workflow", description: "Generate workflow from natural language" },
  { name: "execute_workflow", description: "Execute a workflow" },
  { name: "visualize_workflow", description: "Get LogicArt visualization URL" }
];

app.get("/api/mcp/tools", (_, res) => res.json({ tools }));

app.post("/api/mcp/call", async (req, res) => {
  const { tool, params } = req.body;
  try {
    if (tool === "generate_workflow") {
      const result = await generator.generate({ prompt: params.prompt });
      res.json({ result });
    } else if (tool === "visualize_workflow") {
      const adapter = createLogicArtAdapter({ serverUrl: params.logicArtUrl || "https://logic.art" });
      const url = await adapter.visualize(params.workflow);
      res.json({ result: { url } });
    } else { res.status(400).json({ error: "Unknown tool" }); }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log("FlowForge MCP server running on port " + PORT));
