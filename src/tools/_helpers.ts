// Shared helpers para todos los tools del MCP.
//
// safeRender: envoltorio uniforme que captura ApiError + errores inesperados
// y los traduce a un CallToolResult con isError=true + mensaje markdown
// friendly en espanol (R13.7).

import { ApiError } from "../client/errors.js";

// El index signature es requerido por el tipo CallToolResult del MCP SDK.
export interface ToolResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export async function safeRender(produceText: () => Promise<string>): Promise<ToolResult> {
  try {
    const text = await produceText();
    return { content: [{ type: "text", text }] };
  } catch (e) {
    if (e instanceof ApiError) {
      const lines = [`**Error (${e.code}):** ${e.message}`];
      // Mensajes accionables segun el code conocido.
      switch (e.code) {
        case "INVALID_TOKEN":
          lines.push("");
          lines.push(
            "Para arreglarlo: genera un api_token nuevo desde /admin/tokens del bicom-api y actualiza BICOM_API_TOKEN en tu claude_desktop_config.json. Despues reinicia Claude Desktop.",
          );
          break;
        case "COBRANZA_NOT_ENABLED":
          lines.push("");
          lines.push(
            "_Esta empresa no usa el modulo de tesoreria nuevo. Las herramientas de ventas, stock, productos, clientes y compras siguen funcionando._",
          );
          break;
        case "TIMEOUT":
        case "SERVICE_UNAVAILABLE":
          lines.push("");
          lines.push("_Reintenta en unos segundos. Si persiste, avisame al equipo de soporte._");
          break;
      }
      return {
        isError: true,
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return {
      isError: true,
      content: [{ type: "text", text: `**Error inesperado:** ${msg}` }],
    };
  }
}
