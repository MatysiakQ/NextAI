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
      // Ustaw transform bezpośrednio na scale(1.06), nie doklejaj do istniejącego
      card.style.transform = 'scale(1.06)';
    });
    card.addEventListener('mouseleave', () => {
      // Przywróć transform do wartości początkowej (pusty string = domyślna)
      card.style.transform = '';
    });
  });

  // NAVIGATION INDICATOR LOGIC
  const menu = document.querySelector('.nav-menu');
  const links = document.querySelectorAll('.nav-item a');
  if (menu && links.length) {
    const indicator = document.createElement('div');
    indicator.classList.add('nav-indicator');
    menu.appendChild(indicator);

    let hoveredLink = null;

    function updateIndicator(link) {
      if (link) {
        const rect = link.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        indicator.style.width = `${rect.width}px`;
        indicator.style.transform = `translateX(${rect.left - menuRect.left}px)`;
      }
    }

    function setIndicatorToActive() {
      if (!hoveredLink) {
        const activeLink = document.querySelector('.nav-item a.active');
        if (activeLink) updateIndicator(activeLink);
      }
    }

    setIndicatorToActive();

    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        hoveredLink = link;
        updateIndicator(link);
      });
      link.addEventListener('mouseleave', () => {
        hoveredLink = null;
        setTimeout(() => {
          if (!document.querySelector('.nav-item a:hover')) {
            setIndicatorToActive();
          }
        }, 1);
      });
      link.addEventListener('touchend', () => {
        hoveredLink = null;
        setIndicatorToActive();
      });
    });

    menu.addEventListener('mouseleave', () => {
      hoveredLink = null;
      setIndicatorToActive();
    });
  }
});

document.querySelectorAll('.video-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const videoSrc = btn.getAttribute('data-video');
    const modal = document.getElementById('videoModal');
    const iframe = document.getElementById('videoFrame');
    iframe.src = videoSrc + "?autoplay=1";
    modal.style.display = 'flex';
    // Focus na close-btn dla accessibility
    setTimeout(() => {
      modal.querySelector('.close-btn')?.focus();
    }, 100);
  });
});

document.querySelector('.close-btn').addEventListener('click', () => {
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('videoFrame');
  iframe.src = '';
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  const modal = document.getElementById('videoModal');
  if (e.target === modal) {
    document.getElementById('videoFrame').src = '';
    modal.style.display = 'none';
  }
});

// Zamknięcie modala klawiszem Escape
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('videoModal');
  if (modal && modal.style.display === 'flex' && e.key === 'Escape') {
    document.getElementById('videoFrame').src = '';
    modal.style.display = 'none';
  }
});