// Mobile menu
function toggleMenu(){
  document.getElementById('mobileMenu').classList.toggle('open');
}
document.addEventListener('click', e => {
  const menu = document.getElementById('mobileMenu');
  if(menu && !menu.contains(e.target) && !e.target.closest('.hamburger')){
    menu.classList.remove('open');
  }
});

// Calculator tab switching
function showTab(name){
  document.querySelectorAll('.calc-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.calc-panel').forEach(p => p.classList.toggle('active', p.id === name));
  history.replaceState(null,'','#'+name);
}

// Responsive grid for wissen rules grids
function fixGrids(){
  const w = window.innerWidth;
  document.querySelectorAll('.rules-grid').forEach(g => {
    g.style.gridTemplateColumns = w < 640 ? '1fr' : w < 900 ? '1fr 1fr' : 'repeat(3,1fr)';
  });
}
window.addEventListener('resize', fixGrids);
fixGrids();
