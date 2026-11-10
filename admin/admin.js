function placeholderImg(texto) {
    const limpio = (texto || 'Doriteque').replace(/[<>&]/g, '');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#1a1a1a"/><rect x="8" y="8" width="384" height="284" fill="none" stroke="#333" stroke-width="2" rx="16"/><text x="50%" y="50%" fill="#C41E3A" font-family="Arial, sans-serif" font-size="30" font-weight="bold" text-anchor="middle" dominant-baseline="middle">' + limpio + '</text></svg>';
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

const admin = {
    config: {},
    menu: { categorias: [], productos: [], modificadores: [] },
    unsubConfig: null,
    unsubMenu: null,
    flyerTimer: null,

    async init() {
        try {
            await window.signOut(window.auth);
        } catch (e) { }

        window.onAuthStateChanged(window.auth, (user) => {
            if (user) {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('admin-panel').style.display = 'block';
                this.loadDashboard();
            } else {
                document.getElementById('login-screen').style.display = 'flex';
                document.getElementById('admin-panel').style.display = 'none';
            }
        });

        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('productos-list').addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-icon');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'edit') this.editProduct(id);
            if (action === 'delete') this.deleteProduct(id);
            if (action === 'toggle') this.toggleProduct(id);
        });

        document.getElementById('categorias-list').addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-icon');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'edit') this.editCategory(id);
            if (action === 'delete') this.deleteCategory(id);
        });

        const modList = document.getElementById('modificadores-list');
        if (modList) {
            modList.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-icon');
                if (!btn) return;
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action === 'edit-mod') this.editModifier(id);
                if (action === 'delete-mod') this.deleteModifier(id);
            });
        }
    },

    togglePassword() {
        const input = document.getElementById('login-pass');
        const icon = document.getElementById('toggle-password-icon');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    },

    async login() {
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-pass').value;
        const errorEl = document.getElementById('login-error');
        try {
            await window.signInWithEmailAndPassword(window.auth, email, pass);
        } catch (error) {
            console.error('Error de login:', error);
            errorEl.textContent = 'Correo o contraseña incorrectos.';
            errorEl.style.display = 'block';
            setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
        }
    },

    async logout() {
        try {
            await window.signOut(window.auth);
            if (this.unsubConfig) this.unsubConfig();
            if (this.unsubMenu) this.unsubMenu();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    },

    /* ============================================
       MÓDULO MENÚ EN IMAGEN (para Estados de WhatsApp, Instagram, etc.)
       ============================================ */

    menuImagenes: [],
    generandoMenu: false,

    // desdeForm = true  -> usa lo que estás editando ahora mismo
    // desdeForm = false -> usa lo último que guardaste
    getFlyer(desdeForm = true) {
        const saved = (this.config && this.config.flyer) || {};
        const usarForm = desdeForm && this.flyerFormListo && !!document.getElementById('fly-titulo');
        const get = (id, guardado) => {
            if (!usarForm) return guardado;
            const el = document.getElementById(id);
            return el ? el.value : guardado;
        };
        const logoEl = usarForm ? document.getElementById('fly-logo') : null;
        const fotosEl = usarForm ? document.getElementById('fly-fotos') : null;
        const cta = get('fly-cta', saved.cta);
        return {
            titulo: get('fly-titulo', saved.titulo) || '',
            promo: get('fly-promo', saved.promo) || '',
            cta: (cta !== undefined && cta !== '') ? cta : '¡ESCANEA Y PIDE AHORA!',
            pie: get('fly-pie', saved.pie) || '',
            colorPrimario: get('fly-color-primario', saved.colorPrimario) || '#C41E3A',
            colorMarco: get('fly-color-marco', saved.colorMarco) || '#FF7A00',
            colorFondo: get('fly-color-fondo', saved.colorFondo) || '#FDF4EE',
            mostrarLogo: logoEl ? logoEl.checked : saved.mostrarLogo !== false,
            incluirFotos: fotosEl ? fotosEl.checked : saved.incluirFotos !== false
        };
    },

    openFlyerEditor() {
        this.switchTab('flyer');
        this.fillFlyerForm();
    },

    fillFlyerForm() {
        const f = this.getFlyer(false);
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        set('fly-titulo', f.titulo);
        set('fly-promo', f.promo);
        set('fly-cta', f.cta);
        set('fly-pie', f.pie);
        set('fly-color-primario', f.colorPrimario);
        set('fly-color-marco', f.colorMarco);
        set('fly-color-fondo', f.colorFondo);
        const logo = document.getElementById('fly-logo');
        if (logo) logo.checked = f.mostrarLogo;
        const fotos = document.getElementById('fly-fotos');
        if (fotos) fotos.checked = f.incluirFotos;
        this.flyerFormListo = true;
    },

    // Colores predefinidos (el QR se mantiene siempre oscuro para que escanee bien)
    aplicarPaleta(nombre) {
        const paletas = {
            clasico: ['#C41E3A', '#FF7A00', '#FDF4EE'],
            fuego:   ['#B71C1C', '#FFB300', '#FFF8E1'],
            bosque:  ['#1B5E20', '#8BC34A', '#F1F8E9'],
            oceano:  ['#0D47A1', '#29B6F6', '#E3F2FD'],
            uva:     ['#4A148C', '#BA68C8', '#F3E5F5'],
            noche:   ['#212121', '#C41E3A', '#F5F5F5']
        };
        const p = paletas[nombre];
        if (!p) return;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        set('fly-color-primario', p[0]);
        set('fly-color-marco', p[1]);
        set('fly-color-fondo', p[2]);
    },

    // Grupos de productos: primero "Más vendidos" (si hay) y luego cada categoría
    gruposMenu() {
        const menu = this.menu || {};
        const productos = (menu.productos || []).filter(p => p && p.disponible);
        const grupos = [];
        const top = productos.filter(p => p.destacado);
        if (top.length) grupos.push({ titulo: '🔥 Más vendidos', productos: top });
        (menu.categorias || []).forEach(cat => {
            const ps = productos.filter(p => p.categoriaId === cat.id);
            if (ps.length) grupos.push({ titulo: cat.nombre, productos: ps });
        });
        return grupos;
    },

    // Reparte los productos de cada grupo en imágenes (sin dejar una imagen con un solo producto suelto)
    paginarMenu(grupos, conFotos) {
        const filas = conFotos ? 6 : 8;
        const paginas = [];
        grupos.forEach(g => {
            const n = g.productos.length;
            const cuantas = Math.ceil(n / filas);
            const porPagina = Math.ceil(n / cuantas);
            for (let i = 0; i < cuantas; i++) {
                paginas.push({
                    titulo: g.titulo,
                    num: i + 1,
                    total: cuantas,
                    productos: g.productos.slice(i * porPagina, (i + 1) * porPagina)
                });
            }
        });
        return paginas;
    },

    esColorClaro(hex) {
        const n = parseInt(String(hex || '#ffffff').replace('#', ''), 16);
        if (isNaN(n)) return true;
        const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
        return lum > 0.55;
    },

    // Parte un texto en líneas que caben en maxAncho (con "…" si no cabe todo)
    ajustarTexto(ctx, texto, maxAncho, maxLineas) {
        const palabras = String(texto || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
        const lineas = [];
        let actual = '';
        let truncado = false;
        for (let i = 0; i < palabras.length; i++) {
            const prueba = actual ? actual + ' ' + palabras[i] : palabras[i];
            if (!actual || ctx.measureText(prueba).width <= maxAncho) {
                actual = prueba;
            } else {
                lineas.push(actual);
                actual = palabras[i];
                if (lineas.length === maxLineas) { truncado = true; actual = ''; break; }
            }
        }
        if (actual) lineas.push(actual);
        for (let k = 0; k < lineas.length; k++) {
            const puntos = truncado && k === lineas.length - 1;
            let l = lineas[k];
            while (l.length > 1 && ctx.measureText(puntos ? l + '…' : l).width > maxAncho) l = l.slice(0, -1);
            lineas[k] = puntos ? l.replace(/[\s.,;:]+$/, '') + '…' : l;
        }
        return lineas;
    },

    // Carga una foto de producto (si no se puede, devuelve null y el producto sale sin foto)
    async cargarFotoMenu(url, cache) {
        if (!url) return null;
        if (cache.has(url)) return cache.get(url);
        let img = null;
        try {
            img = await Promise.race([
                this.loadImage(url, true),
                new Promise((_, rechazo) => setTimeout(() => rechazo(new Error('tiempo agotado')), 8000))
            ]);
        } catch (e) { img = null; }
        cache.set(url, img);
        return img;
    },

    // Dibuja UNA imagen del menú (1080 x 1920, tamaño de Estados / Stories)
    async dibujarPaginaMenu(pagina, f, logo, cache, conFotos, sitio) {
        const W = 1080, H = 1920;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        const claro = this.esColorClaro(f.colorFondo);
        const colorTexto = claro ? '#1a1a1a' : '#f5f5f5';
        const colorSuave = claro ? '#6b6b6b' : '#b8b8b8';

        // Marco degradado
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, f.colorMarco);
        grad.addColorStop(1, this.shade(f.colorMarco, -18));
        this.roundRect(ctx, 0, 0, W, H, 64);
        ctx.fillStyle = grad;
        ctx.fill();

        // Línea punteada
        ctx.save();
        this.roundRect(ctx, 28, 28, W - 56, H - 56, 46);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 5;
        ctx.setLineDash([20, 14]);
        ctx.stroke();
        ctx.restore();

        // Fondo interior
        this.roundRect(ctx, 56, 56, W - 112, H - 112, 36);
        ctx.fillStyle = f.colorFondo;
        ctx.fill();

        // Textura sutil de triángulos
        ctx.save();
        this.roundRect(ctx, 56, 56, W - 112, H - 112, 36);
        ctx.clip();
        ctx.fillStyle = f.colorPrimario;
        ctx.globalAlpha = 0.04;
        for (let ty = 56; ty < H - 56; ty += 120) {
            for (let tx = 56; tx < W - 56; tx += 120) {
                ctx.beginPath();
                ctx.moveTo(tx, ty + 120);
                ctx.lineTo(tx + 60, ty);
                ctx.lineTo(tx + 120, ty + 120);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        ctx.textAlign = 'center';
        const titulo = (f.titulo || (this.config && this.config.nombre) || 'DORITEQUE').toUpperCase();

        // ---- Encabezado: logo + nombre + categoría ----
        if (logo) {
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.22)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 6;
            ctx.beginPath();
            ctx.arc(W / 2, 190, 88, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.arc(W / 2, 190, 80, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(logo, W / 2 - 80, 110, 160, 160);
            ctx.restore();
            ctx.beginPath();
            ctx.arc(W / 2, 190, 84, 0, Math.PI * 2);
            ctx.strokeStyle = f.colorPrimario;
            ctx.lineWidth = 6;
            ctx.stroke();
        }
        ctx.fillStyle = f.colorPrimario;
        ctx.font = logo ? '900 70px Arial, sans-serif' : '900 96px Arial, sans-serif';
        try { ctx.letterSpacing = '5px'; } catch (e) { }
        ctx.fillText(titulo, W / 2, logo ? 372 : 290);
        try { ctx.letterSpacing = '0px'; } catch (e) { }

        // Cinta con el nombre de la categoría
        const rotulo = pagina.titulo + (pagina.total > 1 ? '  (' + pagina.num + '/' + pagina.total + ')' : '');
        ctx.font = '900 46px Arial, sans-serif';
        const anchoRotulo = Math.min(W - 200, ctx.measureText(rotulo).width + 110);
        this.roundRect(ctx, (W - anchoRotulo) / 2, 410, anchoRotulo, 84, 42);
        ctx.fillStyle = f.colorPrimario;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.ajustarTexto(ctx, rotulo, anchoRotulo - 50, 1)[0] || rotulo, W / 2, 468);

        if (f.promo) {
            ctx.fillStyle = f.colorPrimario;
            ctx.font = '800 34px Arial, sans-serif';
            ctx.fillText(this.ajustarTexto(ctx, f.promo, W - 220, 1)[0] || '', W / 2, 538);
        }

        // ---- Lista de productos ----
        // Con pocos productos las filas crecen y la lista se centra, para que no quede un hueco vacío
        const baseFila = conFotos ? 146 : 108;
        const maxFila = conFotos ? 196 : 150;
        const espacio = 1468 - 566 - 24;
        const nProd = Math.max(1, pagina.productos.length);
        const filaAlto = Math.min(maxFila, Math.max(baseFila, Math.floor(espacio / nProd)));
        const foto = conFotos ? filaAlto - 30 : 0;
        const yInicio = 566 + Math.min(110, Math.max(0, Math.floor((espacio - nProd * filaAlto) / 2)));
        const xTarjeta = 80, anchoTarjeta = W - 160;
        const xPrecio = W - 112;
        const xTexto = 100 + (conFotos ? foto + 24 : 8);
        const anchoPrecio = 210;
        const anchoTexto = xPrecio - anchoPrecio - xTexto;

        for (let i = 0; i < pagina.productos.length; i++) {
            const p = pagina.productos[i];
            const y = yInicio + i * filaAlto;
            const alto = filaAlto - 14;

            // Tarjeta de la fila
            this.roundRect(ctx, xTarjeta, y, anchoTarjeta, alto, 22);
            ctx.fillStyle = claro ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.08)';
            ctx.fill();
            this.roundRect(ctx, xTarjeta, y, anchoTarjeta, alto, 22);
            ctx.strokeStyle = f.colorPrimario;
            ctx.globalAlpha = 0.16;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Foto (o relleno si no hay)
            if (conFotos) {
                const fx = 100, fy = y + (alto - foto) / 2;
                const img = await this.cargarFotoMenu(p.imagen, cache);
                ctx.save();
                this.roundRect(ctx, fx, fy, foto, foto, 18);
                ctx.clip();
                if (img) {
                    const lado = Math.min(img.width, img.height);
                    ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, fx, fy, foto, foto);
                } else {
                    ctx.fillStyle = claro ? '#e9e2dc' : '#2c2c2c';
                    ctx.fillRect(fx, fy, foto, foto);
                    // Plato dibujado (sin emoji, para que se vea igual en todos los teléfonos)
                    const pcx = fx + foto / 2, pcy = fy + foto / 2;
                    ctx.strokeStyle = f.colorPrimario;
                    ctx.globalAlpha = 0.85;
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.arc(pcx, pcy, foto * 0.30, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(pcx, pcy, foto * 0.17, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
                ctx.restore();
            }

            // Nombre y descripción
            ctx.textAlign = 'left';
            ctx.font = '800 36px Arial, sans-serif';
            const lineasNombre = this.ajustarTexto(ctx, String(p.nombre || '').toUpperCase(), anchoTexto, 2);
            const maxDesc = lineasNombre.length === 1 ? (conFotos ? 2 : 1) : 0;
            let lineasDesc = [];
            if (maxDesc > 0 && p.descripcion) {
                ctx.font = '500 25px Arial, sans-serif';
                lineasDesc = this.ajustarTexto(ctx, p.descripcion, anchoTexto, maxDesc);
            }
            const altoBloque = lineasNombre.length * 42 + lineasDesc.length * 30;
            let ty = y + (alto - altoBloque) / 2 + 32;
            ctx.fillStyle = colorTexto;
            ctx.font = '800 36px Arial, sans-serif';
            lineasNombre.forEach(l => { ctx.fillText(l, xTexto, ty); ty += 42; });
            ctx.fillStyle = colorSuave;
            ctx.font = '500 25px Arial, sans-serif';
            ty -= 8;
            lineasDesc.forEach(l => { ctx.fillText(l, xTexto, ty); ty += 30; });

            // Precio
            ctx.textAlign = 'right';
            ctx.fillStyle = f.colorPrimario;
            ctx.font = '900 46px Arial, sans-serif';
            ctx.fillText('$' + (Number(p.precio) || 0).toFixed(2), xPrecio, y + alto / 2 + 16);
        }

        // ---- Tarjeta inferior con el QR ----
        const cardX = 90, cardW = W - 180, cardY = 1468, cardH = 372;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
        this.roundRect(ctx, cardX, cardY, cardW, cardH, 28);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.restore();
        this.roundRect(ctx, cardX, cardY, cardW, cardH, 28);
        ctx.strokeStyle = f.colorPrimario;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;

        const qr = 290;
        QRGen.draw(ctx, sitio.url, cardX + 36, cardY + 34, qr, f.colorPrimario, '#FFFFFF', 'H');

        const tx = cardX + 36 + qr + 40;
        const anchoDer = cardX + cardW - 36 - tx;
        ctx.textAlign = 'left';
        ctx.fillStyle = f.colorPrimario;
        ctx.font = '900 42px Arial, sans-serif';
        const lineasCta = this.ajustarTexto(ctx, f.cta, anchoDer, 3);
        let cy = cardY + 92;
        lineasCta.forEach(l => { ctx.fillText(l, tx, cy); cy += 50; });
        ctx.fillStyle = '#555555';
        ctx.font = '600 26px Arial, sans-serif';
        ctx.fillText(this.ajustarTexto(ctx, sitio.texto, anchoDer, 1)[0] || '', tx, cy + 6);
        if (sitio.pie) {
            ctx.fillStyle = f.colorPrimario;
            ctx.font = '700 26px Arial, sans-serif';
            this.ajustarTexto(ctx, sitio.pie, anchoDer, 2).forEach((l, k) => ctx.fillText(l, tx, cy + 46 + k * 32));
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888888';
        ctx.font = '500 23px Arial, sans-serif';
        ctx.fillText('Precios en USD · Bs según la tasa del día', cardX + cardW / 2, cardY + cardH - 14);

        return canvas.toDataURL('image/jpeg', 0.92);
    },

    async generarMenuImagenes() {
        if (this.generandoMenu) return;
        const estado = document.getElementById('menu-img-estado');
        const lista = document.getElementById('menu-img-lista');
        const botonTodas = document.getElementById('menu-img-todas');
        const botonGenerar = document.getElementById('menu-img-generar');
        const f = this.getFlyer();
        const grupos = this.gruposMenu();

        if (grupos.length === 0) {
            if (estado) estado.textContent = 'No hay productos disponibles para armar el menú.';
            return;
        }

        this.generandoMenu = true;
        this.menuImagenes = [];
        if (lista) lista.innerHTML = '';
        if (botonTodas) botonTodas.style.display = 'none';
        if (botonGenerar) botonGenerar.disabled = true;

        try {
            const logo = f.mostrarLogo ? await this.loadLogoImage() : null;
            const cache = new Map();
            const redes = [];
            const c = this.config || {};
            if (c.instagram) redes.push('Instagram @' + String(c.instagram).replace(/^@/, ''));
            if (c.tiktok) redes.push('TikTok @' + String(c.tiktok).replace(/^@/, ''));
            const sitio = {
                url: 'https://doriteque.github.io/Doriteque/',
                texto: 'doriteque.github.io/Doriteque',
                pie: f.pie || redes.join(' · ')
            };
            const paginas = this.paginarMenu(grupos, f.incluirFotos);

            for (let i = 0; i < paginas.length; i++) {
                if (estado) estado.textContent = 'Generando imagen ' + (i + 1) + ' de ' + paginas.length + '...';
                const dataUrl = await this.dibujarPaginaMenu(paginas[i], f, logo, cache, f.incluirFotos, sitio);
                const nombre = 'doriteque-menu-' + String(i + 1).padStart(2, '0') + '-' +
                    paginas[i].titulo.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() + '.jpg';
                this.menuImagenes.push({ nombre: nombre, dataUrl: dataUrl });
                this.agregarTarjetaMenu(i);
            }

            let fallidas = 0;
            cache.forEach(v => { if (!v) fallidas++; });
            if (estado) {
                estado.textContent = '✅ ' + paginas.length + (paginas.length === 1 ? ' imagen lista.' : ' imágenes listas.') +
                    (fallidas ? ' ' + fallidas + ' foto(s) no se pudieron cargar y salen sin foto. Si pasa con todas, desactiva "Mostrar fotos de los productos".' : '');
            }
            if (botonTodas && this.menuImagenes.length > 1) botonTodas.style.display = 'block';
        } catch (e) {
            console.error('Error generando el menú en imagen:', e);
            if (estado) estado.textContent = '❌ No se pudieron generar las imágenes: ' + (e && e.message ? e.message : e);
        } finally {
            this.generandoMenu = false;
            if (botonGenerar) botonGenerar.disabled = false;
        }
    },

    // Muestra una imagen generada con sus botones
    agregarTarjetaMenu(indice) {
        const lista = document.getElementById('menu-img-lista');
        if (!lista) return;
        const item = this.menuImagenes[indice];

        const caja = document.createElement('div');
        caja.style.cssText = 'background:#252525;border:1px solid #333;border-radius:14px;padding:12px;margin-bottom:14px;';

        const img = document.createElement('img');
        img.src = item.dataUrl;
        img.alt = 'Imagen ' + (indice + 1) + ' del menú';
        img.style.cssText = 'width:100%;border-radius:10px;display:block;margin-bottom:10px;';

        const fila = document.createElement('div');
        fila.style.cssText = 'display:flex;gap:8px;';

        const bCompartir = document.createElement('button');
        bCompartir.type = 'button';
        bCompartir.className = 'btn-save';
        bCompartir.style.cssText = 'margin:0;flex:1;';
        bCompartir.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Compartir';
        bCompartir.addEventListener('click', () => this.compartirImagenesMenu([indice]));

        const bDescargar = document.createElement('button');
        bDescargar.type = 'button';
        bDescargar.className = 'btn-save btn-save-dark';
        bDescargar.style.cssText = 'margin:0;flex:1;';
        bDescargar.innerHTML = '<i class="fa-solid fa-download"></i> Descargar';
        bDescargar.addEventListener('click', () => this.descargarImagenMenu(indice));

        fila.appendChild(bCompartir);
        fila.appendChild(bDescargar);
        caja.appendChild(img);
        caja.appendChild(fila);
        lista.appendChild(caja);
    },

    descargarImagenMenu(indice) {
        const item = this.menuImagenes[indice];
        if (!item) return;
        const a = document.createElement('a');
        a.href = item.dataUrl;
        a.download = item.nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    // Comparte una o varias imágenes (WhatsApp, Instagram...). Si el teléfono no lo permite, las descarga.
    async compartirImagenesMenu(indices) {
        const archivos = [];
        try {
            indices.forEach(i => {
                const item = this.menuImagenes[i];
                if (!item) return;
                const bin = atob(item.dataUrl.split(',')[1]);
                const bytes = new Uint8Array(bin.length);
                for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
                archivos.push(new File([bytes], item.nombre, { type: 'image/jpeg' }));
            });
            if (archivos.length && navigator.canShare && navigator.canShare({ files: archivos })) {
                await navigator.share({ files: archivos, title: 'Menú Doriteque' });
                return;
            }
        } catch (e) {
            if (e && e.name === 'AbortError') return; // el usuario canceló
        }
        indices.forEach(i => this.descargarImagenMenu(i));
    },

    compartirTodasMenu() {
        this.compartirImagenesMenu(this.menuImagenes.map((_, i) => i));
    },

    loadImage(src, useCors) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            if (useCors) img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo cargar una imagen'));
            img.src = src;
        });
    },

    isSafeNoCors(src) {
        if (!src) return false;
        if (src.startsWith('data:')) return true;
        if (src.startsWith('./') || src.startsWith('../') || src.startsWith('/')) return true;
        try { return src.startsWith(location.origin); } catch (e) { return false; }
    },

    async loadLogoImage() {
        const candidates = [];
        if (this.config && this.config.logo) candidates.push(this.config.logo);
        candidates.push('../assets/logo.png');
        for (const src of candidates) {
            try {
                return await this.loadImage(src, true);
            } catch (e) {
                if (this.isSafeNoCors(src)) {
                    try { return await this.loadImage(src, false); } catch (e2) { }
                }
            }
        }
        return null;
    },

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    },

    shade(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        let r = Math.max(0, Math.min(255, (num >> 16) + amt));
        let g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
        let b = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    },

    async loadDashboard() {
        try {
            if (this.unsubConfig) this.unsubConfig();
            if (this.unsubMenu) this.unsubMenu();

            this.unsubConfig = window.onSnapshot(window.doc(window.db, 'config', 'main'), (docSnap) => {
                if (docSnap.exists()) {
                    this.config = docSnap.data();
                    this.fillConfigForm();
                    this.fillFlyerForm();
                }
            });

            this.unsubMenu = window.onSnapshot(window.doc(window.db, 'menu', 'main'), (docSnap) => {
                if (docSnap.exists()) {
                    this.menu = docSnap.data();
                    if (!this.menu.modificadores) this.menu.modificadores = [];
                    if (!this.menu.categorias) this.menu.categorias = [];
                    if (!this.menu.productos) this.menu.productos = [];
                    this.renderProducts();
                    this.renderCategories();
                    this.renderModifiers();
                }
            });
        } catch (error) {
            console.error(error);
            alert('Error al conectar con Firebase: ' + error.message);
        }
    },

    switchTab(tabName) {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-tab="' + tabName + '"]').classList.add('active');
        document.getElementById('tab-' + tabName).classList.add('active');
    },

    fillConfigForm() {
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('cfg-nombre', this.config.nombre);
        setVal('cfg-whatsapp', this.config.whatsapp);
        setVal('cfg-email', this.config.email);
        setVal('cfg-instagram', this.config.instagram);
        setVal('cfg-tiktok', this.config.tiktok);
        setVal('cfg-horario', this.config.horario);
        setVal('cfg-tasa', this.config.tasaBs || 36.50);
        setVal('cfg-metodos', (this.config.metodosPago || []).join(', '));
        setVal('cfg-logo', this.config.logo);
        setVal('msg-header', this.config.msgHeader || '🍔 *NUEVO PEDIDO*');
        setVal('msg-greeting', this.config.msgGreeting || '¡Gracias por tu pedido!');
        setVal('msg-before-detail', this.config.msgBeforeDetail || 'Aquí tienes el detalle de tu pedido:');
        setVal('msg-after-total', this.config.msgAfterTotal || 'Te contactaremos pronto para confirmar.');
        setVal('cfg-resena', this.config.googleReviewUrl);
        this.renderHorarioSemana(this.config.horarioSemana);
        this.mostrarTasaAuto();
    },

    // Muestra la tasa BCV automática en el panel (y avisa si falló)
    tasaAuto: null,

    async mostrarTasaAuto(forzar) {
        const valor = document.getElementById('tasa-auto-valor');
        const estado = document.getElementById('tasa-auto-estado');
        if (!valor || !estado) return;

        estado.style.color = '#b0b0b0';
        estado.textContent = 'Consultando BCV...';

        if (forzar) {
            try { localStorage.removeItem('doriteque_tasa_bcv'); } catch (e) { }
        }

        let tasa = null;
        try {
            if (typeof window.obtenerTasaBCV === 'function') tasa = await window.obtenerTasaBCV();
        } catch (e) { tasa = null; }
        this.tasaAuto = tasa;

        if (!tasa) {
            valor.textContent = '—';
            estado.style.color = '#FF4d4d';
            estado.textContent = '⚠️ No se pudo obtener la tasa automática. Los clientes verán la tasa manual de abajo: actualízala tú.';
            return;
        }

        valor.textContent = 'Bs ' + tasa.toFixed(2);
        estado.style.color = '#25D366';
        estado.textContent = '✅ Automática y actualizada hoy. Esta es la tasa que ven tus clientes.';
    },

    // Copia la tasa automática al campo manual (queda lista para guardar como respaldo)
    usarTasaAuto() {
        if (!this.tasaAuto) { alert('La tasa automática no está disponible ahora.'); return; }
        const input = document.getElementById('cfg-tasa');
        if (input) input.value = this.tasaAuto.toFixed(2);
        alert('Copiada. Pulsa "Guardar configuración" para dejarla como respaldo.');
    },

    // ---------- Horario de atención (para el letrero Abierto / Cerrado del menú) ----------
    DIAS_HORARIO: [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']],

    // Horario que tiene hoy el negocio: martes a domingo de 3:00 pm a 12:00 am, lunes cerrado
    horarioPorDefecto() {
        const o = {};
        for (let d = 0; d < 7; d++) o[d] = { ab: d !== 1, d: '15:00', h: '00:00' };
        return o;
    },

    renderHorarioSemana(datos) {
        const cont = document.getElementById('horario-semana');
        if (!cont) return;
        const guardado = (datos && typeof datos === 'object') ? datos : this.horarioPorDefecto();
        cont.innerHTML = '';

        this.DIAS_HORARIO.forEach(([n, nombre]) => {
            const x = guardado[n] || guardado[String(n)] || { ab: false, d: '15:00', h: '00:00' };

            const fila = document.createElement('div');
            fila.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#252525;border:1px solid #333;border-radius:12px;padding:10px 12px;margin-bottom:8px;';

            const etiqueta = document.createElement('label');
            etiqueta.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1 1 130px;margin:0;font-weight:800;cursor:pointer;';
            const check = document.createElement('input');
            check.type = 'checkbox';
            check.id = 'hs-ab-' + n;
            check.checked = !!x.ab;
            const texto = document.createElement('span');
            texto.textContent = nombre;
            etiqueta.appendChild(check);
            etiqueta.appendChild(texto);

            const tiempos = document.createElement('div');
            tiempos.style.cssText = 'display:flex;align-items:center;gap:6px;';
            const desde = document.createElement('input');
            desde.type = 'time';
            desde.id = 'hs-d-' + n;
            desde.value = x.d || '15:00';
            desde.style.cssText = 'width:112px;padding:8px;';
            const a = document.createElement('span');
            a.textContent = 'a';
            a.style.color = '#b0b0b0';
            const hasta = document.createElement('input');
            hasta.type = 'time';
            hasta.id = 'hs-h-' + n;
            hasta.value = x.h || '00:00';
            hasta.style.cssText = 'width:112px;padding:8px;';
            tiempos.appendChild(desde);
            tiempos.appendChild(a);
            tiempos.appendChild(hasta);

            const cerrado = document.createElement('span');
            cerrado.textContent = 'Cerrado';
            cerrado.style.cssText = 'color:#b0b0b0;font-weight:700;';

            const actualizar = () => {
                tiempos.style.display = check.checked ? 'flex' : 'none';
                cerrado.style.display = check.checked ? 'none' : 'inline';
            };
            check.addEventListener('change', actualizar);
            actualizar();

            fila.appendChild(etiqueta);
            fila.appendChild(tiempos);
            fila.appendChild(cerrado);
            cont.appendChild(fila);
        });
    },

    // Lee el horario escrito en el formulario. Devuelve null (y avisa) si falta alguna hora.
    leerHorarioSemana() {
        const resultado = {};
        for (const [n, nombre] of this.DIAS_HORARIO) {
            const check = document.getElementById('hs-ab-' + n);
            if (!check) return this.horarioPorDefecto(); // el formulario aún no se dibujó
            const d = document.getElementById('hs-d-' + n).value;
            const h = document.getElementById('hs-h-' + n).value;
            if (check.checked && (!d || !h)) {
                alert('Pon la hora de apertura y de cierre del ' + nombre.toLowerCase() + ', o márcalo como cerrado.');
                return null;
            }
            resultado[n] = { ab: check.checked, d: d || '15:00', h: h || '00:00' };
        }
        return resultado;
    },

    // Acepta solo enlaces https de Google para reseñas. Devuelve el enlace limpio o ''
    urlResenaValida(texto) {
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
    },

    async saveConfig() {
        try {
            const getVal = (id) => document.getElementById(id).value.trim();
            const resenaCampo = document.getElementById('cfg-resena');
            const resenaTexto = resenaCampo ? resenaCampo.value.trim() : '';
            const resenaUrl = this.urlResenaValida(resenaTexto);
            if (resenaTexto && !resenaUrl) {
                alert('El enlace de reseñas no parece válido. Debe empezar con https:// y ser de Google (por ejemplo https://g.page/r/...).');
                return;
            }
            // Lectura tolerante de los ajustes del menú en imagen (si falta un campo, usa el valor por defecto)
            const leerCampo = (id, def, recortar = true) => {
                const el = document.getElementById(id);
                if (!el) return def;
                return recortar ? el.value.trim() : el.value;
            };
            const leerMarca = (id, def) => {
                const el = document.getElementById(id);
                return el ? el.checked : def;
            };
            const horarioSemana = this.leerHorarioSemana();
            if (!horarioSemana) return;
            const newConfig = {
                nombre: getVal('cfg-nombre'),
                whatsapp: getVal('cfg-whatsapp'),
                email: getVal('cfg-email'),
                instagram: getVal('cfg-instagram'),
                tiktok: getVal('cfg-tiktok'),
                horario: getVal('cfg-horario'),
                tasaBs: parseFloat(getVal('cfg-tasa')) || 36.50,
                metodosPago: getVal('cfg-metodos').split(',').map(s => s.trim()).filter(s => s),
                logo: getVal('cfg-logo'),
                msgHeader: getVal('msg-header'),
                msgGreeting: getVal('msg-greeting'),
                msgBeforeDetail: getVal('msg-before-detail'),
                msgAfterTotal: getVal('msg-after-total'),
                googleReviewUrl: resenaUrl,
                horarioSemana: horarioSemana,
                flyer: {
                    titulo: leerCampo('fly-titulo', ''),
                    promo: leerCampo('fly-promo', ''),
                    cta: leerCampo('fly-cta', ''),
                    pie: leerCampo('fly-pie', ''),
                    colorPrimario: leerCampo('fly-color-primario', '#C41E3A', false),
                    colorMarco: leerCampo('fly-color-marco', '#FF7A00', false),
                    colorFondo: leerCampo('fly-color-fondo', '#FDF4EE', false),
                    mostrarLogo: leerMarca('fly-logo', true),
                    incluirFotos: leerMarca('fly-fotos', true)
                }
            };
            await window.setDoc(window.doc(window.db, 'config', 'main'), newConfig);
            alert('✅ Configuración guardada.');
        } catch (error) {
            console.error(error);
            alert('Error al guardar: ' + error.message);
        }
    },

    /* ============================================
       PRODUCTOS
       ============================================ */

    renderProducts() {
        const container = document.getElementById('productos-list');
        if (!this.menu.productos || this.menu.productos.length === 0) {
            container.innerHTML = '<p style="color:#b0b0b0;text-align:center;padding:20px;">No hay productos.</p>';
            return;
        }
        let html = '';
        this.menu.productos.forEach(p => {
            const cat = this.menu.categorias.find(c => String(c.id) === String(p.categoriaId));
            const img = p.imagen || placeholderImg(p.nombre);
            const badge = p.disponible ? '<span class="badge badge-active">Disponible</span>' : '<span class="badge badge-inactive">No disponible</span>';
            const modsCount = p.modificadoresIds ? p.modificadoresIds.length : 0;
            const modsBadge = modsCount > 0 ? `<span class="badge" style="background:#FF9800;color:white;margin-left:6px;">${modsCount} mods</span>` : '';
            const topBadge = p.destacado ? '<span class="badge" style="background:#FFC107;color:#1a1a1a;margin-left:6px;">⭐ Más vendido</span>' : '';
            const idStr = String(p.id);
            html += `<div class="admin-item">
                <img src="${img}" class="admin-item-img" alt="${p.nombre}">
                <div class="admin-item-info">
                    <div class="admin-item-nombre">${p.nombre} ${badge} ${modsBadge}${topBadge}</div>
                    <div class="admin-item-desc">${cat ? cat.nombre : 'Sin categoría'}</div>
                    <div class="admin-item-precio">$${Number(p.precio).toFixed(2)}</div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-icon btn-toggle" data-action="toggle" data-id="${idStr}"><i class="fa-solid fa-${p.disponible ? 'eye' : 'eye-slash'}"></i></button>
                    <button class="btn-icon btn-edit" data-action="edit" data-id="${idStr}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-delete" data-action="delete" data-id="${idStr}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    },

    editProduct(id) { this.openProductModal(String(id)); },

    openProductModal(productId = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const select = document.getElementById('prod-categoria');

        select.innerHTML = '<option value="">Selecciona una categoría</option>';
        (this.menu.categorias || []).forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });

        const modsSection = document.getElementById('modificadores-chips-container');
        if (modsSection) {
            modsSection.innerHTML = '';
            if (!this.menu.modificadores || this.menu.modificadores.length === 0) {
                modsSection.innerHTML = '<p style="color:#b0b0b0;font-size:0.85rem;">No hay modificadores.</p>';
            } else {
                this.menu.modificadores.forEach(m => {
                    let isChecked = false;
                    if (productId) {
                        const p = this.menu.productos.find(x => String(x.id) === String(productId));
                        if (p && p.modificadoresIds && p.modificadoresIds.includes(m.id)) isChecked = true;
                    }
                    const chip = document.createElement('div');
                    chip.className = 'mod-chip' + (isChecked ? ' selected' : '');
                    chip.dataset.modId = m.id;
                    chip.innerHTML = `<i class="fa-solid fa-${isChecked ? 'check' : 'plus'}"></i> ${m.nombre}`;
                    chip.onclick = function() {
                        this.classList.toggle('selected');
                        const icon = this.querySelector('i');
                        icon.className = this.classList.contains('selected') ? 'fa-solid fa-check' : 'fa-solid fa-plus';
                    };
                    modsSection.appendChild(chip);
                });
            }
        }

        if (productId) {
            const p = this.menu.productos.find(x => String(x.id) === String(productId));
            if (!p) { alert('Producto no encontrado.'); return; }
            title.textContent = 'Editar producto';
            document.getElementById('prod-id').value = p.id;
            document.getElementById('prod-nombre').value = p.nombre;
            document.getElementById('prod-descripcion').value = p.descripcion;
            document.getElementById('prod-precio').value = p.precio;
            document.getElementById('prod-categoria').value = p.categoriaId;
            document.getElementById('prod-imagen').value = p.imagen || '';
            document.getElementById('prod-disponible').checked = (p.disponible === true);
            document.getElementById('prod-destacado').checked = (p.destacado === true);
            if (p.imagen && String(p.imagen).length > 10) {
                document.getElementById('image-preview').src = p.imagen;
                document.getElementById('image-preview-container').style.display = 'block';
            } else {
                document.getElementById('image-preview-container').style.display = 'none';
            }
        } else {
            title.textContent = 'Nuevo producto';
            document.getElementById('prod-id').value = '';
            document.getElementById('prod-nombre').value = '';
            document.getElementById('prod-descripcion').value = '';
            document.getElementById('prod-precio').value = '';
            document.getElementById('prod-categoria').value = '';
            document.getElementById('prod-imagen').value = '';
            document.getElementById('prod-disponible').checked = true;
            document.getElementById('prod-destacado').checked = false;
            document.getElementById('image-preview-container').style.display = 'none';
        }
        modal.style.display = 'flex';
    },

    closeProductModal() { document.getElementById('product-modal').style.display = 'none'; },

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Solo imágenes.'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB.'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 800;
                let width = img.width, height = img.height;
                if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
                else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL('image/jpeg', 0.7);
                document.getElementById('prod-imagen').value = compressed;
                document.getElementById('image-preview').src = compressed;
                document.getElementById('image-preview-container').style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    removeImagePreview() {
        document.getElementById('prod-imagen').value = '';
        const fileInput = document.getElementById('prod-imagen-file');
        if (fileInput) fileInput.value = '';
        document.getElementById('image-preview-container').style.display = 'none';
    },

    // La clave de ImgBB ya NO va escrita en el código: se guarda en tu base de datos,
    // en una zona que solo puede leer el administrador con sesión iniciada.
    imgbbKey: null,

    async obtenerClaveImgBB(pedirNueva) {
        if (this.imgbbKey && !pedirNueva) return this.imgbbKey;

        if (!pedirNueva) {
            try {
                const snap = await window.getDoc(window.doc(window.db, 'secrets', 'imgbb'));
                if (snap.exists() && snap.data().key) {
                    this.imgbbKey = String(snap.data().key);
                    return this.imgbbKey;
                }
            } catch (e) {
                console.warn('No se pudo leer la clave de ImgBB:', e.message);
            }
        }

        const texto = prompt('Pega tu clave (API key) de ImgBB. Se guarda en tu cuenta, no en el código:');
        const clave = texto ? texto.trim() : '';
        if (!/^[a-zA-Z0-9]{20,64}$/.test(clave)) return null;

        try {
            await window.setDoc(window.doc(window.db, 'secrets', 'imgbb'), { key: clave });
        } catch (e) {
            alert('No se pudo guardar la clave: ' + e.message);
            return null;
        }
        this.imgbbKey = clave;
        return clave;
    },

    async uploadImageToStorage(dataUrl, nombre) {
        const API_KEY = await this.obtenerClaveImgBB(false);
        if (!API_KEY) {
            alert('Falta la clave de ImgBB. La imagen no se subió.');
            return dataUrl;
        }
        try {
            const base64 = dataUrl.split(',')[1];
            const formData = new FormData();
            formData.append('key', API_KEY);
            formData.append('image', base64);
            formData.append('name', (nombre || 'doriteque').replace(/[^a-zA-Z0-9]/g, ''));

            const res = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });
            const json = await res.json();

            if (json && json.success && json.data && json.data.url) {
                return json.data.url;
            }
            throw new Error('ImgBB no devolvió URL');
        } catch (e) {
            console.error('Error subiendo imagen a ImgBB:', e);
            this.imgbbKey = null;
            if (confirm('No se pudo subir la imagen. ¿Quieres pegar una clave de ImgBB nueva?')) {
                const nueva = await this.obtenerClaveImgBB(true);
                if (nueva) alert('Clave guardada. Vuelve a subir la imagen.');
            }
            return dataUrl;
        }
    },

    async migrateImages() {
        let cambios = 0;
        for (const p of (this.menu.productos || [])) {
            if (p.imagen && p.imagen.startsWith('data:')) {
                const url = await this.uploadImageToStorage(p.imagen, p.nombre);
                if (url !== p.imagen) {
                    p.imagen = url;
                    cambios++;
                }
            }
        }
        if (cambios === 0) {
            alert('No hay imágenes base64 por migrar.');
            return;
        }
        await window.setDoc(window.doc(window.db, 'menu', 'main'), {
            categorias: this.menu.categorias || [],
            productos: this.menu.productos,
            modificadores: this.menu.modificadores || []
        });
        alert('✅ ' + cambios + ' imagen(es) migradas a ImgBB. El documento ya pesa menos.');
    },

    async saveProduct() {
        const id = document.getElementById('prod-id').value;
        const nombre = document.getElementById('prod-nombre').value.trim();
        const descripcion = document.getElementById('prod-descripcion').value.trim();
        const precio = parseFloat(document.getElementById('prod-precio').value);
        const categoriaId = document.getElementById('prod-categoria').value;
        let imagen = document.getElementById('prod-imagen').value.trim();
        const disponible = document.getElementById('prod-disponible').checked;
        const destacado = document.getElementById('prod-destacado').checked;
        const modificadoresIds = [];
        document.querySelectorAll('.mod-chip.selected').forEach(chip => modificadoresIds.push(chip.dataset.modId));

        if (!nombre || !descripcion || isNaN(precio) || !categoriaId) {
            alert('Completa todos los campos obligatorios.');
            return;
        }

        // Si la imagen es base64, subirla a ImgBB y guardar solo la URL
        if (imagen.startsWith('data:')) {
            imagen = await this.uploadImageToStorage(imagen, nombre);
        }

        const productoData = { id: id || 'p' + Date.now(), nombre, descripcion, precio, categoriaId, imagen, disponible, destacado, modificadoresIds };

        try {
            const newProductos = [...(this.menu.productos || [])];
            if (id) {
                const idx = newProductos.findIndex(p => String(p.id) === String(id));
                if (idx !== -1) newProductos[idx] = productoData;
            } else {
                newProductos.push(productoData);
            }
            await window.setDoc(window.doc(window.db, 'menu', 'main'), {
                categorias: this.menu.categorias || [],
                productos: newProductos,
                modificadores: this.menu.modificadores || []
            });
            this.closeProductModal();
            alert('✅ Producto guardado.');
        } catch (error) {
            console.error(error);
            alert('Error al guardar: ' + error.message);
        }
    },

    async deleteProduct(id) {
        if (!confirm('¿Eliminar producto?')) return;
        try {
            const newProductos = this.menu.productos.filter(p => String(p.id) !== String(id));
            await window.setDoc(window.doc(window.db, 'menu', 'main'), {
                categorias: this.menu.categorias || [],
                productos: newProductos,
                modificadores: this.menu.modificadores || []
            });
        } catch (error) { alert('Error: ' + error.message); }
    },

    async toggleProduct(id) {
        try {
            const newProductos = this.menu.productos.map(p => {
                if (String(p.id) === String(id)) return { ...p, disponible: !p.disponible };
                return p;
            });
            await window.setDoc(window.doc(window.db, 'menu', 'main'), {
                categorias: this.menu.categorias || [],
                productos: newProductos,
                modificadores: this.menu.modificadores || []
            });
        } catch (error) { alert('Error: ' + error.message); }
    },

    /* ============================================
       CATEGORÍAS
       ============================================ */

    renderCategories() {
        const container = document.getElementById('categorias-list');
        if (!this.menu.categorias || this.menu.categorias.length === 0) {
            container.innerHTML = '<p style="color:#b0b0b0;text-align:center;padding:20px;">No hay categorías.</p>';
            return;
        }
        let html = '';
        this.menu.categorias.forEach(c => {
            const count = this.menu.productos.filter(p => String(p.categoriaId) === String(c.id)).length;
            html += `<div class="admin-item">
                <div class="admin-item-info">
                    <div class="admin-item-nombre">${c.nombre}</div>
                    <div class="admin-item-desc">Orden: ${c.orden} | ${count} productos</div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-icon btn-edit" data-action="edit" data-id="${c.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-delete" data-action="delete" data-id="${c.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    },

    editCategory(id) { this.openCategoryModal(String(id)); },

    openCategoryModal(catId = null) {
        const modal = document.getElementById('category-modal');
        const title = document.getElementById('category-modal-title');
        if (catId) {
            const c = this.menu.categorias.find(x => String(x.id) === String(catId));
            if (!c) return;
            title.textContent = 'Editar categoría';
            document.getElementById('cat-id').value = c.id;
            document.getElementById('cat-nombre').value = c.nombre;
            document.getElementById('cat-orden').value = c.orden;
        } else {
            title.textContent = 'Nueva categoría';
            document.getElementById('cat-id').value = '';
            document.getElementById('cat-nombre').value = '';
            document.getElementById('cat-orden').value = (this.menu.categorias || []).length + 1;
        }
        modal.style.display = 'flex';
    },

    closeCategoryModal() { document.getElementById('category-modal').style.display = 'none'; },

    async saveCategory() {
        const id = document.getElementById('cat-id').value;
        const nombre = document.getElementById('cat-nombre').value.trim();
        const orden = parseInt(document.getElementById('cat-orden').value) || 1;
        if (!nombre) { alert('Nombre obligatorio.'); return; }
        const catData = { id: id || 'cat' + Date.now(), nombre, orden };
        try {
            const newCategorias = [...(this.menu.categorias || [])];
            if (id) {
                const idx = newCategorias.findIndex(c => String(c.id) === String(id));
                if (idx !== -1) newCategorias[idx] = catData;
            } else {
                newCategorias.push(catData);
            }
            await window.setDoc(window.doc(window.db, 'menu', 'main'), {
                categorias: newCategorias,
                productos: this.menu.productos || [],
                modificadores: this.menu.modificadores || []
            });
            this.closeCategoryModal();
            alert('✅ Categoría guardada.');
        } catch (error) { alert('Error: ' + error.message); }
    },

    async deleteCategory(id) {
        const count = this.menu.productos.filter(p => String(p.categoriaId) === String(id)).length;
        if (count > 0) { alert('No se puede eliminar: tiene ' + count + ' producto(s).'); return; }
        if (!confirm('¿Eliminar categoría?')) return;
        try {
            const newCategorias = this.menu.categorias.filter(c => String(c.id) !== String(id));
            await window.setDoc(window.doc(window.db, 'menu', 'main'), {
                categorias: newCategorias,
                productos: this.menu.productos || [],
                modificadores: this.menu.modificadores || []
            });
        } catch (error) { alert('Error: ' + error.message); }
    },

    /* ============================================
       MODIFICADORES
       ============================================ */

    esc(valor) {
        return String(valor == null ? '' : valor)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    renderModifiers() {
        const container = document.getElementById('modificadores-list');
        if (!container) return;
        const mods = this.menu.modificadores || [];

        if (mods.length === 0) {
            container.innerHTML = '<div class="mod-empty"><i class="fa-solid fa-list-check"></i>' +
                '<p>Aún no tienes modificadores</p>' +
                '<small>Sirven para ofrecer extras, salsas, tamaños, etc.</small></div>';
            return;
        }

        container.innerHTML = mods.map(m => {
            const opciones = Array.isArray(m.opciones) ? m.opciones : [];
            const usados = (this.menu.productos || []).filter(p => p.modificadoresIds && p.modificadoresIds.includes(m.id)).length;
            const unico = m.tipo === 'unico';

            const chips = opciones.map(o => {
                const precio = Number(o.precio) > 0 ? '+$' + Number(o.precio).toFixed(2) : 'Gratis';
                return '<span class="mod-opt">' + this.esc(o.nombre) + ' <b>' + precio + '</b></span>';
            }).join('');

            return '<div class="mod-card">' +
                '<div class="mod-head">' +
                    '<div class="mod-name">' + this.esc(m.nombre) + '</div>' +
                    '<div class="mod-actions">' +
                        '<button class="btn-icon btn-edit" data-action="edit-mod" data-id="' + this.esc(m.id) + '"><i class="fa-solid fa-pen"></i></button>' +
                        '<button class="btn-icon btn-delete" data-action="delete-mod" data-id="' + this.esc(m.id) + '"><i class="fa-solid fa-trash"></i></button>' +
                    '</div>' +
                '</div>' +
                '<div class="mod-badges">' +
                    '<span class="mod-badge ' + (unico ? 'b-unico' : 'b-multi') + '"><i class="fa-solid ' + (unico ? 'fa-circle-dot' : 'fa-square-check') + '"></i> ' + (unico ? 'Elige una' : 'Elige varias') + '</span>' +
                    '<span class="mod-badge ' + (m.obligatorio ? 'b-oblig' : 'b-opc') + '">' + (m.obligatorio ? 'Obligatorio' : 'Opcional') + '</span>' +
                    '<span class="mod-badge b-uso"><i class="fa-solid fa-utensils"></i> ' + usados + (usados === 1 ? ' producto' : ' productos') + '</span>' +
                '</div>' +
                '<div class="mod-options">' + chips + '</div>' +
            '</div>';
        }).join('');
    },

    editModifier(id) { this.openModifierModal(String(id)); },

    setModTipo(tipo) {
        const val = tipo === 'multiple' ? 'multiple' : 'unico';
        const hidden = document.getElementById('mod-tipo');
        if (hidden) hidden.value = val;
        const a = document.getElementById('seg-unico');
        const b = document.getElementById('seg-multiple');
        if (a) a.classList.toggle('active', val === 'unico');
        if (b) b.classList.toggle('active', val === 'multiple');
    },

    openModifierModal(modId = null) {
        const modal = document.getElementById('modifier-modal');
        const title = document.getElementById('modifier-modal-title');
        const container = document.getElementById('opciones-container');
        container.innerHTML = '';
        if (modId) {
            const m = this.menu.modificadores.find(x => String(x.id) === String(modId));
            if (!m) return;
            title.textContent = 'Editar modificador';
            document.getElementById('mod-id').value = m.id;
            document.getElementById('mod-nombre').value = m.nombre;
            this.setModTipo(m.tipo);
            document.getElementById('mod-obligatorio').checked = !!m.obligatorio;
            (m.opciones || []).forEach(op => this.addOpcion(op.nombre, op.precio, op.id));
        } else {
            title.textContent = 'Nuevo modificador';
            document.getElementById('mod-id').value = '';
            document.getElementById('mod-nombre').value = '';
            this.setModTipo('unico');
            document.getElementById('mod-obligatorio').checked = false;
            this.addOpcion();
        }
        modal.style.display = 'flex';
    },

    closeModifierModal() { document.getElementById('modifier-modal').style.display = 'none'; },

    addOpcion(nombre = '', precio = 0, id = null) {
        const container = document.getElementById('opciones-container');
        const opcionId = id || 'opt' + Date.now() + Math.random().toString(36).substr(2, 5);

        const row = document.createElement('div');
        row.className = 'opcion-row';

        const inNombre = document.createElement('input');
        inNombre.type = 'text';
        inNombre.className = 'opcion-nombre';
        inNombre.placeholder = 'Nombre (ej: Queso extra)';
        inNombre.maxLength = 60;
        inNombre.value = nombre;

        const inPrecio = document.createElement('input');
        inPrecio.type = 'number';
        inPrecio.className = 'opcion-precio';
        inPrecio.step = '0.01';
        inPrecio.min = '0';
        inPrecio.placeholder = '$ 0.00';
        inPrecio.value = precio;

        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'btn-icon btn-delete';
        btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
        btnDel.addEventListener('click', () => row.remove());

        const inId = document.createElement('input');
        inId.type = 'hidden';
        inId.className = 'opcion-id';
        inId.value = opcionId;

        row.appendChild(inNombre);
        row.appendChild(inPrecio);
        row.appendChild(btnDel);
        row.appendChild(inId);
        container.appendChild(row);
    },

    async saveModifier() {
        const id = document.getElementById('mod-id').value;
        const nombre = document.getElementById('mod-nombre').value.trim();
        const tipo = document.getElementById('mod-tipo').value;
        const obligatorio = document.getElementById('mod-obligatorio').checked;
        if (!nombre) { alert('Nombre obligatorio.'); return; }
        const opcionesRows = document.querySelectorAll('.opcion-row');
        const opciones = [];
        opcionesRows.forEach(row => {
            const n = row.querySelector('.opcion-nombre').value.trim();
            const p = parseFloat(row.querySelector('.opcion-precio').value) || 0;
            const oid = row.querySelector('.opcion-id').value;
            if (n) opciones.push({ id: oid, nombre: n, precio: p });
        });
        if (opciones.length === 0) { alert('Agrega al menos una opción.'); return; }
        const modData = { id: id || 'mod' + Date.now(), nombre, tipo, obligatorio, opciones };
        try {
            const newMods = [...(this.menu.modificadores || [])];
            if (id) {
                const idx = newMods.findIndex(m => String(m.id) === String(id));
                if (idx !== -1) newMods[idx] = modData;
            } else {
                newMods.push(modData);
            }
            await window.setDoc(window.doc(window.db, 'menu', 'main'), {
                categorias: this.menu.categorias || [],
                productos: this.menu.productos || [],
                modificadores: newMods
            });
            this.closeModifierModal();
            alert('✅ Modificador guardado.');
        } catch (error) { alert('Error: ' + error.message); }
    },

    async deleteModifier(id) {
        const productosUsando = this.menu.productos.filter(p => p.modificadoresIds && p.modificadoresIds.includes(id)).length;
        if (productosUsando > 0) { alert('Está asignado a ' + productosUsando + ' producto(s).'); return; }
        if (!confirm('¿Eliminar modificador?')) return;
        try {
            const newMods = this.menu.modificadores.filter(m => String(m.id) !== String(id));
            await window.setDoc(window.doc(window.db, 'menu', 'main'), {
                categorias: this.menu.categorias || [],
                productos: this.menu.productos || [],
                modificadores: newMods
            });
        } catch (error) { alert('Error: ' + error.message); }
    }
};

document.addEventListener('DOMContentLoaded', () => admin.init());