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
      title: "🤖 Jak chatboty zmieniają obsługę klienta?",
      date: "2024-06-12",
      tag: "AI",
      content: `<p><strong>Chatboty</strong> rewolucjonizują obsługę klienta, automatyzując odpowiedzi na najczęstsze pytania i skracając czas oczekiwania. Dzięki AI możliwe jest personalizowanie komunikacji i obsługa 24/7. Wdrożenia pokazują, że firmy oszczędzają nawet 60% kosztów obsługi!</p>
      <ul>
        <li>Automatyczne odpowiedzi 24/7</li>
        <li>Integracja z Messenger, WhatsApp, WWW</li>
        <li>Redukcja kosztów i wzrost satysfakcji klientów</li>
      </ul>
      <p>Chcesz dowiedzieć się więcej? Skontaktuj się z nami!</p>`
    },
    {
      title: "⚡ Automatyzacja procesów – od czego zacząć?",
      date: "2024-06-10",
      tag: "Automatyzacja",
      content: `<p>Automatyzacja procesów zaczyna się od analizy powtarzalnych zadań. Warto zacząć od prostych workflowów, np. automatyzacji faktur czy powiadomień. Kluczowe jest dobranie narzędzi, które łatwo zintegrujesz z obecnymi systemami.</p>
      <ol>
        <li>Wybierz proces do automatyzacji</li>
        <li>Określ cele i mierniki sukcesu</li>
        <li>Wdrażaj stopniowo, testuj i optymalizuj</li>
      </ol>`
    },
    {
      title: "📈 AI w liczbach – realne korzyści dla biznesu",
      date: "2024-06-05",
      tag: "Biznes",
      content: `<p>Wdrożenia AI przynoszą wymierne korzyści: wzrost efektywności, lepsze decyzje i oszczędności. Analiza ROI pokazuje, że inwestycja w AI zwraca się już po kilku miesiącach.</p>
      <ul>
        <li>Średni wzrost efektywności: +35%</li>
        <li>Redukcja błędów: -50%</li>
        <li>Lepsza obsługa klienta i szybsze procesy</li>
      </ul>`
    },
    {
      title: "🎓 Edukacja AI – jak się uczyć, by nie zostać w tyle?",
      date: "2024-06-01",
      tag: "Edukacja",
      content: `<p>Rozwój kompetencji AI to inwestycja w przyszłość. Warto korzystać z kursów online, webinarów i praktycznych warsztatów. Najlepsze efekty daje nauka przez praktykę i wdrażanie AI w codziennej pracy.</p>
      <ul>
        <li>Kursy online i szkolenia</li>
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
