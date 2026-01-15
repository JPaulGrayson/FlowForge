import { v4 as uuidv4 } from "uuid";
export class WorkflowGenerator {
    async generate(req) {
        const id = uuidv4();
        const workflow = {
            id, name: this.extractName(req.prompt), description: req.prompt, version: "1.0.0", sourcePrompt: req.prompt,
            config: { timeout: 300000 }, inputs: [{ name: "input", label: "Input", type: "string", required: true }],
            outputs: [{ name: "result", label: "Result", type: "string", sourceNodeId: "process" }],
            nodes: [
                { id: "start", type: "start", label: "Start", config: {} },
                { id: "process", type: "tool", label: "Process", config: { toolName: "process", parameters: {} } },
                { id: "end", type: "end", label: "End", config: {} }
            ],
            edges: [
                { id: "e1", sourceNodeId: "start", targetNodeId: "process" },
                { id: "e2", sourceNodeId: "process", targetNodeId: "end" }
            ],
            startNodeId: "start",
            metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visibility: "private" }
        };
        return { workflow, confidence: 0.8 };
    }
    extractName(prompt) { return prompt.split(" ").slice(0, 4).join(" "); }
}
export const generator = new WorkflowGenerator();
//# sourceMappingURL=workflow-generator.js.map