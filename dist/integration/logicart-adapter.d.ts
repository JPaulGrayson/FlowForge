import type { Workflow } from "../types/workflow.js";
export declare class LogicArtAdapter {
    private config;
    constructor(config: {
        serverUrl: string;
    });
    createSession(wf: Workflow): Promise<{
        sessionId: string;
        url: string;
    }>;
    visualize(wf: Workflow): Promise<string>;
}
export declare function workflowToLogicArt(wf: Workflow): {
    nodes: {
        id: string;
        type: import("../types/workflow.js").NodeType;
        data: {
            label: string;
        };
        position: {
            x: number;
            y: number;
        };
    }[];
    edges: {
        id: string;
        source: string;
        target: string;
        label: string | undefined;
    }[];
};
export declare function createLogicArtAdapter(cfg: {
    serverUrl: string;
}): LogicArtAdapter;
//# sourceMappingURL=logicart-adapter.d.ts.map