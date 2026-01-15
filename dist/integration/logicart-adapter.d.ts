export declare class LogicArtAdapter {
    private config;
    constructor(config: {
        serverUrl: string;
    });
    createSession(workflow: any): Promise<unknown>;
}
export declare function createLogicArtAdapter(config: any): LogicArtAdapter;
export declare function workflowToLogicArt(w: any): {
    nodes: any;
    edges: any;
};
//# sourceMappingURL=logicart-adapter.d.ts.map