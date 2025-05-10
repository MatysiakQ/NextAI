// main.js
document.addEventListener('DOMContentLoaded', () => {
  // NAVIGATION
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');
  const items = document.querySelectorAll('.nav-item');
  const indicator = document.querySelector('.nav-indicator');

  toggle?.addEventListener('click', () => {
    menu.classList.toggle('show');
  });

  function updateIndicator(el) {
    const link = el?.querySelector('a');
    if (!link || !indicator) return;
    indicator.style.width = link.offsetWidth + 'px';
    indicator.style.left = link.offsetLeft + 'px';
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
  const links = document.querySelectorAll('.nav-item a');
  const sections = document.querySelectorAll('section[id], .hero-section');

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
  function next() { current = (current + 1) % total; updateCards(); }
  function prev() { current = (current - 1 + total) % total; updateCards(); }
  function reset() {
    clearInterval(interval);
    interval = setInterval(next, 5000);
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
});
document.addEventListener('DOMContentLoaded', () => {
  // ... (pozostaw cały istniejący kod wewnątrz DOMContentLoaded)

  // Modale dla kwadratów współpracy
  const boxModals = {
    '1': document.getElementById('modal-1'),
    '2': document.getElementById('modal-2'),
    '3': document.getElementById('modal-3')
  };

  document.querySelectorAll('.triangle-box').forEach(box => {
    box.addEventListener('click', () => {
      const number = box.textContent.trim();
      const modal = boxModals[number];
      if (modal) modal.classList.remove('hidden');
    });
  });

  document.querySelectorAll('.close-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      document.getElementById(`modal-${modalId}`).classList.add('hidden');
    });
  });

  // Kliknięcie poza modalem — zamyka
  Object.values(boxModals).forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
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
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Określ typ pakietu
      const card = this.closest('.package-card');
      let packageType = 'basic';
      
      if (card.classList.contains('premium')) packageType = 'pro';
      if (card.classList.contains('enterprise')) packageType = 'enterprise';
      
      // Przekierowanie z parametrem
      window.location.href = '../sub/subskrypcja.html?package=' + packageType;
    });
  });
});