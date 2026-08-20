import { bot } from "../src/bot.ts";

const WEBAPP_URL = (Deno.env.get("WEBAPP_URL") ?? "").replace(/\/+$/, "");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const WEBHOOK_PATH = `/telegram-webhook/${WEBHOOK_SECRET}`;

console.log("🤖 Configurando bot:", (await bot.init()).username);

await bot.api.setWebhook(`${WEBAPP_URL}${WEBHOOK_PATH}`, {
    secret_token: WEBHOOK_SECRET,
    drop_pending_updates: true, // 👈 SOLO aquí tiene sentido: arranque limpio manual
});

await bot.api.setChatMenuButton({
    menu_button: {
        type: "web_app",
        text: "Abrir App",
        web_app: { url: WEBAPP_URL },
    },
});

await bot.api.setMyCommands([
    { command: "start", description: "Iniciar el bot" },
    { command: "help", description: "Ver comandos disponibles" },
    { command: "menu", description: "Abrir el menú principal" },
    { command: "config", description: "Ver configuración" },
    { command: "status", description: "Estado del webhook" },
]);

const info = await bot.api.getWebhookInfo();
console.log("✅ Setup completo:", info.url);
Deno.exit(0);