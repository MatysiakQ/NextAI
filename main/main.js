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
  // Poprawka: obsługa kliknięcia po zmianie na ikonki
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
      document.getElementById(`modal-${modalId}`).classList.add('hidden');
      document.body.classList.remove('modal-open');
    });
  });

  Object.values(boxModals).forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }
    });
  });

  // Przełącznik płatności
  const billingBtn = document.getElementById('billing-switch');
  const monthlyPrices = document.querySelectorAll('.price .monthly');
  const yearlyPrices = document.querySelectorAll('.price .yearly');
  const priceHeaders = document.querySelectorAll('.price-header');
  const savingsText = document.createElement('span'); // Element do wyświetlania oszczędności
  savingsText.classList.add('savings-text');

  let yearly = false;

  if (billingBtn) {
    // billingBtn.addEventListener('click', () => {
    //   yearly = !yearly;

    //   // Przełącz widoczność cen
    //   monthlyPrices.forEach(p => {
    //     if (yearly) {
    //       const monthlyPrice = parseInt(p.textContent, 10);
    //       const yearlyPrice = Math.round(monthlyPrice * 12 * 0.8); // 20% zniżki
    //       const parent = p.parentElement;

    //       // Dodaj przekreśloną cenę miesięczną
    //       const crossedPrice = document.createElement('span');
    //       crossedPrice.classList.add('crossed-price');
    //       crossedPrice.textContent = `${monthlyPrice * 12} PLN`;
    //       crossedPrice.style.color = 'red';
    //       crossedPrice.style.textDecoration = 'line-through';

    //       // Dodaj cenę roczną i oszczędności
    //       const yearlyPriceElement = document.createElement('span');
    //       yearlyPriceElement.classList.add('yearly-price');
    //       yearlyPriceElement.textContent = `${yearlyPrice} PLN`;

    //       // Dodaj tekst oszczędności
    //       savingsText.textContent = 'OSZCZĘDZASZ 20%';

    //       // Wyczyść poprzednie ceny i dodaj nowe
    //       parent.innerHTML = '';
    //       parent.appendChild(crossedPrice);
    //       parent.appendChild(yearlyPriceElement);
    //       parent.appendChild(savingsText);
    //     } else {
    //       // Przywróć miesięczne ceny
    //       const parent = p.parentElement;
    //       parent.innerHTML = '';
    //       parent.appendChild(p);
    //       savingsText.remove();
    //     }
    //   });

    //   // Zmień nagłówek
    //   priceHeaders.forEach(h => {
    //     h.textContent = yearly ? 'Cena/rok' : 'Cena/msc';
    //   });

    //   billingBtn.textContent = yearly
    //     ? 'Przełącz na płatność miesięczną'
    //     : 'Przełącz na płatność roczną';
    // });
    billingBtn.addEventListener('click', () => {
      yearly = !yearly;

      document.querySelectorAll('.price').forEach(priceContainer => {
        const monthly = priceContainer.querySelector('.monthly');
        const yearlyEl = priceContainer.querySelector('.yearly');
        const crossed = priceContainer.querySelector('.crossed-price');
        const savings = priceContainer.querySelector('.savings-text');

        if (yearly) {
          monthly?.classList.add('hidden');
          yearlyEl?.classList.remove('hidden');
          crossed?.classList.remove('hidden');
          savings?.classList.remove('hidden');
        } else {
          monthly?.classList.remove('hidden');
          yearlyEl?.classList.add('hidden');
          crossed?.classList.add('hidden');
          savings?.classList.add('hidden');
        }
      });

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
      let packageType = 'basic'; // Domyślnie "basic"
      let checkoutUrl = 'https://buy.stripe.com/test_cNicN5806549eZvgi34Rq00'; // Link dla basic

      if (card.classList.contains('premium')) {
        packageType = 'pro';
        checkoutUrl = 'https://buy.stripe.com/test_dRmcN50xE68dcRn8PB4Rq01'; // Link dla pro
      }
      if (card.classList.contains('enterprise')) {
        window.open('enterpirse_form.html', 'blank');
        return;
      }
      window.location.href = checkoutUrl;
    });
  });

  document.querySelectorAll('.package-card .subscribe-button').forEach(button => {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      const card = this.closest('.package-card');
      if (card.classList.contains('start')) {
        window.location.href = '../sub/subskrypcja.html?package=basic';
      } else if (card.classList.contains('premium')) {
        window.location.href = '../sub/subskrypcja.html?package=pro';
      }
      // Enterprise zostawiasz bez zmian lub obsłuż osobno
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

  // USER MENU DROPDOWN
  const userMenuToggle = document.getElementById('user-menu-toggle');
  const userMenu = document.getElementById('user-menu');
  let isUserLoggedIn = false;

  // Funkcja do sprawdzenia zalogowania (asynchronicznie)
  async function checkLoginStatus() {
    try {
      const res = await fetch('../userpanel/auth.php?action=subscriptions', { credentials: 'include' });
      const data = await res.json();
      isUserLoggedIn = !!data.success;
      renderUserMenu();
    } catch {
      isUserLoggedIn = false;
      renderUserMenu();
    }
  }

  // Funkcja do renderowania menu użytkownika
  function renderUserMenu() {
    if (!userMenu) return;
    userMenu.innerHTML = '';
    if (!isUserLoggedIn) {
      userMenu.innerHTML = `
        <button type="button" id="user-login-btn">Zaloguj się</button>
        <a href="#faq">FAQ</a>
        <a href="#" id="user-terms-link">Regulamin</a>
        <a href="#contact">Pomoc</a>
      `;
    } else {
      userMenu.innerHTML = `
        <button type="button" id="user-account-btn">Moje konto</button>
        <a href="#faq">FAQ</a>
        <a href="#" id="user-terms-link">Regulamin</a>
        <a href="#contact">Pomoc</a>
        <button type="button" id="user-logout-btn">Wyloguj się</button>
      `;
    }
  }

  // Pokaz/ukryj menu po kliknięciu w ikonkę
  if (userMenuToggle) {
    userMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenu.classList.toggle('hidden');
      userMenuToggle.classList.toggle('active', !userMenu.classList.contains('hidden'));
    });
  }
  // Zamknij menu po kliknięciu poza nim
  document.addEventListener('click', (e) => {
    if (userMenu && !userMenu.classList.contains('hidden')) {
      if (!userMenu.contains(e.target) && e.target !== userMenuToggle) {
        userMenu.classList.add('hidden');
        userMenuToggle.classList.remove('active');
      }
    }
  });

  // Delegacja obsługi kliknięć w menu użytkownika
  if (userMenu) {
    userMenu.addEventListener('click', async function (e) {
      if (e.target.id === 'user-login-btn') {
        // Zapamiętaj powrót na stronę główną po zalogowaniu
        localStorage.setItem('afterLoginRedirect', window.location.pathname);
        window.location.href = '../userpanel/login.html';
      }
      if (e.target.id === 'user-account-btn') {
        window.location.href = '../userpanel/user_panel.html';
      }
      if (e.target.id === 'user-logout-btn') {
        await fetch('../userpanel/auth.php?action=logout', { credentials: 'include' });
        isUserLoggedIn = false;
        renderUserMenu();
        userMenu.classList.add('hidden');
      }
      if (e.target.id === 'user-terms-link') {
        e.preventDefault();
        window.location.href = '../main/Regulamin_NextAi.pdf';
      }
    });
  }

  // Po powrocie z logowania przekieruj na stronę główną jeśli trzeba
  if (window.location.pathname.endsWith('/userpanel/login.html')) {
    const afterLogin = localStorage.getItem('afterLoginRedirect');
    if (afterLogin) {
      // Po zalogowaniu w auth.js przekieruj na afterLogin
      window.afterLoginRedirect = afterLogin;
    }
  }

  // Sprawdź status logowania na starcie
  checkLoginStatus();
});

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

document.querySelector('.contact-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('submit_form.php', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData
    });

    if (response.ok) {
      document.getElementById('success-modal').classList.remove('hidden');
      this.reset();
    } else {
      alert("Wystąpił błąd podczas wysyłania formularza.");
    }
  } catch (error) {
    alert("Nie można połączyć się z serwerem.");
  }
});