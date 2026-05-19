// ---- Dark Mode (also runs inline in <head> via each page's script tag) ----
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('fc-theme', t);
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}
// On DOMContentLoaded, ensure theme is applied (in case head script missed it)
(function(){
  const t = localStorage.getItem('fc-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
})();

// ---- Mobile menu ----
function toggleMenu(){
  document.getElementById('mobileMenu').classList.toggle('open');
}
document.addEventListener('click', e => {
  const m = document.getElementById('mobileMenu');
  if(m && !m.contains(e.target) && !e.target.closest('.hamburger')) m.classList.remove('open');
});

// ---- Calculator tab switching ----
function showTab(name){
  document.querySelectorAll('.calc-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.calc-panel').forEach(p => p.classList.toggle('active', p.id === name));
  history.replaceState(null,'','#'+name);
}

// ---- Responsive grid helper ----
function fixGrids(){
  const w = window.innerWidth;
  document.querySelectorAll('.rules-grid').forEach(g => {
    g.style.gridTemplateColumns = w < 640 ? '1fr' : w < 900 ? '1fr 1fr' : 'repeat(3,1fr)';
  });
}
window.addEventListener('resize', fixGrids);
fixGrids();
