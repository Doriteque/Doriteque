// js/checkout.js
import { onProductosChange, onConfigChange, Cart } from './db.js';

let productos = [];
let config = {};

async function init() {
    onProductosChange(data => {
        productos = data;
        renderResumen();
    });

    onConfigChange(data => {
        config = data;
        renderResumen();
        // Llenar el select de métodos de pago dinámicamente si se desea, 
        // pero por ahora usamos los hardcodeados en el HTML que coinciden.
    });

    // Si el carrito está vacío, no debería estar aquí
    if (Cart.get().length === 0) {
        window.location.href = 'index.html';
    }
}

function renderResumen() {
    const cartItems = Cart.get();
    const container = document.getElementById('resumen-final');
    
    if (cartItems.length === 0 || productos.length === 0) return;

    let html = '<h3 style="margin-bottom: 12px;">Tu pedido</h3>';
    let totalUSD = 0;

    cartItems.forEach(item => {
        const producto = productos.find(p => p.id === item.id);
        if (!producto) return;

        const subtotal = producto.precio * item.cantidad;
        totalUSD += subtotal;

        html += `
        <div class="resumen-item">
            <span>${item.cantidad}x ${producto.nombre}</span>
            <span>$${subtotal.toFixed(2)}</span>
        </div>
        `;
    });

    const totalBs = totalUSD * config.tasaBs;
    html += `
    <div class="resumen-total">
        <span>TOTAL:</span>
        <div style="text-align: right;">
            <div style="color: var(--rojo);">$${totalUSD.toFixed(2)}</div>
            <div style="font-size: 0.85rem; color: #666;">Bs ${totalBs.toFixed(2)}</div>
        </div>
    </div>
    `;

    container.innerHTML = html;
}

// Manejar el envío del formulario
document.getElementById('formulario-pedido').addEventListener('submit', (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const metodoPago = document.getElementById('metodo-pago').value;
    const nota = document.getElementById('nota').value.trim();

    const cartItems = Cart.get();
    let totalUSD = 0;
    let detallePedido = '';

    cartItems.forEach(item => {
        const producto = productos.find(p => p.id === item.id);
        if (!producto) return;
        const subtotal = producto.precio * item.cantidad;
        totalUSD += subtotal;
        detallePedido += `• ${item.cantidad}x ${producto.nombre} - $${subtotal.toFixed(2)}\n`;
    });

    const totalBs = (totalUSD * config.tasaBs).toFixed(2);

    // Construir el mensaje de WhatsApp
    let mensaje = `🍔 *NUEVO PEDIDO - DORITEQUE* 🍔\n\n`;
    mensaje += `👤 *Cliente:* ${nombre}\n`;
    mensaje += `📱 *Teléfono:* ${telefono}\n`;
    mensaje += `📍 *Dirección:* ${direccion}\n`;
    mensaje += `💳 *Pago:* ${metodoPago}\n`;
    
    if (nota) {
        mensaje += `📝 *Nota:* ${nota}\n`;
    }
    
    mensaje += `\n🛒 *DETALLE DEL PEDIDO:*\n${detallePedido}`;
    mensaje += `---------------------------\n`;
    mensaje += `💵 *TOTAL:* $${totalUSD.toFixed(2)} (Bs ${totalBs})\n\n`;
    mensaje += `Quedo atento a la confirmación y datos para el pago. ¡Gracias!`;

    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${config.whatsapp}?text=${mensajeCodificado}`;

    // Abrir WhatsApp
    window.open(urlWhatsApp, '_blank');

    // Limpiar carrito y redirigir
    Cart.clear();
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
});

init();