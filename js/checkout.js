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

            this.setupAddressAutocomplete();
            this.setupDateTime();
        } catch (error) {
            console.error(error);
            alert('Error al cargar los datos.');
        }
    },

    setupDateTime() {
        const datetimeInput = document.getElementById('client-datetime');
        if (datetimeInput) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            datetimeInput.value = now.toISOString().slice(0, 16);
            datetimeInput.min = now.toISOString().slice(0, 16);
        }
    },

    setupAddressAutocomplete() {
        const addressInput = document.getElementById('client-address');
        const suggestionsContainer = document.getElementById('address-suggestions');
        let debounceTimer;

        if (!addressInput) return;

        addressInput.addEventListener('input', (e) => {
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
            if (!e.target.closest('#client-address') && !e.target.closest('#address-suggestions')) {
                suggestionsContainer.classList.remove('active');
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
                div.textContent = result.display_name;
                div.onclick = () => this.selectAddress(result);
                suggestionsContainer.appendChild(div);
            });

            suggestionsContainer.classList.add('active');
        } catch (error) {
            console.error('Error buscando dirección:', error);
        }
    },

    selectAddress(result) {
        document.getElementById('client-address').value = result.display_name;
        document.getElementById('address-suggestions').classList.remove('active');
        
        this.selectedAddress = result.display_name;
        this.selectedCoords = {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon)
        };
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
        const reference = document.getElementById('client-reference').value.trim();
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
            detalle += '• ' + item.qty + 'x ' + prod.nombre + opcionesTexto + ' - $' + sub.toFixed(2) + '\n';
        });

        const totalBs = (totalUSD * this.config.tasaBs).toFixed(2);
        const fullPhone = country + phone;
        const negocio = (this.config.nombre || 'DORITEQUE').toUpperCase();

        // Formatear fecha y hora
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

        // Generar enlace de whata.app si hay coordenadas
        let mapaLink = '';
        if (this.selectedCoords) {
            mapaLink = 'https://whata.app/m/?lat=' + this.selectedCoords.lat + '&lon=' + this.selectedCoords.lon + '&address=' + encodeURIComponent(address);
        }

        const header = this.config.msgHeader || '🍔 *NUEVO PEDIDO*';
        const greeting = this.config.msgGreeting || '';
        const beforeDetail = this.config.msgBeforeDetail || 'Aquí tienes el detalle de tu pedido:';
        const afterTotal = this.config.msgAfterTotal || 'Te contactaremos pronto para confirmar. ¡Gracias por elegirnos!';

        let mensaje = header + ' - ' + negocio + '\n\n';
        if (greeting) mensaje += greeting + '\n\n';
        mensaje += '👤 *Nombre completo:* ' + name + '\n';
        mensaje += '📱 *Nro. de WhatsApp:* +' + fullPhone + '\n';
        if (fechaHora) mensaje += ' *Fecha y hora:* ' + fechaHora + '\n';
        if (note) mensaje += '⚠️ *Observación adicional:* ' + note + '\n';
        if (address) {
            mensaje += '📍 *Mapa de ubicación:* ' + address + '\n';
            if (mapaLink) mensaje += mapaLink + '\n';
        }
        if (reference) mensaje += ' *Referencia:* ' + reference + '\n';
        mensaje += '\n' + beforeDetail + '\n' + detalle;
        mensaje += '---------------------------\n';
        mensaje += '💵 *Sub-total:* USD$ ' + totalUSD.toFixed(2) + '\n';
        mensaje += '💵 *TOTAL DE LA ORDEN:* USD$ ' + totalUSD.toFixed(2) + ' (Bs ' + totalBs + ')\n\n';
        mensaje += '💳 *TIPO DE PAGO:* ' + this.selectedPayment + '\n\n';
        mensaje += afterTotal;

        return mensaje;
    },

    previewMessage() {
        const name = document.getElementById('client-name').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        const address = document.getElementById('client-address').value.trim();
        const reference = document.getElementById('client-reference').value.trim();
        const datetime = document.getElementById('client-datetime').value;

        if (!name) { alert('Ingresa tu nombre completo.'); return; }
        if (!phone) { alert('Ingresa tu número de WhatsApp.'); return; }
        if (!address) { alert('Selecciona tu dirección de entrega.'); return; }
        if (!reference) { alert('Agrega una referencia para ubicarte mejor.'); return; }
        if (!datetime) { alert('Selecciona la fecha y hora de entrega.'); return; }
        if (!this.selectedPayment) { alert('Selecciona un método de pago.'); return; }

        const mensaje = this.buildMessage();
        
        const url = 'https://wa.me/' + this.config.whatsapp + '?text=' + encodeURIComponent(mensaje);
        window.open(url, '_blank');

        localStorage.removeItem('doriteque_cart');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    },

    sendOrder() {
        this.previewMessage();
    }
};

document.addEventListener('DOMContentLoaded', () => checkout.init());