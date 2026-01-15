export class Council {
    handlers = new Map();
    registerModel(id, handler) { this.handlers.set(id, handler); }
    async query(req) {
        const responses = [];
        for (const model of req.models) {
            const handler = this.handlers.get(model.id);
            if (handler) {
                const response = await handler(req.prompt);
                responses.push({ modelId: model.id, response });
            }
        }
        if (req.pattern === "arena")
            return { responses, winner: responses[0]?.modelId };
        if (req.pattern === "debate")
            return { responses, synthesis: "Debate synthesis placeholder" };
        return { responses };
    }
}
export const council = new Council();
//# sourceMappingURL=council.js.map