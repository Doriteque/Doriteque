const checkout = {
  config: {},
  menu: { productos: [], modificadores: [] },
  cart: [],
  selectedPayment: '',
  
  async init() {
    try {
      const [configRes, menuRes] = await Promise.all([
        fetch('config.json?t=' + Date.now()),
        fetch('menu.json?t=' + Date.now())
      ]);
      this.config = await configRes.json();
      this.menu = await menuRes.json();
      
      if (!this.menu.modificadores) this.menu.modificadores = [];
      
      this.cart = JSON.parse(localStorage.getItem('doriteque_cart')) || [];
      
      if (this.cart.length === 0) {
        alert('Tu carrito está vacío.');
        window.location.href = 'index.html';
        return;
      }
      
      this.renderItems();
      this.renderPaymentMethods();
    } catch (error) {
      console.error(error);
      alert('Error al cargar los datos.');
    }
  },
  
  renderItems() {
    const container = document.getElementById('checkout-items');
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
    document.getElementById('edit-cart-count').textContent = totalItems;
    document.getElementById('checkout-subtotal').textContent = 'USD$ ' + totalUSD.toFixed(2);
    document.getElementById('checkout-total-usd').textContent = 'USD$ ' + totalUSD.toFixed(2);
  },
  
  renderPaymentMethods() {
    const container = document.getElementById('payment-methods');
    let html = '';
    
    this.config.metodosPago.forEach((method, index) => {
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
  
  sendOrder() {
    const name = document.getElementById('client-name').value.trim();
    const country = document.getElementById('client-country').value;
    const phone = document.getElementById('client-phone').value.trim();
    const address = document.getElementById('client-address').value.trim();
    const note = document.getElementById('client-note').value.trim();
    
    if (!name) { alert('Ingresa tu nombre completo.'); return; }
    if (!phone) { alert('Ingresa tu número de WhatsApp.'); return; }
    if (!address) { alert('Ingresa tu dirección de entrega.'); return; }
    if (!this.selectedPayment) { alert('Selecciona un método de pago.'); return; }
    
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
    
    let mensaje = '🍔 *NUEVO PEDIDO - ' + this.config.nombre.toUpperCase() + '* 🍔\n\n';
    mensaje += '👤 *Cliente:* ' + name + '\n';
    mensaje += '📱 *WhatsApp:* +' + fullPhone + '\n';
    mensaje += '📍 *Dirección:* ' + address + '\n';
    mensaje += '💳 *Pago:* ' + this.selectedPayment + '\n';
    if (note) mensaje += '📝 *Nota:* ' + note + '\n';
    mensaje += '\n🛒 *DETALLE DEL PEDIDO:*\n' + detalle;
    mensaje += '---------------------------\n';
    mensaje += '💵 *TOTAL:* $' + totalUSD.toFixed(2) + ' (Bs ' + totalBs + ')\n\n';
    mensaje += 'Quedo atento a la confirmación. ¡Gracias!';
    
    const url = 'https://wa.me/' + this.config.whatsapp + '?text=' + encodeURIComponent(mensaje);
    window.open(url, '_blank');
    
    localStorage.removeItem('doriteque_cart');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  }
};

document.addEventListener('DOMContentLoaded', () => checkout.init());