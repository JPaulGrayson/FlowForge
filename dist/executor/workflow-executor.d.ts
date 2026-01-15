import type { Workflow, WorkflowExecution } from "../types/workflow.js";
export declare class WorkflowExecutor {
    private config;
    private tools;
    constructor(config?: any);
    registerTool(name: string, fn: Function): void;
    execute(wf: Workflow, inputs: any): Promise<WorkflowExecution>;
}
export declare function createExecutor(c?: any): WorkflowExecutor;
//# sourceMappingURL=workflow-executor.d.ts.map