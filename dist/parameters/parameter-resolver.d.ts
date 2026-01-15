export declare class ParameterResolver {
    private sources;
    registerSource(name: string, fn: () => Promise<any>): void;
    resolve(param: any, ctx: any): Promise<any>;
    private interpolate;
}
export declare function createParameterResolver(): ParameterResolver;
//# sourceMappingURL=parameter-resolver.d.ts.map