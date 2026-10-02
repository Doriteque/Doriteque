let productos = [];
let config = { tasaBs: 36.50 };

async function init() {
    const cartItems = Cart.get();
    
    if (cartItems.length === 0) {
        document.getElementById('carrito-vacio').classList.remove('hidden');
        document.getElementById('carrito-lleno').classList.add('hidden');
        return;
    }
    
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
        if (!producto) return;
        
        const subtotal = producto.precio * item.cantidad;
        totalUSD += subtotal;
        
        html += '<div class="carrito-item">';
        html += '<img src="' + (producto.imagen || 'https://via.placeholder.com/80/1a1a1a/C41E3A?text=D') + '" class="carrito-item-img" alt="' + producto.nombre + '">';
        html += '<div class="carrito-item-info">';
        html += '<div class="carrito-item-nombre">' + producto.nombre + '</div>';
        html += '<div class="carrito-item-precio">$' + producto.precio.toFixed(2) + ' c/u</div>';
        html += '</div>';
        html += '<div class="carrito-item-controles">';
        html += '<button class="btn-cantidad" onclick="cambiarCantidad(\'' + item.id + '\', ' + (item.cantidad - 1) + ')">-</button>';
        html += '<span class="carrito-item-cantidad">' + item.cantidad + '</span>';
        html += '<button class="btn-cantidad" onclick="cambiarCantidad(\'' + item.id + '\', ' + (item.cantidad + 1) + ')">+</button>';
        html += '</div>';
        html += '<div class="carrito-item-subtotal">$' + subtotal.toFixed(2) + '</div>';
        html += '<button class="btn-eliminar" onclick="eliminarProducto(\'' + item.id + '\')"><i class="fa-solid fa-trash"></i></button>';
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
    setTimeout(() => location.reload(), 400);
}

function eliminarProducto(productoId) {
    Cart.remove(productoId);
    setTimeout(() => location.reload(), 400);
}

window.cambiarCantidad = cambiarCantidad;
window.eliminarProducto = eliminarProducto;

init();