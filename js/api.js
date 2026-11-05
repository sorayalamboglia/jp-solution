// Cliente de la API: añade la cabecera de seguridad y traduce errores a mensajes comprensibles.
// En la versión personal (LOCAL) las solicitudes se atienden dentro del teléfono, sin servidor.
import { LOCAL } from './mode.js';
export class ApiError extends Error {
  constructor(message, status, field) { super(message); this.status = status; this.field = field; }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function api(method, path, body) {
  if (LOCAL) {
    const engine = await import('./local/engine.js');
    let out;
    try { out = await engine.request(method, path, body); } catch (e) { throw new ApiError(e.message || 'No se pudo completar la operación. Inténtalo de nuevo.', e.status || 500); }
    if (out.status !== 200) {
      if (out.status === 401) onUnauthorized();
      throw new ApiError(out.data?.error || 'No se pudo completar la operación. Inténtalo de nuevo.', out.status, out.data?.field);
    }
    return out.data;
  }
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-JP': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* respuesta vacía */ }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized();
    throw new ApiError(data?.error || 'No se pudo completar la operación. Inténtalo de nuevo.', res.status, data?.field);
  }
  return data;
}

export const get = (p) => api('GET', p);
export const post = (p, b = {}) => api('POST', p, b);
export const patch = (p, b = {}) => api('PATCH', p, b);
export const put = (p, b = {}) => api('PUT', p, b);
export const del = (p, b) => api('DELETE', p, b);
export const newClientId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
