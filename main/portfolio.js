// Portfolio page JS
document.addEventListener('DOMContentLoaded', () => {
  // Glitch effect co 3 sekundy
  setInterval(() => {
    document.querySelectorAll('.glitch').forEach(el => {
      el.classList.add('glitch-active');
      setTimeout(() => el.classList.remove('glitch-active'), 300);
    });
  }, 3000);

  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  navToggle?.addEventListener('click', () => {
    navMenu.classList.toggle('show');
  });

  // Animacja wejścia kafelków portfolio (feature-card, portfolio-card)
  const cards = document.querySelectorAll('.portfolio-card, .feature-card:not(.robot-card), .portfolio-card-alt');
  cards.forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('visible');
    }, 200 + i * 120);
  });

  // Animacja wejścia kart robotów
  const robotCards = document.querySelectorAll('.robot-card');
  robotCards.forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('visible');
    }, 200 + i * 180);
  });

  // Dodaj efekt "bounce" na hover dla portfolio-card-alt (opcjonalnie)
  document.querySelectorAll('.portfolio-card-alt').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform .18s cubic-bezier(.4,1.2,.6,1)';
      card.style.transform += ' scale(1.06)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = card.style.transform.replace(' scale(1.06)', '');
    });
  });
});
