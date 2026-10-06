const checkout = {
  config: {},
  menu: { productos: [], modificadores: [] },
  cart: [],
  selectedPayment: '',
  
  async init() {
    try {
      // Esperar a que Firebase esté listo
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
    } catch (error) {
      console.error(error);
      alert('Error al cargar los datos.');
    }
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
  
  // Plantilla por defecto si no hay una personalizada
  const plantillaDefault = '🍔 *NUEVO PEDIDO - {negocio}* 🍔\n\n👤 *Cliente:* {cliente}\n📱 *WhatsApp:* +{whatsapp}\n📍 *Dirección:* {direccion}\n💳 *Pago:* {pago}\n{nota}\n\n🛒 *DETALLE DEL PEDIDO:*\n{detalle}---------------------------\n💵 *TOTAL:* ${total_usd} (Bs {total_bs})\n\nQuedo atento a la confirmación. ¡Gracias!';
  
  const plantilla = this.config.mensajeWhatsApp || plantillaDefault;
  
  let mensaje = plantilla
    .replace(/{negocio}/g, negocio)
    .replace(/{cliente}/g, name)
    .replace(/{whatsapp}/g, fullPhone)
    .replace(/{direccion}/g, address)
    .replace(/{pago}/g, this.selectedPayment)
    .replace(/{nota}/g, note ? '📝 *Nota:* ' + note : '')
    .replace(/{detalle}/g, detalle)
    .replace(/{total_usd}/g, totalUSD.toFixed(2))
    .replace(/{total_bs}/g, totalBs);
  
  return mensaje;
},
  
  previewMessage() {
  const name = document.getElementById('client-name').value.trim();
  const phone = document.getElementById('client-phone').value.trim();
  const address = document.getElementById('client-address').value.trim();
  
  if (!name) { alert('Ingresa tu nombre completo.'); return; }
  if (!phone) { alert('Ingresa tu número de WhatsApp.'); return; }
  if (!address) { alert('Ingresa tu dirección de entrega.'); return; }
  if (!this.selectedPayment) { alert('Selecciona un método de pago.'); return; }
  
  const mensaje = this.buildMessage();
  
  // Enviar directo sin mostrar editor
  const url = 'https://wa.me/' + this.config.whatsapp + '?text=' + encodeURIComponent(mensaje);
  window.open(url, '_blank');
  
  localStorage.removeItem('doriteque_cart');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
},
  
  sendOrder() {
    const mensaje = document.getElementById('whatsapp-message').value;
    
    if (!mensaje || mensaje.trim() === '') {
      alert('El mensaje está vacío.');
      return;
    }
    
    const url = 'https://wa.me/' + this.config.whatsapp + '?text=' + encodeURIComponent(mensaje);
    window.open(url, '_blank');
    
    localStorage.removeItem('doriteque_cart');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  }
};

document.addEventListener('DOMContentLoaded', () => checkout.init());