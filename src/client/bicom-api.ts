// HTTP client for the bicom-api stats endpoints.
//
// Single responsibility: GET requests with Bearer auth + timeout + typed
// error mapping. No retry V1 — the MCP user can retry manually if a request
// times out or 5xx's.
//
// Spec ref: sdd/bicom-mcp-v1/spec R13.
// Design ref: sdd/bicom-mcp-v1/design D8.

import { ApiError } from "./errors.js";

const TIMEOUT_MS = 10_000;

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class BicomApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  /**
   * GET `path` with optional query params. Returns the JSON body typed as `T`.
   * Throws `ApiError` with a typed code for any non-2xx outcome.
   */
  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(this.baseUrl + path);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      const err = e as Error;
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new ApiError(
          "TIMEOUT",
          `bicom-api no respondio en ${TIMEOUT_MS / 1000}s (${url.pathname}). Reintenta en unos segundos.`,
        );
      }
      throw new ApiError("NETWORK_ERROR", `Error de red al conectar con bicom-api: ${err.message}`);
    }

    if (res.status === 401) {
      throw new ApiError(
        "INVALID_TOKEN",
        "El api_token es invalido o expiro. Revisa BICOM_API_TOKEN en tu claude_desktop_config.json.",
        401,
      );
    }
    if (res.status === 403) {
      throw new ApiError(
        "TENANT_INACTIVE",
        "El tenant esta desactivado. Contacta a soporte BICOM.",
        403,
      );
    }
    if (res.status === 422) {
      const body = (await safeJson(res)) as ApiErrorBody;
      const code = body?.error?.code ?? "VALIDATION_ERROR";
      const message = body?.error?.message ?? "Error de validacion del request.";
      throw new ApiError(code, message, 422);
    }
    if (res.status >= 500) {
      throw new ApiError(
        "SERVICE_UNAVAILABLE",
        `bicom-api respondio HTTP ${res.status}. El servicio puede estar en mantencion — reintenta en unos minutos.`,
        res.status,
      );
    }
    if (!res.ok) {
      throw new ApiError(
        "UNEXPECTED",
        `Respuesta inesperada de bicom-api: HTTP ${res.status}`,
        res.status,
      );
    }

    return (await res.json()) as T;
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
