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

function placeholderImg(texto) {
    const limpio = (texto || 'Doriteque').replace(/[<>&"']/g, '');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#1a1a1a"/><rect x="8" y="8" width="384" height="284" fill="none" stroke="#333" stroke-width="2" rx="16"/><text x="50%" y="50%" fill="#C41E3A" font-family="Arial, sans-serif" font-size="30" font-weight="bold" text-anchor="middle" dominant-baseline="middle">' + limpio + '</text></svg>';
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

const app = {
    config: {},
    menu: { categorias: [], productos: [], modificadores: [] },
    cart: [],
    categoriaActiva: 'todas',
    busqueda: '',
    productoSeleccionado: null,
    tasaBCV: null,

    async init() {
        localStorage.removeItem('doriteque_cart');
        this.cart = [];

        if (!window.loadConfig || !window.loadMenu) {
            setTimeout(() => this.init(), 500);
            return;
        }

        try {
            // Consultar tasa BCV automática al iniciar
            try {
                this.tasaBCV = await window.obtenerTasaBCV();
            } catch (e) {
                this.tasaBCV = null;
            }

            window.loadConfig((config) => {
                this.config = config || {};
                this.renderConfig();
            });

            window.loadMenu((menu) => {
                this.menu = menu || {};
                if (!Array.isArray(this.menu.modificadores)) this.menu.modificadores = [];
                if (!Array.isArray(this.menu.categorias)) this.menu.categorias = [];
                if (!Array.isArray(this.menu.productos)) this.menu.productos = [];

                this.renderCategorias();
                this.renderProductos();
                this.updateCartUI();

                setTimeout(() => this.setupScrollSpy(), 500);
            });

            this.setupEventListeners();
        } catch (error) {
            console.error('Error cargando datos:', error);
            document.getElementById('productos-grid').innerHTML = '<p class="loading">Error al cargar el menú.</p>';
        }
    },

    tasa() {
        return (this.tasaBCV && this.tasaBCV > 0) ? this.tasaBCV : num(this.config.tasaBs);
    },

    renderConfig() {
        const c = this.config || {};
        document.getElementById('header-nombre').textContent = c.nombre || '';
        document.getElementById('horario-text').textContent = ' ' + (c.horario || '') + ' | Tasa: Bs ' + this.tasa().toFixed(2);
        document.getElementById('link-instagram').href = 'https://instagram.com/' + soloUsuario(c.instagram);
        document.getElementById('link-tiktok').href = 'https://tiktok.com/@' + soloUsuario(c.tiktok);
        document.getElementById('link-whatsapp').href = 'https://wa.me/' + soloDigitos(c.whatsapp);
        const metodos = Array.isArray(c.metodosPago) ? c.metodosPago : [];
        document.getElementById('footer-metodos').textContent = '💳 ' + metodos.join(' | ');
        const logo = urlImagenSegura(c.logo);
        if (logo) document.getElementById('header-logo').src = logo;
        this.revisarResena();
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

            // Para probar el aviso sin esperar 2 horas: abre el menú con  #probar-resena  al final del enlace
            if (window.location && window.location.hash === '#probar-resena') {
                this.resenaMostrada = true;
                this.mostrarAvisoResena(url, Date.now());
                return;
            }

            const pedido = JSON.parse(localStorage.getItem('doriteque_pedido') || 'null');
            const t = pedido ? Number(pedido.t) : 0;
            if (!t) return;

            const edad = Date.now() - t;
            if (edad < RESENA_ESPERA_MS || edad > RESENA_VENCE_MS) return;
            if (localStorage.getItem('doriteque_resena') === String(t)) return;

            this.resenaMostrada = true;
            this.mostrarAvisoResena(url, t);
        } catch (e) {
            console.warn('No se pudo revisar el aviso de reseña:', e.message);
        }
    },

    mostrarAvisoResena(url, t) {
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

        const cerrar = () => {
            try { localStorage.setItem('doriteque_resena', String(t)); } catch (e) { }
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
                cerrar();
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
        ahoraNo.addEventListener('click', cerrar);

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
        const catsToShow = (this.categoriaActiva === 'todas' || hayBusqueda)
            ? this.menu.categorias
            : this.menu.categorias.filter(c => c.id === this.categoriaActiva);

        catsToShow.forEach(cat => {
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
                const precioBs = (precio * this.tasa()).toFixed(2);
                const img = urlImagenSegura(p.imagen) || placeholderImg(p.nombre);

                html += '<article class="producto-card" data-id="' + esc(p.id) + '">';
                html += '<img src="' + esc(img) + '" alt="' + esc(p.nombre) + '" class="producto-img" loading="lazy">';
                html += '<div class="producto-info">';
                html += '<h3 class="producto-nombre">' + esc(p.nombre) + '</h3>';
                html += '<p class="producto-desc">' + esc(p.descripcion) + '</p>';
                html += '<div class="producto-precio">$' + precio.toFixed(2) + '</div>';
                html += '<div class="producto-precio-bs">Bs ' + precioBs + '</div>';
                html += '<button class="btn-agregar" data-id="' + esc(p.id) + '"><i class="fa-solid fa-plus"></i> Agregar</button>';
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
        const card = e.target.closest ? e.target.closest('.producto-card') : null;
        if (card) this.openProductModal(card.dataset.id);
    },

    openProductModal(productId) {
        const producto = this.menu.productos.find(p => p.id === productId);
        if (!producto) return;

        this.productoSeleccionado = producto;
        const img = urlImagenSegura(producto.imagen) || placeholderImg(producto.nombre);
        const precio = num(producto.precio);
        const precioBs = (precio * this.tasa()).toFixed(2);

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
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Agregado';
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
        localStorage.setItem('doriteque_cart', JSON.stringify(this.cart));
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

        const totalBs = (totalUSD * this.tasa()).toFixed(2);
        document.getElementById('cart-total-bs').textContent = 'Bs ' + totalBs;

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

document.addEventListener('DOMContentLoaded', () => app.init());