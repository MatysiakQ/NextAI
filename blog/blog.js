// Blog page JS
document.addEventListener('DOMContentLoaded', () => {
  setInterval(() => {
    document.querySelectorAll('.glitch').forEach(el => {
      el.classList.add('glitch-active');
      setTimeout(() => el.classList.remove('glitch-active'), 300);
    });
  }, 3000);

  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  navToggle?.addEventListener('click', () => {
    navMenu.classList.toggle('show');
  });
});
document.addEventListener('DOMContentLoaded', () => {
  // NAVIGATION INDICATOR LOGIC
  const menu = document.querySelector('.nav-menu');
  const links = document.querySelectorAll('.nav-item a');
  if (!menu || !links.length) return;
  const indicator = document.createElement('div');
  indicator.classList.add('nav-indicator');
  menu.appendChild(indicator);

  let hoveredLink = null;

  function updateIndicator(link) {
    if (!link) return;
    const rect = link.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    indicator.style.width = `${rect.width}px`;
    indicator.style.transform = `translateX(${rect.left - menuRect.left}px)`;
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
});
document.addEventListener('DOMContentLoaded', () => {
  // MODAL BLOGA - ognisty modal
  const blogModal = document.getElementById('blog-modal');
  const blogModalInner = document.getElementById('blog-modal-inner');
  const closeBlogModal = document.getElementById('close-blog-modal');

  // Przykładowe treści bloga (możesz rozbudować lub pobierać dynamicznie)
  const blogContents = [
    {
      title: "🤖 Chatboty w biznesie: Nowy standard obsługi klienta",
      date: "2024-06-12",
      tag: "Biznes & AI",
      content: `<p><strong>Chatboty</strong> stają się kluczowym narzędziem w nowoczesnej obsłudze klienta, automatyzując komunikację i zwiększając dostępność usług. Dzięki AI firmy mogą personalizować doświadczenia klientów i zapewniać wsparcie 24/7. Praktyka pokazuje, że wdrożenie chatbotów pozwala znacząco obniżyć koszty operacyjne i zwiększyć satysfakcję odbiorców.</p>
      <ul>
        <li>Obsługa klienta bez przerw – 24/7</li>
        <li>Integracja z Messenger, WhatsApp, stroną WWW</li>
        <li>Redukcja kosztów i wzrost lojalności klientów</li>
      </ul>
      <p>Chcesz dowiedzieć się, jak chatboty mogą wesprzeć Twój biznes? Skontaktuj się z naszym zespołem ekspertów NextAI.</p>`
    },
    {
      title: "⚡ Automatyzacja procesów: Przewodnik dla liderów",
      date: "2024-06-10",
      tag: "Automatyzacja",
      content: `<p>Automatyzacja procesów biznesowych zaczyna się od analizy powtarzalnych zadań i identyfikacji obszarów o największym potencjale optymalizacji. Warto rozpocząć od prostych workflowów, takich jak automatyzacja faktur czy powiadomień. Kluczowe jest dobranie narzędzi, które łatwo zintegrujesz z istniejącymi systemami i które będą skalowalne wraz z rozwojem firmy.</p>
      <ol>
        <li>Wybierz proces do automatyzacji</li>
        <li>Określ cele biznesowe i mierniki sukcesu</li>
        <li>Wdrażaj stopniowo, testuj i optymalizuj rozwiązania</li>
      </ol>`
    },
    {
      title: "📈 AI w liczbach: Wpływ na wyniki biznesowe",
      date: "2024-06-05",
      tag: "Analiza ROI",
      content: `<p>Wdrożenia AI przynoszą wymierne korzyści biznesowe: wzrost efektywności, lepsze decyzje i oszczędności. Analiza zwrotu z inwestycji (ROI) pokazuje, że inwestycja w AI często zwraca się już po kilku miesiącach, a firmy notują wyraźny wzrost konkurencyjności.</p>
      <ul>
        <li>Średni wzrost efektywności: +35%</li>
        <li>Redukcja błędów operacyjnych: -50%</li>
        <li>Lepsza obsługa klienta i szybsze procesy biznesowe</li>
      </ul>`
    },
    {
      title: "🎓 Kompetencje AI: Jak rozwijać zespół przyszłości?",
      date: "2024-06-01",
      tag: "Rozwój zespołu",
      content: `<p>Inwestycja w rozwój kompetencji AI to klucz do budowania przewagi konkurencyjnej. Warto korzystać z kursów online, webinarów i praktycznych warsztatów. Najlepsze efekty daje nauka przez praktykę oraz wdrażanie AI w codziennych procesach biznesowych.</p>
      <ul>
        <li>Dedykowane kursy i szkolenia dla firm</li>
        <li>Praktyczne projekty i case studies</li>
        <li>Współpraca z ekspertami NextAI</li>
      </ul>`
    }
  ];

  document.querySelectorAll('.blog-readmore-btn').forEach((btn, idx) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Otwórz ognisty modal z treścią bloga
      const post = blogContents[idx];
      if (post) {
        blogModalInner.innerHTML = `
          <div class="modal-meta">
            <span><i class="fa-regular fa-calendar"></i> ${post.date}</span>
            <span style="color:#FFD700;font-weight:bold;">${post.tag}</span>
          </div>
          <span class="modal-glitch-title" data-text="${post.title}">${post.title}</span>
          <div class="modal-body">${post.content}</div>
        `;
        blogModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
      }
    });
  });

  closeBlogModal?.addEventListener('click', () => {
    blogModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  });

  blogModal?.addEventListener('click', (e) => {
    if (e.target === blogModal) {
      blogModal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    }
  });

  // Zamknięcie modala klawiszem Escape
  document.addEventListener('keydown', (e) => {
    if (blogModal && !blogModal.classList.contains('hidden') && e.key === 'Escape') {
      blogModal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    }
  });
});
