const checkout = {
    config: {},
    menu: { productos: [], modificadores: [] },
    cart: [],
    selectedPayment: '',
    selectedAddress: null,
    selectedCoords: null,

    async init() {
        try {
            if (!window.loadConfig || !window.loadMenu) {
                setTimeout(() => this.init(), 500);
                return;
            }

            window.loadConfig((config) => {
                this.config = config;
                this.renderPaymentMethods();
            });

            window.loadMenu((menu) => {
                this.menu = menu;
                if (!this.menu.modificadores) this.menu.modificadores = [];
                this.renderItems();
            });

            this.cart = JSON.parse(localStorage.getItem('doriteque_cart')) || [];

            if (this.cart.length === 0) {
                alert('Tu carrito está vacío.');
                window.location.href = 'index.html';
                return;
            }

            this.setupDateTime();
            this.setupAddressSearch();
        } catch (error) {
            console.error(error);
            alert('Error al cargar los datos.');
        }
    },

    setupDateTime() {
        // Fecha y hora automática: 30 minutos desde ahora
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30);
        
        // Formatear para mostrar
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit' 
        };
        const formatted = now.toLocaleString('es-VE', options);
        
        document.getElementById('datetime-text').textContent = formatted;
        
        // Guardar en formato ISO para el mensaje
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('client-datetime').value = now.toISOString().slice(0, 16);
    },

    setupAddressSearch() {
        const searchInput = document.getElementById('address-search');
        const suggestionsContainer = document.getElementById('address-suggestions');
        let debounceTimer;

        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(debounceTimer);
            
            if (query.length < 3) {
                suggestionsContainer.classList.remove('active');
                return;
            }

            debounceTimer = setTimeout(() => {
                this.searchAddress(query);
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#address-search') && !e.target.closest('#address-suggestions')) {
                setTimeout(() => {
                    suggestionsContainer.classList.remove('active');
                }, 200);
            }
        });
    },

    async searchAddress(query) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ve&limit=5`);
            const results = await response.json();
            
            const suggestionsContainer = document.getElementById('address-suggestions');
            suggestionsContainer.innerHTML = '';

            if (results.length === 0) {
                suggestionsContainer.classList.remove('active');
                return;
            }

            results.forEach(result => {
                const div = document.createElement('div');
                div.className = 'address-suggestion';
                
                const parts = result.display_name.split(',');
                const main = parts[0].trim();
                const sub = parts.slice(1).join(', ').trim();
                
                div.innerHTML = `
                    <i class="fa-solid fa-location-dot"></i>
                    <div class="address-suggestion-text">
                        <div class="address-suggestion-main">${main}</div>
                        <div class="address-suggestion-sub">${sub}</div>
                    </div>
                `;
                
                div.onclick = () => this.selectAddress(result);
                suggestionsContainer.appendChild(div);
            });

            suggestionsContainer.classList.add('active');
        } catch (error) {
            console.error('Error buscando dirección:', error);
        }
    },

    selectAddress(result) {
        this.selectedAddress = result.display_name;
        this.selectedCoords = {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon)
        };
        
        document.getElementById('address-search').value = '';
        document.getElementById('address-suggestions').classList.remove('active');
        this.updateAddressDisplay();
    },

    updateAddressDisplay() {
        const display = document.getElementById('address-display');
        if (this.selectedAddress) {
            display.classList.add('has-value');
            display.innerHTML = `
                <i class="fa-solid fa-location-dot"></i>
                <span>${this.selectedAddress.split(',')[0]}</span>
            `;
        } else {
            display.classList.remove('has-value');
            display.innerHTML = `
                <i class="fa-solid fa-location-dot"></i>
                <span>Seleccionar ubicación</span>
            `;
        }
    },

    openAddressModal() {
        const modal = document.getElementById('address-modal');
        modal.style.display = 'flex';
        setTimeout(() => {
            document.getElementById('address-search').focus();
        }, 100);
    },

    closeAddressModal() {
        const modal = document.getElementById('address-modal');
        modal.style.display = 'none';
        document.getElementById('address-suggestions').classList.remove('active');
    },

    acceptAddress() {
        const detailInput = document.getElementById('address-detail-input');
        const detail = detailInput.value.trim();
        
        if (!this.selectedAddress) {
            alert('Por favor selecciona una dirección de la lista');
            return;
        }
        
        document.getElementById('client-address').value = this.selectedAddress;
        document.getElementById('client-address-detail').value = detail;
        
        this.closeAddressModal();
        detailInput.value = '';
    },

    renderItems() {
        const container = document.getElementById('checkout-items');
        if (!container) return;
        
        let html = '';
        let totalUSD = 0;
        let totalItems = 0;

        this.cart.forEach(item => {
            const prod = this.menu.productos.find(p => p.id === item.id);
            if (!prod) return;
            
            let precioUnitario = prod.precio;
            let opcionesTexto = '';
            
            if (item.opciones) {
                Object.keys(item.opciones).forEach(modNombre => {
                    const opciones = item.opciones[modNombre];
                    opciones.forEach(opNombre => {
                        const mod = this.menu.modificadores.find(m => m.nombre === modNombre);
                        if (mod) {
                            const op = mod.opciones.find(o => o.nombre === opNombre);
                            if (op) precioUnitario += op.precio;
                        }
                    });
                    opcionesTexto += '<div class="checkout-item-opciones">' + modNombre + ': ' + opciones.join(', ') + '</div>';
                });
            }
            
            const subtotal = precioUnitario * item.qty;
            totalUSD += subtotal;
            totalItems += item.qty;

            html += '<div class="checkout-item">';
            html += '<div class="checkout-item-info">';
            html += '<div class="checkout-item-name">' + prod.nombre + '</div>';
            if (opcionesTexto) html += opcionesTexto;
            html += '<div class="checkout-item-qty">' + item.qty + 'x $' + precioUnitario.toFixed(2) + '</div>';
            html += '</div>';
            html += '<div class="checkout-item-price">USD$ ' + subtotal.toFixed(2) + '</div>';
            html += '</div>';
        });

        container.innerHTML = html;
        
        const editCount = document.getElementById('edit-cart-count');
        if (editCount) editCount.textContent = totalItems;
        
        const subtotalEl = document.getElementById('checkout-subtotal');
        if (subtotalEl) subtotalEl.textContent = 'USD$ ' + totalUSD.toFixed(2);
        
        const totalEl = document.getElementById('checkout-total-usd');
        if (totalEl) totalEl.textContent = 'USD$ ' + totalUSD.toFixed(2);
    },

    renderPaymentMethods() {
        const container = document.getElementById('payment-methods');
        if (!container) return;
        
        let html = '';
        const metodos = this.config.metodosPago || ['Efectivo'];

        metodos.forEach((method, index) => {
            html += '<div class="payment-option" onclick="checkout.selectPayment(\'' + method + '\', this)">';
            html += '<input type="radio" name="payment" value="' + method + '" id="payment-' + index + '">';
            html += '<label for="payment-' + index + '">' + method + '</label>';
            html += '</div>';
        });

        container.innerHTML = html;
    },

    selectPayment(method, element) {
        this.selectedPayment = method;
        document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
        element.classList.add('selected');
        element.querySelector('input').checked = true;
    },

    buildMessage() {
        const name = document.getElementById('client-name').value.trim();
        const country = document.getElementById('client-country').value;
        const phone = document.getElementById('client-phone').value.trim();
        const address = document.getElementById('client-address').value.trim();
        const addressDetail = document.getElementById('client-address-detail').value.trim();
        const datetime = document.getElementById('client-datetime').value;
        const note = document.getElementById('client-note').value.trim();

        let totalUSD = 0;
        let detalle = '';
        
        this.cart.forEach(item => {
            const prod = this.menu.productos.find(p => p.id === item.id);
            if (!prod) return;
            
            let precioUnitario = prod.precio;
            let opcionesTexto = '';
            
            if (item.opciones) {
                Object.keys(item.opciones).forEach(modNombre => {
                    const opciones = item.opciones[modNombre];
                    opciones.forEach(opNombre => {
                        const mod = this.menu.modificadores.find(m => m.nombre === modNombre);
                        if (mod) {
                            const op = mod.opciones.find(o => o.nombre === opNombre);
                            if (op) precioUnitario += op.precio;
                        }
                    });
                    opcionesTexto += ' (' + modNombre + ': ' + opciones.join(', ') + ')';
                });
            }
            
            const sub = precioUnitario * item.qty;
            totalUSD += sub;
            detalle += '• ' + item.qty + 'x ' + prod.nombre + opcionesTexto + ' | precio ' + precioUnitario.toFixed(0) + ' | total ' + sub.toFixed(0) + '\n';
        });

        const totalBs = (totalUSD * this.config.tasaBs).toFixed(2);
        const fullPhone = country + phone;
        const negocio = (this.config.nombre || 'DORITEQUE').toUpperCase();

        let fechaHora = '';
        if (datetime) {
            const dt = new Date(datetime);
            fechaHora = dt.toLocaleString('es-VE', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        let mapaLink = '';
        if (this.selectedCoords) {
            mapaLink = 'https://whata.app/m/?lat=' + this.selectedCoords.lat + '&lon=' + this.selectedCoords.lon + '&address=' + encodeURIComponent(address);
        }

        const header = this.config.msgHeader || '🍔 *NUEVO PEDIDO*';
        const greeting = this.config.msgGreeting || '';
        
        let mensaje = header + ' - ' + negocio + '\n\n';
        if (greeting) mensaje += greeting + '\n\n';
        mensaje += '👤 *Nombre completo*\n' + name + '\n\n';
        mensaje += '📱 *Nro. de WhatsApp*\n+' + fullPhone + '\n\n';
        if (fechaHora) mensaje += '📅 *Fecha y hora*\n' + fechaHora + '\n\n';
        if (note) mensaje += '⚠️ *Alguna observación adicional (Ejemplo Alergias)*\n' + note + '\n\n';
        
        if (address) {
            mensaje += '📍 *Mapa de ubicación*\n' + address;
            if (addressDetail) mensaje += '. ' + addressDetail;
            mensaje += '\n';
            if (mapaLink) mensaje += mapaLink + '\n';
        }
        
        mensaje += '\n *Detalle*\n' + detalle;
        mensaje += '---------------------------\n\n';
        mensaje += '💵 *Sub-total:* USD$ ' + totalUSD.toFixed(2) + '\n';
        mensaje += '💵 *TOTAL DE LA ORDEN:* USD$ ' + totalUSD.toFixed(2) + ' (Bs ' + totalBs + ')\n\n';
        mensaje += '💳 *TIPO DE PAGO:* ' + this.selectedPayment;

        return mensaje;
    },

    sendOrder() {
        const name = document.getElementById('client-name').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        const address = document.getElementById('client-address').value.trim();

        if (!name) { alert('Ingresa tu nombre completo.'); return; }
        if (!phone) { alert('Ingresa tu número de WhatsApp.'); return; }
        if (!address) { alert('Selecciona tu dirección de entrega.'); return; }
        if (!this.selectedPayment) { alert('Selecciona un método de pago.'); return; }

        const mensaje = this.buildMessage();
        
        const url = 'https://wa.me/' + this.config.whatsapp + '?text=' + encodeURIComponent(mensaje);
        window.open(url, '_blank');

        localStorage.removeItem('doriteque_cart');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
};

document.addEventListener('DOMContentLoaded', () => checkout.init());