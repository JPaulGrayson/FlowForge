export declare class WorkflowExecutor {
    private config;
    constructor(config: any);
    execute(workflow: any, inputs: any): Promise<{
        id: string;
        workflowId: any;
        status: string;
        inputs: any;
        variables: {};
        nodeOutputs: {};
        startedAt: string;
        completedAt: string;
    }>;
}
export declare function createExecutor(config: any): WorkflowExecutor;
//# sourceMappingURL=workflow-executor.d.ts.map