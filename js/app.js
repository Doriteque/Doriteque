/* ============================================
   Utilidades de seguridad
   ============================================ */

// Convierte texto en algo inofensivo para poner dentro de HTML
function esc(valor) {
    return String(valor == null ? '' : valor)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Número seguro (si no es número, devuelve 0)
function num(valor) {
    const n = Number(valor);
    return isFinite(n) ? n : 0;
}

// Solo deja pasar imágenes https, imágenes incrustadas (base64) o archivos de la carpeta assets/
function urlImagenSegura(url) {
    const s = String(url || '').trim();
    if (/^https:\/\//i.test(s)) return s;
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/i.test(s)) return s;
    if (/^(\.\/)?assets\/[A-Za-z0-9_.\/-]+$/.test(s) && s.indexOf('..') === -1) return s;
    return '';
}

function soloUsuario(valor) { return String(valor || '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 40); }
function soloDigitos(valor) { return String(valor || '').replace(/\D/g, '').slice(0, 20); }

// Reseñas de Google: cuánto esperar después del pedido y hasta cuándo se pide
const RESENA_ESPERA_MS = 2 * 60 * 60 * 1000;        // 2 horas después del pedido
const RESENA_VENCE_MS = 3 * 24 * 60 * 60 * 1000;    // después de 3 días ya no se pide
const RESENA_PAUSA_ESTRELLAS_MS = 30 * 24 * 60 * 60 * 1000;  // si tocó una estrella: no se vuelve a pedir en 30 días
const RESENA_PAUSA_AHORA_NO_MS = 7 * 24 * 60 * 60 * 1000;    // si tocó "Ahora no": no se vuelve a pedir en 7 días
const RESENA_PAUSA_MOSTRADA_MS = 24 * 60 * 60 * 1000;       // apenas se muestra: no se repite en 24 horas aunque la ignore

// Solo enlaces https de Google para reseñas
function urlResenaSegura(texto) {
    const t = String(texto || '').trim();
    if (!t) return '';
    let u;
    try { u = new URL(t); } catch (e) { return ''; }
    if (u.protocol !== 'https:') return '';
    const h = u.hostname.toLowerCase();
    const ok = h === 'g.page' || h === 'g.co' || h === 'maps.app.goo.gl' ||
        (h === 'goo.gl' && u.pathname.startsWith('/maps')) ||
        (h === 'search.google.com' && u.pathname.startsWith('/local/writereview')) ||
        (/^(www\.)?google\.[a-z.]{2,6}$/.test(h) && (u.pathname.startsWith('/maps') || u.pathname.startsWith('/search')));
    return ok ? u.href : '';
}

// Imagen de relleno cuando un producto no tiene foto: cuadrada y sin texto que se corte
function placeholderImg() {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1216"/><stop offset="1" stop-color="#151515"/></linearGradient></defs>' +
        '<rect width="300" height="300" fill="url(#g)"/>' +
        '<circle cx="150" cy="150" r="78" fill="none" stroke="#C41E3A" stroke-width="6" opacity="0.9"/>' +
        '<text x="150" y="152" font-size="84" text-anchor="middle" dominant-baseline="central">🍽️</text></svg>';
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// Bolívares al estilo venezolano: 12.528,46
function fmtBs(valor) {
    const partes = num(valor).toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return partes[0] + ',' + partes[1];
}

// ---------- Horario del local (hora de Venezuela) ----------
// Se configura desde el admin. Mientras no esté guardado, se usa este horario por defecto.
// Cada día (0 = domingo ... 6 = sábado): [abre, cierra] en horas (15 = 3:00 pm; más de 24 = cierra después de medianoche). null = cerrado.
const HORARIO_POR_DEFECTO = [
    [15, 24],   // domingo
    null,       // lunes: cerrado
    [15, 24],   // martes
    [15, 24],   // miércoles
    [15, 24],   // jueves
    [15, 24],   // viernes
    [15, 24]    // sábado
];
const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function horaDecimal(texto) {
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(texto || '').trim());
    return m ? parseInt(m[1], 10) + parseInt(m[2], 10) / 60 : null;
}

// Convierte lo guardado en el admin ({ "0": {ab, d, h}, ... }) en el horario que usa el menú
function construirHorario(datos) {
    if (!datos || typeof datos !== 'object') return HORARIO_POR_DEFECTO;
    const res = [];
    for (let d = 0; d < 7; d++) {
        const x = datos[d] || datos[String(d)];
        if (!x || typeof x !== 'object') return HORARIO_POR_DEFECTO;
        if (!x.ab) { res.push(null); continue; }
        const abre = horaDecimal(x.d);
        const cierra = horaDecimal(x.h);
        if (abre === null || cierra === null) return HORARIO_POR_DEFECTO;
        res.push([abre, cierra <= abre ? cierra + 24 : cierra]); // "hasta 00:00" = medianoche
    }
    return res;
}

function formatoHora(h) {
    const hh = h % 24;
    const sufijo = hh >= 12 ? 'pm' : 'am';
    let h12 = Math.floor(hh) % 12;
    if (h12 === 0) h12 = 12;
    const mm = Math.round((hh - Math.floor(hh)) * 60);
    return h12 + ':' + String(mm).padStart(2, '0') + ' ' + sufijo;
}

function horaCorta(h) {
    const hh = h % 24;
    const sufijo = hh >= 12 ? 'pm' : 'am';
    let h12 = Math.floor(hh) % 12;
    if (h12 === 0) h12 = 12;
    const mm = Math.round((hh - Math.floor(hh)) * 60);
    return h12 + (mm ? ':' + String(mm).padStart(2, '0') : '') + sufijo;
}

// Texto del horario generado solo, por ejemplo: "Martes a Domingo 3pm - 12am (Lunes cerrado)"
function textoHorarioAuto(horario) {
    const orden = [1, 2, 3, 4, 5, 6, 0]; // semana que empieza el lunes
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const grupos = [];
    const cerrados = [];
    orden.forEach((dia, pos) => {
        const h = horario[dia];
        if (!h) { cerrados.push(cap(NOMBRES_DIAS[dia])); return; }
        const ult = grupos[grupos.length - 1];
        if (ult && ult.h[0] === h[0] && ult.h[1] === h[1] && ult.fin === pos - 1) ult.fin = pos;
        else grupos.push({ h: h, ini: pos, fin: pos });
    });
    const partes = grupos.map(g => {
        const dias = g.ini === g.fin
            ? cap(NOMBRES_DIAS[orden[g.ini]])
            : cap(NOMBRES_DIAS[orden[g.ini]]) + ' a ' + cap(NOMBRES_DIAS[orden[g.fin]]);
        return dias + ' ' + horaCorta(g.h[0]) + ' - ' + horaCorta(g.h[1]);
    });
    let t = partes.join(' · ');
    if (!t) return 'Cerrado por ahora';
    if (cerrados.length) t += ' (' + cerrados.join(', ') + (cerrados.length > 1 ? ' cerrados' : ' cerrado') + ')';
    return t;
}

// Venezuela está en UTC-4 todo el año (no cambia de hora)
function estadoLocal(ahoraMs, horario) {
    const h = horario || HORARIO_POR_DEFECTO;
    const d = new Date(ahoraMs - 4 * 60 * 60 * 1000);
    const dia = d.getUTCDay();
    const hora = d.getUTCHours() + d.getUTCMinutes() / 60;

    // ¿Sigue abierto desde ayer? (cierra después de medianoche)
    const ayer = h[(dia + 6) % 7];
    if (ayer && ayer[1] > 24 && hora < ayer[1] - 24) {
        return { abierto: true, cierra: ayer[1] - 24, minutos: Math.max(1, Math.round((ayer[1] - 24 - hora) * 60)) };
    }
    const hoy = h[dia];
    if (hoy && hora >= hoy[0] && hora < hoy[1]) {
        return { abierto: true, cierra: hoy[1], minutos: Math.max(1, Math.round((hoy[1] - hora) * 60)) };
    }
    if (hoy && hora < hoy[0]) return { abierto: false, abreHoy: true, abre: hoy[0] };
    for (let i = 1; i <= 7; i++) {
        const nd = (dia + i) % 7;
        const x = h[nd];
        if (x) return { abierto: false, abreHoy: false, diasFalta: i, dia: nd, abre: x[0] };
    }
    return { abierto: false, sinHorario: true };
}

function textoEstadoLocal(est) {
    if (est.abierto) {
        if (est.minutos <= 60) return '🟢 Abierto · cerramos en ' + est.minutos + ' min';
        return '🟢 Abierto ahora · cerramos a las ' + formatoHora(est.cierra);
    }
    if (est.sinHorario) return '🔴 Cerrado';
    if (est.abreHoy) return '🔴 Cerrado · abrimos hoy a las ' + formatoHora(est.abre);
    if (est.diasFalta === 1) return '🔴 Cerrado · abrimos mañana a las ' + formatoHora(est.abre);
    return '🔴 Cerrado · abrimos el ' + NOMBRES_DIAS[est.dia] + ' a las ' + formatoHora(est.abre);
}

// ---------- Caché del menú (para que abra al instante la segunda vez) ----------
const CACHE_MENU = 'doriteque_menu_cache_v1';
const CACHE_CONFIG = 'doriteque_config_cache_v1';

function leerCache(clave) {
    try {
        const t = localStorage.getItem(clave);
        return t ? JSON.parse(t) : null;
    } catch (e) { return null; }
}

function guardarCache(clave, valor) {
    try {
        const t = JSON.stringify(valor);
        if (t.length < 1500000) localStorage.setItem(clave, t); // si es demasiado grande, no se guarda
    } catch (e) { /* sin espacio: se ignora */ }
}

function normalizarMenu(m) {
    const menu = m || {};
    return {
        ...menu,
        categorias: Array.isArray(menu.categorias) ? menu.categorias : [],
        productos: Array.isArray(menu.productos) ? menu.productos : [],
        modificadores: Array.isArray(menu.modificadores) ? menu.modificadores : []
    };
}

// Tasa guardada de HOY (si la hay) para el primer dibujo de la página
function tasaGuardadaDeHoy() {
    try {
        const c = JSON.parse(localStorage.getItem('doriteque_tasa_bcv'));
        const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
        if (c && c.dia === hoy && Number(c.tasa) > 0) return Number(c.tasa);
    } catch (e) { }
    return null;
}

// ---------- Carrito guardado en el teléfono ----------
const CARRITO_VIGENCIA_MS = 6 * 60 * 60 * 1000; // 6 horas

function cargarCarritoGuardado() {
    try {
        const t = Number(localStorage.getItem('doriteque_cart_t') || 0);
        if (!t || Date.now() - t > CARRITO_VIGENCIA_MS) return [];
        const datos = JSON.parse(localStorage.getItem('doriteque_cart') || '[]');
        if (!Array.isArray(datos)) return [];
        const limpio = [];
        datos.forEach(item => {
            if (!item || typeof item.id !== 'string' || !item.id) return;
            const qty = Math.min(99, Math.max(1, parseInt(item.qty, 10) || 1));
            const opciones = {};
            if (item.opciones && typeof item.opciones === 'object') {
                Object.keys(item.opciones).forEach(mod => {
                    const lista = item.opciones[mod];
                    if (Array.isArray(lista)) opciones[mod] = lista.filter(x => typeof x === 'string');
                });
            }
            limpio.push({ id: item.id, qty: qty, opciones: opciones });
        });
        return limpio;
    } catch (e) { return []; }
}

const app = {
    carritoPendiente: [],
    avisoCarritoMostrado: false,
    avisoCarritoAbierto: false,
    _menuTexto: '',
    observador: null,
    config: {},
    menu: { categorias: [], productos: [], modificadores: [] },
    cart: [],
    categoriaActiva: 'todas',
    busqueda: '',
    productoSeleccionado: null,
    tasaBCV: null,

    async init() {
        if (!window.loadConfig || !window.loadMenu) {
            setTimeout(() => this.init(), 300);
            return;
        }

        try {
            window.loadConfig((config) => {
                this.config = config || {};
                guardarCache(CACHE_CONFIG, this.config);
                this.renderConfig();
            });

            window.loadMenu((menu) => {
                const nuevo = normalizarMenu(menu);
                guardarCache(CACHE_MENU, nuevo);
                this.menu = nuevo;

                // Solo se vuelve a dibujar si algo cambió (evita parpadeos y saltos de pantalla)
                const texto = JSON.stringify(nuevo);
                if (texto !== this._menuTexto) {
                    this._menuTexto = texto;
                    this.renderCategorias();
                    this.renderProductos();
                    this.updateCartUI();
                }
                setTimeout(() => this.setupScrollSpy(), 300);
                this.preguntarCarritoPendiente();
            });

            this.setupEventListeners();
            this.actualizarTasa(); // en paralelo: ya no retrasa el menú
            this.configurarAtajosDueno();
            // El letrero Abierto/Cerrado se actualiza solo cada minuto
            setInterval(() => this.renderEstadoLocal(), 60000);
        } catch (error) {
            console.error('Error cargando datos:', error);
            document.getElementById('productos-grid').innerHTML = '<p class="loading">Error al cargar el menú.</p>';
        }
    },

    // ---------- Pedido sin enviar (de hace menos de 6 horas) ----------
    // Si el cliente vuelve por su cuenta, se le PREGUNTA si quiere continuar con ese pedido.
    // (Si viene de "Editar carrito" en la misma pestaña, se recupera solo.)
    preguntarCarritoPendiente() {
        try {
            if (this.avisoCarritoMostrado || !this.carritoPendiente.length) return;
            if (!this.menu.productos.length) return;

            // Solo productos que todavía existen y están disponibles
            const items = this.carritoPendiente.filter(item =>
                this.menu.productos.some(p => p.id === item.id && p.disponible));
            this.carritoPendiente = [];
            if (items.length === 0) {
                try { localStorage.removeItem('doriteque_cart'); } catch (e) { }
                return;
            }
            this.avisoCarritoMostrado = true;
            this.avisoCarritoAbierto = true;

            let totalUSD = 0, totalItems = 0;
            items.forEach(item => {
                const prod = this.menu.productos.find(p => p.id === item.id);
                totalUSD += this.precioUnitario(prod, item) * item.qty;
                totalItems += item.qty;
            });

            const estilo = document.createElement('style');
            estilo.textContent =
                '.pendiente-aviso{position:fixed;left:12px;right:12px;bottom:16px;max-width:420px;margin:0 auto;background:#1f1f1f;color:#fff;' +
                'border:1px solid #C41E3A;border-radius:18px;padding:18px;z-index:2600;box-shadow:0 10px 40px rgba(0,0,0,.6);text-align:center;}' +
                '.pendiente-aviso h3{margin:0 0 6px;font-size:1.1rem;font-weight:800;}' +
                '.pendiente-aviso p{margin:0 0 14px;font-size:.92rem;color:#b0b0b0;line-height:1.4;}' +
                '.pendiente-botones{display:flex;gap:10px;}' +
                '.pendiente-botones button{flex:1;padding:13px 8px;border-radius:12px;border:none;font-size:.95rem;font-weight:800;cursor:pointer;font-family:inherit;}' +
                '.pendiente-si{background:#C41E3A;color:#fff;}' +
                '.pendiente-no{background:#333;color:#ddd;}';
            document.head.appendChild(estilo);

            const caja = document.createElement('div');
            caja.className = 'pendiente-aviso';
            caja.setAttribute('role', 'dialog');

            const titulo = document.createElement('h3');
            titulo.textContent = '¿Continuar con tu pedido? 🛒';
            const texto = document.createElement('p');
            texto.textContent = 'Dejaste ' + totalItems + (totalItems === 1 ? ' producto' : ' productos') +
                ' por USD$ ' + totalUSD.toFixed(2) + ' sin enviar.';

            const botones = document.createElement('div');
            botones.className = 'pendiente-botones';

            const cerrar = () => {
                this.avisoCarritoAbierto = false;
                if (caja.parentNode) caja.parentNode.removeChild(caja);
                if (estilo.parentNode) estilo.parentNode.removeChild(estilo);
            };

            const si = document.createElement('button');
            si.type = 'button';
            si.className = 'pendiente-si';
            si.textContent = 'Sí, continuar';
            si.addEventListener('click', () => {
                this.cart = items;
                this.saveCart();
                this.updateCartUI();
                cerrar();
            });

            const no = document.createElement('button');
            no.type = 'button';
            no.className = 'pendiente-no';
            no.textContent = 'No, empezar de nuevo';
            no.addEventListener('click', () => {
                try {
                    localStorage.removeItem('doriteque_cart');
                    localStorage.removeItem('doriteque_cart_t');
                } catch (e) { }
                cerrar();
            });

            botones.appendChild(si);
            botones.appendChild(no);
            caja.appendChild(titulo);
            caja.appendChild(texto);
            caja.appendChild(botones);
            document.body.appendChild(caja);
        } catch (e) {
            console.warn('No se pudo revisar el pedido pendiente:', e.message);
        }
    },

    // Dibuja al instante lo último que vio el cliente, mientras Firebase termina de cargar
    renderDesdeCache() {
        try {
            const cfg = leerCache(CACHE_CONFIG);
            const mnu = leerCache(CACHE_MENU);
            if (!mnu) return false;

            if (cfg) this.config = cfg;
            this.tasaBCV = tasaGuardadaDeHoy();
            this.menu = normalizarMenu(mnu);
            this._menuTexto = JSON.stringify(this.menu);

            if (cfg) this.renderConfig();
            this.renderCategorias();
            this.renderProductos();
            this.updateCartUI();
            setTimeout(() => this.setupScrollSpy(), 300);
            return true;
        } catch (e) {
            console.warn('No se pudo usar el caché del menú:', e.message);
            return false;
        }
    },

    // Esqueleto gris animado mientras carga la primera vez
    mostrarEsqueleto() {
        const grid = document.getElementById('productos-grid');
        if (!grid) return;
        if (!document.getElementById('esqueleto-estilo')) {
            const st = document.createElement('style');
            st.id = 'esqueleto-estilo';
            st.textContent =
                '@keyframes esqueletoBrillo{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}' +
                '.esqueleto-card{display:flex;gap:12px;background:#1a1a1a;border:1px solid #2c2c2c;border-radius:18px;padding:10px;margin-bottom:12px;}' +
                '.esqueleto-img,.esqueleto-linea{border-radius:10px;background:linear-gradient(90deg,#2a2a2a 0,#3a3a3a 50%,#2a2a2a 100%);background-size:200px 100%;background-repeat:no-repeat;background-color:#2a2a2a;animation:esqueletoBrillo 1.2s infinite linear;}' +
                '.esqueleto-img{width:104px;height:104px;flex-shrink:0;border-radius:12px;}' +
                '.esqueleto-texto{flex:1;min-width:0;padding-top:4px;}' +
                '.esqueleto-linea{height:14px;margin:0 0 10px;width:85%;}' +
                '.esqueleto-linea.corta{width:50%;}';
            document.head.appendChild(st);
        }
        let h = '';
        for (let i = 0; i < 5; i++) {
            h += '<div class="esqueleto-card"><div class="esqueleto-img"></div><div class="esqueleto-texto"><div class="esqueleto-linea"></div><div class="esqueleto-linea corta"></div><div class="esqueleto-linea corta"></div></div></div>';
        }
        grid.innerHTML = h;
    },

    // Consulta la tasa BCV sin bloquear el menú; al llegar, actualiza los precios en Bs
    actualizarTasa() {
        if (typeof window.obtenerTasaBCV !== 'function') return;
        window.obtenerTasaBCV().then((t) => {
            if (t && t > 0 && t !== this.tasaBCV) {
                this.tasaBCV = t;
                this.renderConfig();
                this.renderProductos();
                this.updateCartUI();
            }
        }).catch(() => { });
    },

    tasa() {
        return (this.tasaBCV && this.tasaBCV > 0) ? this.tasaBCV : num(this.config.tasaBs);
    },

    renderConfig() {
        const c = this.config || {};
        document.getElementById('header-nombre').textContent = c.nombre || '';
        const textoHorario = (c.horario && String(c.horario).trim()) ? String(c.horario).trim() : textoHorarioAuto(construirHorario(c.horarioSemana));
        document.getElementById('horario-text').textContent = ' ' + textoHorario + ' | Tasa: Bs ' + fmtBs(this.tasa());
        document.getElementById('link-instagram').href = 'https://instagram.com/' + soloUsuario(c.instagram);
        document.getElementById('link-tiktok').href = 'https://tiktok.com/@' + soloUsuario(c.tiktok);
        document.getElementById('link-whatsapp').href = 'https://wa.me/' + soloDigitos(c.whatsapp);
        const metodos = Array.isArray(c.metodosPago) ? c.metodosPago : [];
        document.getElementById('footer-metodos').textContent = '💳 ' + metodos.join(' | ');
        this.actualizarBotonWhatsApp(soloDigitos(c.whatsapp));
        const logo = urlImagenSegura(c.logo);
        const esLogoPorDefecto = !logo || /(^|\/)assets\/logo\.png$/.test(logo);
        // Si el logo es el de siempre, se usa la versión liviana (12 KB en vez de 158 KB)
        document.getElementById('header-logo').src = esLogoPorDefecto ? 'assets/logo-header.webp' : logo;
        this.renderEstadoLocal();
        this.revisarResena();
        this.revisarDiagnostico();
    },

    // Atajos para el dueño: cambiar el # de la dirección con la página abierta, o tocar 5 veces el © del pie de página
    configurarAtajosDueno() {
        try {
            window.addEventListener('hashchange', () => {
                this.revisarResena();
                this.revisarDiagnostico();
            });
            const parrafos = document.querySelectorAll('.footer p');
            const copyright = parrafos.length ? parrafos[parrafos.length - 1] : null;
            if (copyright) {
                let toques = 0, ultimo = 0;
                copyright.addEventListener('click', () => {
                    const t = Date.now();
                    toques = (t - ultimo < 1500) ? toques + 1 : 1;
                    ultimo = t;
                    if (toques >= 5) {
                        toques = 0;
                        this.mostrarDiagnostico();
                    }
                });
            }
        } catch (e) { }
    },

    // Letrero "Abierto ahora / Cerrado" dentro de la barra roja de arriba
    renderEstadoLocal() {
        try {
            const barra = document.querySelector('.info-bar');
            if (!barra) return;
            let el = document.getElementById('estado-local');
            if (!el) {
                if (!document.getElementById('estado-local-estilo')) {
                    const st = document.createElement('style');
                    st.id = 'estado-local-estilo';
                    st.textContent =
                        '.estado-local{display:inline-block;padding:4px 14px;border-radius:20px;font-size:.82rem;font-weight:800;margin-bottom:6px;color:#fff;}' +
                        '.estado-local.abierto{background:#15803d;}' +
                        '.estado-local.cerrado{background:#1a1a1a;}';
                    document.head.appendChild(st);
                }
                el = document.createElement('div');
                el.id = 'estado-local';
                barra.insertBefore(el, barra.firstChild);
            }
            const est = estadoLocal(Date.now(), construirHorario(this.config && this.config.horarioSemana));
            el.className = 'estado-local ' + (est.abierto ? 'abierto' : 'cerrado');
            el.textContent = textoEstadoLocal(est);
        } catch (e) {
            console.warn('No se pudo mostrar el estado del local:', e.message);
        }
    },

    // Botón verde flotante para escribir por WhatsApp
    actualizarBotonWhatsApp(numero) {
        let a = document.getElementById('wa-flotante');
        if (!numero) { if (a && a.parentNode) a.parentNode.removeChild(a); return; }
        if (!a) {
            a = document.createElement('a');
            a.id = 'wa-flotante';
            a.className = 'wa-flotante';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.setAttribute('aria-label', 'Escríbenos por WhatsApp');
            a.innerHTML = '<i class="fa-brands fa-whatsapp"></i>';
            document.body.appendChild(a);
        }
        a.href = 'https://wa.me/' + numero;
    },

    // ---------- Aviso de reseña de Google ----------
    // Aparece cuando el cliente vuelve al menú entre 2 horas y 3 días después de un pedido.
    // Se le pide a TODOS los clientes por igual (Google no permite filtrar quién reseña).
    resenaMostrada: false,

    revisarResena() {
        try {
            // Si hay un pedido sin enviar por preguntar (o la pregunta está abierta), la reseña espera
            if (this.resenaMostrada || this.avisoCarritoAbierto || (this.carritoPendiente && this.carritoPendiente.length)) return;
            const url = urlResenaSegura(this.config.googleReviewUrl);
            if (!url) return;

            // Para probar el aviso sin esperar 2 horas: abre el menú con  #probar-resena  al final del enlace.
            // Se muestra una sola vez y se quita el "#probar-resena" de la dirección para que no se repita.
            if (window.location && window.location.hash === '#probar-resena') {
                this.resenaMostrada = true;
                try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { }
                this.mostrarAvisoResena(url, Date.now(), true);
                return;
            }

            // Pausa: si ya respondió hace poco, no se vuelve a pedir
            const hasta = Number(localStorage.getItem('doriteque_resena_hasta') || 0);
            if (hasta && Date.now() < hasta) return;

            const pedido = JSON.parse(localStorage.getItem('doriteque_pedido') || 'null');
            const t = pedido ? Number(pedido.t) : 0;
            if (!t) return;

            const edad = Date.now() - t;
            if (edad < RESENA_ESPERA_MS || edad > RESENA_VENCE_MS) return;
            if (localStorage.getItem('doriteque_resena') === String(t)) return;

            this.resenaMostrada = true;
            // Se marca como mostrada desde ya: sale UNA sola vez por pedido, aunque el cliente no toque nada
            try {
                localStorage.setItem('doriteque_resena', String(t));
                localStorage.setItem('doriteque_resena_hasta', String(Date.now() + RESENA_PAUSA_MOSTRADA_MS));
            } catch (e) { }
            this.mostrarAvisoResena(url, t, false);
        } catch (e) {
            console.warn('No se pudo revisar el aviso de reseña:', e.message);
        }
    },

    // ---------- Diagnóstico de la reseña (para el dueño) ----------
    // Abre el menú con  #diagnostico  al final de la dirección: explica por qué sale o no sale la reseña,
    // y permite adelantar 3 horas el último pedido para probarla sin esperar.
    revisarDiagnostico() {
        if (this._diagMostrado) return;
        if (!(window.location && window.location.hash === '#diagnostico')) return;
        this._diagMostrado = true;
        try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { }
        this.mostrarDiagnostico();
    },

    mostrarDiagnostico() {
        try {
            if (document.getElementById('dg-overlay')) return;
            const ahora = Date.now();
            const url = urlResenaSegura(this.config.googleReviewUrl);
            let pedido = null;
            try { pedido = JSON.parse(localStorage.getItem('doriteque_pedido') || 'null'); } catch (e) { }
            const t = pedido ? Number(pedido.t) : 0;
            const hasta = Number(localStorage.getItem('doriteque_resena_hasta') || 0);
            const yaMostrada = !!t && localStorage.getItem('doriteque_resena') === String(t);
            const hayCarrito = this.avisoCarritoAbierto || (this.carritoPendiente && this.carritoPendiente.length > 0);

            const filas = [];
            filas.push(['Enlace de reseñas', url ? '✅ guardado en el admin' : '❌ vacío o no válido (pégalo en Configuración del admin y guarda)']);
            if (!t) {
                filas.push(['Pedido enviado', '❌ no hay ninguno guardado en este teléfono (si ya enviaste uno, falta subir el checkout.js nuevo)']);
            } else {
                const min = Math.floor((ahora - t) / 60000);
                filas.push(['Pedido enviado', 'hace ' + min + ' min']);
                if (ahora - t < RESENA_ESPERA_MS) filas.push(['Tiempo', '⏳ faltan ' + (Math.ceil(RESENA_ESPERA_MS / 60000) - min) + ' min para que pueda salir']);
                else if (ahora - t > RESENA_VENCE_MS) filas.push(['Tiempo', '❌ pasaron más de 3 días: ya no se pide']);
                else filas.push(['Tiempo', '✅ dentro del rango (2 horas a 3 días)']);
            }
            filas.push(['Pausa', hasta > ahora ? '⏸️ en pausa por ' + Math.ceil((hasta - ahora) / 3600000) + ' h más (por una respuesta anterior)' : '✅ sin pausa']);
            filas.push(['Ya mostrada para este pedido', yaMostrada ? '⚠️ sí (ya salió o ya respondió)' : '✅ no']);
            filas.push(['Pedido sin enviar por preguntar', hayCarrito ? '⚠️ sí: primero se pregunta por él y la reseña espera' : '✅ no']);

            const estilo = document.createElement('style');
            estilo.textContent =
                '.dg-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.8);z-index:3500;display:flex;align-items:center;justify-content:center;padding:14px;}' +
                '.dg-card{background:#1f1f1f;color:#fff;border:1px solid #444;border-radius:18px;padding:18px;width:100%;max-width:400px;max-height:90vh;overflow:auto;}' +
                '.dg-card h3{margin:0 0 12px;font-size:1.05rem;font-weight:800;}' +
                '.dg-fila{background:#2a2a2a;border-radius:10px;padding:8px 12px;margin-bottom:8px;font-size:.85rem;line-height:1.4;}' +
                '.dg-fila b{display:block;color:#b0b0b0;font-size:.75rem;font-weight:700;margin-bottom:2px;}' +
                '.dg-btn{display:block;width:100%;padding:12px;margin-top:8px;border:none;border-radius:12px;font-size:.92rem;font-weight:800;cursor:pointer;font-family:inherit;}' +
                '.dg-rojo{background:#C41E3A;color:#fff;}.dg-gris{background:#333;color:#ddd;}';
            document.head.appendChild(estilo);

            const overlay = document.createElement('div');
            overlay.id = 'dg-overlay';
            overlay.className = 'dg-overlay';
            const card = document.createElement('div');
            card.className = 'dg-card';
            const titulo = document.createElement('h3');
            titulo.textContent = '🔍 Diagnóstico de la reseña';
            card.appendChild(titulo);
            filas.forEach(par => {
                const f = document.createElement('div');
                f.className = 'dg-fila';
                const b = document.createElement('b');
                b.textContent = par[0];
                const v = document.createElement('span');
                v.textContent = par[1];
                f.appendChild(b);
                f.appendChild(v);
                card.appendChild(f);
            });

            const boton = (texto, clase, accion) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'dg-btn ' + clase;
                b.textContent = texto;
                b.addEventListener('click', accion);
                card.appendChild(b);
            };
            const recargar = () => { try { window.location.reload(); } catch (e) { } };

            boton('⏩ Simular que el pedido fue hace 3 horas y probar', 'dg-rojo', () => {
                try {
                    localStorage.setItem('doriteque_pedido', JSON.stringify({ t: Date.now() - 3 * 60 * 60 * 1000 }));
                    localStorage.removeItem('doriteque_resena');
                    localStorage.removeItem('doriteque_resena_hasta');
                } catch (e) { }
                recargar();
            });
            boton('🧹 Borrar pausas y avisos anteriores', 'dg-gris', () => {
                try {
                    localStorage.removeItem('doriteque_resena');
                    localStorage.removeItem('doriteque_resena_hasta');
                } catch (e) { }
                recargar();
            });
            boton('Cerrar', 'dg-gris', () => {
                this._diagMostrado = false;
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (estilo.parentNode) estilo.parentNode.removeChild(estilo);
            });

            overlay.appendChild(card);
            document.body.appendChild(overlay);
        } catch (e) {
            console.warn('No se pudo mostrar el diagnóstico:', e.message);
        }
    },

    mostrarAvisoResena(url, t, esPrueba) {
        const estilo = document.createElement('style');
        estilo.textContent =
            '.resena-aviso{position:fixed;left:12px;right:12px;bottom:16px;max-width:420px;margin:0 auto;background:#1f1f1f;color:#fff;' +
            'border:1px solid #333;border-radius:18px;padding:18px;z-index:2500;box-shadow:0 10px 40px rgba(0,0,0,.6);text-align:center;}' +
            '.resena-aviso h3{margin:0 0 6px;font-size:1.1rem;font-weight:800;}' +
            '.resena-aviso p{margin:0 0 10px;font-size:.9rem;color:#b0b0b0;line-height:1.4;}' +
            '.resena-estrellas{display:flex;justify-content:center;gap:4px;margin:6px 0 10px;}' +
            '.resena-estrella{background:none;border:none;font-size:2.2rem;line-height:1;color:#FFC107;cursor:pointer;padding:4px;}' +
            '.resena-nota{font-size:.78rem;color:#888;margin:0 0 10px;}' +
            '.resena-cerrar{background:none;border:none;color:#b0b0b0;font-size:.9rem;font-weight:700;cursor:pointer;padding:8px 12px;}';
        document.head.appendChild(estilo);

        const caja = document.createElement('div');
        caja.className = 'resena-aviso';
        caja.setAttribute('role', 'dialog');

        const titulo = document.createElement('h3');
        titulo.textContent = '¿Cómo estuvo tu pedido? 🍔';
        const texto = document.createElement('p');
        texto.textContent = 'Tu opinión ayuda a que más personas nos encuentren.';

        const fila = document.createElement('div');
        fila.className = 'resena-estrellas';

        // pausaMs: cuánto tiempo no se vuelve a mostrar el aviso en este teléfono
        const cerrar = (pausaMs) => {
            if (!esPrueba) {
                try {
                    localStorage.setItem('doriteque_resena', String(t));
                    localStorage.setItem('doriteque_resena_hasta', String(Date.now() + pausaMs));
                } catch (e) { }
            }
            if (caja.parentNode) caja.parentNode.removeChild(caja);
            if (estilo.parentNode) estilo.parentNode.removeChild(estilo);
        };

        for (let i = 1; i <= 5; i++) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'resena-estrella';
            b.setAttribute('aria-label', i + (i === 1 ? ' estrella' : ' estrellas'));
            b.textContent = '★';
            b.addEventListener('click', () => {
                window.open(url, '_blank', 'noopener');
                cerrar(RESENA_PAUSA_ESTRELLAS_MS);
            });
            fila.appendChild(b);
        }

        const nota = document.createElement('p');
        nota.className = 'resena-nota';
        nota.textContent = 'Elegirás tus estrellas en Google.';

        const ahoraNo = document.createElement('button');
        ahoraNo.type = 'button';
        ahoraNo.className = 'resena-cerrar';
        ahoraNo.textContent = 'Ahora no';
        ahoraNo.addEventListener('click', () => cerrar(RESENA_PAUSA_AHORA_NO_MS));

        caja.appendChild(titulo);
        caja.appendChild(texto);
        caja.appendChild(fila);
        caja.appendChild(nota);
        caja.appendChild(ahoraNo);
        document.body.appendChild(caja);
    },

    renderCategorias() {
        const container = document.getElementById('categorias-tabs');
        let html = '<button class="categoria-tab active" data-id="todas">Todos</button>';
        this.menu.categorias.forEach(cat => {
            html += '<button class="categoria-tab" data-id="' + esc(cat.id) + '">' + esc(cat.nombre) + '</button>';
        });
        container.innerHTML = html;

        container.querySelectorAll('.categoria-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.categoria-tab').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.categoriaActiva = e.target.dataset.id;

                this.centerTab(e.target);

                if (this.categoriaActiva === 'todas') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    const seccion = document.getElementById('seccion-' + this.categoriaActiva);
                    if (seccion) {
                        const top = seccion.getBoundingClientRect().top + window.pageYOffset - 80;
                        window.scrollTo({ top: top, behavior: 'smooth' });
                    }
                }
            });
        });
    },

    centerTab(tab) {
        const container = document.getElementById('categorias-tabs');
        if (!container || !tab) return;
        const left = tab.offsetLeft - (container.clientWidth - tab.clientWidth) / 2;
        container.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    },

    renderProductos() {
        const container = document.getElementById('productos-grid');
        const texto = this.busqueda.toLowerCase().trim();
        let html = '';

        const hayBusqueda = texto.length > 0;

        // ---- Sección "Más vendidos" (productos marcados como destacados en el admin) ----
        if (!hayBusqueda) {
            const destacados = this.menu.productos.filter(p => p.destacado && p.disponible);
            if (destacados.length > 0) {
                html += '<section class="seccion-destacados" id="seccion-destacados">';
                html += '<h2 class="titulo-seccion">🔥 Más vendidos</h2>';
                html += '<div class="destacados-scroll">';
                destacados.forEach(p => {
                    const precio = num(p.precio);
                    const img = urlImagenSegura(p.imagen) || placeholderImg();
                    html += '<article class="destacado-card" data-id="' + esc(p.id) + '">';
                    html += '<img src="' + esc(img) + '" alt="' + esc(p.nombre) + '" class="destacado-img" width="156" height="120" loading="lazy" decoding="async">';
                    html += '<div class="destacado-info">';
                    html += '<h3 class="destacado-nombre">' + esc(p.nombre) + '</h3>';
                    html += '<div class="destacado-fila">';
                    html += '<span class="destacado-precio">$' + precio.toFixed(2) + '</span>';
                    html += '<button class="btn-agregar btn-agregar-chico" data-id="' + esc(p.id) + '" aria-label="Agregar ' + esc(p.nombre) + '"><i class="fa-solid fa-plus"></i></button>';
                    html += '</div></div></article>';
                });
                html += '</div></section>';
            }
        }

        // Siempre se dibujan todas las categorías: las pestañas solo desplazan la pantalla hasta cada una
        this.menu.categorias.forEach(cat => {
            const prods = this.menu.productos.filter(p =>
                p.categoriaId === cat.id && p.disponible &&
                (texto === '' ||
                    String(p.nombre || '').toLowerCase().includes(texto) ||
                    String(p.descripcion || '').toLowerCase().includes(texto))
            );

            if (prods.length === 0) return;

            html += '<section class="seccion-categoria" id="seccion-' + esc(cat.id) + '">';
            html += '<h2 class="titulo-seccion">' + esc(cat.nombre) + '</h2>';

            prods.forEach(p => {
                const precio = num(p.precio);
                const precioBs = fmtBs(precio * this.tasa());
                const img = urlImagenSegura(p.imagen) || placeholderImg();
                const etiqueta = p.destacado ? '<span class="etiqueta-top">🔥 Más vendido</span>' : '';

                html += '<article class="producto-card" data-id="' + esc(p.id) + '">';
                html += '<img src="' + esc(img) + '" alt="' + esc(p.nombre) + '" class="producto-img" width="104" height="104" loading="lazy" decoding="async">';
                html += '<div class="producto-info">';
                html += etiqueta;
                html += '<h3 class="producto-nombre">' + esc(p.nombre) + '</h3>';
                html += '<p class="producto-desc">' + esc(p.descripcion) + '</p>';
                html += '<div class="producto-fila">';
                html += '<div class="producto-precios">';
                html += '<div class="producto-precio">$' + precio.toFixed(2) + '</div>';
                html += '<div class="producto-precio-bs">Bs ' + precioBs + '</div>';
                html += '</div>';
                html += '<button class="btn-agregar" data-id="' + esc(p.id) + '" aria-label="Agregar ' + esc(p.nombre) + '"><i class="fa-solid fa-plus"></i></button>';
                html += '</div>';
                html += '</div></article>';
            });
            html += '</section>';
        });

        container.innerHTML = html || '<p class="loading">No se encontraron productos.</p>';
    },

    // Un solo "oído" para toda la lista de productos (sin código dentro del HTML)
    handleGridClick(e) {
        const btn = e.target.closest ? e.target.closest('.btn-agregar') : null;
        if (btn) {
            e.stopPropagation();
            this.addToCart(btn.dataset.id, btn);
            return;
        }
        const card = e.target.closest ? e.target.closest('.producto-card, .destacado-card') : null;
        if (card) this.openProductModal(card.dataset.id);
    },

    openProductModal(productId) {
        const producto = this.menu.productos.find(p => p.id === productId);
        if (!producto) return;

        this.productoSeleccionado = producto;
        const img = urlImagenSegura(producto.imagen) || placeholderImg();
        const precio = num(producto.precio);
        const precioBs = fmtBs(precio * this.tasa());

        document.getElementById('modal-img').src = img;
        document.getElementById('modal-img').alt = producto.nombre || '';
        document.getElementById('modal-title').textContent = producto.nombre || '';
        document.getElementById('modal-price-usd').textContent = '$' + precio.toFixed(2);
        document.getElementById('modal-price-bs').textContent = 'Bs ' + precioBs;
        document.getElementById('modal-desc').textContent = producto.descripcion || '';

        const modal = document.getElementById('product-modal');
        modal.style.display = 'flex';
        modal.offsetHeight;
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    },

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        modal.classList.remove('visible');

        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            this.productoSeleccionado = null;
        }, 300);
    },

    addToCart(productId, btn) {
        const producto = this.menu.productos.find(p => p.id === productId);
        if (!producto) return;

        const tieneMods = Array.isArray(producto.modificadoresIds) &&
            producto.modificadoresIds.length > 0 &&
            this.menu.modificadores.length > 0;

        if (tieneMods) {
            const modsAsignados = this.menu.modificadores.filter(m =>
                producto.modificadoresIds.includes(m.id)
            );
            if (modsAsignados.length > 0) {
                this.openCustomizationModal(producto);
                return;
            }
        }

        this.addProductToCart(producto, {}, btn);
    },

    openCustomizationModal(producto) {
        this.productoSeleccionado = producto;
        const modificadores = this.menu.modificadores.filter(m =>
            producto.modificadoresIds.includes(m.id)
        );

        const modal = document.getElementById('customization-modal');
        const title = document.getElementById('customization-title');
        const content = document.getElementById('customization-content');

        title.textContent = producto.nombre || '';
        let html = '';

        modificadores.forEach((mod, modIndex) => {
            const obligatorio = mod.obligatorio ? '<span class="required">*</span>' : '<span class="optional">(opcional)</span>';
            html += '<div class="customization-section">';
            html += '<h4 class="customization-title">' + esc(mod.nombre) + ' ' + obligatorio + '</h4>';
            html += '<div class="customization-options">';

            (Array.isArray(mod.opciones) ? mod.opciones : []).forEach((op, index) => {
                const inputType = mod.tipo === 'unico' ? 'radio' : 'checkbox';
                const inputName = 'mod-' + modIndex;
                const inputId = inputName + '-' + index;
                const precioOp = num(op.precio);
                const precioText = precioOp > 0 ? ' +$' + precioOp.toFixed(2) : '';

                html += '<label class="customization-option">';
                html += '<input type="' + inputType + '" name="' + inputName + '" id="' + inputId + '" value="' + esc(op.id) + '"' +
                    ' data-precio="' + precioOp + '" data-nombre="' + esc(op.nombre) + '"' +
                    ' data-modificador="' + esc(mod.nombre) + '" data-modid="' + esc(mod.id) + '">';
                html += '<span class="option-text">' + esc(op.nombre) + precioText + '</span>';
                html += '</label>';
            });

            html += '</div></div>';
        });

        content.innerHTML = html;
        document.getElementById('customization-total-extra').textContent = '$0.00';

        modal.style.display = 'flex';
        modal.offsetHeight;
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    },

    closeCustomizationModal() {
        const modal = document.getElementById('customization-modal');
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            this.productoSeleccionado = null;
        }, 300);
    },

    updateCustomizationTotal() {
        let total = 0;
        document.querySelectorAll('#customization-content input:checked').forEach(input => {
            total += parseFloat(input.dataset.precio) || 0;
        });
        document.getElementById('customization-total-extra').textContent = '$' + total.toFixed(2);
    },

    confirmCustomization() {
        const producto = this.productoSeleccionado;
        if (!producto) return;

        const modificadores = this.menu.modificadores.filter(m =>
            producto.modificadoresIds.includes(m.id)
        );

        const marcados = Array.from(document.querySelectorAll('#customization-content input:checked'));

        for (const mod of modificadores) {
            if (mod.obligatorio) {
                const hay = marcados.some(i => i.dataset.modid === String(mod.id));
                if (!hay) {
                    alert('Debes seleccionar al menos una opción de: ' + mod.nombre);
                    return;
                }
            }
        }

        const opcionesSeleccionadas = {};
        marcados.forEach(input => {
            const modNombre = input.dataset.modificador;
            if (!opcionesSeleccionadas[modNombre]) opcionesSeleccionadas[modNombre] = [];
            opcionesSeleccionadas[modNombre].push(input.dataset.nombre);
        });

        this.addProductToCart(producto, opcionesSeleccionadas, null);
        this.closeCustomizationModal();
    },

    addProductToCart(producto, opciones, btn) {
        const existing = this.cart.find(item => item.id === producto.id);
        if (existing) {
            existing.qty++;
        } else {
            this.cart.push({
                id: producto.id,
                qty: 1,
                opciones: opciones
            });
        }
        this.saveCart();
        this.updateCartUI();

        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            btn.style.background = '#25D366';
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.background = '';
            }, 800);
        }
    },

    updateCartQty(productId, delta) {
        const item = this.cart.find(i => i.id === productId);
        if (!item) return;

        item.qty += delta;
        if (item.qty <= 0) {
            this.cart = this.cart.filter(i => i.id !== productId);
        }
        this.saveCart();
        this.renderCartItems();
        this.updateCartUI();
    },

    removeFromCart(productId) {
        this.cart = this.cart.filter(i => i.id !== productId);
        this.saveCart();
        this.renderCartItems();
        this.updateCartUI();
    },

    // Un solo "oído" para los botones del carrito
    handleCartClick(e) {
        const btn = e.target.closest ? e.target.closest('button[data-accion]') : null;
        if (!btn) return;
        const id = btn.dataset.id;
        if (btn.dataset.accion === 'menos') this.updateCartQty(id, -1);
        else if (btn.dataset.accion === 'mas') this.updateCartQty(id, 1);
        else if (btn.dataset.accion === 'quitar') this.removeFromCart(id);
    },

    saveCart() {
        try {
            localStorage.setItem('doriteque_cart', JSON.stringify(this.cart));
            localStorage.setItem('doriteque_cart_t', String(Date.now()));
            sessionStorage.setItem('doriteque_cart_sesion', '1');
        } catch (e) { }
    },

    // Precio de una línea del carrito (producto + extras)
    precioUnitario(prod, item) {
        let precio = num(prod.precio);
        if (item.opciones) {
            Object.keys(item.opciones).forEach(modNombre => {
                const opciones = Array.isArray(item.opciones[modNombre]) ? item.opciones[modNombre] : [];
                opciones.forEach(opNombre => {
                    const mod = this.menu.modificadores.find(m => m.nombre === modNombre);
                    if (mod && Array.isArray(mod.opciones)) {
                        const op = mod.opciones.find(o => o.nombre === opNombre);
                        if (op) precio += num(op.precio);
                    }
                });
            });
        }
        return precio;
    },

    calculateTotal() {
        let totalUSD = 0;
        let totalItems = 0;

        this.cart.forEach(item => {
            if (!item || !item.id) return;
            const prod = this.menu.productos.find(p => p.id === item.id);
            if (!prod) return;
            const qty = item.qty || 1;
            totalUSD += this.precioUnitario(prod, item) * qty;
            totalItems += qty;
        });

        return { totalUSD: totalUSD || 0, totalItems: totalItems || 0 };
    },

    updateCartUI() {
        const { totalUSD, totalItems } = this.calculateTotal();

        document.getElementById('cart-count').textContent = totalItems;
        document.getElementById('cart-modal-count').textContent = totalItems;
        document.getElementById('cart-total-usd').textContent = 'USD$ ' + totalUSD.toFixed(2);
        document.getElementById('cart-finalizar-total').textContent = 'USD$ ' + totalUSD.toFixed(2);

        const totalBs = fmtBs(totalUSD * this.tasa());
        document.getElementById('cart-total-bs').textContent = 'Bs ' + totalBs;

        if (document.body && document.body.classList) document.body.classList.toggle('con-carrito', totalItems > 0);

        const cartBar = document.getElementById('cart-bar-floating');
        if (cartBar) {
            if (totalItems > 0) {
                cartBar.classList.add('visible');
                document.getElementById('cart-bar-count').textContent = totalItems;
                document.getElementById('cart-bar-total').textContent = 'USD$ ' + totalUSD.toFixed(2);
            } else {
                cartBar.classList.remove('visible');
            }
        }

        if (document.getElementById('cart-modal').style.display === 'flex') {
            this.renderCartItems();
        }
    },

    renderCartItems() {
        const container = document.getElementById('cart-items-container');
        if (this.cart.length === 0) {
            container.innerHTML = '<p style="text-align:center; color: #888; padding: 20px;">Tu carrito está vacío</p>';
            return;
        }

        let html = '';

        this.cart.forEach(item => {
            if (!item || !item.id) return;

            const prod = this.menu.productos.find(p => p.id === item.id);
            if (!prod) return;

            const precioUnit = this.precioUnitario(prod, item);
            let opcionesTexto = '';

            if (item.opciones) {
                Object.keys(item.opciones).forEach(modNombre => {
                    const opciones = Array.isArray(item.opciones[modNombre]) ? item.opciones[modNombre] : [];
                    opcionesTexto += '<div class="cart-item-opciones">' + esc(modNombre) + ': ' + esc(opciones.join(', ')) + '</div>';
                });
            }

            const qty = item.qty || 1;
            const subtotal = precioUnit * qty;
            const id = esc(item.id);

            html += '<div class="cart-item">';
            html += '<div class="cart-item-info">';
            html += '<div class="cart-item-nombre">' + esc(prod.nombre) + '</div>';
            if (opcionesTexto) html += opcionesTexto;
            html += '<div class="cart-item-precio">' + qty + ' × $' + precioUnit.toFixed(2) + ' = $' + subtotal.toFixed(2) + '</div>';
            html += '</div>';
            html += '<div class="cart-item-controles">';
            html += '<button class="btn-cantidad" data-accion="menos" data-id="' + id + '">−</button>';
            html += '<span>' + qty + '</span>';
            html += '<button class="btn-cantidad" data-accion="mas" data-id="' + id + '">+</button>';
            html += '</div>';
            html += '<button class="btn-eliminar" data-accion="quitar" data-id="' + id + '"><i class="fa-solid fa-trash"></i></button>';
            html += '</div>';
        });

        container.innerHTML = html;
    },

    toggleCart() {
        const modal = document.getElementById('cart-modal');
        if (modal.style.display === 'none' || modal.style.display === '') {
            this.renderCartItems();
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    },

    checkout() {
        if (this.cart.length === 0) return;
        window.location.href = 'checkout.html';
    },

    setupScrollSpy() {
        const secciones = document.querySelectorAll('.seccion-categoria');
        if (secciones.length === 0) return;
        if (this.observador) this.observador.disconnect();

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id.replace('seccion-', '');
                    this.categoriaActiva = id;

                    const container = document.getElementById('categorias-tabs');
                    let tabActiva = null;
                    container.querySelectorAll('.categoria-tab').forEach(tab => {
                        tab.classList.remove('active');
                        if (tab.dataset.id === id) tabActiva = tab;
                    });
                    if (tabActiva) {
                        tabActiva.classList.add('active');
                        this.centerTab(tabActiva);
                    }
                }
            });
        }, {
            rootMargin: '-80px 0px -60% 0px',
            threshold: 0
        });

        this.observador = observer;
        secciones.forEach(seccion => observer.observe(seccion));
    },

    setupEventListeners() {
        const inputBuscar = document.getElementById('input-buscar');
        const btnLimpiar = document.getElementById('btn-limpiar');

        inputBuscar.addEventListener('input', (e) => {
            this.busqueda = e.target.value;
            btnLimpiar.style.display = this.busqueda.length > 0 ? 'flex' : 'none';
            this.renderProductos();
        });

        inputBuscar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                inputBuscar.blur();
            }
        });

        btnLimpiar.addEventListener('click', () => {
            inputBuscar.value = '';
            this.busqueda = '';
            this.categoriaActiva = 'todas';
            btnLimpiar.style.display = 'none';

            const container = document.getElementById('categorias-tabs');
            container.querySelectorAll('.categoria-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.id === 'todas') tab.classList.add('active');
            });

            this.renderProductos();
        });

        // Lista de productos, carrito y opciones: un solo oído para cada uno
        document.getElementById('productos-grid').addEventListener('click', (e) => this.handleGridClick(e));
        document.getElementById('cart-items-container').addEventListener('click', (e) => this.handleCartClick(e));
        document.getElementById('customization-content').addEventListener('change', () => this.updateCustomizationTotal());

        document.getElementById('cart-modal').addEventListener('click', (e) => {
            if (e.target.id === 'cart-modal') this.toggleCart();
        });

        document.getElementById('product-modal').addEventListener('click', (e) => {
            if (e.target.id === 'product-modal') this.closeProductModal();
        });

        document.getElementById('customization-modal').addEventListener('click', (e) => {
            if (e.target.id === 'customization-modal') this.closeCustomizationModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeProductModal();
                this.closeCustomizationModal();
                const cartModal = document.getElementById('cart-modal');
                if (cartModal.style.display === 'flex') {
                    cartModal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            }
        });

        this.updateCartUI();
    }
};

// Pintar al instante lo último que vio el cliente (si lo hay); si es su primera visita, mostrar el esqueleto
(function () {
    const guardado = cargarCarritoGuardado();
    let mismaSesion = false;
    try { mismaSesion = sessionStorage.getItem('doriteque_cart_sesion') === '1'; } catch (e) { }
    if (guardado.length && mismaSesion) app.cart = guardado;       // viene de "Editar carrito": se recupera solo
    else if (guardado.length) app.carritoPendiente = guardado;      // vuelve por su cuenta: se le pregunta
})();
try { if (!app.renderDesdeCache()) app.mostrarEsqueleto(); } catch (e) { console.warn('Arranque rápido omitido:', e.message); }

try { app.renderEstadoLocal(); } catch (e) { }

document.addEventListener('DOMContentLoaded', () => app.init());