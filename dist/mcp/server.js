import express from "express";
import { generator } from "../generator/workflow-generator.js";
import { createLogicArtAdapter } from "../integration/logicart-adapter.js";
import { council } from "../council/council.js";
const app = express();
app.use(express.json());
const tools = [
    { name: "generate_workflow", description: "Generate workflow from natural language" },
    { name: "visualize_workflow", description: "Get LogicArt visualization URL" },
    { name: "council_query", description: "Query multiple AI models (arena/debate/council/specialist)" }
];
app.get("/api/mcp/tools", (_, res) => res.json({ tools }));
app.post("/api/mcp/call", async (req, res) => {
    const { tool, params } = req.body;
    try {
        if (tool === "generate_workflow") {
            res.json({ result: await generator.generate({ prompt: params.prompt }) });
        }
        else if (tool === "visualize_workflow") {
            const url = await createLogicArtAdapter({ serverUrl: "https://logic.art" }).visualize(params.workflow);
            res.json({ result: { url } });
        }
        else if (tool === "council_query") {
            res.json({ result: await council.query(params) });
        }
        else {
            res.status(400).json({ error: "Unknown tool" });
        }
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.listen(5001, () => console.log("FlowForge MCP server on port 5001"));
//# sourceMappingURL=server.js.map