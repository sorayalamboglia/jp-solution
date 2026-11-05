// Protección contra pisar datos: decide si es seguro respaldar en la hoja de Google sin preguntar.
// remote = { fecha, id, nombre } del último respaldo guardado en la hoja (fecha null si está vacía).
// cfg.lastRemoteAt = fecha del último respaldo que este dispositivo hizo o restauró.

export function deviceInfo(storage = globalThis.localStorage, ua = globalThis.navigator?.userAgent || '') {
  let id = null;
  try { id = storage.getItem('jp-device'); } catch { /* sin almacenamiento */ }
  if (!id) {
    id = globalThis.crypto.randomUUID();
    try { storage.setItem('jp-device', id); } catch { /* sin almacenamiento */ }
  }
  const name = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Macintosh|Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'otro dispositivo';
  return { id, name };
}

// Devuelve null si se puede respaldar, o la razón para preguntar primero.
export function conflictWith(remote, cfg, deviceId) {
  if (!remote || !remote.fecha) return null;                 // hoja vacía: nada que pisar
  if (remote.id === deviceId) return null;                   // lo último lo guardó este mismo dispositivo
  if (cfg?.lastRemoteAt && remote.fecha <= cfg.lastRemoteAt) return null;   // ya lo conocíamos (lo restauramos o lo pisamos a propósito)
  return { fecha: remote.fecha, nombre: remote.nombre || 'otro dispositivo' };
}
