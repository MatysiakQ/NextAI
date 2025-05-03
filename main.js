document.addEventListener('DOMContentLoaded', () => {
  // Navigation toggle and indicator
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');
  toggle.addEventListener('click', () => menu.classList.toggle('show'));

  const navItems = document.querySelectorAll('.nav-item');
  const indicator = document.querySelector('.nav-indicator');
  function updateIndicator(el) {
    const link = el.querySelector('a');
    indicator.style.width = link.offsetWidth + 'px';
    indicator.style.left = link.offsetLeft + 'px';
    indicator.style.background = window.getComputedStyle(link).color;
  }
  navItems.forEach(item => item.addEventListener('mouseenter', () => updateIndicator(item)));
  document.querySelector('.nav-menu').addEventListener('mouseleave', () => {
    const active = document.querySelector('.nav-item a.active')?.parentElement;
    active ? updateIndicator(active) : indicator.style.width = '0';
  });

  // Smooth scroll & active link
  const sections = document.querySelectorAll('section[id], .hero-section');
  document.querySelectorAll('.nav-item a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      menu.classList.remove('show');
    });
  });
  window.addEventListener('scroll', () => {
    let pos = window.scrollY + 150;
    sections.forEach(sec => {
      const id = sec.id || 'hero';
      const link = document.querySelector(`.nav-item a[href="#${id}"]`);
      if (!link) return;
      if (pos >= sec.offsetTop && pos < sec.offsetTop + sec.offsetHeight) {
        document.querySelectorAll('.nav-item a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        updateIndicator(link.parentElement);
      }
    });
  });

  // Slider
  let current = 0;
  const cards = document.querySelectorAll('.card');
  const total = cards.length;
  let interval;
  function updateCards() {
    cards.forEach((c,i) => c.className = 'card ' + (
      i === current ? 'center' :
      i === (current+1)%total ? 'right' :
      i === (current-1+total)%total ? 'left' : ''
    ));
  }
  function next() { current = (current+1)%total; updateCards(); }
  function prev() { current = (current-1+total)%total; updateCards(); }
  document.querySelector('.slider-next').addEventListener('click', () => { next(); reset(); });
  document.querySelector('.slider-prev').addEventListener('click', () => { prev(); reset(); });
  function reset() { clearInterval(interval); interval = setInterval(next, 5000); }
  updateCards(); reset();

  // Periodic glitch animation – co 3 sekundy
  const glitches = document.querySelectorAll('.glitch');
  setInterval(() => {
    glitches.forEach(el => el.classList.add('glitch-animate'));
    setTimeout(() => glitches.forEach(el => el.classList.remove('glitch-animate')), 1500);
  }, 3000);
});
