import { v4 as uuidv4 } from "uuid";
export class WorkflowExecutor {
    config;
    constructor(config) {
        this.config = config;
    }
    async execute(workflow, inputs) { return { id: uuidv4(), workflowId: workflow.id, status: "completed", inputs, variables: {}, nodeOutputs: {}, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() }; }
}
export function createExecutor(config) { return new WorkflowExecutor(config); }
//# sourceMappingURL=workflow-executor.js.map