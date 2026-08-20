import { Router } from "express";
import { bot } from "./bot.ts";

const router = Router();

// GET /api/config — consumido por la Mini App
router.get("/config", (req, res) => {
    res.json({ theme: "dark", features: ["chat", "wallet", "settings"], version: "1.0.0" });
});

// POST /api/buy — la Mini App envía datos y el bot notifica por chat
router.post("/buy", async (req, res) => {
    const { userId, item, price } = req.body;

    if (!userId || !item) {
        return res.status(400).json({ success: false, message: "Faltan datos (userId, item)." });
    }

    try {
        await bot.api.sendMessage(
            userId,
            `✅ ¡Compra procesada!\n\n📦 Producto: *${item}*\n💰 Precio: $${price}`,
            { parse_mode: "Markdown" }
        );
        res.json({ success: true, message: "Compra procesada y bot notificado." });
    } catch (error) {
        // GrammY expone la descripción del error de la API de Telegram
        console.error("Error en /api/buy:", error.description ?? error.message);
        res.status(500).json({ success: false, message: "No se pudo notificar al usuario." });
    }
});

export default router;
