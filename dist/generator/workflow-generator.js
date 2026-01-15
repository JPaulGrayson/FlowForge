import { v4 as uuidv4 } from "uuid";
export class WorkflowGenerator {
    async generate(req) { return { workflow: { id: uuidv4(), name: "Generated", description: req.prompt, version: "1.0.0", config: {}, inputs: [], outputs: [], nodes: [{ id: "start", type: "start", label: "Start", config: {} }, { id: "end", type: "end", label: "End", config: {} }], edges: [{ id: "e1", sourceNodeId: "start", targetNodeId: "end" }], startNodeId: "start", metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visibility: "private" } }, confidence: 0.85 }; }
}
export const generator = new WorkflowGenerator();
//# sourceMappingURL=workflow-generator.js.map