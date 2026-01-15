export interface Workflow {
    id: string;
    name: string;
    description: string;
    version: string;
    config: any;
    inputs: any[];
    outputs: any[];
    nodes: any[];
    edges: any[];
    startNodeId: string;
    metadata: any;
}
export interface WorkflowExecution {
    id: string;
    workflowId: string;
    status: string;
    inputs: any;
    variables: any;
    nodeOutputs: any;
    startedAt: string;
}
export type NodeType = "start" | "end" | "tool" | "decision" | "human" | "council";
//# sourceMappingURL=workflow.d.ts.map