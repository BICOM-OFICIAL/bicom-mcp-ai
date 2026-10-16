// Guarda un PDF en disco y devuelve la ruta absoluta. El MCP corre local (STDIO)
// en el computador del usuario, asi que el archivo queda accesible para abrirlo.

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export async function savePdf(dir: string, filename: string, bytes: Uint8Array): Promise<string> {
  await mkdir(dir, { recursive: true });
  // El nombre incluye valores que vienen de la API (folio): se limpia para que
  // nunca pueda salir de `dir` (p.ej. "../").
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "_");
  const path = resolve(join(dir, safe));
  await writeFile(path, bytes);
  return path;
}
