import type { Workflow } from "../types/workflow.js";
export declare class WorkflowGenerator {
    generate(req: {
        prompt: string;
    }): Promise<{
        workflow: Workflow;
        confidence: number;
    }>;
    private fallback;
}
export declare const generator: WorkflowGenerator;
//# sourceMappingURL=workflow-generator.d.ts.map