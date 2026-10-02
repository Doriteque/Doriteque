// js/db.js
const COL_PRODUCTOS = 'productos';
const COL_CATEGORIAS = 'categorias';
const COL_CONFIG = 'config';

const CONFIG_DEFAULT = {
    nombre: "Doriteque",
    whatsapp: "584245566545",
    email: "Locodori59@gmail.com",
    instagram: "dori__locosss",
    tiktok: "doritequess",
    horario: "Martes a Domingo 12pm - 12am (Lunes cerrado)",
    tasaBs: 36.50,
    metodosPago: ["Pago Móvil", "Efectivo Bs", "Efectivo Divisa"],
    logo: "assets/logo.png"
};

const CATEGORIAS_DEFAULT = [
    { id: "cat1", nombre: "Dorilocos", orden: 1 },
    { id: "cat2", nombre: "Hamburguesas", orden: 2 },
    { id: "cat3", nombre: "Bebidas", orden: 3 },
    { id: "cat4", nombre: "Adicionales", orden: 4 }
];

const PRODUCTOS_DEFAULT = [
    { id: "p1", nombre: "RUFFLES GRANDE", descripcion: "Carne, pollo, chorizo, maiz, queso, lechuga, pico de gallo, 5 salsas", precio: 14.00, categoriaId: "cat1", imagen: "", disponible: true },
    { id: "p2", nombre: "SUPER DORILOCO", descripcion: "Doriloco grande: carne, pollo, chorizo, lechuga, pico de gallo, queso, aguacate, maíz, todas las salsas", precio: 13.00, categoriaId: "cat1", imagen: "", disponible: true },
    { id: "p3", nombre: "DORILOCO PEQUEÑO NORMAL", descripcion: "Carne o pollo, pico de gallo, lechuga, maiz, queso, salsas", precio: 5.00, categoriaId: "cat1", imagen: "", disponible: true },
    { id: "p4", nombre: "DORILOCO PEQUEÑO MIXTO", descripcion: "Carne y pollo, pico de gallo, lechuga, maiz, queso, salsas", precio: 6.00, categoriaId: "cat1", imagen: "", disponible: true },
    { id: "p5", nombre: "DORILOCO PEQUEÑO PARRILLERO", descripcion: "Carne, pollo, chorizo, pico de gallo, lechuga, maiz, queso, salsas", precio: 7.00, categoriaId: "cat1", imagen: "", disponible: true },
    { id: "p6", nombre: "HAMBURGUESA NORMAL", descripcion: "Carne o pollo, queso, mini papas, lechuga, tomate, cebolla, pepinillo, 6 salsas", precio: 5.50, categoriaId: "cat2", imagen: "", disponible: true },
    { id: "p7", nombre: "DORI HAMBURGUESA", descripcion: "Pollo empanizado de dorito, queso, mini papas, lechuga, tomate, cebolla, pepinillo, 6 salsas", precio: 6.50, categoriaId: "cat2", imagen: "", disponible: true },
    { id: "p8", nombre: "HAMBURGUESA MIXTA", descripcion: "Carne, pollo, queso, mini papas, pepinillos, lechuga, tomate, cebolla, 6 salsas", precio: 7.00, categoriaId: "cat2", imagen: "", disponible: true },
    { id: "p9", nombre: "HAMBURGUESA PARRILLERA", descripcion: "Carne, pollo, chorizo, queso, mini papas, queso llanero, pepinillo, lechuga, tomate, cebolla, 6 salsas", precio: 8.00, categoriaId: "cat2", imagen: "", disponible: true },
    { id: "p10", nombre: "COCA-COLA 1LT", descripcion: "Refresco Coca-Cola de 1 litro", precio: 1.50, categoriaId: "cat3", imagen: "", disponible: true },
    { id: "p11", nombre: "PEPSI 1.5LT", descripcion: "Refresco Pepsi de 1.5 litros", precio: 1.80, categoriaId: "cat3", imagen: "", disponible: true },
    { id: "p12", nombre: "GLUP 2LT", descripcion: "Refresco Glup de 2 litros", precio: 1.80, categoriaId: "cat3", imagen: "", disponible: true },
    { id: "p13", nombre: "RACIÓN PAPAS FRITAS", descripcion: "Ración de papas fritas", precio: 2.50, categoriaId: "cat4", imagen: "", disponible: true },
    { id: "p14", nombre: "CHORIZO AJO", descripcion: "Chorizo ajo ahumado o picante", precio: 1.00, categoriaId: "cat4", imagen: "", disponible: true },
    { id: "p15", nombre: "DORITO", descripcion: "1 bolsa de Doritos", precio: 1.40, categoriaId: "cat4", imagen: "", disponible: true }
];

async function initDatabase() {
    const configRef = db.collection(COL_CONFIG).doc('main');
    const configSnap = await configRef.get();
    
    if (!configSnap.exists) {
        await configRef.set(CONFIG_DEFAULT);
        const catRef = db.collection(COL_CATEGORIAS);
        for (const cat of CATEGORIAS_DEFAULT) {
            await catRef.doc(cat.id).set(cat);
        }
        const prodRef = db.collection(COL_PRODUCTOS);
        for (const prod of PRODUCTOS_DEFAULT) {
            await prodRef.doc(prod.id).set(prod);
        }
        console.log("BD Inicializada");
    }
}

function onProductosChange(callback) {
    return db.collection(COL_PRODUCTOS).orderBy('nombre', 'asc').onSnapshot((snapshot) => {
        const productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(productos);
    });
}

function onCategoriasChange(callback) {
    return db.collection(COL_CATEGORIAS).orderBy('orden', 'asc').onSnapshot((snapshot) => {
        const categorias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(categorias);
    });
}

function onConfigChange(callback) {
    return db.collection(COL_CONFIG).doc('main').onSnapshot((doc) => {
        if (doc.exists) callback(doc.data());
    });
}

const Cart = {
    get: () => JSON.parse(localStorage.getItem('doriteque_cart') || '[]'),
    add: (productoId) => {
        const cart = Cart.get();
        const item = cart.find(i => i.id === productoId);
        if (item) item.cantidad++;
        else cart.push({ id: productoId, cantidad: 1 });
        localStorage.setItem('doriteque_cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
    },
    remove: (productoId) => {
        const cart = Cart.get().filter(i => i.id !== productoId);
        localStorage.setItem('doriteque_cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
    },
    updateCantidad: (productoId, cantidad) => {
        const cart = Cart.get();
        const item = cart.find(i => i.id === productoId);
        if (item) {
            if (cantidad <= 0) Cart.remove(productoId);
            else { item.cantidad = cantidad; localStorage.setItem('doriteque_cart', JSON.stringify(cart)); }
        }
        window.dispatchEvent(new Event('cartUpdated'));
    },
    clear: () => {
        localStorage.removeItem('doriteque_cart');
        window.dispatchEvent(new Event('cartUpdated'));
    }
};