export interface TenantContext {
    id: string;
    slug: string;
    workspaceId: string;
}
export declare const CurrentTenant: (...dataOrPipes: unknown[]) => ParameterDecorator;
