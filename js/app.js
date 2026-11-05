// Arranque, navegación y estructura principal de JP Solution.
import { setUnauthorizedHandler } from './api.js';
import { S, loadMe, selectHousehold, savedHousehold, onChange } from './store.js';
import { icon, esc, $, closeAllSheets, errorBox } from './ui.js';
import { enableTips } from './charts.js';
import { parseHash, go } from './nav.js';
import { startTranslator, tr } from './i18n.js';
import { LOCAL } from './mode.js';
import { authView, onboardingView } from './views/auth.js';
import { homeView } from './views/home.js';
import { transactionsView } from './views/transactions.js';
import { openTxForm } from './views/txform.js';
import { budgetView } from './views/budget.js';
import { calendarView } from './views/calendar.js';
import { goalsView } from './views/goals.js';
import { accountsView } from './views/accounts.js';
import { reportsView } from './views/reports.js';
import { openMenu, householdView, categoriesView, debtsView, recurringView, profileView } from './views/more.js';
import { importView, backupView } from './views/data.js';

const TABS = [
  ['inicio', 'Inicio', 'home'],
  ['movimientos', 'Movimientos', 'list'],
  ['presupuesto', 'Presupuesto', 'pie'],
  ['calendario', 'Calendario', 'calendar'],
  ['metas', 'Metas', 'target'],
];
const ROUTES = {
  inicio: { title: 'Inicio', view: homeView },
  movimientos: { title: 'Movimientos', view: transactionsView },
  presupuesto: { title: 'Presupuesto', view: budgetView },
  calendario: { title: 'Calendario de pagos', view: calendarView },
  metas: { title: 'Metas familiares', view: goalsView },
  cuentas: { title: 'Cuentas y tarjetas', view: accountsView },
  informes: { title: 'Informes', view: reportsView },
  deudas: { title: 'Deudas', view: debtsView },
  categorias: { title: 'Categorías', view: categoriesView },
  recurrentes: { title: 'Recurrentes', view: recurringView },
  importar: { title: 'Importar CSV', view: importView },
  respaldo: { title: 'Respaldo y datos', view: backupView },
  hogar: { title: LOCAL ? 'Hogar y nombres' : 'Hogar e integrantes', view: householdView },
  perfil: { title: 'Mi cuenta', view: profileView },
  seguridad: { title: 'Seguridad y bloqueo', view: async (m, p) => (await import('./local/ui.js')).securityView(m, p) },
};
const PUBLIC = ['entrar', 'registro', 'olvide', 'restablecer', 'unirse'];

const appEl = document.getElementById('app');
enableTips(document.body);
startTranslator();

setUnauthorizedHandler(() => { S.me = null; if (!PUBLIC.includes(parseHash().name)) go('entrar'); });

function shell(route, name) {
  const isHome = name === 'inicio';
  const demo = S.h?.is_demo;
  const hasAlert = S.homeAlert;
  appEl.className = 'app has-nav';
  appEl.innerHTML = `
    <header class="topbar"><div class="topbar-inner">
      ${isHome ? `
        <div class="brand"><div class="brand-mark">${icon('family')}</div>
          <div class="grow"><div class="brand-name">JP Solution</div><div class="brand-sub ellipsis">${esc(S.h?.name || 'Finanzas familiares')}</div></div></div>
        <a class="icon-btn" href="#/calendario" aria-label="Facturas y recordatorios${hasAlert ? ': hay pagos que requieren atención' : ''}">${icon('bell')}${hasAlert ? '<span class="dot"></span>' : ''}</a>
        <button class="icon-btn" data-menu aria-label="Abrir menú">${icon('menu')}</button>`
      : `
        <button class="icon-btn" data-menu aria-label="Abrir menú">${icon('menu')}</button>
        <h1 class="page-title">${esc(route.title)}</h1>
        <a class="icon-btn" href="#/inicio" aria-label="Ir a inicio">${icon('home')}</a>`}
    </div></header>
    ${demo ? `<div class="demo-banner"><div class="glass">${icon('sparkles')}<span><b>Modo demostración.</b> Estos datos son de ejemplo y están separados de tu hogar real.</span>
      <button class="link-btn" data-menu style="margin-left:auto">Cambiar</button></div></div>` : ''}
    <main class="main view-enter" id="main" tabindex="-1"></main>
    <nav class="tabbar glass" aria-label="Navegación principal">
      ${TABS.map(([k, label, ic]) => `<a class="tab" href="#/${k}" ${k === name ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`).join('')}
    </nav>
    <button class="fab" data-fab aria-label="Registrar movimiento">${icon('plus')}</button>`;
  appEl.querySelectorAll('[data-menu]').forEach((b) => (b.onclick = () => openMenu()));
  appEl.querySelector('[data-fab]').onclick = () => openTxForm({ type: 'expense' });
  return $('#main');
}

let cleanup = null;
let renderSeq = 0;
let localState = null;   // versión personal: 'ready' o 'locked'
export async function render() {
  const seq = ++renderSeq;
  closeAllSheets();
  cleanup?.(); cleanup = null;
  const { name, params } = parseHash();
  if (LOCAL && localState !== 'ready') {
    const engine = await import('./local/engine.js');
    try { localState = localState || await engine.init(); } catch (e) {
      appEl.innerHTML = `<div class="auth">${errorBox('No se pudo abrir el almacenamiento del teléfono. ' + (e.message || ''))}</div>`;
      return;
    }
    await import('./local/sheets.js');
    if (localState === 'locked') {
      const { lockView } = await import('./local/ui.js');
      return lockView(appEl, () => { localState = 'ready'; S.me = null; S.hid = null; render(); });
    }
  }

  if (!S.me) {
    try { await loadMe(); } catch { S.me = null; }
  }
  if (seq !== renderSeq) return;
  if (!S.me) {
    appEl.className = 'app';
    return authView(appEl, PUBLIC.includes(name) ? name : 'entrar', params);
  }
  if (name === 'unirse' || name === 'restablecer') return authView(appEl, name, params);
  // Sin hogar todavía: bienvenida (en la versión personal también se permite ir a restaurar un respaldo).
  if ((!S.me.households.length && !(LOCAL && name === 'respaldo')) || name === 'bienvenida') {
    appEl.className = 'app';
    return onboardingView(appEl, params);
  }
  if (!S.hid) {
    try { await selectHousehold(savedHousehold()); } catch (e) {
      appEl.innerHTML = `<div class="auth">${errorBox(e.message)}</div>`;
      appEl.querySelector('[data-action="retry"]').onclick = () => render();
      return;
    }
  }
  if (seq !== renderSeq) return;
  const route = ROUTES[name];
  if (!route) return go('inicio');
  document.title = `${tr(route.title)} · JP Solution`;
  const main = shell(route, name);
  const run = async () => {
    try {
      const out = await route.view(main, params);
      if (typeof out === 'function') cleanup = out;
    } catch (e) {
      main.innerHTML = errorBox(e.message || 'No se pudo cargar esta pantalla.');
      main.querySelector('[data-action="retry"]')?.addEventListener('click', run);
    }
  };
  await run();
  const off = onChange(() => { if (parseHash().name === name) run(); });
  const prev = cleanup;
  cleanup = () => { off(); prev?.(); };
}

window.addEventListener('hashchange', render);
window.addEventListener('jp:render', render);
render();

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(LOCAL ? './sw.js' : '/sw.js').catch(() => {});
