const checkout = {
    config: {},
    menu: { productos: [], modificadores: [] },
    cart: [],
    selectedPayment: '',
    selectedAddress: null,
    selectedCoords: null,

    async init() {
        try {
            // 1. Cargar carrito PRIMERO
            const savedCart = localStorage.getItem('doriteque_cart');
            this.cart = savedCart ? JSON.parse(savedCart) : [];

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

            // 2. Si el carrito está vacío, redirigir
            if (this.cart.length === 0) {
                alert('Tu carrito está vacío.');
                window.location.href = 'index.html';
                return;
            }

            // 3. Limpiar campos (PERO NO la hora)
            setTimeout(() => {
                const fieldsToClear = [
                    'client-name', 'client-phone', 'client-address',
                    'address-search', 'address-detail-input', 'client-note'
                ];

                fieldsToClear.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });

                document.querySelectorAll('.payment-option').forEach(opt => {
                    opt.classList.remove('selected');
                    const radio = opt.querySelector('input');
                    if (radio) radio.checked = false;
                });

                this.selectedAddress = null;
                this.selectedCoords = null;
                this.selectedPayment = '';
            }, 100);

            // 4. Configurar hora DESPUÉS de limpiar (así no se sobrescribe)
            setTimeout(() => this.setupDateTime(), 200);

            // 5. Setup de búsqueda de dirección
            this.setupAddressSearch();
        } catch (error) {
            console.error(error);
            alert('Error al cargar los datos.');
        }
    },

    setupDateTime() {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30);

        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        };
        const dtText = document.getElementById('datetime-text');
        if (dtText) dtText.textContent = now.toLocaleString('es-VE', options);

        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const dtInput = document.getElementById('client-datetime');
        if (dtInput) dtInput.value = now.toISOString().slice(0, 16);
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
                setTimeout(() => suggestionsContainer.classList.remove('active'), 200);
            }
        });
    },

    async searchAddress(query) {
        try {
            const suggestionsContainer = document.getElementById('address-suggestions');
            suggestionsContainer.innerHTML = '';

            const cleanQuery = query.trim().replace(/\s+/g, ' ');
            if (cleanQuery.length < 3) {
                suggestionsContainer.classList.remove('active');
                return;
            }

            // Búsqueda priorizada en Venezuela
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&countrycodes=ve&viewbox=-73.3,12.5,-59.8,0.9&bounded=0&limit=10&addressdetails=1&accept-language=es`;

            const response = await fetch(url);
            const results = await response.json();

            if (results.length === 0) {
                // Fallback: búsqueda global
                const urlFallback = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=10&addressdetails=1&accept-language=es`;
                const responseFallback = await fetch(urlFallback);
                const resultsFallback = await responseFallback.json();

                if (resultsFallback.length === 0) {
                    suggestionsContainer.classList.remove('active');
                    return;
                }

                this.renderSuggestions(resultsFallback, suggestionsContainer);
                return;
            }

            this.renderSuggestions(results, suggestionsContainer);
        } catch (error) {
            console.error('Error buscando dirección:', error);
        }
    },

    renderSuggestions(results, container) {
        const uniqueResults = [];
        const seen = new Set();

        for (const result of results) {
            if (!seen.has(result.display_name)) {
                seen.add(result.display_name);
                uniqueResults.push(result);
            }
        }

        uniqueResults.slice(0, 8).forEach(result => {
            const div = document.createElement('div');
            div.className = 'address-suggestion';

            const parts = result.display_name.split(',');
            const main = parts[0].trim();
            const sub = parts.slice(1, 4).join(', ').trim();

            div.innerHTML = `
                <i class="fa-solid fa-location-dot"></i>
                <div class="address-suggestion-text">
                    <div class="address-suggestion-main">${main}</div>
                    <div class="address-suggestion-sub">${sub}</div>
                </div>
            `;

            div.onclick = () => this.selectAddress(result);
            container.appendChild(div);
        });

        container.classList.add('active');
    },

    selectAddress(result) {
        this.selectedAddress = result.display_name;
        this.selectedCoords = {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon)
        };

        const clientAddress = document.getElementById('client-address');
        if (clientAddress) clientAddress.value = result.display_name;

        const addressSearch = document.getElementById('address-search');
        if (addressSearch) addressSearch.value = result.display_name;

        const suggestionsContainer = document.getElementById('address-suggestions');
        if (suggestionsContainer) suggestionsContainer.classList.remove('active');
    },

    getCurrentLocation() {
        const btn = document.querySelector('.btn-geolocation');

        if (!navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización. Por favor escribe tu dirección manualmente.');
            return;
        }

        btn.classList.add('loading');
        btn.innerHTML = '<i class="fa-solid fa-spinner"></i><span>Obteniendo ubicación...</span>';

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    await this.reverseGeocode(lat, lon);

                    btn.classList.remove('loading');
                    btn.innerHTML = '<i class="fa-solid fa-check"></i><span>¡Ubicación encontrada!</span>';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i><span>Usar mi ubicación actual</span>';
                    }, 2000);
                } catch (error) {
                    console.error('Error en reverse geocoding:', error);
                    alert('No se pudo obtener la dirección. Por favor escríbela manualmente.');
                    btn.classList.remove('loading');
                    btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i><span>Usar mi ubicación actual</span>';
                }
            },
            (error) => {
                console.error('Error de geolocalización:', error);
                btn.classList.remove('loading');
                btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i><span>Usar mi ubicación actual</span>';

                let errorMsg = 'No se pudo obtener tu ubicación. ';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg += 'Por favor permite el acceso a la ubicación en tu navegador.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg += 'La información de ubicación no está disponible.';
                        break;
                    case error.TIMEOUT:
                        errorMsg += 'La solicitud de ubicación tardó demasiado.';
                        break;
                    default:
                        errorMsg += 'Error desconocido.';
                }
                alert(errorMsg);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    },

    async reverseGeocode(lat, lon) {
        try {
            // Zoom 18 = máxima precisión
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&accept-language=es&addressdetails=1`);
            const data = await response.json();

            if (data && data.display_name) {
                const result = {
                    display_name: data.display_name,
                    lat: lat,
                    lon: lon
                };

                this.selectAddress(result);

                // Mostrar mensaje claro al cliente
                const shortAddress = data.display_name.split(',').slice(0, 3).join(',').trim();
                setTimeout(() => {
                    alert(`📍 Dirección obtenida:\n\n"${shortAddress}"\n\n⚠️ IMPORTANTE:\n• Esta es una dirección APROXIMADA basada en tu GPS\n• VERIFICA que sea correcta\n• Si no lo es, edítala manualmente en el campo de arriba\n• El enlace del mapa SÍ usará tu ubicación GPS exacta`);
                }, 500);
            } else {
                throw new Error('No se pudo obtener la dirección');
            }
        } catch (error) {
            console.error('Error en reverse geocoding:', error);
            throw error;
        }
    },

    renderItems() {
        const container = document.getElementById('checkout-items');
        if (!container) return;

        let html = '';
        let totalUSD = 0;
        let totalItems = 0;

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
                    opcionesTexto += '<div class="checkout-item-opciones">' + modNombre + ': ' + opciones.join(', ') + '</div>';
                });
            }

            const qty = item.qty || 1;
            const subtotal = precioUnitario * qty;
            totalUSD += subtotal;
            totalItems += qty;

            html += '<div class="checkout-item">';
            html += '<div class="checkout-item-info">';
            html += '<div class="checkout-item-name">' + prod.nombre + '</div>';
            if (opcionesTexto) html += opcionesTexto;
            html += '<div class="checkout-item-qty">' + qty + 'x $' + precioUnitario.toFixed(2) + '</div>';
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
        const address = document.getElementById('client-address').value.trim() || document.getElementById('address-search').value.trim();
        const addressDetail = document.getElementById('address-detail-input').value.trim();
        const datetime = document.getElementById('client-datetime').value;
        const note = document.getElementById('client-note').value.trim();

        let totalUSD = 0;
        let detalle = '';

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
                    opcionesTexto += ' (' + modNombre + ': ' + opciones.join(', ') + ')';
                });
            }

            const qty = item.qty || 1;
            const sub = precioUnitario * qty;
            totalUSD += sub;
            detalle += '• ' + qty + 'x ' + prod.nombre + opcionesTexto + ' | precio ' + precioUnitario.toFixed(0) + ' | total ' + sub.toFixed(0) + '\n';
        });

        const totalBs = (totalUSD * this.config.tasaBs).toFixed(2);
        const fullPhone = country + phone;
        const negocio = (this.config.nombre || 'DORITEQUE').toUpperCase();

        let fechaHora = '';
        if (datetime) {
            const dt = new Date(datetime);
            fechaHora = dt.toLocaleString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
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
        if (note) mensaje += '️ *Observación adicional*\n' + note + '\n\n';

        if (address) {
            mensaje += ' *Mapa de ubicación*\n' + address;
            if (addressDetail) mensaje += '. ' + addressDetail;
            mensaje += '\n';
            if (mapaLink) mensaje += mapaLink + '\n';
        }

        mensaje += '\n📝 *Detalle*\n' + detalle;
        mensaje += '---------------------------\n\n';
        mensaje += '💵 *Sub-total:* USD$ ' + totalUSD.toFixed(2) + '\n';
        mensaje += '💵 *TOTAL DE LA ORDEN:* USD$ ' + totalUSD.toFixed(2) + ' (Bs ' + totalBs + ')\n\n';
        mensaje += '💳 *TIPO DE PAGO:* ' + this.selectedPayment;

        return mensaje;
    },

    sendOrder() {
        const name = document.getElementById('client-name').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        const address = document.getElementById('client-address').value.trim() || document.getElementById('address-search').value.trim();

        if (!name) { alert('Ingresa tu nombre completo.'); return; }
        if (!phone) { alert('Ingresa tu número de WhatsApp.'); return; }
        if (!address) { alert('Escribe o selecciona tu dirección de entrega.'); return; }
        if (!this.selectedPayment) { alert('Selecciona un método de pago.'); return; }

        const mensaje = this.buildMessage();
        const url = 'https://wa.me/' + this.config.whatsapp + '?text=' + encodeURIComponent(mensaje);
        window.open(url, '_blank');

        // LIMPIAR TODO DESPUÉS DE ENVIAR
        localStorage.removeItem('doriteque_cart');
        this.cart = [];
        this.selectedAddress = null;
        this.selectedCoords = null;
        this.selectedPayment = '';

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
};

document.addEventListener('DOMContentLoaded', () => checkout.init());