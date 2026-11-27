export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "payload_too_large"
  | "validation_failed"
  | "rate_limited"
  | "internal";

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  payload_too_large: 413,
  validation_failed: 422,
  rate_limited: 429,
  internal: 500,
};

export class ApiError extends Error {
  readonly status: number;
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.status = STATUS[code];
  }
}

export function errorBody(code: ApiErrorCode, message: string) {
  return { error: { code, message } };
}
