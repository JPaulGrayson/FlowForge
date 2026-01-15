export interface CouncilModel {
    id: string;
    name: string;
    role?: string;
}
export interface CouncilRequest {
    prompt: string;
    models: CouncilModel[];
    pattern: string;
}
export interface CouncilResponse {
    modelId: string;
    response: string;
}
export interface CouncilResult {
    responses: CouncilResponse[];
    synthesis?: string;
    winner?: string;
}
export declare class Council {
    query(req: CouncilRequest): Promise<CouncilResult>;
}
export declare const council: Council;
//# sourceMappingURL=council.d.ts.map