import type { Workflow } from "../types/workflow.js";
export class LogicArtAdapter {
  constructor(private config: { serverUrl: string }) {}
  async createSession(wf: Workflow): Promise<{ sessionId: string; url: string }> {
    const res = await fetch(this.config.serverUrl + "/api/remote/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wf.name, code: JSON.stringify(wf) })
    });
    return res.json() as Promise<{ sessionId: string; url: string }>;
  }
  async visualize(wf: Workflow): Promise<string> {
    const data = workflowToLogicArt(wf);
    const encoded = encodeURIComponent(JSON.stringify(data));
    return this.config.serverUrl + "/?flow=" + encoded;
  }
}
export function workflowToLogicArt(wf: Workflow) {
  return { nodes: wf.nodes.map(n => ({ id: n.id, type: n.type, data: { label: n.label }, position: n.position || { x: 0, y: 0 } })),
    edges: wf.edges.map(e => ({ id: e.id, source: e.sourceNodeId, target: e.targetNodeId, label: e.label })) };
}
export function createLogicArtAdapter(cfg: { serverUrl: string }) { return new LogicArtAdapter(cfg); }
