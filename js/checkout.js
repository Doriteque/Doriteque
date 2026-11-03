const checkout = {
    config: {},
    menu: { productos: [], modificadores: [] },
    cart: [],
    selectedPayment: '',
    coords: null,        // { lat, lon, acc } tomado del GPS del teléfono
    tasaBCV: null,
    enviando: false,

    // ---------- Utilidades de seguridad ----------
    esc(valor) {
        return String(valor == null ? '' : valor)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    // Quita caracteres de control, espacios repetidos y limita el largo
    limpiar(valor, max) {
        return String(valor == null ? '' : valor)
            .replace(/[\u0000-\u001F\u007F]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, max || 200);
    },

    valor(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    },

    async init() {
        try {
            // 1. Cargar carrito
            let savedCart = [];
            try { savedCart = JSON.parse(localStorage.getItem('doriteque_cart')) || []; } catch (e) { savedCart = []; }
            this.cart = Array.isArray(savedCart) ? savedCart : [];

            // 2. Verificar que Firebase esté cargado
            if (!window.loadConfig || !window.loadMenu) {
                console.error('Firebase no está cargado');
                alert('Error: No se pudo conectar. Recarga la página.');
                return;
            }

            // Consultar tasa BCV automática al iniciar
            try {
                this.tasaBCV = await window.obtenerTasaBCV();
            } catch (e) {
                this.tasaBCV = null;
            }

            // 3. Cargar config y menú
            window.loadConfig((config) => {
                this.config = config;
                this.renderPaymentMethods();
            });

            window.loadMenu((menu) => {
                this.menu = menu;
                if (!this.menu.modificadores) this.menu.modificadores = [];
                this.renderItems();
            });

            // 4. Si el carrito está vacío, redirigir
            if (this.cart.length === 0) {
                alert('Tu carrito está vacío.');
                window.location.href = 'index.html';
                return;
            }

            // 5. Limpiar campos
            setTimeout(() => {
                ['client-name', 'client-phone', 'addr-sector', 'addr-calle', 'addr-ref', 'maps-link', 'client-note'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });

                document.querySelectorAll('.payment-option').forEach(opt => {
                    opt.classList.remove('selected');
                    const radio = opt.querySelector('input');
                    if (radio) radio.checked = false;
                });

                this.coords = null;
                this.selectedPayment = '';
            }, 100);

            // 6. Hora actual exacta
            setTimeout(() => this.setupDateTime(), 200);

            // 7. Botón de ubicación
            const btn = document.getElementById('btn-ubicacion');
            if (btn) btn.addEventListener('click', () => this.capturarUbicacion());
        } catch (error) {
            console.error('Error en init:', error);
            alert('Error al cargar: ' + error.message);
        }
    },

    tasa() {
        return (this.tasaBCV && this.tasaBCV > 0) ? this.tasaBCV : (this.config.tasaBs || 1000);
    },

    setupDateTime() {
        const now = new Date();

        const dtText = document.getElementById('datetime-text');
        if (dtText) {
            dtText.textContent = now.toLocaleString('es-VE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        }

        const dtInput = document.getElementById('client-datetime');
        if (dtInput) {
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            dtInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    },

    // ---------- Ubicación (sin APIs externas) ----------
    // Usa el GPS del propio teléfono y manda un enlace de Google Maps con las coordenadas exactas.
    capturarUbicacion() {
        const btn = document.getElementById('btn-ubicacion');
        const textoBtn = btn ? btn.querySelector('span') : null;

        if (!navigator.geolocation) {
            alert('Tu navegador no permite obtener la ubicación. Pega un enlace de Google Maps en el campo de abajo.');
            return;
        }

        if (btn) btn.classList.add('loading');
        if (textoBtn) textoBtn.textContent = 'Obteniendo ubicación...';

        const restaurar = () => {
            if (btn) btn.classList.remove('loading');
            if (textoBtn) textoBtn.textContent = 'Compartir mi ubicación exacta (Google Maps)';
        };

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.coords = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    acc: Math.round(pos.coords.accuracy || 0)
                };
                restaurar();
                this.mostrarEstadoUbicacion();
            },
            (err) => {
                restaurar();
                let msg = 'No se pudo obtener tu ubicación.';
                if (err.code === 1) msg = 'Permiso de ubicación denegado. Actívalo en los ajustes de tu navegador o pega un enlace de Google Maps.';
                else if (err.code === 2) msg = 'Tu ubicación no está disponible ahora. Prueba cerca de una ventana o pega un enlace de Google Maps.';
                else if (err.code === 3) msg = 'Tardó demasiado en obtener la ubicación. Inténtalo otra vez.';
                alert(msg);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
    },

    mostrarEstadoUbicacion() {
        const box = document.getElementById('ubicacion-estado');
        if (!box || !this.coords) return;

        const precisa = this.coords.acc > 0 && this.coords.acc <= 100;
        box.style.display = 'block';
        box.style.background = precisa ? '#e8f8ee' : '#fff4e0';
        box.style.color = precisa ? '#14693a' : '#8a5a00';
        box.textContent = '';

        const linea = document.createElement('div');
        linea.textContent = precisa
            ? '✅ Ubicación capturada (precisión aprox. ' + this.coords.acc + ' m). '
            : '⚠️ Ubicación capturada con baja precisión (aprox. ' + this.coords.acc + ' m). Pégame mejor un enlace de Google Maps. ';
        box.appendChild(linea);

        const a = document.createElement('a');
        a.href = this.enlaceCoordenadas();
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'Verla en Google Maps';
        a.style.fontWeight = '700';
        box.appendChild(a);
    },

    enlaceCoordenadas() {
        if (!this.coords) return '';
        return 'https://www.google.com/maps?q=' + this.coords.lat.toFixed(6) + ',' + this.coords.lon.toFixed(6);
    },

    // Acepta solo enlaces https de Google Maps. Devuelve el enlace limpio o ''
    validarEnlaceMapas(texto) {
        const t = this.limpiar(texto, 300);
        if (!t) return '';
        let u;
        try { u = new URL(t); } catch (e) { return ''; }
        if (u.protocol !== 'https:') return '';
        const host = u.hostname.toLowerCase();
        const esGoogleMaps =
            (/^(www\.)?google\.[a-z.]{2,6}$/.test(host) && u.pathname.startsWith('/maps')) ||
            (/^maps\.google\.[a-z.]{2,6}$/.test(host)) ||
            (host === 'maps.app.goo.gl') ||
            (host === 'goo.gl' && u.pathname.startsWith('/maps'));
        return esGoogleMaps ? u.href : '';
    },

    // Enlace final para el pedido: el pegado por el cliente tiene prioridad sobre el GPS
    enlaceFinal() {
        const pegado = this.validarEnlaceMapas(this.valor('maps-link'));
        return pegado || this.enlaceCoordenadas();
    },

    // Deja solo dígitos y quita el 0 inicial (0412 -> 412)
    telefonoLimpio() {
        return this.valor('client-phone').replace(/\D/g, '').replace(/^0+/, '');
    },

    renderItems() {
        const container = document.getElementById('checkout-items');
        if (!container) return;

        let html = '';
        let totalUSD = 0;
        let totalItems = 0;

        this.cart.forEach(item => {
            if (!item || !item.id) return;
            const prod = this.menu.productos.find(p => p.id === item.id);
            if (!prod) return;

            let price = prod.precio || 0;
            let optsText = '';

            if (item.opciones) {
                Object.keys(item.opciones).forEach(mod => {
                    item.opciones[mod].forEach(opt => {
                        const m = this.menu.modificadores.find(x => x.nombre === mod);
                        if (m) {
                            const o = m.opciones.find(x => x.nombre === opt);
                            if (o) price += o.precio || 0;
                        }
                    });
                    optsText += `<div class="checkout-item-opciones">${this.esc(mod)}: ${this.esc(item.opciones[mod].join(', '))}</div>`;
                });
            }

            const qty = item.qty || 1;
            const sub = price * qty;
            totalUSD += sub;
            totalItems += qty;

            html += `<div class="checkout-item">
                <div class="checkout-item-info">
                    <div class="checkout-item-name">${this.esc(prod.nombre)}</div>
                    ${optsText}
                    <div class="checkout-item-qty">${qty}x $${price.toFixed(2)}</div>
                </div>
                <div class="checkout-item-price">USD$ ${sub.toFixed(2)}</div>
            </div>`;
        });

        container.innerHTML = html;

        const ec = document.getElementById('edit-cart-count');
        if (ec) ec.textContent = totalItems;

        const st = document.getElementById('checkout-subtotal');
        if (st) st.textContent = 'USD$ ' + totalUSD.toFixed(2);

        const tt = document.getElementById('checkout-total-usd');
        if (tt) tt.textContent = 'USD$ ' + totalUSD.toFixed(2);
    },

    renderPaymentMethods() {
        const container = document.getElementById('payment-methods');
        if (!container) return;

        const methods = Array.isArray(this.config.metodosPago) && this.config.metodosPago.length
            ? this.config.metodosPago
            : ['Efectivo'];

        container.textContent = '';
        methods.forEach((m, i) => {
            const nombre = this.limpiar(m, 60);
            const div = document.createElement('div');
            div.className = 'payment-option';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'payment';
            input.value = nombre;
            input.id = 'pay-' + i;

            const label = document.createElement('label');
            label.setAttribute('for', 'pay-' + i);
            label.textContent = nombre;

            div.appendChild(input);
            div.appendChild(label);
            div.addEventListener('click', () => this.selectPayment(nombre, div));
            container.appendChild(div);
        });
    },

    selectPayment(method, el) {
        this.selectedPayment = method;
        document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
        el.classList.add('selected');
        el.querySelector('input').checked = true;
    },

    buildMessage() {
        const name = this.limpiar(this.valor('client-name'), 80);
        const country = this.valor('client-country').replace(/\D/g, '');
        const phone = this.telefonoLimpio();
        const sector = this.limpiar(this.valor('addr-sector'), 80);
        const calle = this.limpiar(this.valor('addr-calle'), 120);
        const ref = this.limpiar(this.valor('addr-ref'), 120);
        const mapa = this.enlaceFinal();
        const dt = this.valor('client-datetime');
        const note = this.limpiar(this.valor('client-note'), 300);

        let total = 0;
        let detalle = '';

        this.cart.forEach(item => {
            if (!item || !item.id) return;
            const prod = this.menu.productos.find(p => p.id === item.id);
            if (!prod) return;

            let price = prod.precio || 0;
            let opts = '';

            if (item.opciones) {
                const allOptions = [];
                Object.keys(item.opciones).forEach(mod => {
                    item.opciones[mod].forEach(opt => {
                        const m = this.menu.modificadores.find(x => x.nombre === mod);
                        if (m) {
                            const o = m.opciones.find(x => x.nombre === opt);
                            if (o) price += o.precio || 0;
                        }
                    });
                    allOptions.push(...item.opciones[mod]);
                });
                if (allOptions.length > 0) {
                    opts = ` (${allOptions.join(', ')})`;
                }
            }

            const qty = item.qty || 1;
            const sub = price * qty;
            total += sub;
            detalle += `• ${qty}x ${prod.nombre}${opts} | precio ${price.toFixed(0)} | total ${sub.toFixed(0)}\n`;
        });

        const totalBs = (total * this.tasa()).toFixed(2);
        const fullPhone = country + phone;
        const negocio = ((this.config.nombre || 'DORITEQUE')).toUpperCase();

        let fechaHora = '';
        if (dt) {
            const d = new Date(dt);
            fechaHora = d.toLocaleString('es-VE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        }

        const header = (this.config.msgHeader || '🍔 *NUEVO PEDIDO*');
        const greeting = (this.config.msgGreeting || '');

        let msg = header + ' - ' + negocio + '\n\n';
        if (greeting) msg += greeting + '\n\n';
        msg += `👤 *Nombre completo*\n${name}\n\n`;
        msg += `📱 *Nro. de WhatsApp*\n+${fullPhone}\n\n`;
        if (fechaHora) msg += `📅 *Fecha y hora del pedido*\n${fechaHora}\n\n`;
        if (note) msg += `⚠️ *Observación adicional*\n${note}\n\n`;

        msg += `📍 *Dirección de entrega*\n${sector}. ${calle}`;
        if (ref) msg += `\nReferencia: ${ref}`;
        msg += '\n\n';
        if (mapa) msg += `🗺️ *Ubicación en Google Maps*\n${mapa}\n\n`;

        msg += `📝 *Detalle del pedido*\n${detalle}`;
        msg += '---------------------------\n\n';
        msg += `💵 *Sub-total:* USD$ ${total.toFixed(2)}\n`;
        msg += `💵 *TOTAL DE LA ORDEN:* USD$ ${total.toFixed(2)} (Bs ${totalBs})\n\n`;
        msg += `💳 *TIPO DE PAGO:* ${this.selectedPayment}`;

        return msg;
    },

    sendOrder() {
        if (this.enviando) return;

        const name = this.limpiar(this.valor('client-name'), 80);
        const phone = this.telefonoLimpio();
        const sector = this.limpiar(this.valor('addr-sector'), 80);
        const calle = this.limpiar(this.valor('addr-calle'), 120);
        const linkPegado = this.limpiar(this.valor('maps-link'), 300);

        if (name.length < 2) { alert('Ingresa tu nombre.'); return; }
        if (phone.length < 7 || phone.length > 11) { alert('Ingresa un número de WhatsApp válido (sin el código del país).'); return; }
        if (!sector) { alert('Ingresa tu sector o urbanización.'); return; }
        if (!calle) { alert('Ingresa tu calle, casa o edificio.'); return; }
        if (linkPegado && !this.validarEnlaceMapas(linkPegado)) {
            alert('El enlace no parece ser de Google Maps. Revísalo o déjalo vacío.');
            return;
        }
        if (!this.selectedPayment) { alert('Selecciona método de pago.'); return; }

        const whatsapp = String(this.config.whatsapp || '').replace(/\D/g, '');
        if (!whatsapp) { alert('El negocio aún no tiene WhatsApp configurado.'); return; }

        this.enviando = true;
        const msg = this.buildMessage();
        const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank', 'noopener');

        localStorage.removeItem('doriteque_cart');
        this.cart = [];
        this.coords = null;
        this.selectedPayment = '';

        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    }
};

document.addEventListener('DOMContentLoaded', () => checkout.init());