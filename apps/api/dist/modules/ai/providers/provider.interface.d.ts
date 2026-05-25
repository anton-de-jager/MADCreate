export interface AIProviderCompleteOptions {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
}
export interface AIProviderCompleteResult {
    raw: string;
    tokensIn?: number;
    tokensOut?: number;
}
export interface AIProvider {
    readonly name: 'claude-code-manual';
    complete(opts: AIProviderCompleteOptions): Promise<AIProviderCompleteResult>;
    readonly isManual?: boolean;
}
