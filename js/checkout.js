<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Doriteque - Menú Digital</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
</head>
<body>
    <header class="header">
        <div class="header-logo">
            <img src="assets/logo.png" alt="Doriteque Logo" id="header-logo" onerror="this.style.display='none'">
            <h1 id="header-nombre">Doriteque</h1>
        </div>
        <a href="carrito.html" class="cart-btn">
            <i class="fa-solid fa-cart-shopping"></i>
            <span class="cart-badge" id="cart-count">0</span>
        </a>
    </header>

    <div class="info-bar" id="info-bar">
        <p id="horario-text">Cargando horario...</p>
    </div>

    <!-- BUSCADOR -->
    <div class="buscador-container">
        <div class="buscador">
            <i class="fa-solid fa-magnifying-glass buscador-icono"></i>
            <input type="text" id="input-buscar" placeholder="Buscar producto..." oninput="window.buscarProductos(this.value)">
            <button class="buscador-limpiar" onclick="limpiarBusqueda()" id="btn-limpiar" style="display: none;">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    </div>

    <nav class="categorias-tabs" id="categorias-tabs"></nav>

    <main class="productos-grid" id="productos-grid">
        <div class="loading">Cargando menú...</div>
    </main>

    <a href="carrito.html" class="cart-bar" id="cart-bar" style="display: none;">
        <div class="cart-bar-count" id="cart-bar-count">0</div>
        <span>Ver pedido</span>
        <span class="cart-bar-total" id="cart-bar-total">$0.00</span>
    </a>

    <footer class="footer">
        <div class="footer-redes">
            <a href="#" id="link-instagram" target="_blank"><i class="fa-brands fa-instagram"></i></a>
            <a href="#" id="link-tiktok" target="_blank"><i class="fa-brands fa-tiktok"></i></a>
            <a href="#" id="link-whatsapp" target="_blank"><i class="fa-brands fa-whatsapp"></i></a>
        </div>
        <p id="footer-metodos">Métodos de pago: Cargando...</p>
        <p style="margin-top: 8px; font-size: 0.75rem;">© 2026 Doriteque</p>
    </footer>

    <script src="js/firebase.js"></script>
    <script src="js/db.js"></script>
    <script src="js/menu.js"></script>
</body>
</html>