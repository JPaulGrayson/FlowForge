export interface CouncilModel { id: string; name: string; role?: string; }
export interface CouncilRequest { prompt: string; models: CouncilModel[]; pattern: "arena" | "debate" | "council" | "specialist"; }
export interface CouncilResponse { modelId: string; response: string; confidence?: number; }
export interface CouncilResult { responses: CouncilResponse[]; winner?: string; synthesis?: string; }
export class Council {
  private handlers: Map<string, (prompt: string) => Promise<string>> = new Map();
  registerModel(id: string, handler: (prompt: string) => Promise<string>) { this.handlers.set(id, handler); }
  async query(req: CouncilRequest): Promise<CouncilResult> {
    const responses: CouncilResponse[] = [];
    for (const model of req.models) {
      const handler = this.handlers.get(model.id);
      if (handler) {
        const response = await handler(req.prompt);
        responses.push({ modelId: model.id, response });
      }
    }
    if (req.pattern === "arena") return { responses, winner: responses[0]?.modelId };
    if (req.pattern === "debate") return { responses, synthesis: "Debate synthesis placeholder" };
    return { responses };
  }
}
export const council = new Council();
