import type { Workflow } from "../types/workflow.js";
export declare function saveWorkflow(wf: Workflow): Promise<string>;
export declare function loadWorkflow(id: string): Promise<Workflow | null>;
export declare function listWorkflows(): Promise<string[]>;
export declare function deleteWorkflow(id: string): Promise<boolean>;
//# sourceMappingURL=persistence.d.ts.map