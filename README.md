# bicom-mcp-ai

**Conecta tu ERP BICOM con un asistente de IA.** Haz preguntas en lenguaje natural sobre ventas, cobranza, stock, clientes y compras desde Claude Desktop o ChatGPT Desktop.

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

Eso es lo que recibirás en Claude Desktop al conectar el MCP. Sigue leyendo para instalarlo en 10 minutos.

---

## Qué puedes preguntar

12 herramientas conectadas a la base de datos de tu empresa en BICOM:

| Categoría | Ejemplos |
|---|---|
| 💰 **Ventas** | "¿Cuánto vendí este mes?", "Top 10 productos del trimestre", "¿Cuál es mi mejor vendedor este año?" |
| 👥 **Clientes** | "¿Quiénes son mis mejores clientes?", "Top 20 clientes del trimestre" |
| 📒 **Cobranza** | "¿Cuánto me deben en total?", "¿Qué clientes deben hace más de 60 días?" |
| 📦 **Stock** | "¿Qué productos están por agotarse?", "Productos con stock en 0" |
| 🛒 **Compras** | "¿Cuánto gasté en compras este año?", "Compara compras vs ventas del mes" |
| 🧾 **Cotizaciones** | "Cotiza 10 cajas de guantes nitrilo y 5 alcohol gel a Acme SpA, RUT 76.123.456-7, con 10% de descuento en los guantes" |

**Períodos disponibles**: hoy, ayer, esta semana, este mes, mes pasado, trimestre actual, año actual. Todos con comparativo automático contra el período anterior.

### 🧾 Cotizaciones

El asistente busca los productos (`search_products`), te muestra el resumen y, **solo cuando confirmas**, crea la cotización en BICOM (`create_quote`). El PDF queda guardado en `~/Downloads/Cotizaciones BICOM/` (configurable con `BICOM_QUOTES_DIR`).

- El precio de cada línea sale del maestro de productos de BICOM; puedes indicar descuento por línea (% o monto).
- Si el RUT del cliente no existe, se crea con el nombre y datos que indiques.
- La cotización es interna: no va al SII ni mueve stock.
- Vendedor, sucursal, bodega y giro: si tu empresa tiene uno solo de cada uno se usan automáticamente; si tiene varios, el asistente te pregunta (`get_quote_options`). Para no elegirlos cada vez, fíjalos en el `env` del MCP:

```json
"BICOM_DEFAULT_SELLER_ID": "3",
"BICOM_DEFAULT_BRANCHOFFICE_ID": "1",
"BICOM_DEFAULT_WAREHOUSE_ID": "1",
"BICOM_DEFAULT_ACTIVITY_ID": "685"
```

Si la cotización se crea pero falla la generación del PDF, puedes pedir el PDF de nuevo con `get_quote_pdf`.

---

## ⚙️ Instalación — Claude Desktop (recomendado)

> **Tiempo estimado:** 10 minutos · **Dificultad:** baja (no requiere conocimientos de programación)

### Paso 1 — Instalar Node.js y pnpm

Si nunca has instalado Node antes:

- **Mac / Linux**: descarga desde [nodejs.org](https://nodejs.org) (versión LTS, 20 o superior).
- **Windows**: descarga el instalador `.msi` de [nodejs.org](https://nodejs.org) y completa los pasos del asistente.

Luego abre una terminal (en Mac: `Terminal.app`; en Windows: `PowerShell` o `cmd`) y ejecuta:

```bash
node --version
```

Debe mostrar `v20.x.x` o superior. Si funciona, instala pnpm:

```bash
npm install -g pnpm
```

### Paso 2 — Descargar y compilar el MCP

En la misma terminal, ubícate en la carpeta donde quieras guardarlo (típicamente `Documentos`) y ejecuta:

```bash
git clone https://github.com/BICOM-OFICIAL/bicom-mcp-ai.git
cd bicom-mcp-ai
pnpm install
pnpm build
```

Esto deja el ejecutable en `dist/index.js`. **Anota la ruta absoluta completa** de ese archivo — la necesitarás en el paso 4.

- Mac/Linux: típicamente `/Users/<tu-usuario>/bicom-mcp-ai/dist/index.js`
- Windows: típicamente `C:\Users\<tu-usuario>\bicom-mcp-ai\dist\index.js`

### Paso 3 — Obtener tu API token

Solicita al administrador de BICOM (o desde el backoffice `/admin/tokens`) un token de API para tu empresa. Recibirás un UUID similar a este:

```
79823361-92f1-4799-a234-341c3aa4e07f
```

Guárdalo, lo usarás en el paso 4. **No lo compartas** — funciona como una contraseña.

### Paso 4 — Configurar Claude Desktop

Ubica el archivo de configuración según tu sistema operativo:

| OS | Ubicación |
|---|---|
| **Mac** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

Ábrelo con un editor de texto (TextEdit, Notepad, VS Code, etc.). Si el archivo no existe, créalo con este contenido:

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

Si ya existe con otros MCPs configurados, agrega únicamente la entrada `"bicom": { ... }` dentro de `mcpServers`.

**Reemplaza**:
- `/RUTA/ABSOLUTA/A/bicom-mcp-ai/dist/index.js` → la ruta real del archivo del paso 2.
- `tu-token-uuid-del-paso-3` → el token UUID real obtenido en el paso 3.

> ⚠️ **Windows**: utiliza forward slashes (`/`) en la ruta, no backslashes. Ejemplo: `"C:/Users/Jose/bicom-mcp-ai/dist/index.js"`.

### Paso 5 — Reiniciar Claude Desktop

**Cierra Claude completamente** (clic derecho sobre el ícono → Quit, no solo minimizar). Vuelve a abrirlo.

Al volver a abrirse, verás un ícono de herramientas en la barra de input. Al hacer clic debería aparecer **bicom** con sus 12 herramientas listadas.

### Paso 6 — Probar

Realiza una consulta a Claude. Algunos ejemplos para comenzar:

- *"¿Cuánto vendí este mes en BICOM?"*
- *"Dame mis 5 mejores clientes del año"*
- *"¿Quiénes son mis clientes morosos hace más de 30 días?"*
- *"Hazme un reporte ejecutivo del mes en BICOM"*

> 💡 **Sugerencia**: Si tienes otros MCPs de facturación electrónica configurados, especifica "en BICOM" o "de mi empresa BICOM" en las consultas para que Claude no confunda las fuentes de datos.

---

## ⚙️ Instalación — ChatGPT Desktop

ChatGPT Desktop soporta MCPs mediante **Settings → Apps & Connectors → Developer**. La integración nativa está optimizada para servidores remotos (HTTP/SSE).

> **Estado actual (V1)**: `bicom-mcp-ai` utiliza el protocolo **STDIO** (estándar de Claude Desktop). Para usarlo con ChatGPT Desktop existen dos caminos:

### Opción A — Esperar el soporte SSE nativo (V2)

Estamos integrando transporte SSE para que ChatGPT Desktop lo soporte directamente. **ETA: V2 del MCP** (próximas semanas).

### Opción B — Usar un puente STDIO ↔ HTTP (avanzado)

Si necesitas usarlo en ChatGPT actualmente, puedes utilizar el paquete `mcp-remote` que expone un servidor STDIO local como HTTP/SSE. La configuración en ChatGPT Desktop apuntaría a `http://localhost:<puerto>` y el puente se ejecutaría localmente:

```bash
npx -y mcp-remote node /RUTA/ABSOLUTA/A/bicom-mcp-ai/dist/index.js --port 7878
```

Luego en ChatGPT Desktop → Settings → Apps & Connectors → Add MCP server → URL `http://localhost:7878`. Configura el token mediante variables de entorno antes de iniciar el puente:

```bash
export BICOM_API_TOKEN="tu-token-uuid"
export BICOM_API_BASE_URL="https://bicomrest.bicomstore.cl"
```

> 💡 **Recomendación**: utiliza Claude Desktop por ahora — es la experiencia más estable hasta que ChatGPT Desktop estabilice su soporte STDIO o lancemos la versión con SSE.

---

## 🧠 Consultas combinadas

Claude puede ejecutar múltiples herramientas en una sola consulta. Algunos ejemplos:

| Consulta | Lo que ejecuta Claude |
|---|---|
| *"Hazme un reporte ejecutivo del mes en BICOM"* | Ventas + top productos + top clientes + cobranza + alertas |
| *"¿Cómo está mi negocio?"* | Ventas + cobranza + stock bajo → health check en 60 segundos |
| *"¿Qué clientes son top pero también me están debiendo?"* | Top customers + overdue customers, cruzados |
| *"Compara mi rentabilidad: ventas vs compras del año"* | Sales summary + purchases summary, año actual |

---

## 🐛 Solución de problemas

### "bicom" no aparece en la lista de MCPs

1. Cierra Claude Desktop **por completo** (System Tray → Quit, no solo minimizar).
2. Verifica la ruta en el archivo de configuración — debe ser **absoluta**, no relativa.
3. En Windows utiliza `/` en lugar de `\` en la ruta.
4. Verifica que `dist/index.js` exista (ejecuta `pnpm build` nuevamente si no está).

### Claude responde "el api_token es inválido"

El token expiró o fue desactivado. Solicita uno nuevo al administrador y actualiza `BICOM_API_TOKEN` en la configuración. Reinicia Claude Desktop.

### Claude responde "cobranza no habilitada para esta empresa"

Tu empresa utiliza el modelo de tesorería anterior (`new_treasury=0`). Los reportes de cuentas por cobrar y morosos no aplican en ese caso — pero **el resto de las herramientas funcionan normalmente**. El soporte para ese modo está planificado para V2.

### Errores inesperados o sin respuesta

Revisa el archivo de logs de Claude Desktop:

| OS | Ubicación |
|---|---|
| Mac | `~/Library/Logs/Claude/mcp-server-bicom.log` |
| Windows | `%APPDATA%\Claude\logs\mcp-server-bicom.log` |

Envía el contenido al administrador de BICOM o abre un issue en este repositorio con esa información.

---

## 🛡️ Seguridad

- El `BICOM_API_TOKEN` se almacena **en texto plano** en `claude_desktop_config.json`. Trata ese archivo como una contraseña.
- El MCP **solo lee datos** de tu empresa, con una excepción: `create_quote` crea cotizaciones (y el cliente, si su RUT no existe). Claude Desktop te pide aprobar cada uso de la herramienta. No puede modificar ni eliminar nada.
- Cada token está **scopeado a tu empresa**: nunca podrás ver datos de otra empresa con tu token, ni viceversa.
- Toda la comunicación con `bicomrest.bicomstore.cl` se realiza por **HTTPS**.

---

## 📚 Recursos

- **Backend BICOM API**: documentación interna en el repositorio `bicom-api-go` (privado).
- **Endpoints que consume este MCP**: `/api/stats/*` (8 endpoints REST).
- **Protocolo MCP**: [modelcontextprotocol.io](https://modelcontextprotocol.io) — el estándar utilizado por Claude.

## 📄 Licencia

MIT — ver [LICENSE](LICENSE).
