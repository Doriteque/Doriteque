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
            });

            this.setupEventListeners();
            this.actualizarTasa(); // en paralelo: ya no retrasa el menú
        } catch (error) {
            console.error('Error cargando datos:', error);
            document.getElementById('productos-grid').innerHTML = '<p class="loading">Error al cargar el menú.</p>';
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
        document.getElementById('horario-text').textContent = ' ' + (c.horario || '') + ' | Tasa: Bs ' + fmtBs(this.tasa());
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
        this.revisarResena();
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
            if (this.resenaMostrada) return;
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
app.cart = cargarCarritoGuardado();
try { if (!app.renderDesdeCache()) app.mostrarEsqueleto(); } catch (e) { console.warn('Arranque rápido omitido:', e.message); }

document.addEventListener('DOMContentLoaded', () => app.init());