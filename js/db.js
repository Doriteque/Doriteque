// Funciones para leer y guardar datos en Firestore

async function saveConfig(configData) {
  try {
    await window.setDoc(window.doc(window.db, 'config', 'main'), configData);
    console.log('Configuración guardada');
  } catch (error) {
    console.error('Error guardando config:', error);
  }
}

async function loadConfig(callback) {
  try {
    window.onSnapshot(window.doc(window.db, 'config', 'main'), (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      }
    });
  } catch (error) {
    console.error('Error cargando config:', error);
  }
}

async function loadMenu(callback) {
  try {
    window.onSnapshot(window.doc(window.db, 'menu', 'main'), (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        // Datos por defecto si no existe
        callback({
          categorias: [],
          productos: [],
          modificadores: []
        });
      }
    });
  } catch (error) {
    console.error('Error cargando menú:', error);
  }
}

// Expone funciones globales
window.saveConfig = saveConfig;
window.loadConfig = loadConfig;
window.loadMenu = loadMenu;