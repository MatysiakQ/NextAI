// Funkcja do automatycznego wykrywania poprawnej ścieżki
function getCorrectPath() {
  const path = window.location.pathname;
  if (path === '/' || path.includes('/main/') || path.endsWith('index.html')) {
    return './userpanel/';
  }
  return '../userpanel/';
}
// main.js
document.addEventListener('DOMContentLoaded', () => {
  window.checkLoginStatus = async function () {
    try {
      const res = await fetch(getCorrectPath() + 'auth.php?action=verify', {
        credentials: 'include',
        cache: 'no-cache'
      });

      // Sprawdź czy odpowiedź to JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Otrzymano odpowiedź, która nie jest JSON-em');
        localStorage.removeItem('nextai_logged_in');
        document.cookie = 'nextai_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=lax';
        return false;
      }

      const data = await res.json();

      // Zapisz status w localStorage i cookie jako backup
      if (data.success && data.logged_in) {
        localStorage.setItem('nextai_logged_in', 'true');
        const expires = new Date();
        expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 dni
        document.cookie = `nextai_session=true; expires=${expires.toUTCString()}; path=/; secure; samesite=lax`;
        return true;
      } else {
        localStorage.removeItem('nextai_logged_in');
        document.cookie = 'nextai_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=lax';
        return false;
      }
    } catch (error) {
      console.error('Błąd sprawdzania statusu logowania:', error);
      localStorage.removeItem('nextai_logged_in');
      document.cookie = 'nextai_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=lax';
      return false;
    }
  };

  // Funkcja inicjalizująca sprawdzanie sesji
  window.initSessionCheck = function () {
    // Sprawdź status przy załadowaniu strony
    window.checkLoginStatus();

    // Sprawdzaj status co 10 minut
    setInterval(() => {
      window.checkLoginStatus();
    }, 10 * 60 * 1000);

    // Sprawdź status gdy użytkownik wraca do karty
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        window.checkLoginStatus();
      }
    });
  };


  // Inicjalizuj sprawdzanie sesji
  window.initSessionCheck();
  // NAVIGATION
  const menu = document.querySelector('.nav-menu');
  const links = document.querySelectorAll('.nav-item a');
  const indicator = document.createElement('div');
  indicator.classList.add('nav-indicator');
  if (menu) menu.appendChild(indicator);

  let hoveredLink = null;
  let navMenuHovered = false;

  // Funkcja do ustawiania wskaźnika na danym linku
  function updateIndicator(link) {
    if (!link || !menu) return;
    const rect = link.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    indicator.style.width = `${rect.width}px`;
    indicator.style.transform = `translateX(${rect.left - menuRect.left}px)`;
  }

  // Funkcja do ustawiania wskaźnika na aktywnym linku
  function setIndicatorToActive() {
    if (!hoveredLink) {
      const activeLink = document.querySelector('.nav-item a.active');
      if (activeLink) updateIndicator(activeLink);
    }
  }

  // Ustaw wskaźnik na aktywny element przy załadowaniu strony
  setIndicatorToActive();

  // Nowa logika wskaźnika: pointerenter/pointerleave na całym menu
  if (menu) {
    menu.addEventListener('pointerenter', () => {
      navMenuHovered = true;
    });
    menu.addEventListener('pointerleave', () => {
      navMenuHovered = false;
      hoveredLink = null;
      setIndicatorToActive();
    });
  }

  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      hoveredLink = link;
      updateIndicator(link);
    });
    link.addEventListener('mouseleave', () => {
      hoveredLink = null;
      // Nie wracaj na aktywny, dopóki kursor jest w menu
      setTimeout(() => {
        if (!navMenuHovered) setIndicatorToActive();
      }, 10);
    });
    link.addEventListener('touchend', () => {
      hoveredLink = null;
      setIndicatorToActive();
    });
  });

  // Po opuszczeniu całej nawigacji (ul.nav-menu) wracaj na aktywny
  if (menu) {
    menu.addEventListener('mouseleave', () => {
      hoveredLink = null;
      setIndicatorToActive();
    });
  }

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
    interval = setInterval(next, 10000); // Reset na 10 sekund
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

  let interval = setInterval(next, 10000); // Automatyczne przesuwanie co 10 sekund
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

  if (chatToggle && chatWidget) {
    chatToggle.addEventListener('click', () => {
      chatToggle.classList.add('opening');
      setTimeout(() => {
        chatWidget.classList.add('open');
        chatToggle.style.display = 'none';
        chatToggle.classList.remove('opening');
        if (chatQuestion) chatQuestion.focus();
      }, 300);
    });
  }

  if (chatClose && chatWidget && chatToggle) {
    chatClose.addEventListener('click', () => {
      chatWidget.classList.remove('open');
      chatToggle.classList.add('closing');
      chatToggle.style.display = 'flex';
      setTimeout(() => {
        chatToggle.classList.remove('closing');
      }, 300);
    });
  }

  if (chatQuestion) {
    chatQuestion.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (chatSend) {
    chatSend.addEventListener('click', sendMessage);
  }

  function appendMessage(sender, message, who = 'bot') {
    if (!chatBody) return;
    const msg = document.createElement('div');
    msg.className = 'chat-message ' + (who === 'user' ? 'user' : 'bot');
    msg.innerHTML = `<span class="sender">${sender}</span>${message}`;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  let lastChatSendTime = 0;

  function showChatCooldown() {
    // Zablokuj input i przycisk wysyłania
    if (chatQuestion) chatQuestion.disabled = true;
    if (chatSend) chatSend.disabled = true;
  }

  function hideChatCooldown() {
    // Odblokuj input i przycisk wysyłania
    if (chatQuestion) chatQuestion.disabled = false;
    if (chatSend) chatSend.disabled = false;
  }

  async function sendMessage() {
    if (!chatQuestion) return;
    const text = chatQuestion.value.trim();
    if (!text) return;

    const now = Date.now();
    const diff = now - lastChatSendTime;
    if (diff < 5000) {
      showChatCooldown();
      // Dodaj powiadomienie i usuń je po 4 sekundach
      const warnMsg = document.createElement('div');
      warnMsg.className = 'chat-message bot';
      warnMsg.innerHTML = '<span class="sender">NextAI</span><span style="color:#ff5c5c;">Możesz wysłać kolejną wiadomość dopiero za 5 sekund.</span>';
      chatBody.appendChild(warnMsg);
      chatBody.scrollTop = chatBody.scrollHeight;
      setTimeout(() => {
        if (warnMsg.parentNode) warnMsg.parentNode.removeChild(warnMsg);
        hideChatCooldown();
      }, 5000);
      return;
    }
    lastChatSendTime = now;
    hideChatCooldown();

    appendMessage('Ty', text, 'user');
    chatQuestion.value = '';
    appendMessage('NextAI', '<span style="opacity:.7;">piszę odpowiedź<span class="dot-anim"><span>.</span><span>.</span><span>.</span></span></span>', 'bot');
    try {
      const res = await fetch('https://nextai.app.n8n.cloud/webhook/chatbot', {
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

  function updateLastBotMessage(newText) {
    if (!chatBody) return;
    const messages = chatBody.querySelectorAll('.chat-message.bot');
    if (messages.length) {
      messages[messages.length - 1].innerHTML = `<span class="sender">NextAI</span>${newText}`;
    }
  }

  // Modale dla kwadratów współpracy
  const boxModals = [
    document.getElementById('modal-2'), // box-2: konsultacja
    document.getElementById('modal-1'), // box-1: umowa
    document.getElementById('modal-3'), // box-3: wdrożenie
  ];
  document.querySelectorAll('.triangle-box').forEach((box, idx) => {
    box.addEventListener('click', () => {
      const modal = boxModals[idx];
      if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
      }
    });
  });

  document.querySelectorAll('.close-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      const modal = document.getElementById(`modal-${modalId}`);
      if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }
    });
  });

  boxModals.forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          document.body.classList.remove('modal-open');
        }
      });
    }
  });

  // Przełącznik płatności
  const billingBtn = document.getElementById('billing-switch');
  let yearly = false;

  if (billingBtn) {
    billingBtn.addEventListener('click', () => {
      yearly = !yearly;

      document.querySelectorAll('.package-card').forEach(card => {
        const price = card.querySelector('.price');
        if (!price) return;
        const monthly = price.querySelector('.monthly');
        const yearlyBlock = price.querySelector('.yearly-block');
        if (yearly) {
          if (monthly) monthly.classList.add('hidden');
          if (yearlyBlock) yearlyBlock.classList.remove('hidden');
          price.classList.add('yearly-active');
        } else {
          if (monthly) monthly.classList.remove('hidden');
          if (yearlyBlock) yearlyBlock.classList.add('hidden');
          price.classList.remove('yearly-active');
        }
      });

      document.querySelectorAll('.price-header').forEach(h => {
        h.textContent = yearly ? 'Cena/rok' : 'Cena/msc';
      });

      billingBtn.textContent = yearly
        ? 'Przełącz na płatność miesięczną'
        : 'Przełącz na płatność roczną';
    });
  }

  // Obsługa przycisków subskrypcji (przekierowanie z odpowiednim typem płatności)
  document.querySelectorAll('.package-card .subscribe-button').forEach(button => {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      const card = this.closest('.package-card');
      // Ustal pakiet
      let packageType = 'basic';
      if (card && card.classList.contains('premium')) packageType = 'pro';
      if (card && card.classList.contains('enterprise')) {
        window.open('enterpirse_form.html', '_blank');
        return;
      }
      // Sprawdź czy na stronie jest aktywna płatność roczna
      let isYearly = false;
      const billingBtn = document.getElementById('billing-switch');
      if (billingBtn && billingBtn.textContent.includes('miesięczną')) {
        isYearly = true;
      }
      // Przekieruj z odpowiednim parametrem billing
      const billingParam = isYearly ? 'yearly' : 'monthly';
      window.location.href = `../sub/subskrypcja.html?package=${packageType}&billing=${billingParam}`;
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

  const planPrices = {
    basic: { monthly: 599, yearly: 5750 },
    pro: { monthly: 1299, yearly: 12470 },
    enterprise: { monthly: 2990, yearly: 28600 },
  };

  // Zapisz ceny w localStorage
  localStorage.setItem("planPrices", JSON.stringify(planPrices));

  // USER MENU DROPDOWN (działa na każdej stronie)
  const userMenuToggle = document.getElementById('user-menu-toggle');
  const userMenu = document.getElementById('user-menu');
  let isUserLoggedIn = false;

  // Dodane: nie rób nic jeśli nie ma tych elementów
  if (userMenuToggle && userMenu) {
    async function checkLoginStatus() {
      try {
        const res = await fetch('../userpanel/auth.php?action=verify', {
          credentials: 'include',
          cache: 'no-cache'
        });

        // Sprawdź czy odpowiedź to JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Otrzymano odpowiedź, która nie jest JSON-em');
          isUserLoggedIn = false;
          renderUserMenu();
          return;
        }

        const data = await res.json();
        isUserLoggedIn = data.success && data.logged_in;

        // Zapisz status w localStorage jako backup
        if (isUserLoggedIn) {
          localStorage.setItem('nextai_logged_in', 'true');
        } else {
          localStorage.removeItem('nextai_logged_in');
        }

        renderUserMenu();
      } catch (error) {
        console.error('Błąd sprawdzania statusu logowania:', error);
        isUserLoggedIn = false;
        localStorage.removeItem('nextai_logged_in');
        renderUserMenu();
      }
    }

    function renderUserMenu() {
      if (!userMenu) return;
      userMenu.innerHTML = '';
      if (!isUserLoggedIn) {
        userMenu.innerHTML = `
          <button type="button" id="user-login-btn">Zaloguj się</button>
          <a href="#" id="user-terms-link">Regulamin</a>
          <a href="#contact">Pomoc</a>
        `;
      } else {
        userMenu.innerHTML = `
          <button type="button" id="user-account-btn">Moje konto</button>
          <a href="#" id="user-terms-link">Regulamin</a>
          <a href="#contact">Pomoc</a>
          <button type="button" id="user-logout-btn">Wyloguj się</button>
        `;
      }
    }

    // Pokaz/ukryj menu po kliknięciu w całą ikonkę/przycisk
    userMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenu.classList.toggle('hidden');
      userMenuToggle.classList.toggle('active', !userMenu.classList.contains('hidden'));
    });

    // Zamknij menu po kliknięciu poza nim
    document.addEventListener('click', (e) => {
      if (!userMenu.classList.contains('hidden')) {
        // Zamknij jeśli kliknięto poza menu i poza przyciskiem
        if (!userMenu.contains(e.target) && !userMenuToggle.contains(e.target)) {
          userMenu.classList.add('hidden');
          userMenuToggle.classList.remove('active');
        }
      }
    });

    // Delegacja obsługi kliknięć w menu użytkownika
    userMenu.addEventListener('click', async function (e) {
      if (e.target.id === 'user-login-btn') {
        localStorage.setItem('afterLoginRedirect', window.location.pathname);
        window.location.href = '../userpanel/login.php';
      }
      if (e.target.id === 'user-account-btn') {
        window.location.href = '../userpanel/user_panel.html';
      }
      if (e.target.id === 'user-logout-btn') {
        try {
          await fetch('../userpanel/auth.php?action=logout', {
            credentials: 'include',
            method: 'POST'
          });
          isUserLoggedIn = false;
          localStorage.removeItem('nextai_logged_in');
          localStorage.setItem('justLoggedOut', '1');
          window.location.href = '/index.html'; // poprawione przekierowanie
        } catch (error) {
          console.error('Błąd podczas wylogowywania:', error);
        }
      }
      if (e.target.id === 'user-terms-link') {
        e.preventDefault();
        window.location.href = '../main/Regulamin_NextAi.pdf';
      }
    });

    // Sprawdź status logowania na starcie (na każdej stronie)
    checkLoginStatus();

    // Sprawdzaj status co 10 minut
    setInterval(checkLoginStatus, 10 * 60 * 1000);
  }

  // MODAL: Dodaj opinię
  const addOpinionBtn = document.getElementById('add-opinion-btn');
  const addOpinionModal = document.getElementById('add-opinion-modal');
  const closeOpinionModal = document.getElementById('close-opinion-modal');
  const opinionForm = document.getElementById('opinion-form');
  const opinionSuccess = document.getElementById('opinion-success');
  const addOpinionInfo = document.getElementById('add-opinion-info');
  // Dodane: obsługa anonimowości
  const opinionName = document.getElementById('opinion-name');
  const opinionAnonymous = document.getElementById('opinion-anonymous');
  const opinionText = document.getElementById('opinion-text');

  // Obsługa checkboxa anonimowości (naprawiona)
  if (opinionAnonymous && opinionName) {
    opinionAnonymous.addEventListener('change', function () {
      if (this.checked) {
        opinionName.value = '';
        opinionName.disabled = true;
        opinionName.placeholder = 'Anonimowy';
        opinionName.classList.add('anon-placeholder');
      } else {
        opinionName.disabled = false;
        opinionName.placeholder = 'Imię lub nick';
        opinionName.classList.remove('anon-placeholder');
      }
    });
  }

  // Dodaj licznik słów do formularza opinii
  let wordCounterEl = null;
  if (opinionText) {
    wordCounterEl = document.createElement('div');
    wordCounterEl.id = 'opinion-word-counter';
    wordCounterEl.style.cssText = 'font-size:0.95em;color:#0ff;text-align:right;margin-top:-8px;margin-bottom:4px;';
    opinionText.parentNode.insertBefore(wordCounterEl, opinionText.nextSibling);

    function updateWordCounter() {
      const words = opinionText.value.trim().split(/\s+/).filter(Boolean);
      wordCounterEl.textContent = `${words.length}/50`;
    }
    opinionText.addEventListener('input', updateWordCounter);
    if (addOpinionBtn && addOpinionModal) {
      addOpinionBtn.addEventListener('click', () => setTimeout(updateWordCounter, 50));
    }
  }

  // Główna funkcja pobierania opinii
  async function fetchAndRenderOpinions() {
    const testimonialSlider = document.querySelector('.testimonial-slider');
    if (!testimonialSlider) return;
    try {
      // Dodaj parametr czasowy, by zawsze pobierać świeże dane (omija cache)
      const res = await fetch('main/opinions_to_db/get_opinions.php?ts=' + Date.now(), { cache: 'no-store' });
      const opinions = await res.json();
      testimonialSlider.innerHTML = '';
      opinions.forEach((op, i) => {
        const card = document.createElement('div');
        card.className = 'testimonial-card';
        card.innerHTML = `
        <span class="testimonial-avatar">
          <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
            <circle cx="27" cy="20" r="12" fill="#e0e0e0" />
            <ellipse cx="27" cy="41" rx="16" ry="10" fill="#e0e0e0" />
          </svg>
        </span>
        <span class="testimonial-name">${op.name ? op.name : 'Anonimowy'}</span>
        <span class="testimonial-stars">
          ${'<i class="fa fa-star"></i>'.repeat(Number(op.stars))}
          ${Number(op.stars) < 5 ? '<i class="fa-regular fa-star"></i>'.repeat(5 - Number(op.stars)) : ''}
        </span>
        <p class="testimonial-text">${op.text || ''}</p>
      `;
        testimonialSlider.appendChild(card);
      });
      // Zawsze uruchom slider po załadowaniu opinii
      setTimeout(() => {
        if (typeof initTestimonialSlider === 'function') {
          initTestimonialSlider();
        } else if (typeof window.initTestimonialSlider === 'function') {
          window.initTestimonialSlider();
        }
      }, 0);
      // Pokaż kontrolki jeśli są opinie
      const controls = document.querySelector('.testimonial-controls');
      if (controls) {
        controls.style.display = opinions.length > 0 ? 'flex' : 'none';
      }
    } catch (e) {
      console.error('Błąd pobierania opinii:', e);
    }
  }

  // Slider zawsze podpinaj do nowych kart!
  function initTestimonialSlider() {
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const prevBtn = document.querySelector('.testimonial-prev');
    const nextBtn = document.querySelector('.testimonial-next');
    if (!testimonialCards.length) return;

    let idx = 0;
    let autoInterval = null;

    function updateTestimonials() {
      const cardsArr = Array.from(document.querySelectorAll('.testimonial-card'));
      cardsArr.forEach((el, i) => {
        el.classList.remove('left', 'center', 'right', 'hidden');
        if (i === idx % cardsArr.length) {
          el.classList.add('left');
        } else if (i === (idx + 1) % cardsArr.length) {
          el.classList.add('center');
        } else if (i === (idx + 2) % cardsArr.length) {
          el.classList.add('right');
        } else {
          el.classList.add('hidden');
        }
      });
    }

    function nextTestimonial() {
      const cardsArr = Array.from(document.querySelectorAll('.testimonial-card'));
      idx = (idx + 1) % cardsArr.length;
      updateTestimonials();
    }

    function prevTestimonial() {
      const cardsArr = Array.from(document.querySelectorAll('.testimonial-card'));
      idx = (idx - 1 + cardsArr.length) % cardsArr.length;
      updateTestimonials();
    }

    function startAutoSlide() {
      if (autoInterval) clearInterval(autoInterval);
      autoInterval = setInterval(nextTestimonial, 5000);
    }

    // Usuwamy stare eventy, żeby nie dublować!
    if (prevBtn) {
      const newPrev = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(newPrev, prevBtn);
      newPrev.addEventListener('click', () => {
        prevTestimonial();
        startAutoSlide();
      });
    }
    if (nextBtn) {
      const newNext = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newNext, nextBtn);
      newNext.addEventListener('click', () => {
        nextTestimonial();
        startAutoSlide();
      });
    }

    updateTestimonials();
    startAutoSlide();
  }

  // NA SAMYM DOLE PLIKU!
  window.addEventListener('load', fetchAndRenderOpinions);


  // Zmieniona obsługa przycisku "Dodaj opinię"
  if (addOpinionBtn) {
    addOpinionBtn.addEventListener('click', async () => {
      // Sprawdź status logowania przed pokazaniem modala
      let loggedIn = false;
      try {
        const res = await fetch('../userpanel/auth.php?action=verify', {
          credentials: 'include',
          cache: 'no-cache'
        });

        // Sprawdź czy odpowiedź to JSON
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          loggedIn = data.success && data.logged_in;
        }
      } catch {
        loggedIn = false;
      }

      if (loggedIn) {
        if (addOpinionModal) {
          addOpinionModal.classList.remove('hidden');
          document.body.classList.add('modal-open');
          if (opinionForm) opinionForm.reset();
          if (opinionSuccess) opinionSuccess.classList.add('hidden');
          // Resetuj stan anonimowości
          if (opinionAnonymous && opinionName) {
            opinionName.disabled = false;
            opinionName.placeholder = 'Imię lub nick';
          }
        }
        if (addOpinionInfo) addOpinionInfo.style.display = 'none';
      } else {
        if (addOpinionInfo) {
          addOpinionInfo.textContent = "Aby dodać opinię, musisz się zalogować";
          addOpinionInfo.style.display = 'block';
          setTimeout(() => { addOpinionInfo.style.display = 'none'; }, 4000);
        }
        // NIE pokazuj modala!
        if (addOpinionModal) addOpinionModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }
    });
  }

  if (closeOpinionModal && addOpinionModal) {
    closeOpinionModal.addEventListener('click', () => {
      addOpinionModal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    });
    addOpinionModal.addEventListener('click', (e) => {
      if (e.target === addOpinionModal) {
        addOpinionModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }
    });
  }

  if (opinionForm && opinionSuccess) {
    opinionForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      // Obsługa anonimowości (naprawiona)
      let name = '';
      if (opinionAnonymous && opinionAnonymous.checked) {
        name = 'Anonimowy';
      } else if (opinionName) {
        name = opinionName.value.trim();
      }
      const stars = document.getElementById('opinion-stars')?.value || '5';
      let text = opinionText?.value.trim() || '';

      // Ograniczenie do 50 słów
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length > 50) {
        alert('Opinia może zawierać maksymalnie 50 słów.');
        return;
      }

      // Zapisz opinię do bazy danych przez PHP
      try {
        const resp = await fetch('main/opinions_to_db/add_opinion.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            stars: stars,
            text: text,
            anonymous: opinionAnonymous && opinionAnonymous.checked ? 1 : 0
          })
        });
        const result = await resp.json();
        if (!result.success) {
          alert(result.message || 'Błąd podczas dodawania opinii.');
          return;
        }
      } catch (err) {
        alert('Błąd połączenia z serwerem.');
        return;
      }

      // Po sukcesie: odśwież listę opinii
      await fetchAndRenderOpinions();

      opinionSuccess.classList.remove('hidden');
      setTimeout(() => {
        if (addOpinionModal) addOpinionModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        opinionSuccess.classList.add('hidden');
        opinionForm.reset();
        if (opinionName) {
          opinionName.disabled = false;
          opinionName.placeholder = 'Imię lub nick';
          opinionName.classList.remove('anon-placeholder');
        }
        if (wordCounterEl) wordCounterEl.textContent = '0/50';
      }, 1800);
    });
  }

  // Funkcje rysowania strzałek
  function drawArrow1to2() {
    const box1 = document.getElementById('triangle-konsultacja');
    const box2 = document.getElementById('triangle-umowa');
    const container = document.querySelector('.cooperation-container.triangle-layout');
    const line = document.getElementById('arrow-1-2-line');
    if (!box1 || !box2 || !container || !line) return;

    const cRect = container.getBoundingClientRect();
    const b1Rect = box1.getBoundingClientRect();
    const b2Rect = box2.getBoundingClientRect();

    const x1 = b1Rect.left - cRect.left + b1Rect.width / 2;
    const y1 = b1Rect.top - cRect.top;
    let x2 = b2Rect.left - cRect.left + b2Rect.width / 2 - 30;
    let y2 = b2Rect.top - cRect.top + b2Rect.height;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const shorten = 18;
    if (len > shorten) {
      x2 = x2 - (dx / len) * shorten;
      y2 = y2 - (dy / len) * shorten;
    }

    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
  }

  function drawArrow2to3() {
    const box2 = document.getElementById('triangle-umowa');
    const box3 = document.getElementById('triangle-wdrozenie');
    const container = document.querySelector('.cooperation-container.triangle-layout');
    const line = document.getElementById('arrow-2-3-line');
    if (!box2 || !box3 || !container || !line) return;

    const cRect = container.getBoundingClientRect();
    const b2Rect = box2.getBoundingClientRect();
    const b3Rect = box3.getBoundingClientRect();

    let x1 = b2Rect.left - cRect.left + b2Rect.width / 2 + 30;
    let y1 = b2Rect.top - cRect.top + b2Rect.height;
    let x2 = b3Rect.left - cRect.left + b3Rect.width / 2;
    let y2 = b3Rect.top - cRect.top;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const shorten = 18;
    if (len > shorten) {
      x2 = x2 - (dx / len) * shorten;
      y2 = y2 - (dy / len) * shorten;
    }

    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
  }

  function drawArrow3to1() {
    const box3 = document.getElementById('triangle-wdrozenie');
    const box1 = document.getElementById('triangle-konsultacja');
    const container = document.querySelector('.cooperation-container.triangle-layout');
    const line = document.getElementById('arrow-3-1-line');
    if (!box3 || !box1 || !container || !line) return;

    const cRect = container.getBoundingClientRect();
    const b3Rect = box3.getBoundingClientRect();
    const b1Rect = box1.getBoundingClientRect();

    let x1 = b3Rect.left - cRect.left;
    let y1 = b3Rect.top - cRect.top + b3Rect.height / 2;
    let x2 = b1Rect.left - cRect.left + b1Rect.width;
    let y2 = b1Rect.top - cRect.top + b1Rect.height / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const shorten = 18;
    if (len > shorten) {
      x2 = x2 - (dx / len) * shorten;
      y2 = y2 - (dy / len) * shorten;
    }

    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
  }

  // Rysuj strzałki przy załadowaniu i zmianie rozmiaru okna
  function drawAllArrows() {
    drawArrow1to2();
    drawArrow2to3();
    drawArrow3to1();
  }

  drawAllArrows();
  window.addEventListener('resize', drawAllArrows);
});

// Obsługa linku do chatbota
document.addEventListener("DOMContentLoaded", function () {
  const chatbotLink = document.getElementById("open-chatbot");
  const chatToggle = document.getElementById("chat-toggle");
  const chatWidget = document.getElementById("chat-widget");

  if (chatbotLink && chatToggle && chatWidget) {
    chatbotLink.addEventListener("click", function (e) {
      e.preventDefault();
      if (!chatWidget.classList.contains("open")) {
        chatToggle.click();
      }
    });
  }
});

// Obsługa formularza kontaktowego
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);

    try {
      const response = await fetch("../sub/checkout.php", {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData
      });

      if (response.ok) {
        const successModal = document.getElementById('success-modal');
        if (successModal) successModal.classList.remove('hidden');
        this.reset();
      } else {
        alert("Wystąpił błąd podczas wysyłania formularza.");
      }
    } catch (error) {
      alert("Nie można połączyć się z serwerem.");
    }
  });
}

// Newsletter form
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = this.newsletter_email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Podaj poprawny email!');
    this.reset();
    const successEl = document.querySelector('.newsletter-success');
    if (successEl) {
      successEl.classList.remove('hidden');
      setTimeout(() => successEl.classList.add('hidden'), 4000);
    }
  });
}

// Progress bar przy ładowaniu strony
window.addEventListener('DOMContentLoaded', () => {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  let width = 0;
  bar.style.width = '0';
  const interval = setInterval(() => {
    width += Math.random() * 10;
    bar.style.width = Math.min(width, 90) + '%';
    if (width >= 90) clearInterval(interval);
  }, 120);
  window.addEventListener('load', () => {
    bar.style.width = '100%';
    setTimeout(() => bar.style.opacity = '0', 400);
  });
});

// Parallax effect
window.addEventListener('scroll', () => {
  document.querySelectorAll('section').forEach((sec, i) => {
    sec.style.backgroundPositionY = `${window.scrollY * 0.05 * (i % 2 === 0 ? 1 : -1)}px`;
  });
});

// Zamknięcie modali klawiszem Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
      modal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    });
  }
});

// MODAL "Wylogowano" na każdej podstronie
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    if (localStorage.getItem("justLoggedOut") === "1") {
      localStorage.removeItem("justLoggedOut");
      var modal = document.getElementById("logout-modal");
      if (modal) {
        modal.classList.remove("hidden");
      }
    }
  }, 100);
});