import { v4 as uuidv4 } from "uuid";
import type { Workflow, WorkflowExecution } from "../types/workflow.js";
export class WorkflowExecutor {
  private tools: Map<string, Function> = new Map();
  constructor(private config: any = {}) {}
  registerTool(name: string, fn: Function) { this.tools.set(name, fn); }
  async execute(wf: Workflow, inputs: any): Promise<WorkflowExecution> {
    const ex: WorkflowExecution = { id: uuidv4(), workflowId: wf.id, status: "running", inputs, history: [], variables: {}, nodeOutputs: {}, startedAt: new Date().toISOString() };
    for (const node of wf.nodes) {
      if (node.type === "tool" && node.config?.toolName) {
        const fn = this.tools.get(node.config.toolName);
        if (fn) ex.nodeOutputs[node.id] = await fn(node.config.parameters, ex);
      }
    }
    ex.status = "completed"; ex.completedAt = new Date().toISOString(); return ex;
  }
}
export function createExecutor(c: any = {}) { return new WorkflowExecutor(c); }
