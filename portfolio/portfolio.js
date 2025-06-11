// Portfolio page JS
document.addEventListener('DOMContentLoaded', () => {
  // Glitch effect co 3 sekundy
  setInterval(() => {
    document.querySelectorAll('.glitch').forEach(el => {
      el.classList.add('glitch-active');
      setTimeout(() => el.classList.remove('glitch-active'), 300);
    });
  }, 3000);



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
  // ...nie dodawaj tu własnej obsługi wskaźnika nawigacji ani menu użytkownika...
});

document.querySelectorAll('.video-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const videoSrc = btn.getAttribute('data-video');
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('videoPlayer');
    // Zamiast video wyświetl komunikat o produkcji filmu
    modal.querySelector('.video-modal-content').innerHTML = `
      <span class="close-btn">&times;</span>
      <div style="padding:40px 0;text-align:center;">
        <i class="fa-solid fa-video-slash" style="font-size:3em;color:#FFD700;margin-bottom:18px;"></i>
        <h3 style="color:#0ff;margin-bottom:16px;">Filmik w trakcie produkcji</h3>
        <p style="color:#b8f6f6;font-size:1.15em;">Zapraszamy niebawem do obejrzenia prezentacji tego wdrożenia!</p>
      </div>
    `;
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.querySelector('.close-btn')?.focus();
    }, 100);
    // Obsługa zamknięcia
    modal.querySelector('.close-btn').onclick = () => {
      modal.style.display = 'none';
      // Przywróć oryginalną zawartość video po zamknięciu
      modal.querySelector('.video-modal-content').innerHTML = `
        <span class="close-btn">&times;</span>
        <video id="videoPlayer" width="100%" controls autoplay>
          <source src="" type="video/mp4" />
          Twój przeglądarka nie obsługuje HTML5 Video.
        </video>
      `;
    };
    // Dodaj obsługę zamykania po kliknięciu poza modal-content
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        // Przywróć oryginalną zawartość video po zamknięciu
        modal.querySelector('.video-modal-content').innerHTML = `
          <span class="close-btn">&times;</span>
          <video id="videoPlayer" width="100%" controls autoplay>
            <source src="" type="video/mp4" />
            Twój przeglądarka nie obsługuje HTML5 Video.
          </video>
        `;
      }
    };
  });
});

// Zamknięcie modala klawiszem Escape
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('videoModal');
  if (modal && modal.style.display === 'flex' && e.key === 'Escape') {
    document.getElementById('videoFrame').src = '';
    modal.style.display = 'none';
  }
});
// ...nie dodawaj tu własnej obsługi menu użytkownika – całość jest w main.js