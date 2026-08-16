// Inicializar la API de Telegram Web App
const tg = window.Telegram.WebApp;

// Expandir la app a pantalla completa dentro de Telegram
tg.expand();

// Variables de estado
let count = 0;

// Elementos del DOM
const userInfoEl = document.getElementById('user-info');
const counterValueEl = document.getElementById('counter-value');
const incrementBtn = document.getElementById('increment-btn');
const decrementBtn = document.getElementById('decrement-btn');
const themeColorEl = document.getElementById('theme-color');

// Función para inicializar la app
function initApp() {
    // 1. Mostrar información del usuario de Telegram
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        const name = `${user.first_name} ${user.last_name || ''}`.trim();
        userInfoEl.innerHTML = `
            <strong>Hello, ${name}!</strong><br>
            Username: @${user.username || 'N/A'}
        `;
    } else {
        userInfoEl.innerHTML = `<strong>Opened outside of Telegram.</strong>`;
    }

    // 2. Mostrar color de fondo actual (del tema)
    if (tg.themeParams && tg.themeParams.bg_color) {
        themeColorEl.textContent = tg.themeParams.bg_color;
    } else {
        themeColorEl.textContent = 'Default/Web';
    }

    // 3. Configurar el MainButton (Botón nativo en la parte inferior de la pantalla)
    tg.MainButton.text = "SEND DATA TO BOT";
    tg.MainButton.color = tg.themeParams.button_color || "#3390ec";
    tg.MainButton.textColor = tg.themeParams.button_text_color || "#ffffff";
    // Lo mostramos si el contador es mayor que 0
    updateMainButton();
}

// Lógica del contador
function updateCounter(newVal) {
    count = newVal;
    counterValueEl.textContent = count;
    updateMainButton();
}

function updateMainButton() {
    if (count > 0) {
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

// Event Listeners para los botones HTML
incrementBtn.addEventListener('click', () => {
    updateCounter(count + 1);
});

decrementBtn.addEventListener('click', () => {
    if (count > 0) {
        updateCounter(count - 1);
    }
});

// Event Listener para el MainButton de Telegram
tg.MainButton.onClick(() => {
    const dataToSend = JSON.stringify({
        action: 'counter_result',
        finalCount: count
    });

    // sendData envía los datos al bot y cierra la Web App (solo funciona si se abrió con un KeyboardButton)
    // Para Inline Buttons se debe usar una API propia del backend. Aquí usamos sendData por simplicidad.
    tg.sendData(dataToSend);
});

// Detectar cambios de tema (Modo claro/oscuro)
tg.onEvent('themeChanged', () => {
    document.documentElement.className = tg.colorScheme;
    if (tg.themeParams.bg_color) {
        themeColorEl.textContent = tg.themeParams.bg_color;
    }
});

// Iniciar
initApp();