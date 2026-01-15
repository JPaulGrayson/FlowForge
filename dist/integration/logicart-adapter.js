export class LogicArtAdapter {
    config;
    constructor(config) {
        this.config = config;
    }
    async createSession(wf) {
        const res = await fetch(this.config.serverUrl + "/api/remote/session", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: wf.name, code: JSON.stringify(wf) })
        });
        return res.json();
    }
    async visualize(wf) {
        const data = workflowToLogicArt(wf);
        const encoded = encodeURIComponent(JSON.stringify(data));
        return this.config.serverUrl + "/?flow=" + encoded;
    }
}
export function workflowToLogicArt(wf) {
    return { nodes: wf.nodes.map(n => ({ id: n.id, type: n.type, data: { label: n.label }, position: n.position || { x: 0, y: 0 } })),
        edges: wf.edges.map(e => ({ id: e.id, source: e.sourceNodeId, target: e.targetNodeId, label: e.label })) };
}
export function createLogicArtAdapter(cfg) { return new LogicArtAdapter(cfg); }
//# sourceMappingURL=logicart-adapter.js.map