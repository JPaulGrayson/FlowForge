export class LogicArtAdapter {
    config;
    constructor(config) {
        this.config = config;
    }
    async createSession(workflow) { const res = await fetch(this.config.serverUrl + "/api/remote/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: workflow.name }) }); return res.json(); }
}
export function createLogicArtAdapter(config) { return new LogicArtAdapter(config); }
export function workflowToLogicArt(w) { return { nodes: w.nodes, edges: w.edges }; }
//# sourceMappingURL=logicart-adapter.js.map