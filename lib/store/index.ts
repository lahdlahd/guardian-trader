/**
 * Client-side store for live pipeline results.
 * Persists across page navigations via module-level state.
 */

export interface PipelineResult {
  status: string;
  scenarioName?: string;
  tradeIntent: Record<string, unknown>;
  aiAnalysis: Record<string, unknown>;
  guardianDecision: Record<string, unknown>;
  execution: Record<string, unknown> | null;
  snapshot: Record<string, unknown>;
  artifacts: Record<string, unknown>[];
  eip712: { signature: string; typedData: Record<string, unknown> };
  registryEvents: Record<string, unknown>[];
  adapter: string;
}

let _liveResults: PipelineResult[] = [];

export function addLiveResult(result: PipelineResult) {
  _liveResults = [result, ..._liveResults].slice(0, 50);
}

export function getLiveResults(): PipelineResult[] {
  return _liveResults;
}

export function clearLiveResults() {
  _liveResults = [];
}
