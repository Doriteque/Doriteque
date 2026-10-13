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
    flyerDataUrl: null,
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
       MÓDULO FLYER QR (EDITOR + DESCARGA)
       ============================================ */

    getFlyer() {
        const f = (this.config && this.config.flyer) || {};
        return {
            titulo: f.titulo || '',
            subtitulo: (f.subtitulo !== undefined && f.subtitulo !== '') ? f.subtitulo : 'Menú Digital',
            promo: f.promo || '',
            cta: (f.cta !== undefined && f.cta !== '') ? f.cta : '¡ESCANEA Y PIDE AHORA!',
            pie: f.pie || '',
            colorPrimario: f.colorPrimario || '#C41E3A',
            colorMarco: f.colorMarco || '#FF7A00',
            colorFondo: f.colorFondo || '#FDF4EE',
            mostrarLogo: f.mostrarLogo !== false
        };
    },

    openFlyerEditor() {
        this.switchTab('flyer');
        this.fillFlyerForm();
        this.renderFlyerPreview();
    },

    fillFlyerForm() {
        const f = this.getFlyer();
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        set('fly-titulo', f.titulo);
        set('fly-subtitulo', f.subtitulo);
        set('fly-promo', f.promo);
        set('fly-cta', f.cta);
        set('fly-pie', f.pie);
        set('fly-color-primario', f.colorPrimario);
        set('fly-color-marco', f.colorMarco);
        set('fly-color-fondo', f.colorFondo);
        const logo = document.getElementById('fly-logo');
        if (logo) logo.checked = f.mostrarLogo;
    },

    previewFlyerDebounced() {
        clearTimeout(this.flyerTimer);
        this.flyerTimer = setTimeout(() => this.renderFlyerPreview(), 400);
    },

    async renderFlyerPreview() {
        const img = document.getElementById('flyer-preview');
        if (!img) return;
        try {
            const dataUrl = await this.createFlyer('https://doriteque.github.io/Doriteque/');
            this.flyerDataUrl = dataUrl;
            img.src = dataUrl;
            img.style.display = 'block';
            const err = document.getElementById('flyer-error');
            if (err) err.style.display = 'none';
        } catch (e) {
            console.error('Error generando flyer:', e);
            img.style.display = 'none';
            const err = document.getElementById('flyer-error');
            if (err) {
                err.style.display = 'block';
                err.textContent = 'No se pudo generar la vista previa: ' + e.message;
            }
        }
    },

    downloadFlyer() {
        if (!this.flyerDataUrl) {
            alert('Genera la vista previa primero.');
            return;
        }
        const a = document.createElement('a');
        a.href = this.flyerDataUrl;
        a.download = 'doriteque-flyer-qr.png';
        a.click();
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

    async loadQRImage(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const img = await this.loadImage(objectUrl, false);
            URL.revokeObjectURL(objectUrl);
            return img;
        } catch (e1) {
            return await this.loadImage(url, true);
        }
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

    drawIcon(ctx, pathData, cx, cy, size, color) {
        const p = new Path2D(pathData);
        ctx.save();
        ctx.translate(cx - size / 2, cy - size / 2);
        ctx.scale(size / 24, size / 24);
        ctx.fillStyle = color;
        ctx.fill(p);
        ctx.restore();
    },

    iconPaths() {
        return {
            instagram: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z',
            whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
            tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z'
        };
    },

    async createFlyer(url) {
        const f = this.getFlyer();
        const W = 1080, H = 1720;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

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
        ctx.globalAlpha = 0.03;
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

        // Filete interior fino
        this.roundRect(ctx, 92, 92, W - 184, H - 184, 26);
        ctx.strokeStyle = f.colorPrimario;
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.textAlign = 'center';

        // Logo (arriba y al centro del QR)
        const logoImg = f.mostrarLogo ? await this.loadLogoImage() : null;
        if (logoImg) {
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.22)';
            ctx.shadowBlur = 22;
            ctx.shadowOffsetY = 8;
            ctx.beginPath();
            ctx.arc(W / 2, 250, 108, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.arc(W / 2, 250, 98, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(logoImg, W / 2 - 98, 152, 196, 196);
            ctx.restore();
            ctx.beginPath();
            ctx.arc(W / 2, 250, 103, 0, Math.PI * 2);
            ctx.strokeStyle = f.colorPrimario;
            ctx.lineWidth = 7;
            ctx.stroke();
        }

        // Título
        const titulo = (f.titulo || (this.config && this.config.nombre) || 'DORITEQUE').toUpperCase();
        ctx.fillStyle = f.colorPrimario;
        ctx.font = '900 84px Arial, sans-serif';
        try { ctx.letterSpacing = '6px'; } catch (e) { }
        ctx.fillText(titulo, W / 2, 470);
        try { ctx.letterSpacing = '0px'; } catch (e) { }

        // Subtítulo
        ctx.fillStyle = '#8a8a8a';
        ctx.font = '600 44px Arial, sans-serif';
        ctx.fillText(f.subtitulo, W / 2, 536);

        // Promoción opcional
        if (f.promo) {
            ctx.fillStyle = f.colorPrimario;
            ctx.font = '800 40px Arial, sans-serif';
            ctx.fillText(f.promo, W / 2, 598);
        }

        // Tarjeta del QR
        const cardW = 800, cardH = 720;
        const cardX = (W - cardW) / 2, cardY = 670;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.10)';
        ctx.shadowBlur = 26;
        ctx.shadowOffsetY = 10;
        this.roundRect(ctx, cardX, cardY, cardW, cardH, 28);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.restore();
        this.roundRect(ctx, cardX, cardY, cardW, cardH, 28);
        ctx.strokeStyle = f.colorPrimario;
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // QR con corrección alta (tolera el logo encima)
        const qrSize = 560;
        const qrY = cardY + 80;
        const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=' + qrSize + 'x' + qrSize +
            '&ecc=H&color=' + f.colorPrimario.replace('#', '') + '&bgcolor=FFFFFF&data=' + encodeURIComponent(url);
        const qr = await this.loadQRImage(qrUrl);
        ctx.drawImage(qr, (W - qrSize) / 2, qrY, qrSize, qrSize);

        // Logo al centro del QR
        if (logoImg) {
            const cx = W / 2, cy = qrY + qrSize / 2;
            this.roundRect(ctx, cx - 95, cy - 95, 190, 190, 24);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, 78, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(logoImg, cx - 78, cy - 78, 156, 156);
            ctx.restore();
            ctx.beginPath();
            ctx.arc(cx, cy, 80, 0, Math.PI * 2);
            ctx.strokeStyle = f.colorPrimario;
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        // CTA grande
        ctx.fillStyle = f.colorPrimario;
        ctx.font = '900 60px Arial, sans-serif';
        try { ctx.letterSpacing = '2px'; } catch (e) { }
        ctx.fillText(f.cta, W / 2, 1470);
        try { ctx.letterSpacing = '0px'; } catch (e) { }

        // Iconos reales de redes
        const icons = this.iconPaths();
        this.drawIcon(ctx, icons.instagram, W / 2 - 150, 1565, 62, f.colorPrimario);
        this.drawIcon(ctx, icons.whatsapp, W / 2, 1565, 62, f.colorPrimario);
        this.drawIcon(ctx, icons.tiktok, W / 2 + 150, 1565, 62, f.colorPrimario);

        // Pie opcional
        if (f.pie) {
            ctx.fillStyle = '#8a8a8a';
            ctx.font = '600 30px Arial, sans-serif';
            ctx.fillText(f.pie, W / 2, 1652);
        }

        return canvas.toDataURL('image/png');
    },

    /* ============================================
       DASHBOARD Y CONFIGURACIÓN
       ============================================ */

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
    },

    async saveConfig() {
        try {
            const getVal = (id) => document.getElementById(id).value.trim();
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
                flyer: {
                    titulo: getVal('fly-titulo'),
                    subtitulo: getVal('fly-subtitulo'),
                    promo: getVal('fly-promo'),
                    cta: getVal('fly-cta'),
                    pie: getVal('fly-pie'),
                    colorPrimario: document.getElementById('fly-color-primario').value,
                    colorMarco: document.getElementById('fly-color-marco').value,
                    colorFondo: document.getElementById('fly-color-fondo').value,
                    mostrarLogo: document.getElementById('fly-logo').checked
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
            const idStr = String(p.id);
            html += `<div class="admin-item">
                <img src="${img}" class="admin-item-img" alt="${p.nombre}">
                <div class="admin-item-info">
                    <div class="admin-item-nombre">${p.nombre} ${badge} ${modsBadge}</div>
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

    async saveProduct() {
        const id = document.getElementById('prod-id').value;
        const nombre = document.getElementById('prod-nombre').value.trim();
        const descripcion = document.getElementById('prod-descripcion').value.trim();
        const precio = parseFloat(document.getElementById('prod-precio').value);
        const categoriaId = document.getElementById('prod-categoria').value;
        const imagen = document.getElementById('prod-imagen').value.trim();
        const disponible = document.getElementById('prod-disponible').checked;
        const modificadoresIds = [];
        document.querySelectorAll('.mod-chip.selected').forEach(chip => modificadoresIds.push(chip.dataset.modId));

        if (!nombre || !descripcion || isNaN(precio) || !categoriaId) {
            alert('Completa todos los campos obligatorios.');
            return;
        }

        const productoData = { id: id || 'p' + Date.now(), nombre, descripcion, precio, categoriaId, imagen, disponible, modificadoresIds };

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

    renderModifiers() {
        const container = document.getElementById('modificadores-list');
        if (!container) return;
        if (!this.menu.modificadores || this.menu.modificadores.length === 0) {
            container.innerHTML = '<p style="color:#b0b0b0;text-align:center;padding:20px;">No hay modificadores.</p>';
            return;
        }
        let html = '';
        this.menu.modificadores.forEach(m => {
            const tipoTexto = m.tipo === 'unico' ? 'Único' : 'Múltiple';
            const obligatorioTexto = m.obligatorio ? 'Obligatorio' : 'Opcional';
            html += `<div class="admin-item">
                <div class="admin-item-info">
                    <div class="admin-item-nombre">${m.nombre}</div>
                    <div class="admin-item-desc">${tipoTexto} | ${obligatorioTexto} | ${m.opciones.length} opciones</div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-icon btn-edit" data-action="edit-mod" data-id="${m.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-delete" data-action="delete-mod" data-id="${m.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    },

    editModifier(id) { this.openModifierModal(String(id)); },

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
            document.getElementById('mod-tipo').value = m.tipo;
            document.getElementById('mod-obligatorio').checked = m.obligatorio;
            m.opciones.forEach(op => this.addOpcion(op.nombre, op.precio, op.id));
        } else {
            title.textContent = 'Nuevo modificador';
            document.getElementById('mod-id').value = '';
            document.getElementById('mod-nombre').value = '';
            document.getElementById('mod-tipo').value = 'unico';
            document.getElementById('mod-obligatorio').checked = false;
            this.addOpcion();
        }
        modal.style.display = 'flex';
    },

    closeModifierModal() { document.getElementById('modifier-modal').style.display = 'none'; },

    addOpcion(nombre = '', precio = 0, id = null) {
        const container = document.getElementById('opciones-container');
        const opcionId = id || 'opt' + Date.now() + Math.random().toString(36).substr(2, 5);
        const div = document.createElement('div');
        div.className = 'opcion-row';
        div.innerHTML = `<input type="text" placeholder="Nombre" value="${nombre}" class="opcion-nombre"><input type="number" step="0.01" placeholder="Precio" value="${precio}" class="opcion-precio"><button type="button" class="btn-icon btn-delete" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button><input type="hidden" value="${opcionId}" class="opcion-id">`;
        container.appendChild(div);
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
