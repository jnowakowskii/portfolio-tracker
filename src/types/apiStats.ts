export interface ApiStat {
  totalRequests: number;
  successfulCalls: number;
  failedCalls: number;
  lastFetchTime: Date | null;
  avgLatencyMs: number;
  errors: Array<{ message: string; time: Date }>;
  yahooStatus: "online" | "error" | "unknown";
}

export const initialApiStats: ApiStat = {
  totalRequests: 0,
  successfulCalls: 0,
  failedCalls: 0,
  lastFetchTime: null,
  avgLatencyMs: 0,
  errors: [],
  yahooStatus: "unknown",
};
