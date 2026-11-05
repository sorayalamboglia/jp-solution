// Navegación por "hash" (#/pantalla?parametros).
export function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  return { name: path || '', params: Object.fromEntries(new URLSearchParams(qs || '')) };
}
export function go(name, params) {
  const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params) : '';
  const target = `#/${name}${qs}`;
  if (location.hash === target) window.dispatchEvent(new Event('jp:render'));
  else location.hash = target;
}
