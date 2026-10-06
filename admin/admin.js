const admin = {
    config: {},
    menu: { categorias: [], productos: [], modificadores: [] },
    credentials: { user: 'admin', pass: 'doriteque2026' },
    unsubConfig: null,
    unsubMenu: null,

    async init() {
        const savedCreds = localStorage.getItem('doriteque_admin_creds');
        if (savedCreds) this.credentials = JSON.parse(savedCreds);

        if (sessionStorage.getItem('doriteque_admin_logged') === 'true') {
            await this.loadDashboard();
        }

        document.getElementById('login-pass').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.login();
        });
        document.getElementById('login-user').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('login-pass').focus();
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

    login() {
        const user = document.getElementById('login-user').value.trim().toLowerCase();
        const pass = document.getElementById('login-pass').value;
        const storedUser = this.credentials.user.trim().toLowerCase();

        if (user === storedUser && pass === this.credentials.pass) {
            sessionStorage.setItem('doriteque_admin_logged', 'true');
            this.loadDashboard();
        } else {
            const errorEl = document.getElementById('login-error');
            errorEl.style.display = 'block';
            setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
        }
    },

    logout() {
        sessionStorage.removeItem('doriteque_admin_logged');
        if (this.unsubConfig) this.unsubConfig();
        if (this.unsubMenu) this.unsubMenu();
        location.reload();
    },

    async loadDashboard() {
        try {
            // Escuchar cambios en tiempo real desde Firebase
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

            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
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
        document.getElementById('cfg-nombre').value = this.config.nombre || '';
        document.getElementById('cfg-whatsapp').value = this.config.whatsapp || '';
        document.getElementById('cfg-email').value = this.config.email || '';
        document.getElementById('cfg-instagram').value = this.config.instagram || '';
        document.getElementById('cfg-tiktok').value = this.config.tiktok || '';
        document.getElementById('cfg-horario').value = this.config.horario || '';
        document.getElementById('cfg-tasa').value = this.config.tasaBs || 36.50;
        document.getElementById('cfg-metodos').value = (this.config.metodosPago || []).join(', ');
        document.getElementById('cfg-logo').value = this.config.logo || '';
        document.getElementById('cfg-mensaje').value = this.config.mensajeWhatsApp || '';
        document.getElementById('msg-header').value = this.config.msgHeader || '🍔 *NUEVO PEDIDO*';
document.getElementById('msg-greeting').value = this.config.msgGreeting || '¡Gracias por tu pedido!';
document.getElementById('msg-before-detail').value = this.config.msgBeforeDetail || 'Aquí tienes el detalle de tu pedido:';
document.getElementById('msg-after-total').value = this.config.msgAfterTotal || 'Te contactaremos pronto para confirmar. ¡Gracias por elegirnos!';
document.getElementById('msg-business-phone').value = this.config.whatsapp || '';
    },

    async saveConfig() {
    try {
        const newConfig = {
            nombre: document.getElementById('cfg-nombre').value.trim(),
            whatsapp: document.getElementById('cfg-whatsapp').value.trim(),
            email: document.getElementById('cfg-email').value.trim(),
            instagram: document.getElementById('cfg-instagram').value.trim(),
            tiktok: document.getElementById('cfg-tiktok').value.trim(),
            horario: document.getElementById('cfg-horario').value.trim(),
            tasaBs: parseFloat(document.getElementById('cfg-tasa').value) || 36.50,
            metodosPago: document.getElementById('cfg-metodos').value.split(',').map(s => s.trim()).filter(s => s),
            logo: document.getElementById('cfg-logo').value.trim(),
            msgHeader: document.getElementById('msg-header').value.trim(),
            msgGreeting: document.getElementById('msg-greeting').value.trim(),
            msgBeforeDetail: document.getElementById('msg-before-detail').value.trim(),
            msgAfterTotal: document.getElementById('msg-after-total').value.trim()
        };
        
        await window.setDoc(window.doc(window.db, 'config', 'main'), newConfig);
        alert('✅ Configuración guardada en la nube. Los cambios se ven al instante en la tienda.');
    } catch (error) {
        console.error(error);
        alert('Error al guardar: ' + error.message);
    }
},

    fillCredentialsForm() {
        document.getElementById('acc-user').value = this.credentials.user;
        document.getElementById('acc-pass').value = this.credentials.pass;
    },

    saveCredentials() {
        const newUser = document.getElementById('acc-user').value.trim();
        const newPass = document.getElementById('acc-pass').value.trim();
        if (!newUser || !newPass) { alert('Usuario y contraseña no pueden estar vacíos.'); return; }
        this.credentials = { user: newUser, pass: newPass };
        localStorage.setItem('doriteque_admin_creds', JSON.stringify(this.credentials));
        alert('Credenciales actualizadas.');
    },

    renderProducts() {
        const container = document.getElementById('productos-list');
        if (!this.menu.productos || this.menu.productos.length === 0) {
            container.innerHTML = '<p style="color: #b0b0b0; text-align: center; padding: 20px;">No hay productos. Crea el primero.</p>';
            return;
        }
        let html = '';
        this.menu.productos.forEach(p => {
            const cat = this.menu.categorias.find(c => String(c.id) === String(p.categoriaId));
            const img = p.imagen || 'https://via.placeholder.com/60/1a1a1a/C41E3A?text=D';
            const badge = p.disponible ? '<span class="badge badge-active">Disponible</span>' : '<span class="badge badge-inactive">No disponible</span>';
            const modsCount = p.modificadoresIds ? p.modificadoresIds.length : 0;
            const modsBadge = modsCount > 0 ? '<span class="badge" style="background: #FF9800; color: white; margin-left: 6px;">' + modsCount + ' mods</span>' : '';
            const idStr = String(p.id);
            html += '<div class="admin-item">';
            html += '<img src="' + img + '" class="admin-item-img" alt="' + p.nombre + '">';
            html += '<div class="admin-item-info">';
            html += '<div class="admin-item-nombre">' + p.nombre + badge + modsBadge + '</div>';
            html += '<div class="admin-item-desc">' + (cat ? cat.nombre : 'Sin categoría') + '</div>';
            html += '<div class="admin-item-precio">$' + Number(p.precio).toFixed(2) + '</div>';
            html += '</div>';
            html += '<div class="admin-item-actions">';
            html += '<button class="btn-icon btn-toggle ' + (p.disponible ? '' : 'disabled') + '" data-action="toggle" data-id="' + idStr + '" title="Cambiar disponibilidad"><i class="fa-solid fa-' + (p.disponible ? 'eye' : 'eye-slash') + '"></i></button>';
            html += '<button class="btn-icon btn-edit" data-action="edit" data-id="' + idStr + '" title="Editar"><i class="fa-solid fa-pen"></i></button>';
            html += '<button class="btn-icon btn-delete" data-action="delete" data-id="' + idStr + '" title="Eliminar"><i class="fa-solid fa-trash"></i></button>';
            html += '</div></div>';
        });
        container.innerHTML = html;
    },

    renderCategories() {
        const container = document.getElementById('categorias-list');
        if (!this.menu.categorias || this.menu.categorias.length === 0) {
            container.innerHTML = '<p style="color: #b0b0b0; text-align: center; padding: 20px;">No hay categorías.</p>';
            return;
        }
        let html = '';
        this.menu.categorias.forEach(c => {
            const count = this.menu.productos.filter(p => String(p.categoriaId) === String(c.id)).length;
            const idStr = String(c.id);
            html += '<div class="admin-item">';
            html += '<div class="admin-item-info">';
            html += '<div class="admin-item-nombre">' + c.nombre + '</div>';
            html += '<div class="admin-item-desc">Orden: ' + c.orden + ' | ' + count + ' productos</div>';
            html += '</div>';
            html += '<div class="admin-item-actions">';
            html += '<button class="btn-icon btn-edit" data-action="edit" data-id="' + idStr + '" title="Editar"><i class="fa-solid fa-pen"></i></button>';
            html += '<button class="btn-icon btn-delete" data-action="delete" data-id="' + idStr + '" title="Eliminar"><i class="fa-solid fa-trash"></i></button>';
            html += '</div></div>';
        });
        container.innerHTML = html;
    },

    renderModifiers() {
        const container = document.getElementById('modificadores-list');
        if (!container) return;
        if (!this.menu.modificadores || this.menu.modificadores.length === 0) {
            container.innerHTML = '<p style="color: #b0b0b0; text-align: center; padding: 20px;">No hay modificadores. Crea el primero.</p>';
            return;
        }
        let html = '';
        this.menu.modificadores.forEach(m => {
            const tipoTexto = m.tipo === 'unico' ? 'Único' : 'Múltiple';
            const obligatorioTexto = m.obligatorio ? 'Obligatorio' : 'Opcional';
            const idStr = String(m.id);
            html += '<div class="admin-item">';
            html += '<div class="admin-item-info">';
            html += '<div class="admin-item-nombre">' + m.nombre + '</div>';
            html += '<div class="admin-item-desc">' + tipoTexto + ' | ' + obligatorioTexto + ' | ' + m.opciones.length + ' opciones</div>';
            html += '</div>';
            html += '<div class="admin-item-actions">';
            html += '<button class="btn-icon btn-edit" data-action="edit-mod" data-id="' + idStr + '" title="Editar"><i class="fa-solid fa-pen"></i></button>';
            html += '<button class="btn-icon btn-delete" data-action="delete-mod" data-id="' + idStr + '" title="Eliminar"><i class="fa-solid fa-trash"></i></button>';
            html += '</div></div>';
        });
        container.innerHTML = html;
    },

    editProduct(id) {
        this.openProductModal(String(id));
    },

    openProductModal(productId = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const select = document.getElementById('prod-categoria');
        select.innerHTML = '<option value="">Selecciona una categoría</option>';
        (this.menu.categorias || []).forEach(c => {
            select.innerHTML += '<option value="' + c.id + '">' + c.nombre + '</option>';
        });

        const modsSection = document.getElementById('modificadores-chips-container');
        if (modsSection) {
            modsSection.innerHTML = '';
            if (!this.menu.modificadores || this.menu.modificadores.length === 0) {
                modsSection.innerHTML = '<p style="color: #b0b0b0; font-size: 0.85rem;">No hay modificadores creados.</p>';
            } else {
                this.menu.modificadores.forEach(m => {
                    let isChecked = false;
                    if (productId) {
                        const p = this.menu.productos.find(x => String(x.id) === String(productId));
                        if (p && p.modificadoresIds && p.modificadoresIds.includes(m.id)) {
                            isChecked = true;
                        }
                    }
                    const chip = document.createElement('div');
                    chip.className = 'mod-chip' + (isChecked ? ' selected' : '');
                    chip.dataset.modId = m.id;
                    chip.innerHTML = '<i class="fa-solid fa-' + (isChecked ? 'check' : 'plus') + '"></i> ' + m.nombre + ' <span class="mod-type">(' + (m.tipo === 'unico' ? '1 opción' : 'varias') + ')</span>';
                    chip.onclick = function() {
                        this.classList.toggle('selected');
                        const icon = this.querySelector('i');
                        if (this.classList.contains('selected')) {
                            icon.className = 'fa-solid fa-check';
                        } else {
                            icon.className = 'fa-solid fa-plus';
                        }
                    };
                    modsSection.appendChild(chip);
                });
            }
        }

        if (productId && productId !== 'null' && productId !== '') {
            const p = this.menu.productos.find(x => String(x.id) === String(productId));
            if (!p) {
                alert('Error: No se encontró el producto con ID: ' + productId);
                return;
            }
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
            const fileInput = document.getElementById('prod-imagen-file');
            if (fileInput) fileInput.value = '';
        }
        modal.style.display = 'flex';
    },

    closeProductModal() {
        document.getElementById('product-modal').style.display = 'none';
    },

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Solo se permiten imágenes.'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('La imagen es muy grande. Máximo 5MB.'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 800;
                let width = img.width;
                let height = img.height;
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
        document.getElementById('image-preview').src = '';
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
        document.querySelectorAll('.mod-chip.selected').forEach(chip => {
            modificadoresIds.push(chip.dataset.modId);
        });

        if (!nombre || !descripcion || isNaN(precio) || !categoriaId) {
            alert('Completa nombre, descripción, precio y categoría.');
            return;
        }

        const productoData = {
            id: id || 'p' + Date.now(),
            nombre,
            descripcion,
            precio,
            categoriaId,
            imagen,
            disponible,
            modificadoresIds: modificadoresIds
        };

        try {
            const newProductos = [...(this.menu.productos || [])];
            if (id) {
                const idx = newProductos.findIndex(p => String(p.id) === String(id));
                if (idx !== -1) newProductos[idx] = productoData;
            } else {
                newProductos.push(productoData);
            }

            const newMenu = {
                categorias: this.menu.categorias || [],
                productos: newProductos,
                modificadores: this.menu.modificadores || []
            };

            await window.setDoc(window.doc(window.db, 'menu', 'main'), newMenu);
            this.closeProductModal();
            alert('✅ Producto guardado en la nube. Los cambios se ven al instante en la tienda.');
        } catch (error) {
            console.error(error);
            alert('Error al guardar: ' + error.message);
        }
    },

    async deleteProduct(id) {
        if (!confirm('¿Eliminar este producto?')) return;
        try {
            const newProductos = this.menu.productos.filter(p => String(p.id) !== String(id));
            const newMenu = {
                categorias: this.menu.categorias || [],
                productos: newProductos,
                modificadores: this.menu.modificadores || []
            };
            await window.setDoc(window.doc(window.db, 'menu', 'main'), newMenu);
            alert('✅ Producto eliminado.');
        } catch (error) {
            console.error(error);
            alert('Error al eliminar: ' + error.message);
        }
    },

    async toggleProduct(id) {
        try {
            const newProductos = this.menu.productos.map(p => {
                if (String(p.id) === String(id)) {
                    return { ...p, disponible: !p.disponible };
                }
                return p;
            });
            const newMenu = {
                categorias: this.menu.categorias || [],
                productos: newProductos,
                modificadores: this.menu.modificadores || []
            };
            await window.setDoc(window.doc(window.db, 'menu', 'main'), newMenu);
        } catch (error) {
            console.error(error);
            alert('Error: ' + error.message);
        }
    },

    editCategory(id) {
        this.openCategoryModal(String(id));
    },

    openCategoryModal(catId = null) {
        const modal = document.getElementById('category-modal');
        const title = document.getElementById('category-modal-title');
        if (catId && catId !== 'null' && catId !== '') {
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

    closeCategoryModal() {
        document.getElementById('category-modal').style.display = 'none';
    },

    async saveCategory() {
        const id = document.getElementById('cat-id').value;
        const nombre = document.getElementById('cat-nombre').value.trim();
        const orden = parseInt(document.getElementById('cat-orden').value) || 1;
        if (!nombre) { alert('El nombre es obligatorio.'); return; }
        const catData = { id: id || 'cat' + Date.now(), nombre, orden };

        try {
            const newCategorias = [...(this.menu.categorias || [])];
            if (id) {
                const idx = newCategorias.findIndex(c => String(c.id) === String(id));
                if (idx !== -1) newCategorias[idx] = catData;
            } else {
                newCategorias.push(catData);
            }
            const newMenu = {
                categorias: newCategorias,
                productos: this.menu.productos || [],
                modificadores: this.menu.modificadores || []
            };
            await window.setDoc(window.doc(window.db, 'menu', 'main'), newMenu);
            this.closeCategoryModal();
            alert('✅ Categoría guardada.');
        } catch (error) {
            console.error(error);
            alert('Error: ' + error.message);
        }
    },

    async deleteCategory(id) {
        const count = this.menu.productos.filter(p => String(p.categoriaId) === String(id)).length;
        if (count > 0) { alert('No puedes eliminar esta categoría porque tiene ' + count + ' producto(s).'); return; }
        if (!confirm('¿Eliminar esta categoría?')) return;
        try {
            const newCategorias = this.menu.categorias.filter(c => String(c.id) !== String(id));
            const newMenu = {
                categorias: newCategorias,
                productos: this.menu.productos || [],
                modificadores: this.menu.modificadores || []
            };
            await window.setDoc(window.doc(window.db, 'menu', 'main'), newMenu);
            alert('✅ Categoría eliminada.');
        } catch (error) {
            console.error(error);
            alert('Error: ' + error.message);
        }
    },

    openModifierModal(modId = null) {
        const modal = document.getElementById('modifier-modal');
        const title = document.getElementById('modifier-modal-title');
        const container = document.getElementById('opciones-container');
        container.innerHTML = '';

        if (modId && modId !== 'null' && modId !== '') {
            const m = this.menu.modificadores.find(x => String(x.id) === String(modId));
            if (!m) return;
            title.textContent = 'Editar modificador';
            document.getElementById('mod-id').value = m.id;
            document.getElementById('mod-nombre').value = m.nombre;
            document.getElementById('mod-tipo').value = m.tipo;
            document.getElementById('mod-obligatorio').checked = m.obligatorio;
            m.opciones.forEach(op => {
                this.addOpcion(op.nombre, op.precio, op.id);
            });
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

    closeModifierModal() {
        document.getElementById('modifier-modal').style.display = 'none';
    },

    addOpcion(nombre = '', precio = 0, id = null) {
        const container = document.getElementById('opciones-container');
        const opcionId = id || 'opt' + Date.now() + Math.random().toString(36).substr(2, 5);
        const div = document.createElement('div');
        div.className = 'opcion-row';
        div.innerHTML = '<input type="text" placeholder="Nombre de la opción" value="' + nombre + '" class="opcion-nombre" style="flex: 2;"><input type="number" step="0.01" placeholder="Precio extra" value="' + precio + '" class="opcion-precio" style="flex: 1;"><button type="button" class="btn-icon btn-delete" onclick="this.parentElement.remove()" title="Eliminar opción"><i class="fa-solid fa-trash"></i></button><input type="hidden" value="' + opcionId + '" class="opcion-id">';
        container.appendChild(div);
    },

    async saveModifier() {
        const id = document.getElementById('mod-id').value;
        const nombre = document.getElementById('mod-nombre').value.trim();
        const tipo = document.getElementById('mod-tipo').value;
        const obligatorio = document.getElementById('mod-obligatorio').checked;

        if (!nombre) {
            alert('El nombre del modificador es obligatorio.');
            return;
        }

        const opcionesRows = document.querySelectorAll('.opcion-row');
        const opciones = [];
        opcionesRows.forEach(row => {
            const optNombre = row.querySelector('.opcion-nombre').value.trim();
            const optPrecio = parseFloat(row.querySelector('.opcion-precio').value) || 0;
            const optId = row.querySelector('.opcion-id').value;
            if (optNombre) {
                opciones.push({ id: optId, nombre: optNombre, precio: optPrecio });
            }
        });

        if (opciones.length === 0) {
            alert('Debes agregar al menos una opción.');
            return;
        }

        const modData = { id: id || 'mod' + Date.now(), nombre, tipo, obligatorio, opciones };

        try {
            const newMods = [...(this.menu.modificadores || [])];
            if (id) {
                const idx = newMods.findIndex(m => String(m.id) === String(id));
                if (idx !== -1) newMods[idx] = modData;
            } else {
                newMods.push(modData);
            }
            const newMenu = {
                categorias: this.menu.categorias || [],
                productos: this.menu.productos || [],
                modificadores: newMods
            };
            await window.setDoc(window.doc(window.db, 'menu', 'main'), newMenu);
            this.closeModifierModal();
            alert('✅ Modificador guardado.');
        } catch (error) {
            console.error(error);
            alert('Error: ' + error.message);
        }
    },

    editModifier(id) {
        this.openModifierModal(String(id));
    },

    async deleteModifier(id) {
        const productosUsando = this.menu.productos.filter(p => p.modificadoresIds && p.modificadoresIds.includes(id)).length;
        if (productosUsando > 0) {
            alert('No puedes eliminar este modificador porque está asignado a ' + productosUsando + ' producto(s).');
            return;
        }
        if (!confirm('¿Eliminar este modificador?')) return;
        try {
            const newMods = this.menu.modificadores.filter(m => String(m.id) !== String(id));
            const newMenu = {
                categorias: this.menu.categorias || [],
                productos: this.menu.productos || [],
                modificadores: newMods
            };
            await window.setDoc(window.doc(window.db, 'menu', 'main'), newMenu);
            alert('✅ Modificador eliminado.');
        } catch (error) {
            console.error(error);
            alert('Error: ' + error.message);
        }
    },

    previewMessage() {
    const header = document.getElementById('msg-header').value || '🍔 *NUEVO PEDIDO*';
    const greeting = document.getElementById('msg-greeting').value || '';
    const beforeDetail = document.getElementById('msg-before-detail').value || '';
    const afterTotal = document.getElementById('msg-after-total').value || '';
    const negocio = (this.config.nombre || 'DORITEQUE').toUpperCase();
    
    // Datos de ejemplo para la vista previa
    const ejemplo = {
        cliente: 'Juan Pérez',
        whatsapp: '584241234567',
        direccion: 'Av. Principal, Casa #123',
        pago: 'Pago Móvil',
        nota: 'Sin cebolla por favor',
        detalle: '• 2x HAMBURGUESA NORMAL (Proteína: Carne) - $11.00\n• 1x COCA-COLA 1LT - $1.50\n',
        total_usd: '12.50',
        total_bs: '456.25'
    };
    
    let mensaje = header + ' - ' + negocio + '\n\n';
    if (greeting) mensaje += greeting + '\n\n';
    mensaje += '👤 *Cliente:* ' + ejemplo.cliente + '\n';
    mensaje += '📱 *WhatsApp:* +' + ejemplo.whatsapp + '\n';
    mensaje += '📍 *Dirección:* ' + ejemplo.direccion + '\n';
    mensaje += ' *Pago:* ' + ejemplo.pago + '\n';
    if (ejemplo.nota) mensaje += '📝 *Nota:* ' + ejemplo.nota + '\n';
    mensaje += '\n' + beforeDetail + '\n' + ejemplo.detalle;
    mensaje += '---------------------------\n';
    mensaje += '💵 *TOTAL:* $' + ejemplo.total_usd + ' (Bs ' + ejemplo.total_bs + ')\n\n';
    mensaje += afterTotal;
    
    document.getElementById('message-preview-content').textContent = mensaje;
    document.getElementById('message-preview').style.display = 'block';
    document.getElementById('message-preview').scrollIntoView({ behavior: 'smooth' });
},
};

document.addEventListener('DOMContentLoaded', () => admin.init());