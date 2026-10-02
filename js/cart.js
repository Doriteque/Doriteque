let productos = [];
let config = {};
let productosCargados = false;
let configCargado = false;

async function init() {
    const cartItems = Cart.get();
    
    if (cartItems.length === 0) {
        document.getElementById('carrito-vacio').classList.remove('hidden');
        document.getElementById('carrito-lleno').classList.add('hidden');
        return;
    }
    
    onProductosChange(data => {
        productos = data;
        productosCargados = true;
        if (configCargado) renderCarrito();
    });
    
    onConfigChange(data => {
        config = data;
        configCargado = true;
        if (productosCargados) renderCarrito();
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
        if (!producto) return;
        
        const subtotal = producto.precio * item.cantidad;
        totalUSD += subtotal;
        
        html += '<div class="resumen-item" style="gap: 12px;">';
        html += '<div style="flex: 1;">';
        html += '<div style="font-weight: 700; color: var(--blanco);">' + producto.nombre + '</div>';
        html += '<div style="font-size: 0.85rem; color: var(--gris-texto);">$' + producto.precio.toFixed(2) + ' c/u</div>';
        html += '</div>';
        html += '<div style="display: flex; align-items: center; gap: 8px;">';
        html += '<button class="btn-cantidad" onclick="cambiarCantidad(\'' + item.id + '\', ' + (item.cantidad - 1) + ')">-</button>';
        html += '<span style="font-weight: 700; min-width: 20px; text-align: center; color: var(--blanco);">' + item.cantidad + '</span>';
        html += '<button class="btn-cantidad" onclick="cambiarCantidad(\'' + item.id + '\', ' + (item.cantidad + 1) + ')">+</button>';
        html += '</div>';
        html += '<div style="font-weight: 700; min-width: 60px; text-align: right; color: var(--rojo-brillante);">$' + subtotal.toFixed(2) + '</div>';
        html += '<button class="btn-eliminar" onclick="eliminarProducto(\'' + item.id + '\')">';
        html += '<i class="fa-solid fa-trash"></i>';
        html += '</button>';
        html += '</div>';
    });
    
    listaContainer.innerHTML = html;
    
    const totalBs = totalUSD * config.tasaBs;
    document.getElementById('subtotal-usd').textContent = '$' + totalUSD.toFixed(2);
    document.getElementById('total-usd').textContent = '$' + totalUSD.toFixed(2);
    document.getElementById('total-bs').textContent = 'Bs ' + totalBs.toFixed(2);
}

function cambiarCantidad(productoId, nuevaCantidad) {
    Cart.updateCantidad(productoId, nuevaCantidad);
    setTimeout(() => location.reload(), 300);
}

function eliminarProducto(productoId) {
    Cart.remove(productoId);
    setTimeout(() => location.reload(), 300);
}

window.cambiarCantidad = cambiarCantidad;
window.eliminarProducto = eliminarProducto;

init();