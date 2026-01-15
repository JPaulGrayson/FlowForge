import { v4 as uuidv4 } from "uuid";
import Anthropic from "@anthropic-ai/sdk";
import type { Workflow } from "../types/workflow.js";
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
export class WorkflowGenerator {
  async generate(req: { prompt: string }): Promise<{ workflow: Workflow; confidence: number }> {
    if (anthropic) {
      try {
        const msg = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514", max_tokens: 2000,
          messages: [{ role: "user", content: "Generate workflow JSON for: " + req.prompt + ". Return ONLY valid JSON." }]
        });
        const text = msg.content[0].type === "text" ? msg.content[0].text : "";
        const json = text.match(/\{[\s\S]*\}/)?.[0];
        if (json) return { workflow: JSON.parse(json), confidence: 0.95 };
      } catch (e) { console.error("Claude API error:", e); }
    }
    return { workflow: this.fallback(req.prompt), confidence: 0.7 };
  }
  private fallback(p: string): Workflow {
    const id = uuidv4();
    return { id, name: p.slice(0,30), description: p, version: "1.0.0", config: {},
      inputs: [], outputs: [], startNodeId: "start",
      nodes: [{ id: "start", type: "start", label: "Start", config: {} }, { id: "end", type: "end", label: "End", config: {} }],
      edges: [{ id: "e1", sourceNodeId: "start", targetNodeId: "end" }],
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visibility: "private" } };
  }
}
export const generator = new WorkflowGenerator();
