// ⚠️ Debe ser el PRIMER import para que las variables de entorno
// estén disponibles cuando se evalúen los demás módulos (bot.js usa BOT_TOKEN)
import dotenv from 'dotenv';
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { webhookCallback } from "grammy";
import { bot } from "./src/bot.ts";
import apiRouter from "./src/api.ts";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Ruta "secreta" del webhook: difícil de adivinar para terceros
const WEBHOOK_PATH = `/telegram-webhook/${process.env.WEBHOOK_SECRET}`;

// --- Middlewares base ---
app.use(express.json()); // GrammY reutiliza el body ya parseado ✅
app.use(express.static(path.join(__dirname, "public")));

// --- API de la Mini App ---
app.use("/api", apiRouter);

// --- Health check (útil para monitoreo y para verificar que el server vive) ---
app.get("/health", (req, res) => res.json({ status: "ok" }));

// --- WEBHOOK DE TELEGRAM ---
// webhookCallback convierte al bot en middleware de Express.
// El secretToken valida el header "X-Telegram-Bot-Api-Secret-Token"
// que Telegram envía en cada petición: si no coincide, responde 401.
app.use(WEBHOOK_PATH, webhookCallback(bot, "express", { secretToken: process.env.WEBHOOK_SECRET }));

// --- Arranque ---
async function main() {
    // Cachea la info del bot (getMe) y valida el token al inicio.
    // En modo webhook esto NO ocurre automáticamente.
    await bot.init();

    // Le decimos a Telegram dónde enviar los updates
    const fullWebhookUrl = `${process.env.WEBAPP_URL}${WEBHOOK_PATH}`;
    await bot.api.setWebhook(fullWebhookUrl, {
        secret_token: process.env.WEBHOOK_SECRET,   // Telegram lo enviará en cada request
        drop_pending_updates: true,                  // Descarta updates viejos acumulados
    });
    console.log(`🔗 Webhook configurado en: ${fullWebhookUrl}`);

    // Botón de menú persistente y lista de comandos
    await bot.api.setChatMenuButton({
        menu_button: {
            type: "web_app",
            text: "Abrir App",
            web_app: { url: process.env.WEBAPP_URL },
        },
    });

    await bot.api.setMyCommands([
        { command: "start", description: "Iniciar el bot" },
        { command: "help", description: "Ver comandos disponibles" },
        { command: "menu", description: "Abrir el menú principal" },
        { command: "config", description: "Ver configuración" },
        { command: "status", description: "Estado del webhook" },
    ]);

    app.listen(PORT, () => {
        console.log(`🌐 Servidor en http://localhost:${PORT}`);
        console.log(`🤖 Bot en modo webhook esperando updates...`);
    });
}

main().catch((err) => {
    console.error("💥 Error al iniciar la aplicación:", err);
    process.exit(1);
});
