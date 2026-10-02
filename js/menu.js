let config = {};
let productos = [];
let categorias = [];
let categoriaActiva = 'todas';
let busqueda = '';
let productoSeleccionado = null;

async function init() {
  await initDatabase();
  
  onConfigChange(data => {
    config = data;
    renderConfig();
  });
  
  onCategoriasChange(data => {
    categorias = data;
    renderCategorias();
    renderProductos();
    setupScrollSpy();
  });
  
  onProductosChange(data => {
    productos = data;
    renderProductos();
    setupScrollSpy();
    actualizarBarraCarrito();
  });
  
  actualizarBarraCarrito();
  window.addEventListener('cartUpdated', actualizarBarraCarrito);
}

function renderConfig() {
  document.getElementById('header-nombre').textContent = config.nombre;
  document.getElementById('horario-text').textContent = ' ' + config.horario + ' |  Tasa: Bs ' + config.tasaBs;
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
      
      // Centrar la categoría activa
      e.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      
      if (categoriaActiva === 'todas') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const seccion = document.getElementById('seccion-' + categoriaActiva);
        if (seccion) {
          const offset = 200;
          const top = seccion.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      }
    });
  });
}

function renderProductos() {
  const container = document.getElementById('productos-grid');
  const textoBusqueda = busqueda.toLowerCase().trim();
  
  let html = '';
  const categoriasAMostrar = categoriaActiva === 'todas' ?
    categorias :
    categorias.filter(c => c.id === categoriaActiva);
  
  categoriasAMostrar.forEach(cat => {
    const productosCat = productos.filter(p =>
      p.categoriaId === cat.id &&
      p.disponible &&
      (textoBusqueda === '' || p.nombre.toLowerCase().includes(textoBusqueda) || p.descripcion.toLowerCase().includes(textoBusqueda))
    );
    
    if (productosCat.length === 0) return;
    
    html += '<section class="seccion-categoria" id="seccion-' + cat.id + '">';
    html += '<h2 class="titulo-seccion">' + cat.nombre + '</h2>';
    html += '<div class="productos-grid-interno">';
    
    productosCat.forEach(p => {
      const precioBs = (p.precio * config.tasaBs).toFixed(2);
      const imagen = p.imagen || 'https://via.placeholder.com/400x300/1a1a1a/C41E3A?text=Doriteque';
      
      html += '<article class="producto-card" onclick="abrirModal(\'' + p.id + '\')">';
      html += '<img src="' + imagen + '" alt="' + p.nombre + '" class="producto-img" loading="lazy">';
      html += '<div class="producto-info">';
      html += '<h3 class="producto-nombre">' + p.nombre + '</h3>';
      html += '<p class="producto-desc">' + p.descripcion + '</p>';
      html += '<div class="producto-precio">$' + p.precio.toFixed(2) + '</div>';
      html += '<div class="producto-precio-bs">Bs ' + precioBs + '</div>';
      html += '<button class="btn-agregar" onclick="event.stopPropagation(); agregarAlCarrito(\'' + p.id + '\')">';
      html += '<i class="fa-solid fa-plus"></i> Agregar';
      html += '</button>';
      html += '</div>';
      html += '</article>';
    });
    
    html += '</div>';
    html += '</section>';
  });
  
  if (html === '') {
    html = '<p class="text-center" style="grid-column: 1/-1; padding: 40px; color: var(--gris-texto);">No hay productos disponibles.</p>';
  }
  
  container.innerHTML = html;
}

function setupScrollSpy() {
  const secciones = document.querySelectorAll('.seccion-categoria');
  if (secciones.length === 0) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id.replace('seccion-', '');
        categoriaActiva = id;
        
        document.querySelectorAll('.categoria-tab').forEach(tab => {
          tab.classList.remove('active');
          if (tab.dataset.id === id) {
            tab.classList.add('active');
            tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        });
      }
    });
  }, {
    rootMargin: '-200px 0px -60% 0px',
    threshold: 0
  });
  
  secciones.forEach(seccion => observer.observe(seccion));
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
  if (btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Agregado';
    btn.style.background = '#28a745';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
    }, 800);
  }
}

function abrirModal(productoId) {
  const producto = productos.find(p => p.id === productoId);
  if (!producto) return;
  
  productoSeleccionado = producto;
  
  const imagen = producto.imagen || 'https://via.placeholder.com/400x300/1a1a1a/C41E3A?text=Doriteque';
  const precioBs = (producto.precio * config.tasaBs).toFixed(2);
  
  document.getElementById('modal-img').src = imagen;
  document.getElementById('modal-img').alt = producto.nombre;
  document.getElementById('modal-nombre').textContent = producto.nombre;
  document.getElementById('modal-precio-usd').textContent = '$' + producto.precio.toFixed(2);
  document.getElementById('modal-precio-bs').textContent = 'Bs ' + precioBs;
  document.getElementById('modal-desc').textContent = producto.descripcion;
  
  const btnAgregar = document.getElementById('modal-btn-agregar');
  btnAgregar.onclick = () => {
    Cart.add(producto.id);
    btnAgregar.innerHTML = '<i class="fa-solid fa-check"></i> Agregado al pedido';
    btnAgregar.style.background = '#28a745';
    setTimeout(() => {
      btnAgregar.innerHTML = '<i class="fa-solid fa-plus"></i> Agregar al pedido';
      btnAgregar.style.background = '';
      cerrarModal();
    }, 1000);
  };
  
  document.getElementById('modal-producto').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  document.getElementById('modal-producto').style.display = 'none';
  document.body.style.overflow = '';
  productoSeleccionado = null;
}

function buscarProductos(texto) {
  busqueda = texto;
  renderProductos();
  const btnLimpiar = document.getElementById('btn-limpiar');
  if (btnLimpiar) btnLimpiar.style.display = texto.length > 0 ? 'flex' : 'none';
}

function limpiarBusqueda() {
  busqueda = '';
  const input = document.getElementById('input-buscar');
  if (input) input.value = '';
  renderProductos();
  const btnLimpiar = document.getElementById('btn-limpiar');
  if (btnLimpiar) btnLimpiar.style.display = 'none';
}

// Cerrar modal al hacer click fuera
document.addEventListener('click', (e) => {
  const modal = document.getElementById('modal-producto');
  if (e.target === modal) cerrarModal();
});

// Cerrar modal con tecla Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarModal();
});

window.agregarAlCarrito = agregarAlCarrito;
window.buscarProductos = buscarProductos;
window.limpiarBusqueda = limpiarBusqueda;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;

init();