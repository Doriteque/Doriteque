// js/cart.js
import { onProductosChange, onConfigChange, Cart } from './db.js';

let productos = [];
let config = {};

async function init() {
    // Cargamos datos en tiempo real para tener precios actualizados
    onProductosChange(data => {
        productos = data;
        renderCarrito();
    });

    onConfigChange(data => {
        config = data;
        renderCarrito();
    });
}

function renderCarrito() {
    const cartItems = Cart.get();
    const containerVacio = document.getElementById('carrito-vacio');
    const containerLleno = document.getElementById('carrito-lleno');
    const listaContainer = document.getElementById('lista-carrito');

    if (cartItems.length === 0) {
        containerVacio.classList.remove('hidden');
        containerLleno.classList.add('hidden');
        return;
    }

    containerVacio.classList.add('hidden');
    containerLleno.classList.remove('hidden');

    let html = '';
    let totalUSD = 0;

    cartItems.forEach(item => {
        const producto = productos.find(p => p.id === item.id);
        if (!producto) return; // Si el producto fue borrado por el admin, lo ignoramos

        const subtotal = producto.precio * item.cantidad;
        totalUSD += subtotal;

        html += `
        <div class="resumen-item" style="align-items: center; gap: 12px;">
            <div style="flex: 1;">
                <div style="font-weight: 700;">${producto.nombre}</div>
                <div style="font-size: 0.85rem; color: #666;">$${producto.precio.toFixed(2)} c/u</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button class="btn-cantidad" onclick="window.cambiarCantidad('${item.id}', ${item.cantidad - 1})">-</button>
                <span style="font-weight: 700; min-width: 20px; text-align: center;">${item.cantidad}</span>
                <button class="btn-cantidad" onclick="window.cambiarCantidad('${item.id}', ${item.cantidad + 1})">+</button>
            </div>
            <div style="font-weight: 700; min-width: 60px; text-align: right;">
                $${subtotal.toFixed(2)}
            </div>
            <button class="btn-eliminar" onclick="window.eliminarProducto('${item.id}')" style="background: none; border: none; color: var(--rojo); cursor: pointer; font-size: 1.1rem;">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        `;
    });

    listaContainer.innerHTML = html;

    const totalBs = totalUSD * config.tasaBs;
    document.getElementById('subtotal-usd').textContent = `$${totalUSD.toFixed(2)}`;
    document.getElementById('total-usd').textContent = `$${totalUSD.toFixed(2)}`;
    document.getElementById('total-bs').textContent = `Bs ${totalBs.toFixed(2)}`;
}

// Funciones globales para los botones del HTML
window.cambiarCantidad = (productoId, nuevaCantidad) => {
    Cart.updateCantidad(productoId, nuevaCantidad);
};

window.eliminarProducto = (productoId) => {
    Cart.remove(productoId);
};

init();