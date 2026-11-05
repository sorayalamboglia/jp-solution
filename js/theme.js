// Aplica el tema antes de pintar la página para evitar parpadeos.
(function () {
  var t = 'light', rt = false;
  try { t = localStorage.getItem('jp-theme') || 'light'; rt = localStorage.getItem('jp-solid') === '1'; } catch (e) {}
  document.documentElement.setAttribute('data-theme', t);
  if (rt) document.documentElement.classList.add('reduce-transparency');
})();
