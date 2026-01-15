export interface CouncilModel {
    id: string;
    name: string;
    role?: string;
}
export interface CouncilRequest {
    prompt: string;
    models: CouncilModel[];
    pattern: "arena" | "debate" | "council" | "specialist";
}
export interface CouncilResponse {
    modelId: string;
    response: string;
    confidence?: number;
}
export interface CouncilResult {
    responses: CouncilResponse[];
    winner?: string;
    synthesis?: string;
}
export declare class Council {
    private handlers;
    registerModel(id: string, handler: (prompt: string) => Promise<string>): void;
    query(req: CouncilRequest): Promise<CouncilResult>;
}
export declare const council: Council;
//# sourceMappingURL=council.d.ts.map