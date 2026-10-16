// HTTP client for the bicom-api endpoints used by the MCP.
//
// Single responsibility: requests with Bearer auth + timeout + typed error
// mapping. No retry V1 — the MCP user can retry manually if a request times
// out or 5xx's. Writes (POST) send a fresh Idempotency-Key per call, which
// bicom-api requires on /quotes.
//
// Spec ref: sdd/bicom-mcp-v1/spec R13.
// Design ref: sdd/bicom-mcp-v1/design D8.

import { randomUUID } from "node:crypto";
import { ApiError } from "./errors.js";

const TIMEOUT_MS = 10_000;
// Crear una cotizacion incluye la tx + la generacion del PDF upstream.
const WRITE_TIMEOUT_MS = 60_000;

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

type Params = Record<string, string | number | undefined>;

export interface BinaryResponse {
  headers: Headers;
  bytes: Uint8Array;
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
  async get<T>(path: string, params?: Params): Promise<T> {
    const res = await this.request("GET", path, { params });
    return (await res.json()) as T;
  }

  /** GET `path` and return the raw bytes (PDFs). */
  async getBinary(path: string): Promise<BinaryResponse> {
    const res = await this.request("GET", path, { timeoutMs: WRITE_TIMEOUT_MS });
    return { headers: res.headers, bytes: new Uint8Array(await res.arrayBuffer()) };
  }

  /** POST a JSON body and return the raw bytes (PDFs) plus response headers. */
  async postBinary(path: string, body: unknown): Promise<BinaryResponse> {
    const res = await this.request("POST", path, { body, timeoutMs: WRITE_TIMEOUT_MS });
    return { headers: res.headers, bytes: new Uint8Array(await res.arrayBuffer()) };
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    opts: { params?: Params; body?: unknown; timeoutMs?: number } = {},
  ): Promise<Response> {
    const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
    const url = new URL(this.baseUrl + path);
    if (opts.params) {
      for (const [k, v] of Object.entries(opts.params)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
    };
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
      headers["Idempotency-Key"] = randomUUID();
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      const err = e as Error;
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new ApiError(
          "TIMEOUT",
          method === "POST"
            ? `bicom-api no respondio en ${timeoutMs / 1000}s (${url.pathname}). La operacion pudo haberse completado: verifica en BICOM antes de reintentar.`
            : `bicom-api no respondio en ${timeoutMs / 1000}s (${url.pathname}). Reintenta en unos segundos.`,
        );
      }
      throw new ApiError("NETWORK_ERROR", `Error de red al conectar con bicom-api: ${err.message}`);
    }

    if (res.ok) {
      return res;
    }

    const err = await toApiError(res, url);
    // POST /quotes/agent: si la cotizacion se creo pero fallo el PDF, la API
    // igual informa el id. Se agrega al mensaje para poder recuperar el PDF.
    const quoteId = res.headers.get("X-Quote-Id");
    if (quoteId) {
      const folio = res.headers.get("X-Quote-Folio") ?? "?";
      throw new ApiError(
        err.code,
        `${err.message} — OJO: la cotizacion SI se creo (folio ${folio}, id ${quoteId}). No la vuelvas a crear; usa get_quote_pdf con quote_id=${quoteId}.`,
        err.status,
      );
    }
    throw err;
  }
}

async function toApiError(res: Response, url: URL): Promise<ApiError> {
  if (res.status === 401) {
    return new ApiError(
      "INVALID_TOKEN",
      "El api_token es invalido o expiro. Revisa BICOM_API_TOKEN en tu claude_desktop_config.json.",
      401,
    );
  }
  if (res.status === 403) {
    return new ApiError(
      "TENANT_INACTIVE",
      "El tenant esta desactivado. Contacta a soporte BICOM.",
      403,
    );
  }
  // 400 (validaciones de cotizaciones), 409 (idempotencia), 422 y 502 (PDF
  // upstream) traen un body {"error":{"code","message"}} con el detalle.
  if ([400, 409, 422, 502].includes(res.status)) {
    const body = (await safeJson(res)) as ApiErrorBody;
    const code = body?.error?.code ?? "VALIDATION_ERROR";
    const message = body?.error?.message ?? `Error HTTP ${res.status} de bicom-api.`;
    return new ApiError(code, message, res.status);
  }
  if (res.status === 404) {
    return new ApiError("NOT_FOUND", `No se encontro el recurso (${url.pathname}).`, 404);
  }
  if (res.status >= 500) {
    const body = (await safeJson(res)) as ApiErrorBody;
    return new ApiError(
      body?.error?.code ?? "SERVICE_UNAVAILABLE",
      body?.error?.message ??
        `bicom-api respondio HTTP ${res.status}. El servicio puede estar en mantencion — reintenta en unos minutos.`,
      res.status,
    );
  }
  return new ApiError(
    "UNEXPECTED",
    `Respuesta inesperada de bicom-api: HTTP ${res.status}`,
    res.status,
  );
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
