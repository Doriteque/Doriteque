const admin = {
    config: {},
    menu: { categorias: [], productos: [], modificadores: [] },
    unsubConfig: null,
    unsubMenu: null,
    flyerDataUrl: null,

    async init() {
        // 1. FORZAR LOGOUT SIEMPRE al cargar
        try {
            await window.signOut(window.auth);
        } catch (e) {
            // No había sesión activa
        }

        // 2. Listener de autenticación de Firebase
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

        // 3. Formulario de login
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // 4. Listeners de tablas
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
       FLYER CON QR (GENERAR Y DESCARGAR)
       ============================================ */

    async generateQR() {
        const modal = document.getElementById('qr-modal');
        const container = document.getElementById('qr-container');
        const url = 'https://doriteque.github.io/Doriteque/';
        container.innerHTML = '<p style="color:#b0b0b0;">Generando publicación...</p>';
        modal.style.display = 'flex';
        try {
            const dataUrl = await this.createFlyer(url);
            this.flyerDataUrl = dataUrl;
            container.innerHTML = '<img src="' + dataUrl + '" style="max-width:100%;border-radius:12px;">';
        } catch (e) {
            console.error('Error generando flyer:', e);
            this.flyerDataUrl = null;
            container.innerHTML = '<p style="color:#FF1744;font-weight:700;">No se pudo generar el flyer.</p>' +
                '<p style="color:#b0b0b0;font-size:0.85rem;">Motivo: ' + e.message + '</p>' +
                '<p style="color:#b0b0b0;font-size:0.85rem;">Revisa tu conexión y pulsa el botón QR de nuevo.</p>';
        }
    },

    closeQRModal() {
        const modal = document.getElementById('qr-modal');
        if (modal) modal.style.display = 'none';
    },

    loadImage(src, useCors) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            if (useCors) img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo cargar una imagen del flyer'));
            img.src = src;
        });
    },

    async loadQRImage(url) {
        // Estrategia 1: descargar como blob (origen local => canvas limpio)
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const img = await this.loadImage(objectUrl, false);
            URL.revokeObjectURL(objectUrl);
            return img;
        } catch (e1) {
            // Estrategia 2: imagen con CORS
            try {
                return await this.loadImage(url, true);
            } catch (e2) {
                throw new Error('No se pudo descargar el QR (revisa tu conexión)');
            }
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

    async createFlyer(url) {
        const W = 1080, H = 1560;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Marco naranja degradado
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#FF9500');
        grad.addColorStop(1, '#FF6A00');
        this.roundRect(ctx, 0, 0, W, H, 60);
        ctx.fillStyle = grad;
        ctx.fill();

        // Borde punteado blanco
        ctx.save();
        this.roundRect(ctx, 26, 26, W - 52, H - 52, 44);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 6;
        ctx.setLineDash([22, 16]);
        ctx.stroke();
        ctx.restore();

        // Fondo interior crema
        this.roundRect(ctx, 52, 52, W - 104, H - 104, 34);
        ctx.fillStyle = '#FDF4EE';
        ctx.fill();
        ctx.strokeStyle = '#F3D9CF';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Logo circular (opcional, no rompe si falla)
        ctx.textAlign = 'center';
        const logoUrl = (this.config && this.config.logo) ? this.config.logo : '../assets/logo.png';
        try {
            const logo = await this.loadImage(logoUrl, true);
            ctx.save();
            ctx.beginPath();
            ctx.arc(W / 2, 250, 110, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(logo, W / 2 - 110, 140, 220, 220);
            ctx.restore();
            ctx.beginPath();
            ctx.arc(W / 2, 250, 110, 0, Math.PI * 2);
            ctx.strokeStyle = '#C41E3A';
            ctx.lineWidth = 10;
            ctx.stroke();
        } catch (e) { /* sin logo, continúa */ }

        // Nombre del negocio
        const nombre = ((this.config && this.config.nombre) || 'DORITEQUE').toUpperCase();
        ctx.fillStyle = '#C41E3A';
        ctx.font = '900 84px Arial, sans-serif';
        ctx.fillText(nombre, W / 2, 470);

        ctx.fillStyle = '#8a8a8a';
        ctx.font = '600 46px Arial, sans-serif';
        ctx.fillText('Menú Digital', W / 2, 540);

        // Tarjeta blanca del QR
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 10;
        this.roundRect(ctx, 150, 600, W - 300, 660, 30);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.restore();
        this.roundRect(ctx, 150, 600, W - 300, 660, 30);
        ctx.strokeStyle = '#F3D9CF';
        ctx.lineWidth = 3;
        ctx.stroke();

        // QR en rojo de la marca (doble estrategia de descarga)
        const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=540x540&color=C41E3A&bgcolor=FFFFFF&data=' + encodeURIComponent(url);
        const qr = await this.loadQRImage(qrUrl);
        ctx.drawImage(qr, (W - 540) / 2, 660, 540, 540);

        // Texto CTA
        ctx.fillStyle = '#C41E3A';
        ctx.font = '900 58px Arial, sans-serif';
        ctx.fillText('¡ESCANEA Y PIDE AHORA!', W / 2, 1360);

        // Círculos de redes
        const redes = [
            { t: 'IG', v: (this.config && this.config.instagram) || '' },
            { t: 'WA', v: 'WhatsApp' },
            { t: 'TK', v: (this.config && this.config.tiktok) || '' }
        ];
        const xs = [W / 2 - 160, W / 2, W / 2 + 160];
        redes.forEach((r, i) => {
            ctx.beginPath();
            ctx.arc(xs[i], 1440, 44, 0, Math.PI * 2);
            ctx.fillStyle = '#C41E3A';
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '800 30px Arial, sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText(r.t, xs[i], 1442);
            ctx.textBaseline = 'alphabetic';
        });

        // Handles de redes
        const handles = redes.map(r => r.v).filter(Boolean).join('  •  ');
        if (handles) {
            ctx.fillStyle = '#8a8a8a';
            ctx.font = '600 30px Arial, sans-serif';
            ctx.fillText(handles, W / 2, 1522);
        }

        return canvas.toDataURL('image/png');
    },

    downloadFlyer() {
        if (!this.flyerDataUrl) {
            alert('La imagen aún no está lista. Genera el flyer de nuevo y espera 2 segundos.');
            return;
        }
        const a = document.createElement('a');
        a.href = this.flyerDataUrl;
        a.download = 'doriteque-flyer-qr.png';
        a.click();
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
                msgAfterTotal: getVal('msg-after-total')
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
            const img = p.imagen || 'https://via.placeholder.com/60/1a1a1a/C41E3A?text=D';
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