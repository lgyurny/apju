import express from "express";
import { webhookCallback } from "grammy";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { bot } from "./src/bot.ts";
import apiRouter from "./src/api.ts";

// --- Configuración ---
const WEBAPP_URL = (Deno.env.get("WEBAPP_URL") ?? "").replace(/\/+$/, "");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const PORT = Number(Deno.env.get("PORT")) || 8000;

if (!WEBAPP_URL || !WEBHOOK_SECRET) {
    throw new Error("Faltan variables de entorno: WEBAPP_URL y/o WEBHOOK_SECRET");
}

const WEBHOOK_PATH = `/telegram-webhook/${WEBHOOK_SECRET}`;
const FULL_WEBHOOK_URL = `${WEBAPP_URL}${WEBHOOK_PATH}`;

// --- Servidor Express ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

//app.use(express.json());
//app.use(express.static(join(__dirname, "..", "public"))); // ajusta si mueves carpetas

// --- Middlewares base ---
app.use(express.json()); // GrammY reutiliza el body ya parseado ✅
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", apiRouter);
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(WEBHOOK_PATH, webhookCallback(bot, "express", { secretToken: WEBHOOK_SECRET }));

// --- CAPA 2: bootstrap idempotente y SIN crash loop ---
async function bootstrap(attempt = 1): Promise<void> {
    try {
        await bot.init(); // cachea getMe: necesario antes de procesar updates por webhook

        // Solo llama a setWebhook si la URL configurada en Telegram es DIFERENTE.
        // Esto convierte el arranque en una operación de lectura barata (getWebhookInfo)
        // en el 99% de los cold starts de Deno Deploy.
        const info = await bot.api.getWebhookInfo();
        if (info.url === FULL_WEBHOOK_URL) {
            console.log("✅ Webhook ya estaba configurado. No se vuelve a llamar a setWebhook.");
            return;
        }

        await bot.api.setWebhook(FULL_WEBHOOK_URL, { secret_token: WEBHOOK_SECRET });
        console.log("🔗 Webhook actualizado →", FULL_WEBHOOK_URL);
    } catch (err) {
        // ⚠️ NUNCA process.exit(): en serverless eso crea el bucle de reinicios.
        // El servidor sigue en pie aunque el setup falle.
        if (attempt >= 3) {
            console.error("🚨 Bootstrap falló 3 veces. El servidor sigue activo. Ejecuta `deno task setup` o revisa con /status.");
            return;
        }
        const waitMs = 2 ** attempt * 1000; // backoff exponencial: 2s, 4s...
        console.warn(`⏳ Intento ${attempt} falló (${err.message}). Reintentando en ${waitMs / 1000}s...`);
        setTimeout(() => void bootstrap(attempt + 1), waitMs);
    }
}

void bootstrap(); // NO bloquea el arranque del servidor con await

app.listen(PORT, () => console.log(`🌐 Servidor escuchando en el puerto ${PORT}`));
