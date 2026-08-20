import { Bot, InlineKeyboard } from "grammy";
import { autoRetry } from "npm:@grammyjs/auto-retry";

// Instancia única del bot, compartida por toda la app
export const bot = new Bot(process.env.BOT_TOKEN);

// Si Telegram responde 429, espera el retry_aftery reintenta hasta 3 intentos por llamada
// Se registra AQUI para que tanto main.ts como setup.ts lo hereden
bot.api.config.use(autoRetry);

// Middleware de logging: verás cada update llegando por el webhook
bot.use(async (ctx, next) => {
    console.log(`📩 Update #${ctx.update.update_id} recibido de Telegram`);
    await next();
});

bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard().webApp("🚀 Abrir Mini App", process.env.WEBAPP_URL);
    await ctx.reply("¡Bienvenido! Abre la Mini App para interactuar.\n\nUsa /help para ver comandos.", { reply_markup: keyboard });
});

bot.command("help", async (ctx) => {
    await ctx.reply(
        "📚 *Comandos disponibles:*\n" +
        "/start - Iniciar el bot\n" +
        "/menu - Menú principal\n" +
        "/config - Ver configuración\n" +
        "/status - Estado del webhook\n" +
        "/help - Esta ayuda",
        { parse_mode: "Markdown" }
    );
});

bot.command("menu", async (ctx) => {
    const keyboard = new InlineKeyboard()
        .webApp("🛒 Ver Catálogo", `${process.env.WEBAPP_URL}?view=catalog`)
        .webApp("⚙️ Ajustes", `${process.env.WEBAPP_URL}?view=settings`);
    await ctx.reply("Selecciona una opción:", { reply_markup: keyboard });
});

bot.command("config", async (ctx) => {
    await ctx.reply("⚙️ Configuración actual:\n- Tema: Oscuro\n- Notificaciones: Activadas");
});

// Comando de diagnóstico: confirma que el webhook está bien configurado
bot.command("status", async (ctx) => {
    const info = await bot.api.getWebhookInfo();
    await ctx.reply(
        `📡 *Estado del Webhook:*\n` +
        `- URL: \`${info.url || "no configurada"}\`\n` +
        `- Updates pendientes: ${info.pending_update_count}\n` +
        `- Último error: ${info.last_error_message || "ninguno"}`,
        { parse_mode: "Markdown" }
    );
});

// Datos enviados desde la Mini App vía tg.sendData()
bot.on("message:web_app_data", async (ctx) => {
    const dataString = ctx.message.web_app_data.data;
    try {
        const data = JSON.parse(dataString);
        await ctx.reply(`📩 Dato recibido desde la Mini App: ${data.item ?? dataString}`);
    } catch {
        await ctx.reply(`📩 Dato recibido: ${dataString}`);
    }
});

// ⚠️ CRÍTICO en modo webhook: capturar errores.
// Si un error no es manejado, GrammY responde 500 a Telegram,
// y Telegram reintenta el update indefinidamente.
bot.catch((err) => {
    console.error("💥 Error manejado en el bot:", err.error);
});
