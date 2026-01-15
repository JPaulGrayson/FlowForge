export declare class WorkflowGenerator {
    generate(req: {
        prompt: string;
    }): Promise<{
        workflow: {
            id: string;
            name: string;
            description: string;
            version: string;
            config: {};
            inputs: never[];
            outputs: never[];
            nodes: {
                id: string;
                type: string;
                label: string;
                config: {};
            }[];
            edges: {
                id: string;
                sourceNodeId: string;
                targetNodeId: string;
            }[];
            startNodeId: string;
            metadata: {
                createdAt: string;
                updatedAt: string;
                visibility: string;
            };
        };
        confidence: number;
    }>;
}
export declare const generator: WorkflowGenerator;
//# sourceMappingURL=workflow-generator.d.ts.map