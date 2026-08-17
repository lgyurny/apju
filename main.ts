import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en un entorno de módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 1. Configuración de Variables de Entorno
// ==========================================
//const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN'; // Opcional, pero no recomendado en prod sin .env
const token = Deno.env.get("BOT_TOKEN"); // <-- put your bot token between the ""
const port = process.env.PORT || 3000;
// WEBAPP_URL es la URL pública donde está alojada tu app (ej. https://tu-ngrok.ngrok-free.app o en producción).
// Si no se define, se usará una URL temporal por consola.
const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${port}`;

// ==========================================
// 2. Configuración del Servidor Express
// ==========================================
const app = express();

// Servir archivos estáticos de la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Para parsear JSON en el body

// Endpoint raíz por si se visita directamente
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor Express
app.listen(port, () => {
    console.log(`🚀 Servidor Express escuchando en el puerto ${port}`);
    console.log(`🌐 Aplicación Web disponible en: ${webAppUrl}`);
});

// ==========================================
// 3. Configuración del Bot de Telegram
// ==========================================

// Si no hay token en el .env, avisamos, pero no detenemos para que al menos el frontend sirva.
if (token === 'YOUR_TELEGRAM_BOT_TOKEN' || !token) {
    console.warn("⚠️ ADVERTENCIA: No se ha proporcionado un TELEGRAM_BOT_TOKEN válido en el archivo .env.");
    console.warn("El bot de Telegram no se iniciará, pero el servidor frontend está en funcionamiento.");
} else {
    // Inicializar el bot en modo polling
    const bot = new TelegramBot(token, { polling: true });

    console.log("🤖 Bot de Telegram iniciado en modo polling.");

    // Manejar el comando /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;

        // Enviar un mensaje con un botón inline para abrir la Mini App
        bot.sendMessage(chatId, "¡Hola! Bienvenido a la Mini App de prueba. Haz clic en el botón de abajo para abrirla.", {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: "Abrir Mini App 🚀",
                        web_app: { url: webAppUrl }
                    }]
                ]
            }
        });

        //Comando /help
        bot.command("help", (ctx) => ctx.reply("Hola! Este es la ayuda."));


        // También podemos enviarlo como un botón del teclado (Reply Keyboard)
        /*
        bot.sendMessage(chatId, "O usa este botón del teclado:", {
            reply_markup: {
                keyboard: [
                    [{
                        text: "Abrir Web App (Teclado)",
                        web_app: { url: webAppUrl }
                    }]
                ],
                resize_keyboard: true
            }
        });
        */
    });

    // Manejar datos recibidos desde la Web App (Cuando se usa tg.sendData en un botón del teclado regular, NO inline)
    bot.on('message', async (msg) => {
        // Verificar si el mensaje contiene datos de una web app
        if (msg.web_app_data) {
            try {
                const data = JSON.parse(msg.web_app_data.data);
                if (data.action === 'counter_result') {
                    await bot.sendMessage(
                        msg.chat.id,
                        `¡Datos recibidos desde la Mini App!\nTu contador final fue: *${data.finalCount}*`,
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (e) {
                console.error("Error al parsear datos de la Web App:", e);
                bot.sendMessage(msg.chat.id, "Hubo un error al procesar los datos de la app.");
            }
        }
    });
}

await run(bot);
