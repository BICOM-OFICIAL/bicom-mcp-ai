// Typed errors emitted by BicomApiClient. Each maps to a known HTTP outcome
// from bicom-api so tool handlers can render friendly Spanish messages without
// parsing strings.

export type ApiErrorCode =
  | "INVALID_TOKEN"
  | "TENANT_INACTIVE"
  | "INVALID_PERIOD"
  | "INVALID_LIMIT"
  | "INVALID_DAYS"
  | "INVALID_THRESHOLD"
  | "COBRANZA_NOT_ENABLED"
  | "STATS_QUERY_FAILED"
  | "SERVICE_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNEXPECTED";

export class ApiError extends Error {
  public readonly code: ApiErrorCode | string;
  public readonly status?: number;

  constructor(code: ApiErrorCode | string, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}
