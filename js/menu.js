// js/menu.js
import { initDatabase, onProductosChange, onCategoriasChange, onConfigChange, Cart } from './db.js';

let config = {};
let productos = [];
let categorias = [];
let categoriaActiva = 'todas';

// Inicializar
async function init() {
  await initDatabase(); // Solo crea datos si está vacío
  
  // Escuchar cambios en tiempo real
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
  document.getElementById('horario-text').textContent = `🕒 ${config.horario} | 💱 Tasa: Bs ${config.tasaBs}`;
  document.getElementById('link-instagram').href = `https://instagram.com/${config.instagram}`;
  document.getElementById('link-tiktok').href = `https://tiktok.com/@${config.tiktok}`;
  document.getElementById('link-whatsapp').href = `https://wa.me/${config.whatsapp}`;
  document.getElementById('footer-metodos').textContent = `💳 ${config.metodosPago.join(' | ')}`;
  if (config.logo) document.getElementById('header-logo').src = config.logo;
}

function renderCategorias() {
  const container = document.getElementById('categorias-tabs');
  let html = `<button class="categoria-tab active" data-id="todas">Todos</button>`;
  categorias.forEach(cat => {
    html += `<button class="categoria-tab" data-id="${cat.id}">${cat.nombre}</button>`;
  });
  container.innerHTML = html;
  
  // Eventos de tabs
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
    container.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 40px;">No hay productos disponibles en esta categoría.</p>';
    return;
  }
  
  container.innerHTML = filtrados.map(p => {
        const precioBs = (p.precio * config.tasaBs).toFixed(2);