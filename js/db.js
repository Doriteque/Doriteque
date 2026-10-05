// Funciones para interactuar con Firestore

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

async function saveMenu(menuData) {
  try {
    await window.setDoc(window.doc(window.db, 'menu', 'main'), menuData);
    console.log('Menú guardado');
  } catch (error) {
    console.error('Error guardando menú:', error);
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

async function uploadImage(file, path) {
  try {
    const storageRef = window.ref(window.storage, path);
    const snapshot = await window.uploadBytes(storageRef, file);
    const downloadURL = await window.getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    return null;
  }
}

// Expone funciones globales
window.saveConfig = saveConfig;
window.loadConfig = loadConfig;
window.saveMenu = saveMenu;
window.loadMenu = loadMenu;
window.uploadImage = uploadImage;