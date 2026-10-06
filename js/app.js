const app = {
    config: {},
    menu: { categorias: [], productos: [], modificadores: [] },
    cart: [],
    categoriaActiva: 'todas',
    busqueda: '',
    productoSeleccionado: null,

    async init() {
        // Verificar si viene del checkout y limpiar
        const referrer = document.referrer;
        if (referrer.includes('checkout.html')) {
            localStorage.removeItem('doriteque_cart');
            this.cart = [];
        } else {
            // Cargar carrito normalmente
            try {
                const savedCart = localStorage.getItem('doriteque_cart');
                this.cart = savedCart ? JSON.parse(savedCart) : [];
            } catch (e) {
                this.cart = [];
            }
        }
        // ... el resto del código sigue igual
        // Cargar carrito desde localStorage
        try {
            const savedCart = localStorage.getItem('doriteque_cart');
            this.cart = savedCart ? JSON.parse(savedCart) : [];
        } catch (e) {
            this.cart = [];
        }

        if (!window.loadConfig || !window.loadMenu) {
            setTimeout(() => this.init(), 500);
            return;
        }

        try {
            window.loadConfig((config) => {
                this.config = config;
                this.renderConfig();
            });

            window.loadMenu((menu) => {
                this.menu = menu;
                if (!this.menu.modificadores) this.menu.modificadores = [];
                if (!this.menu.categorias) this.menu.categorias = [];
                if (!this.menu.productos) this.menu.productos = [];
                
                this.renderCategorias();
                this.renderProductos();
                this.updateCartUI();
                
                // Scroll spy después de renderizar
                setTimeout(() => this.setupScrollSpy(), 300);
            });

            this.setupEventListeners();
        } catch (error) {
            console.error('Error cargando datos:', error);
            document.getElementById('productos-grid').innerHTML = '<p class="loading">Error al cargar el menú. Recarga la página.</p>';
        }
    },

    renderConfig() {
        document.getElementById('header-nombre').textContent = this.config.nombre;
        document.getElementById('horario-text').textContent = ' ' + this.config.horario + ' |  Tasa: Bs ' + this.config.tasaBs;
        document.getElementById('link-instagram').href = 'https://instagram.com/' + this.config.instagram;
        document.getElementById('link-tiktok').href = 'https://tiktok.com/@' + this.config.tiktok;
        document.getElementById('link-whatsapp').href = 'https://wa.me/' + this.config.whatsapp;
        document.getElementById('footer-metodos').textContent = '💳 ' + this.config.metodosPago.join(' | ');
        if (this.config.logo) document.getElementById('header-logo').src = this.config.logo;
    },

    renderCategorias() {
        const container = document.getElementById('categorias-tabs');
        let html = '<button class="categoria-tab active" data-id="todas">Todos</button>';
        this.menu.categorias.forEach(cat => {
            html += '<button class="categoria-tab" data-id="' + cat.id + '">' + cat.nombre + '</button>';
        });
        container.innerHTML = html;

        container.querySelectorAll('.categoria-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.categoria-tab').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.categoriaActiva = e.target.dataset.id;
                
                e.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                
                if (this.categoriaActiva === 'todas') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    const seccion = document.getElementById('seccion-' + this.categoriaActiva);
                    if (seccion) {
                        const top = seccion.getBoundingClientRect().top + window.pageYOffset - 140;
                        window.scrollTo({ top: top, behavior: 'smooth' });
                    }
                }
            });
        });
    },

    renderProductos() {
        const container = document.getElementById('productos-grid');
        const texto = this.busqueda.toLowerCase().trim();
        let html = '';

        const catsToShow = this.categoriaActiva === 'todas' 
            ? this.menu.categorias 
            : this.menu.categorias.filter(c => c.id === this.categoriaActiva);

        catsToShow.forEach(cat => {
            const prods = this.menu.productos.filter(p => 
                p.categoriaId === cat.id && p.disponible &&
                (texto === '' || p.nombre.toLowerCase().includes(texto) || p.descripcion.toLowerCase().includes(texto))
            );

            if (prods.length === 0) return;

            html += '<section class="seccion-categoria" id="seccion-' + cat.id + '">';
            html += '<h2 class="titulo-seccion">' + cat.nombre + '</h2>';
            
            prods.forEach(p => {
                const precioBs = (p.precio * this.config.tasaBs).toFixed(2);
                const img = p.imagen || 'https://via.placeholder.com/400x300/1a1a1a/C41E3A?text=Doriteque';
                
                html += '<article class="producto-card" onclick="app.openProductModal(\'' + p.id + '\')">';
                html += '<img src="' + img + '" alt="' + p.nombre + '" class="producto-img" loading="lazy">';
                html += '<div class="producto-info">';
                html += '<h3 class="producto-nombre">' + p.nombre + '</h3>';
                html += '<p class="producto-desc">' + p.descripcion + '</p>';
                html += '<div class="producto-precio">$' + p.precio.toFixed(2) + '</div>';
                html += '<div class="producto-precio-bs">Bs ' + precioBs + '</div>';
                html += '<button class="btn-agregar" onclick="event.stopPropagation(); app.addToCart(\'' + p.id + '\')"><i class="fa-solid fa-plus"></i> Agregar</button>';
                html += '</div></article>';
            });
            html += '</section>';
        });

        container.innerHTML = html || '<p class="loading">No se encontraron productos.</p>';
    },

    openProductModal(productId) {
        const producto = this.menu.productos.find(p => p.id === productId);
        if (!producto) return;

        this.productoSeleccionado = producto;
        
        const img = producto.imagen || 'https://via.placeholder.com/400x300/1a1a1a/C41E3A?text=Doriteque';
        const precioBs = (producto.precio * this.config.tasaBs).toFixed(2);

        document.getElementById('modal-img').src = img;
        document.getElementById('modal-img').alt = producto.nombre;
        document.getElementById('modal-title').textContent = producto.nombre;
        document.getElementById('modal-price-usd').textContent = '$' + producto.precio.toFixed(2);
        document.getElementById('modal-price-bs').textContent = 'Bs ' + precioBs;
        document.getElementById('modal-desc').textContent = producto.descripcion;

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

    addToCart(productId) {
        const producto = this.menu.productos.find(p => p.id === productId);
        if (!producto) return;

        const tieneMods = producto.modificadoresIds && 
                          producto.modificadoresIds.length > 0 && 
                          this.menu.modificadores && 
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
        
        this.addProductToCart(producto, {});
    },

    openCustomizationModal(producto) {
        this.productoSeleccionado = producto;
        
        const modificadores = this.menu.modificadores.filter(m => 
            producto.modificadoresIds.includes(m.id)
        );

        const modal = document.getElementById('customization-modal');
        const title = document.getElementById('customization-title');
        const content = document.getElementById('customization-content');
        
        title.textContent = producto.nombre;
        
        let html = '';

        modificadores.forEach(mod => {
            const obligatorio = mod.obligatorio ? '<span class="required">*</span>' : '<span class="optional">(opcional)</span>';
            
            html += '<div class="customization-section">';
            html += '<h4 class="customization-title">' + mod.nombre + ' ' + obligatorio + '</h4>';
            html += '<div class="customization-options">';
            
            mod.opciones.forEach((op, index) => {
                const inputType = mod.tipo === 'unico' ? 'radio' : 'checkbox';
                const inputName = 'mod-' + mod.id;
                const inputId = inputName + '-' + index;
                const precioText = op.precio > 0 ? ' +$' + op.precio.toFixed(2) : '';
                
                html += '<label class="customization-option">';
                html += '<input type="' + inputType + '" name="' + inputName + '" id="' + inputId + '" value="' + op.id + '" data-precio="' + op.precio + '" data-nombre="' + op.nombre + '" data-modificador="' + mod.nombre + '" onchange="app.updateCustomizationTotal()">';
                html += '<span class="option-text">' + op.nombre + precioText + '</span>';
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

        for (let mod of modificadores) {
            if (mod.obligatorio) {
                const selected = document.querySelectorAll('input[name="mod-' + mod.id + '"]:checked');
                if (selected.length === 0) {
                    alert('Debes seleccionar al menos una opción de: ' + mod.nombre);
                    return;
                }
            }
        }

        const opcionesSeleccionadas = {};
        document.querySelectorAll('#customization-content input:checked').forEach(input => {
            const modNombre = input.dataset.modificador;
            if (!opcionesSeleccionadas[modNombre]) opcionesSeleccionadas[modNombre] = [];
            opcionesSeleccionadas[modNombre].push(input.dataset.nombre);
        });

        this.addProductToCart(producto, opcionesSeleccionadas);
        this.closeCustomizationModal();
    },

    addProductToCart(producto, opciones) {
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
        
        const btn = event.target.closest('.btn-agregar');
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

    saveCart() {
        localStorage.setItem('doriteque_cart', JSON.stringify(this.cart));
    },

    calculateTotal() {
        let totalUSD = 0;
        let totalItems = 0;
        
        this.cart.forEach(item => {
            if (!item || !item.id) return;
            
            const prod = this.menu.productos.find(p => p.id === item.id);
            if (prod) {
                let precioUnitario = prod.precio || 0;
                const qty = item.qty || 1;
                
                if (item.opciones) {
                    Object.keys(item.opciones).forEach(modNombre => {
                        const opciones = item.opciones[modNombre];
                        opciones.forEach(opNombre => {
                            const mod = this.menu.modificadores.find(m => m.nombre === modNombre);
                            if (mod) {
                                const op = mod.opciones.find(o => o.nombre === opNombre);
                                if (op) precioUnitario += op.precio || 0;
                            }
                        });
                    });
                }
                totalUSD += precioUnitario * qty;
                totalItems += qty;
            }
        });
        
        return { totalUSD: totalUSD || 0, totalItems: totalItems || 0 };
    },

    updateCartUI() {
        const { totalUSD, totalItems } = this.calculateTotal();
        
        document.getElementById('cart-count').textContent = totalItems;
        document.getElementById('cart-modal-count').textContent = totalItems;
        document.getElementById('cart-total-usd').textContent = 'USD$ ' + totalUSD.toFixed(2);
        document.getElementById('cart-finalizar-total').textContent = 'USD$ ' + totalUSD.toFixed(2);
        
        const totalBs = (totalUSD * this.config.tasaBs).toFixed(2);
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
            
            let precioUnitario = prod.precio || 0;
            let opcionesTexto = '';
            
            if (item.opciones) {
                Object.keys(item.opciones).forEach(modNombre => {
                    const opciones = item.opciones[modNombre];
                    opciones.forEach(opNombre => {
                        const mod = this.menu.modificadores.find(m => m.nombre === modNombre);
                        if (mod) {
                            const op = mod.opciones.find(o => o.nombre === opNombre);
                            if (op) precioUnitario += op.precio || 0;
                        }
                    });
                    opcionesTexto += '<div class="cart-item-opciones">' + modNombre + ': ' + opciones.join(', ') + '</div>';
                });
            }
            
            const qty = item.qty || 1;
            const subtotal = precioUnitario * qty;

            html += '<div class="cart-item">';
            html += '<div class="cart-item-info">';
            html += '<div class="cart-item-nombre">' + prod.nombre + '</div>';
            if (opcionesTexto) html += opcionesTexto;
            html += '<div class="cart-item-precio">' + qty + ' × $' + precioUnitario.toFixed(2) + ' = $' + subtotal.toFixed(2) + '</div>';
            html += '</div>';
            html += '<div class="cart-item-controles">';
            html += '<button class="btn-cantidad" onclick="app.updateCartQty(\'' + item.id + '\', -1)">−</button>';
            html += '<span>' + qty + '</span>';
            html += '<button class="btn-cantidad" onclick="app.updateCartQty(\'' + item.id + '\', 1)">+</button>';
            html += '</div>';
            html += '<button class="btn-eliminar" onclick="app.removeFromCart(\'' + item.id + '\')"><i class="fa-solid fa-trash"></i></button>';
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
                    container.querySelectorAll('.categoria-tab').forEach(tab => {
                        tab.classList.remove('active');
                        if (tab.dataset.id === id) {
                            tab.classList.add('active');
                            tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }
                    });
                }
            });
        }, {
            rootMargin: '-100px 0px -70% 0px',
            threshold: 0.1
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
            btnLimpiar.style.display = 'none';
            this.renderProductos();
        });

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