import { v4 as uuidv4 } from "uuid";
export class WorkflowExecutor {
    config;
    tools = new Map();
    constructor(config = {}) {
        this.config = config;
    }
    registerTool(name, fn) { this.tools.set(name, fn); }
    async execute(wf, inputs) {
        const ex = { id: uuidv4(), workflowId: wf.id, status: "running", inputs, history: [], variables: {}, nodeOutputs: {}, startedAt: new Date().toISOString() };
        for (const node of wf.nodes) {
            if (node.type === "tool" && node.config?.toolName) {
                const fn = this.tools.get(node.config.toolName);
                if (fn)
                    ex.nodeOutputs[node.id] = await fn(node.config.parameters, ex);
            }
        }
        ex.status = "completed";
        ex.completedAt = new Date().toISOString();
        return ex;
    }
}
export function createExecutor(c = {}) { return new WorkflowExecutor(c); }
//# sourceMappingURL=workflow-executor.js.map