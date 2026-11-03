// js/tasa.js - Tasa oficial BCV automática (Bs por USD)
// Se consulta sola cada vez que alguien abre la página. Guarda el valor en el
// navegador y lo renueva si cambió el día o pasaron más de 3 horas.
// Si la API falla, usa la última tasa guardada; y si no hay ninguna,
// app.js / checkout.js usan la "Tasa del día" que pongas en el admin.
(function() {
  const API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
  const CACHE_KEY = 'doriteque_tasa_bcv';
  const MAX_EDAD_MS = 3 * 60 * 60 * 1000; // 3 horas
  const TIMEOUT_MS = 6000;
  
  function hoyVE() {
    // Fecha de hoy en Venezuela (AAAA-MM-DD), sin importar la zona del cliente
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
  }
  
  function tasaValida(n) {
    return typeof n === 'number' && isFinite(n) && n > 0 && n < 1000000;
  }
  
  function leerCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (c && tasaValida(c.tasa)) return c;
    } catch (e) { /* ignorar */ }
    return null;
  }
  
  function guardarCache(tasa) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        tasa: tasa,
        dia: hoyVE(),
        guardado: Date.now()
      }));
    } catch (e) { /* ignorar */ }
  }
  
  async function consultarAPI() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(API_URL, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const tasa = Number(data && data.promedio);
      if (!tasaValida(tasa)) throw new Error('Tasa inválida');
      return Math.round(tasa * 100) / 100;
    } finally {
      clearTimeout(timer);
    }
  }
  
  // Devuelve la tasa en número, o null si no hay forma de obtenerla
  window.obtenerTasaBCV = async function() {
    const cache = leerCache();
    const vigente = cache &&
      cache.dia === hoyVE() &&
      (Date.now() - cache.guardado) < MAX_EDAD_MS;
    
    if (vigente) return cache.tasa;
    
    try {
      const tasa = await consultarAPI();
      guardarCache(tasa);
      return tasa;
    } catch (e) {
      console.warn('No se pudo actualizar la tasa BCV:', e.message);
                  // Solo se reutiliza una tasa guardada si es de HOY; si no, se usa la manual del admin
            return (cache && cache.dia === hoyVE()) ? cache.tasa : null;
    }
  };
})();