let config = {};
let productos = [];
let categorias = [];
let categoriaActiva = 'todas';

async function init() {
  await initDatabase();
  
  onConfigChange(data => {
    config = data;
    renderConfig();
  });
  
  onCategoriasChange(data => {
    categorias = data;
    renderCategorias();
  });
  
  onProductosChange(data => {
    productos = data;
    renderProductos();
  });
  
  actualizarBarraCarrito();
  window.addEventListener('cartUpdated', actualizarBarraCarrito);
}

function renderConfig() {
  document.getElementById('header-nombre').textContent = config.nombre;
  document.getElementById('horario-text').textContent = '🕒 ' + config.horario + ' |  Tasa: Bs ' + config.tasaBs;
  document.getElementById('link-instagram').href = 'https://instagram.com/' + config.instagram;
  document.getElementById('link-tiktok').href = 'https://tiktok.com/@' + config.tiktok;
  document.getElementById('link-whatsapp').href = 'https://wa.me/' + config.whatsapp;
  document.getElementById('footer-metodos').textContent = '💳 ' + config.metodosPago.join(' | ');
  if (config.logo) document.getElementById('header-logo').src = config.logo;
}

function renderCategorias() {
  const container = document.getElementById('categorias-tabs');
  let html = '<button class="categoria-tab active" data-id="todas">Todos</button>';
  categorias.forEach(cat => {
    html += '<button class="categoria-tab" data-id="' + cat.id + '">' + cat.nombre + '</button>';
  });
  container.innerHTML = html;
  
  container.querySelectorAll('.categoria-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.categoria-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      categoriaActiva = e.target.dataset.id;
      renderProductos();
    });
  });
}

function renderProductos() {
  const container = document.getElementById('productos-grid');
  const filtrados = categoriaActiva === 'todas' ?
    productos.filter(p => p.disponible) :
    productos.filter(p => p.categoriaId === categoriaActiva && p.disponible);
  
  if (filtrados.length === 0) {
    container.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 40px;">No hay productos disponibles.</p>';
    return;
  }
  
  let html = '';
  filtrados.forEach(p => {
    const precioBs = (p.precio * config.tasaBs).toFixed(2);
    const imagen = p.imagen || 'https://via.placeholder.com/400x300/1a1a1a/C41E3A?text=Doriteque';
    
    html += '<article class="producto-card">';
    html += '<img src="' + imagen + '" alt="' + p.nombre + '" class="producto-img" loading="lazy">';
    html += '<div class="producto-info">';
    html += '<h3 class="producto-nombre">' + p.nombre + '</h3>';
    html += '<p class="producto-desc">' + p.descripcion + '</p>';
    html += '<div class="producto-precio">$' + p.precio.toFixed(2) + '</div>';
    html += '<div class="producto-precio-bs">Bs ' + precioBs + '</div>';
    html += '<button class="btn-agregar" onclick="agregarAlCarrito(\'' + p.id + '\')">';
    html += '<i class="fa-solid fa-plus"></i> Agregar';
    html += '</button>';
    html += '</div>';
    html += '</article>';
  });
  
  container.innerHTML = html;
}

function actualizarBarraCarrito() {
  const cart = Cart.get();
  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  
  let totalUSD = 0;
  cart.forEach(item => {
    const prod = productos.find(p => p.id === item.id);
    if (prod) totalUSD += prod.precio * item.cantidad;
  });
  
  const cartBar = document.getElementById('cart-bar');
  if (totalItems > 0) {
    cartBar.style.display = 'flex';
    document.getElementById('cart-count').textContent = totalItems;
    document.getElementById('cart-bar-count').textContent = totalItems;
    document.getElementById('cart-bar-total').textContent = '$' + totalUSD.toFixed(2);
  } else {
    cartBar.style.display = 'none';
    document.getElementById('cart-count').textContent = '0';
  }
}

function agregarAlCarrito(productoId) {
  Cart.add(productoId);
  const btn = event.target.closest('.btn-agregar');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Agregado';
  btn.style.background = '#28a745';
  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.style.background = '';
  }, 800);
}

init();