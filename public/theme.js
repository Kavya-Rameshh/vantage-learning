/* Applies the saved theme before first paint so there is no flash. */
(function () {
  try {
    var t = localStorage.getItem('vantage.theme');
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
