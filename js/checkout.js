const checkout = {
    config: {},
    menu: { productos: [], modificadores: [] },
    cart: [],
    selectedPayment: '',
    selectedAddress: null,
    selectedCoords: null,

    async init() {
        try {
            // 1. Cargar carrito
            const savedCart = localStorage.getItem('doriteque_cart');
            this.cart = savedCart ? JSON.parse(savedCart) : [];

            // 2. Verificar que Firebase esté cargado
            if (!window.loadConfig || !window.loadMenu) {
                console.error('Firebase no está cargado');
                alert('Error: No se pudo conectar. Recarga la página.');
                return;
            }

            // 3. Cargar config y menú
            window.loadConfig((config) => {
                this.config = config;
                this.renderPaymentMethods();
            });

            window.loadMenu((menu) => {
                this.menu = menu;
                if (!this.menu.modificadores) this.menu.modificadores = [];
                this.renderItems();
            });

            // 4. Si el carrito está vacío, redirigir
            if (this.cart.length === 0) {
                alert('Tu carrito está vacío.');
                window.location.href = 'index.html';
                return;
            }

            // 5. Limpiar campos
            setTimeout(() => {
                const fields = ['client-name', 'client-phone', 'client-address', 'address-search', 'address-detail-input', 'client-note'];
                fields.forEach(id => {
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

            // 6. Configurar hora
            setTimeout(() => this.setupDateTime(), 200);

            // 7. Setup de búsqueda
            this.setupAddressSearch();
        } catch (error) {
            console.error('Error en init:', error);
            alert('Error al cargar: ' + error.message);
        }
    },

    setupDateTime() {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30);
        
        const dtText = document.getElementById('datetime-text');
        if (dtText) {
            dtText.textContent = now.toLocaleString('es-VE', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        }
        
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const dtInput = document.getElementById('client-datetime');
        if (dtInput) dtInput.value = now.toISOString().slice(0, 16);
    },

    setupAddressSearch() {
        const searchInput = document.getElementById('address-search');
        const suggestions = document.getElementById('address-suggestions');
        let debounceTimer;

        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(debounceTimer);
            
            if (query.length < 3) {
                suggestions.classList.remove('active');
                return;
            }

            debounceTimer = setTimeout(() => this.searchAddress(query), 300);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#address-search') && !e.target.closest('#address-suggestions')) {
                setTimeout(() => suggestions.classList.remove('active'), 200);
            }
        });
    },

    async searchAddress(query) {
        try {
            const container = document.getElementById('address-suggestions');
            container.innerHTML = '';
            
            const cleanQuery = query.trim().replace(/\s+/g, ' ');
            if (cleanQuery.length < 3) {
                container.classList.remove('active');
                return;
            }

            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&countrycodes=ve&viewbox=-73.3,12.5,-59.8,0.9&bounded=0&limit=10&addressdetails=1&accept-language=es`;
            const response = await fetch(url);
            const results = await response.json();
            
            if (results.length === 0) {
                const url2 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=10&addressdetails=1&accept-language=es`;
                const response2 = await fetch(url2);
                const results2 = await response2.json();
                
                if (results2.length === 0) {
                    container.classList.remove('active');
                    return;
                }
                this.renderSuggestions(results2, container);
                return;
            }

            this.renderSuggestions(results, container);
        } catch (error) {
            console.error('Error buscando dirección:', error);
        }
    },

    renderSuggestions(results, container) {
        const unique = [];
        const seen = new Set();
        
        results.forEach(result => {
            if (!seen.has(result.display_name)) {
                seen.add(result.display_name);
                unique.push(result);
            }
        });

        unique.slice(0, 8).forEach(result => {
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
        
        const addr = document.getElementById('client-address');
        if (addr) addr.value = result.display_name;
        
        const search = document.getElementById('address-search');
        if (search) search.value = result.display_name;
        
        const suggestions = document.getElementById('address-suggestions');
        if (suggestions) suggestions.classList.remove('active');
    },

    getCurrentLocation() {
        const btn = document.querySelector('.btn-geolocation');
        
        if (!navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización.');
            return;
        }

        btn.classList.add('loading');
        btn.innerHTML = '<i class="fa-solid fa-spinner"></i><span>Obteniendo ubicación...</span>';

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    await this.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                    btn.classList.remove('loading');
                    btn.innerHTML = '<i class="fa-solid fa-check"></i><span>¡Ubicación encontrada!</span>';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i><span>Usar mi ubicación actual</span>';
                    }, 2000);
                } catch (err) {
                    alert('No se pudo obtener la dirección.');
                    btn.classList.remove('loading');
                    btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i><span>Usar mi ubicación actual</span>';
                }
            },
            (err) => {
                btn.classList.remove('loading');
                btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i><span>Usar mi ubicación actual</span>';
                alert('Error de ubicación: ' + err.message);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    },

    async reverseGeocode(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&accept-language=es&addressdetails=1`);
            const data = await response.json();
            
            if (data && data.display_name) {
                this.selectAddress({ display_name: data.display_name, lat, lon });
                
                const shortAddr = data.display_name.split(',').slice(0, 3).join(',').trim();
                setTimeout(() => {
                    alert(`📍 Dirección:\n\n"${shortAddr}"\n\n⚠️ VERIFICA que sea correcta. Si no, edítala manualmente.`);
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
            
            let price = prod.precio || 0;
            let optsText = '';
            
            if (item.opciones) {
                Object.keys(item.opciones).forEach(mod => {
                    item.opciones[mod].forEach(opt => {
                        const m = this.menu.modificadores.find(x => x.nombre === mod);
                        if (m) {
                            const o = m.opciones.find(x => x.nombre === opt);
                            if (o) price += o.precio || 0;
                        }
                    });
                    optsText += `<div class="checkout-item-opciones">${mod}: ${item.opciones[mod].join(', ')}</div>`;
                });
            }
            
            const qty = item.qty || 1;
            const sub = price * qty;
            totalUSD += sub;
            totalItems += qty;

            html += `<div class="checkout-item">
                <div class="checkout-item-info">
                    <div class="checkout-item-name">${prod.nombre}</div>
                    ${optsText}
                    <div class="checkout-item-qty">${qty}x $${price.toFixed(2)}</div>
                </div>
                <div class="checkout-item-price">USD$ ${sub.toFixed(2)}</div>
            </div>`;
        });

        container.innerHTML = html;
        
        const ec = document.getElementById('edit-cart-count');
        if (ec) ec.textContent = totalItems;
        
        const st = document.getElementById('checkout-subtotal');
        if (st) st.textContent = 'USD$ ' + totalUSD.toFixed(2);
        
        const tt = document.getElementById('checkout-total-usd');
        if (tt) tt.textContent = 'USD$ ' + totalUSD.toFixed(2);
    },

    renderPaymentMethods() {
        const container = document.getElementById('payment-methods');
        if (!container) return;
        
        const methods = this.config.metodosPago || ['Efectivo'];
        container.innerHTML = methods.map((m, i) => `
            <div class="payment-option" onclick="checkout.selectPayment('${m}', this)">
                <input type="radio" name="payment" value="${m}" id="pay-${i}">
                <label for="pay-${i}">${m}</label>
            </div>
        `).join('');
    },

    selectPayment(method, el) {
        this.selectedPayment = method;
        document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
        el.classList.add('selected');
        el.querySelector('input').checked = true;
    },

    buildMessage() {
        const name = (document.getElementById('client-name').value || '').trim();
        const country = document.getElementById('client-country').value;
        const phone = (document.getElementById('client-phone').value || '').trim();
        const addr = (document.getElementById('client-address').value || document.getElementById('address-search').value || '').trim();
        const detail = (document.getElementById('address-detail-input').value || '').trim();
        const dt = document.getElementById('client-datetime').value;
        const note = (document.getElementById('client-note').value || '').trim();

        let total = 0;
        let detalle = '';
        
        this.cart.forEach(item => {
            if (!item || !item.id) return;
            const prod = this.menu.productos.find(p => p.id === item.id);
            if (!prod) return;
            
            let price = prod.precio || 0;
            let opts = '';
            
            if (item.opciones) {
                Object.keys(item.opciones).forEach(mod => {
                    item.opciones[mod].forEach(opt => {
                        const m = this.menu.modificadores.find(x => x.nombre === mod);
                        if (m) {
                            const o = m.opciones.find(x => x.nombre === opt);
                            if (o) price += o.precio || 0;
                        }
                    });
                    opts += ` (${mod}: ${item.opciones[mod].join(', ')})`;
                });
            }
            
            const qty = item.qty || 1;
            const sub = price * qty;
            total += sub;
            detalle += `• ${qty}x ${prod.nombre}${opts} | precio ${price.toFixed(0)} | total ${sub.toFixed(0)}\n`;
        });

        const totalBs = (total * (this.config.tasaBs || 1000)).toFixed(2);
        const fullPhone = country + phone;
        const negocio = ((this.config.nombre || 'DORITEQUE')).toUpperCase();

        let fechaHora = '';
        if (dt) {
            const d = new Date(dt);
            fechaHora = d.toLocaleString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        }

        const header = (this.config.msgHeader || '🍔 *NUEVO PEDIDO*');
        const greeting = (this.config.msgGreeting || '');
        
        let msg = header + ' - ' + negocio + '\n\n';
        if (greeting) msg += greeting + '\n\n';
        msg += `👤 *Nombre completo*\n${name}\n\n`;
        msg += `📱 *Nro. de WhatsApp*\n+${fullPhone}\n\n`;
        if (fechaHora) msg += `📅 *Fecha y hora*\n${fechaHora}\n\n`;
        if (note) msg += `⚠️ *Observación adicional*\n${note}\n\n`;
        
        if (addr) {
    msg += `📍 *Mapa de ubicación*\n${addr}`;
    if (detail) msg += `. ${detail}`;
    msg += '\n\n';
}
        
        msg += `\n📝 *Detalle*\n${detalle}`;
        msg += '---------------------------\n\n';
        msg += `💵 *Sub-total:* USD$ ${total.toFixed(2)}\n`;
        msg += `💵 *TOTAL DE LA ORDEN:* USD$ ${total.toFixed(2)} (Bs ${totalBs})\n\n`;
        msg += `💳 *TIPO DE PAGO:* ${this.selectedPayment}`;

        return msg;
    },

    sendOrder() {
        const name = (document.getElementById('client-name').value || '').trim();
        const phone = (document.getElementById('client-phone').value || '').trim();
        const addr = (document.getElementById('client-address').value || document.getElementById('address-search').value || '').trim();

        if (!name) { alert('Ingresa tu nombre.'); return; }
        if (!phone) { alert('Ingresa tu WhatsApp.'); return; }
        if (!addr) { alert('Ingresa tu dirección.'); return; }
        if (!this.selectedPayment) { alert('Selecciona método de pago.'); return; }

        const msg = this.buildMessage();
        const url = `https://wa.me/${this.config.whatsapp}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');

        localStorage.removeItem('doriteque_cart');
        this.cart = [];
        this.selectedAddress = null;
        this.selectedCoords = null;
        this.selectedPayment = '';
        
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    }
};

document.addEventListener('DOMContentLoaded', () => checkout.init());