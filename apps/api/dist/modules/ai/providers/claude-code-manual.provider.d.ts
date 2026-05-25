import type { AIProvider, AIProviderCompleteOptions, AIProviderCompleteResult } from './provider.interface';
export declare class ClaudeCodeManualProvider implements AIProvider {
    readonly name: "claude-code-manual";
    readonly isManual = true;
    complete(opts: AIProviderCompleteOptions): Promise<AIProviderCompleteResult>;
}
