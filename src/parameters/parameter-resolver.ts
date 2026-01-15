export class ParameterResolver {
  private sources: Map<string, () => Promise<any>> = new Map();
  registerSource(name: string, fn: () => Promise<any>) { this.sources.set(name, fn); }
  async resolve(param: any, ctx: any): Promise<any> {
    if (!param?.type) return param;
    if (param.type === "static") return param.value;
    if (param.type === "template") return this.interpolate(param.template, ctx);
    if (param.type === "reference") {
      const src = this.sources.get(param.source);
      if (src) return src();
      if (param.source === "input") return ctx.inputs?.[param.path];
      if (param.source === "node") return ctx.nodeOutputs?.[param.path];
      if (param.source === "variable") return ctx.variables?.[param.path];
    }
    return param;
  }
  private interpolate(tpl: string, ctx: any): string {
    return tpl.replace(/\$\{([^}]+)\}/g, (_, key) => ctx[key] ?? "");
  }
}
export function createParameterResolver() { return new ParameterResolver(); }
