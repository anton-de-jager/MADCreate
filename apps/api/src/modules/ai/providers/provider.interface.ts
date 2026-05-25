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
  /**
   * If true, AiService treats `raw` as a prompt for the human to run elsewhere
   * (e.g., paste into Claude Code) rather than as a model output. The generation
   * row is parked at AWAITING_INPUT until the human submits the result via
   * POST /v1/ai/generations/:id/submit.
   */
  readonly isManual?: boolean;
}
