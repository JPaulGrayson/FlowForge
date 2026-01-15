export class ParameterResolver {
    sources = new Map();
    registerSource(name, fn) { this.sources.set(name, fn); }
    async resolve(param, ctx) {
        if (!param?.type)
            return param;
        if (param.type === "static")
            return param.value;
        if (param.type === "template")
            return this.interpolate(param.template, ctx);
        if (param.type === "reference") {
            const src = this.sources.get(param.source);
            if (src)
                return src();
            if (param.source === "input")
                return ctx.inputs?.[param.path];
            if (param.source === "node")
                return ctx.nodeOutputs?.[param.path];
            if (param.source === "variable")
                return ctx.variables?.[param.path];
        }
        return param;
    }
    interpolate(tpl, ctx) {
        return tpl.replace(/\$\{([^}]+)\}/g, (_, key) => ctx[key] ?? "");
    }
}
export function createParameterResolver() { return new ParameterResolver(); }
//# sourceMappingURL=parameter-resolver.js.map