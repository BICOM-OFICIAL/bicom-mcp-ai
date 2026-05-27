# bicom-mcp-ai

**Tu BICOM ahora habla con Claude (y ChatGPT).** Conectá tu ERP a un asistente de IA y preguntale en español lo que necesites: ventas, cobranza, stock, clientes, compras.

```
> ¿Cuánto vendí este mes y cómo me fue contra el anterior?

💰 Resumen de ventas
Periodo: 1 may 2026 → 26 may 2026

- Documentos emitidos: 243
- Total bruto: $5.765.217
- Total neto: $4.454.353
- IVA: $814.951

vs periodo anterior 📉
- Cambio: -95,4% (-$119.027.516)
- Anterior: 357 docs, $124.792.733

Por tipo de documento
| Tipo                        | Docs | Total       |
| --------------------------- | ---: | ----------: |
| FACTURA ELECTRÓNICA         |   64 | $2.610.400  |
| BOLETA ELECTRÓNICA          |  142 | $2.313.669  |
| NOTA DE CRÉDITO ELECTRÓNICA |   12 |   $504.082  |
| GUÍA DE DESPACHO ELECTRÓNICA|    7 |   $184.990  |
| FACTURA EXENTA ELECTRÓNICA  |    7 |    $96.480  |
| BOLETA EXENTA ELECTRÓNICA   |   11 |    $55.596  |
```

Esto es lo que vas a ver en Claude Desktop cuando le hables a tu empresa. Sigue leyendo para instalarlo en 10 minutos.

---

## Qué podés preguntar

8 herramientas conectadas a tu base de datos de BICOM:

| Categoría | Ejemplos |
|---|---|
| 💰 **Ventas** | "¿Cuánto vendí este mes?", "Top 10 productos del trimestre", "¿Qué vendedor está mejor este año?" |
| 👥 **Clientes** | "¿Quiénes son mis mejores clientes?", "Top 20 del trimestre" |
| 📒 **Cobranza** | "¿Cuánto me deben en total?", "¿Quiénes me deben hace más de 60 días?" |
| 📦 **Stock** | "¿Qué productos están por agotarse?", "Productos con stock 0" |
| 🛒 **Compras** | "¿Cuánto gasté este año?", "Comparame compras vs ventas del mes" |

**Períodos disponibles**: hoy, ayer, esta semana, este mes, mes pasado, trimestre actual, año actual. Todos con comparativo automático contra el período anterior.

---

## ⚙️ Instalación — Claude Desktop (recomendado)

> **Tiempo estimado:** 10 minutos · **Dificultad:** baja (no necesitás saber programar)

### Paso 1 — Instalar Node.js y pnpm

Si nunca instalaste Node antes:

- **Mac / Linux**: descargar desde [nodejs.org](https://nodejs.org) (versión LTS, 20 o superior).
- **Windows**: descargar el `.msi` de [nodejs.org](https://nodejs.org) y siguiente-siguiente.

Después abrí una terminal (en Mac: `Terminal.app`; en Windows: `PowerShell` o `cmd`) y corré:

```bash
node --version
```

Debería decir `v20.x.x` o superior. Si funciona, instalá pnpm:

```bash
npm install -g pnpm
```

### Paso 2 — Bajar y compilar el MCP

En la misma terminal, parate donde quieras guardarlo (típicamente `Documentos`) y corré:

```bash
git clone https://github.com/BICOM-OFICIAL/bicom-mcp-ai.git
cd bicom-mcp-ai
pnpm install
pnpm build
```

Eso te deja el ejecutable en `dist/index.js`. **Anotá el path absoluto completo** de ese archivo — lo vas a usar en el paso 4.

- Mac/Linux: típicamente `/Users/<tuusuario>/bicom-mcp-ai/dist/index.js`
- Windows: típicamente `C:\Users\<tuusuario>\bicom-mcp-ai\dist\index.js`

### Paso 3 — Conseguir tu API token

Pedile al admin de BICOM (o desde el backoffice `/admin/tokens`) un token de API para tu empresa. Te van a dar un UUID que se ve así:

```
79823361-92f1-4799-a234-341c3aa4e07f
```

Guardalo, lo vas a usar en el paso 4. **No lo compartas** — funciona como contraseña.

### Paso 4 — Configurar Claude Desktop

Encontrá el archivo de configuración según tu sistema:

| OS | Ubicación |
|---|---|
| **Mac** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

Abrilo con un editor de texto (TextEdit, Notepad, VS Code, lo que tengas). Si el archivo no existe, creálo con este contenido:

```json
{
  "mcpServers": {
    "bicom": {
      "command": "node",
      "args": ["/RUTA/ABSOLUTA/A/bicom-mcp-ai/dist/index.js"],
      "env": {
        "BICOM_API_TOKEN": "tu-token-uuid-del-paso-3",
        "BICOM_API_BASE_URL": "https://bicomrest.bicomstore.cl"
      }
    }
  }
}
```

Si ya existe con otros MCPs, agregá la entrada `"bicom": { ... }` dentro de `mcpServers`.

**Reemplazá**:
- `/RUTA/ABSOLUTA/A/bicom-mcp-ai/dist/index.js` → el path real del archivo del paso 2.
- `tu-token-uuid-del-paso-3` → tu token UUID real.

> ⚠️ **Windows**: usá forward slashes (`/`) en el path, no backslashes. Ejemplo: `"C:/Users/Jose/bicom-mcp-ai/dist/index.js"`.

### Paso 5 — Reiniciar Claude Desktop

**Cerrá Claude completamente** (clic derecho sobre el ícono → Quit, no minimizar). Volvelo a abrir.

Cuando vuelva, vas a ver un ícono de herramientas en la barra de input — al hacer clic debería aparecer **bicom** con sus 8 tools listadas.

### Paso 6 — Probar

Tirale a Claude cualquier pregunta. Ejemplos para empezar:

- *"¿Cuánto vendí este mes en BICOM?"*
- *"Dame mis 5 mejores clientes del año"*
- *"¿Quiénes son mis morosos hace más de 30 días?"*
- *"Hacéme un reporte ejecutivo del mes en BICOM"*

> 💡 **Tip**: Si tenés otros MCPs de facturación electrónica configurados, aclará "en BICOM" o "de mi empresa BICOM" en las preguntas para que Claude no confunda fuentes.

---

## ⚙️ Instalación — ChatGPT Desktop

ChatGPT Desktop soporta MCPs vía **Settings → Apps & Connectors → Developer**. La integración nativa está optimizada para servidores remotos (HTTP/SSE).

> **Estado actual (V1)**: `bicom-mcp-ai` usa el protocolo **STDIO** (estándar para Claude Desktop). Para usarlo con ChatGPT Desktop tenés dos caminos:

### Opción A — Esperar el soporte SSE (V2)

Estamos sumando transporte SSE para que ChatGPT Desktop lo soporte nativamente. **ETA: V2 del MCP** (próximas semanas).

### Opción B — Usar un puente STDIO ↔ HTTP (avanzado)

Si querés probarlo ya en ChatGPT, podés usar el paquete `mcp-remote` que expone un servidor STDIO local como HTTP/SSE. La configuración en ChatGPT Desktop quedaría apuntando a `http://localhost:<puerto>` y vos correrías el bridge localmente:

```bash
npx -y mcp-remote node /RUTA/ABSOLUTA/A/bicom-mcp-ai/dist/index.js --port 7878
```

Después en ChatGPT Desktop → Settings → Apps & Connectors → Add MCP server → URL `http://localhost:7878`. Pasale el token vía variable de entorno antes de levantar el bridge:

```bash
export BICOM_API_TOKEN="tu-token-uuid"
export BICOM_API_BASE_URL="https://bicomrest.bicomstore.cl"
```

> 💡 **Mientras tanto, recomendamos Claude Desktop** — es la experiencia más limpia hasta que ChatGPT Desktop estabilice su soporte STDIO o saquemos la versión SSE.

---

## 🧠 Combinaciones que más impresionan

Claude puede llamar varias tools en una sola pregunta. Probá estas:

| Pregunta | Lo que arma Claude |
|---|---|
| *"Hacéme un reporte ejecutivo del mes en BICOM"* | Ventas + top productos + top clientes + cobranza + alertas |
| *"¿Cómo está mi negocio?"* | Ventas + cobranza + stock bajo → health check de 60 segundos |
| *"¿Qué clientes son top pero también me están debiendo?"* | Top customers + overdue customers, cruzados |
| *"Compará mi rentabilidad ventas vs compras del año"* | Sales summary + purchases summary, año actual |

---

## 🐛 Troubleshooting

### "bicom" no aparece en la lista de MCPs

1. Cerrá Claude Desktop **completo** (System Tray → Quit, no minimizar).
2. Verificá el path en el config — debe ser **absoluto**, no relativo.
3. En Windows usá `/` no `\` en el path.
4. Verificá que `dist/index.js` exista (corré `pnpm build` de nuevo si no).

### Claude responde "el api_token es inválido"

Tu token venció o fue desactivado. Pedile uno nuevo al admin y actualizá `BICOM_API_TOKEN` en el config. Reiniciá Claude Desktop.

### Claude responde "cobranza no habilitada para esta empresa"

Tu empresa usa el modelo de tesorería antiguo (`new_treasury=0`). Los reportes de cuentas por cobrar y morosos no aplican — pero **el resto de las herramientas funcionan normal**. Soporte para ese modo está planificado para V2.

### Errores raros / no responde nada

Abrí el archivo de logs de Claude Desktop:

| OS | Ubicación |
|---|---|
| Mac | `~/Library/Logs/Claude/mcp-server-bicom.log` |
| Windows | `%APPDATA%\Claude\logs\mcp-server-bicom.log` |

Pegale el contenido a tu admin de BICOM o abrí un issue acá con esa info.

---

## 🛡️ Seguridad

- El `BICOM_API_TOKEN` se guarda **en claro** en `claude_desktop_config.json`. Tratá ese archivo como una contraseña.
- El MCP **solo lee datos** de tu empresa — no puede crear, modificar ni borrar nada.
- Cada token está **scopeado a tu empresa**: nunca podés ver datos de otra empresa con tu token, ni viceversa.
- Toda la comunicación con `bicomrest.bicomstore.cl` va por **HTTPS**.

---

## 📚 Recursos

- **Backend BICOM API**: documentación interna en el repo `bicom-api-go` (privado).
- **Endpoints que consume este MCP**: `/api/stats/*` (8 endpoints REST).
- **MCP Protocol**: [modelcontextprotocol.io](https://modelcontextprotocol.io) — el estándar que usa Claude.

## 📄 Licencia

MIT — ver [LICENSE](LICENSE).
