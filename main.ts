import dotenv from 'dotenv';
import { Bot, InlineKeyboard } from 'grammy';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración para usar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// 1. Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares para parsear JSON y servir archivos estáticos
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- ENDPOINTS DE LA MINI APP (API) ---

// Endpoint para obtener configuraciones desde el backend
app.get('/api/config', (req, res) => {
    res.json({
        theme: "dark",
        features: ["chat", "wallet", "settings"],
        version: "1.0.0"
    });
});

// Endpoint para procesar formularios o datos desde la Mini App
app.post('/api/submit', (req, res) => {
    const { name, feedback } = req.body;
    console.log("📦 Datos recibidos de la Mini App:", { name, feedback });
    res.json({ success: true, message: `Gracias por tu feedback, ${name}!` });
});

// --- LÓGICA DEL BOT CON GRAMMY ---

const bot = new Bot(Deno.env.get("BOT_TOKEN"));

// Comando /start
bot.command('start', async (ctx) => {
    const keyboard = new InlineKeyboard().webApp(
        "🚀 Abrir Mini App",
        Deno.env.get("WEBAPP_URL")
    );
    await ctx.reply(
        "¡Bienvenido! Soy un bot avanzado con una Mini App integrada.\nUsa /help para ver mis comandos.",
        { reply_markup: keyboard }
    );
});

// Comando /help
bot.command('help', async (ctx) => {
    const text = `
📚 *Comandos disponibles:*
/start - Iniciar el bot y abrir la app
/menu - Mostrar el menú principal
/config - Ver configuración actual de la app
/help - Mostrar esta ayuda
    `;
    await ctx.reply(text, { parse_mode: "Markdown" });
});

// Comando /menu
bot.command('menu', async (ctx) => {
    const keyboard = new InlineKeyboard().webApp(
        "🛒 Ver Catálogo de Productos",
        `${Deno.env.get("WEBAPP_URL")}?view=catalog`
    );
    await ctx.reply("Selecciona una opción del menú:", { reply_markup: keyboard });
});

// Comando /config
bot.command('config', async (ctx) => {
    await ctx.reply("⚙️ Tu configuración actual es:\n- Tema: Oscuro\n- Notificaciones: Activadas");
});

// Escuchar datos enviados DESDE la Mini App hacia el Bot (usando tg.sendData())
bot.on('message:web_app_data', async (ctx) => {
    const dataString = ctx.message.web_app_data.data;
    try {
        const data = JSON.parse(dataString);
        if (data.action === 'buy') {
            await ctx.reply(`✅ ¡Compra realizada! Has adquirido: *${data.item}*.`, { parse_mode: "Markdown" });
        } else {
            await ctx.reply(`📩 Recibí el siguiente dato de la app: ${dataString}`);
        }
    } catch (error) {
        await ctx.reply(`📩 Dato recibido: ${dataString}`);
    }
});

// Configurar el botón de menú persistente (al lado del chat)
bot.api.setChatMenuButton({
    menu_button: {
        type: "web_app",
        text: "Abrir App",
        web_app: { url: Deno.env.get("WEBAPP_URL") }
    }
}).catch(err => console.error("Error configurando menú:", err));

// Iniciar Bot
bot.start({
    onStart: () => console.log("🤖 Bot de Telegram iniciado correctamente...")
});

// Iniciar Servidor Express
app.listen(PORT, () => {
    console.log(`🌐 Servidor web corriendo en http://localhost:${PORT}`);
});
