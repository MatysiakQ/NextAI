// lock-hero.js

// Wyłącz automatyczne przywracanie scrolla i wymuś manualne
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

window.addEventListener('load', () => {
  const hero = document.querySelector('.hero-section');
  if (!hero) return;

  // Usuń hash, aby przeglądarka nie przewijała domyślnie do fragmentu
  if (location.hash) {
    history.replaceState(null, '', location.pathname);
  }

  // Przewiń do hero po pełnym załadowaniu strony
  hero.style.display = '';
  hero.scrollIntoView({ behavior: 'auto' });

  // Przygotuj logikę usuwania hero po przewinięciu
  let removed = false;
  const heroBottom = hero.offsetTop + hero.offsetHeight;

  window.addEventListener('scroll', () => {
    if (!removed && window.scrollY > heroBottom) {
      hero.style.display = 'none';
      removed = true;
      const nextSection = document.querySelector('section');
      if (nextSection) nextSection.scrollIntoView({ behavior: 'auto' });
    }
  });
});