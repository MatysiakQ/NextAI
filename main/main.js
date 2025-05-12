// main.js
document.addEventListener('DOMContentLoaded', () => {
  // NAVIGATION
  const menu = document.querySelector('.nav-menu');
  const links = document.querySelectorAll('.nav-item a');
  const sections = document.querySelectorAll('section[id], .hero-section');
  const indicator = document.createElement('div');
  indicator.classList.add('nav-indicator');
  menu.appendChild(indicator);

  function updateIndicator(link) {
    if (!link) return;
    const rect = link.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    // Ustaw pozycję i szerokość wskaźnika
    indicator.style.width = `${rect.width}px`;
    indicator.style.transform = `translateX(${rect.left - menuRect.left}px)`;
  }

  function setActiveSection() {
    const scrollPosition = window.scrollY + 150; // Offset dla lepszej detekcji
    let activeSection = null;

    sections.forEach(section => {
      if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
        activeSection = section;
      }
    });

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (activeSection && href === `#${activeSection.id}`) {
        link.classList.add('active');
        updateIndicator(link);
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Ustaw wskaźnik na aktywny element przy załadowaniu strony
  const activeLink = document.querySelector('.nav-item a.active');
  if (activeLink) updateIndicator(activeLink);

  // Aktualizacja wskaźnika na scroll
  window.addEventListener('scroll', setActiveSection);

  // Aktualizacja wskaźnika na hover
  links.forEach(link => {
    link.addEventListener('mouseenter', () => updateIndicator(link));
    link.addEventListener('mouseleave', () => {
      const activeLink = document.querySelector('.nav-item a.active');
      if (activeLink) updateIndicator(activeLink);
    });
  });

  // Obsługa kliknięcia w linki nawigacji
  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const href = link.getAttribute('href');
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });

      // Ustaw aktywny link po kliknięciu
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      updateIndicator(link);
    });
  });

  // Ustaw aktywną sekcję na początku
  setActiveSection();

  // SLIDER
  let current = 0;
  const cards = document.querySelectorAll('.card');
  const total = cards.length;
  const nextBtn = document.querySelector('.slider-next');
  const prevBtn = document.querySelector('.slider-prev');

  function updateCards() {
    cards.forEach((c, i) => {
      c.className = 'card ' + (
        i === current ? 'center' :
          i === (current + 1) % total ? 'right' :
            i === (current - 1 + total) % total ? 'left' : ''
      );
    });
  }

  function next() {
    current = (current + 1) % total;
    updateCards();
  }

  function prev() {
    current = (current - 1 + total) % total;
    updateCards();
  }

  function reset() {
    clearInterval(interval);
    interval = setInterval(next, 5000);
  }

  // Dodanie obsługi kliknięcia na kartę
  cards.forEach((card, index) => {
    card.addEventListener('click', () => {
      if (index === current) return; // Jeśli kliknięta karta jest już na środku, nic nie rób
      current = index; // Ustaw klikniętą kartę jako główną
      updateCards();
      reset(); // Zresetuj automatyczne przesuwanie
    });
  });

  let interval = setInterval(next, 5000); // Automatyczne przesuwanie co 5 sekund
  nextBtn?.addEventListener('click', () => { next(); reset(); });
  prevBtn?.addEventListener('click', () => { prev(); reset(); });
  if (cards.length) updateCards();

  // GLITCH every 3 seconds
  setInterval(() => {
    document.querySelectorAll('.glitch').forEach(el => {
      el.classList.add('glitch-active');
      setTimeout(() => el.classList.remove('glitch-active'), 300);
    });
  }, 3000);

  // CHAT WIDGET TOGGLE & ANIMATION
  const chatToggle = document.getElementById('chat-toggle');
  const chatWidget = document.getElementById('chat-widget');
  const chatBody = document.getElementById('chat-body');
  const chatQuestion = document.getElementById('chat-question');
  const chatSend = document.getElementById('chat-send');
  const chatClose = document.getElementById('chat-close');

  chatToggle.addEventListener('click', () => {
    chatToggle.classList.add('opening');
    setTimeout(() => {
      chatWidget.classList.add('open');
      chatToggle.style.display = 'none';
      chatToggle.classList.remove('opening');
      chatQuestion.focus();
    }, 300);
  });
  
  chatClose.addEventListener('click', () => {
    chatWidget.classList.remove('open');
    chatToggle.classList.add('closing');
    chatToggle.style.display = 'block';
    setTimeout(() => {
      chatToggle.classList.remove('closing');
    }, 300);
  });  
  chatQuestion.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  chatSend.addEventListener('click', sendMessage);

  async function sendMessage() {
    const text = chatQuestion.value.trim();
    if (!text) return;
    appendMessage('Ty', text);
    chatQuestion.value = '';
    appendMessage('Asystent', 'piszę odpowiedź...');
    try {
      const res = await fetch('http://localhost:5678/webhook-test/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text })
      });
      const data = await res.json();
      updateLastBotMessage(data.output || '(Brak odpowiedzi)');
    } catch (err) {
      updateLastBotMessage('Błąd połączenia z serwerem. Skontaktuj się z nami poprzez formularz mailowy.');
    }
  }

  function appendMessage(sender, message) {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatBody.appendChild(p);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function updateLastBotMessage(newText) {
    const messages = chatBody.querySelectorAll('p');
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].innerText.startsWith('Asystent:')) {
        messages[i].innerHTML = `<strong>Asystent:</strong> ${newText}`;
        break;
      }
    }
  }

  // Modale dla kwadratów współpracy
  const boxModals = {
    'Krok 1': document.getElementById('modal-1'),
    'Krok 2': document.getElementById('modal-2'),
    'Krok 3': document.getElementById('modal-3')
  };

  document.querySelectorAll('.triangle-box').forEach(box => {
    box.addEventListener('click', () => {
      const number = box.textContent.trim();
      const modal = boxModals[number];
      if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open'); // Dodanie klasy blokującej scroll
      }
    });
  });

  document.querySelectorAll('.close-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      document.getElementById(`modal-${modalId}`).classList.add('hidden');
      document.body.classList.remove('modal-open'); // Usunięcie klasy blokującej scroll
    });
  });

  // Kliknięcie poza modalem — zamyka modal
  Object.values(boxModals).forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open'); // Usunięcie klasy blokującej scroll
      }
    });
  });

  // Przełącznik płatności
  const billingBtn = document.getElementById('billing-switch');
  const monthlyPrices = document.querySelectorAll('.price .monthly');
  const yearlyPrices = document.querySelectorAll('.price .yearly');
  const priceHeaders = document.querySelectorAll('.price-header');
  
  let yearly = false;
  
  if (billingBtn) {
    billingBtn.addEventListener('click', () => {
      yearly = !yearly;
    
      // Przełącz widoczność cen
      monthlyPrices.forEach(p => p.classList.toggle('hidden', yearly));
      yearlyPrices.forEach(p => p.classList.toggle('hidden', !yearly));
    
      // Zmień nagłówek
      priceHeaders.forEach(h => {
        h.textContent = yearly ? 'Cena/rok' : 'Cena/msc';
      });
    
      billingBtn.textContent = yearly
        ? 'Przełącz na płatność miesięczną'
        : 'Przełącz na płatność roczną';
    });
  }

  // Obsługa przycisków subskrypcji
  document.querySelectorAll('.subscribe-button').forEach(button => {
    button.addEventListener('click', function (e) {
      e.preventDefault();

      // Określ typ pakietu
      const card = this.closest('.package-card');
      let packageType = 'basic'; // Domyślnie ustawiamy na "basic"

      if (card.classList.contains('premium')) packageType = 'pro';

      // Przekierowanie z parametrem
      window.location.href = `../sub/subskrypcja.html?package=${packageType}`;
    });
  });

  // Link do regulaminu
  const termsLink = document.getElementById('terms-link');
  if (termsLink) {
    termsLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '../main/Regulamin_NextAi.pdf';
    });
  }
});