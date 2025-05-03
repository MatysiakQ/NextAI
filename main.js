// main.js
document.addEventListener('DOMContentLoaded', () => {
  // NAVIGATION
  const toggle     = document.querySelector('.nav-toggle');
  const menu       = document.querySelector('.nav-menu');
  const items      = document.querySelectorAll('.nav-item');
  const indicator  = document.querySelector('.nav-indicator');

  toggle?.addEventListener('click', () => {
    menu.classList.toggle('show');
  });

  function updateIndicator(el) {
    const link = el?.querySelector('a');
    if (!link || !indicator) return;
    indicator.style.width      = link.offsetWidth + 'px';
    indicator.style.left       = link.offsetLeft + 'px';
    indicator.style.background = window.getComputedStyle(link).color;
  }

  // initial position
  const activeItem = document.querySelector('.nav-item a.active')?.parentElement;
  if (activeItem) updateIndicator(activeItem);

  items.forEach(item => {
    item.addEventListener('mouseenter', () => updateIndicator(item));
  });
  menu?.addEventListener('mouseleave', () => {
    if (activeItem) updateIndicator(activeItem);
    else indicator.style.width = '0';
  });

  // SMOOTH SCROLL & ACTIVE LINK ON SCROLL
  const links    = document.querySelectorAll('.nav-item a');
  const sections= document.querySelectorAll('section[id], .hero-section');

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const href = link.getAttribute('href');
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      menu.classList.remove('show');
    });
  });

  window.addEventListener('scroll', () => {
    const pos = window.scrollY + 150;
    sections.forEach(sec => {
      if (!sec.id) return;
      const link = document.querySelector(`.nav-item a[href="#${sec.id}"]`);
      if (!link) return;
      if (pos >= sec.offsetTop && pos < sec.offsetTop + sec.offsetHeight) {
        links.forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        updateIndicator(link.parentElement);
      }
    });
  });

  // SLIDER
  let current = 0, interval;
  const cards   = document.querySelectorAll('.card');
  const total   = cards.length;
  const nextBtn = document.querySelector('.slider-next');
  const prevBtn = document.querySelector('.slider-prev');

  function updateCards() {
    cards.forEach((c,i) => {
      c.className = 'card ' + (
        i === current ? 'center' :
        i === (current+1)%total ? 'right' :
        i === (current-1+total)%total ? 'left' : ''
      );
    });
  }
  function next() { current = (current+1)%total; updateCards(); }
  function prev() { current = (current-1+total)%total; updateCards(); }
  function reset() {
    clearInterval(interval);
    interval = setInterval(next, 3000);
  }
  nextBtn?.addEventListener('click', () => { next(); reset(); });
  prevBtn?.addEventListener('click', () => { prev(); reset(); });
  if (cards.length) { updateCards(); reset(); }

  // GLITCH every 3 seconds
  setInterval(() => {
    document.querySelectorAll('.glitch').forEach(el => {
      el.classList.add('glitch-active');
      setTimeout(() => el.classList.remove('glitch-active'), 300);
    });
  }, 3000);
});
