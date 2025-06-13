// Courses page JS
document.addEventListener('DOMContentLoaded', () => {
    // Glitch effect
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

  // NAVIGATION INDICATOR LOGIC
  const menu = document.querySelector('.nav-menu');
  const links = document.querySelectorAll('.nav-item a');
  if (menu && links.length) {
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
  }

  // === SYSTEM DOSTĘPU DO KURSÓW ===
  const accessInfo = document.getElementById('courses-access-info');
  let userAccess = 'free'; // free | basic | pro

  // Sprawdź uprawnienia użytkownika (czy ma subskrypcję)
  async function checkSubscription() {
    try {
      const res = await fetch('/userpanel/auth.php?action=check_active_subscription', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.subscription) {
        // Użyj plan_name jeśli jest, fallback na plan
        const plan = (data.subscription.plan_name || data.subscription.plan || '').toLowerCase();
        if (plan.includes('pro')) userAccess = 'pro';
        else if (plan.includes('basic')) userAccess = 'basic';
        else userAccess = 'free';
      } else {
        userAccess = 'free';
      }
    } catch {
      userAccess = 'free';
    }
    updateAccessUI();
  }

  // Odblokuj/blokuj kursy zgodnie z uprawnieniami
  function updateAccessUI() {
    // Komunikat
    if (userAccess === 'pro') {
      accessInfo.innerHTML = '<i class="fa-solid fa-user-check"></i> Masz dostęp do wszystkich kursów PRO!';
      accessInfo.style.color = '#00ffae';
    } else if (userAccess === 'basic') {
      accessInfo.innerHTML = '<i class="fa-solid fa-unlock"></i> Masz dostęp do kursów Basic i darmowych.';
      accessInfo.style.color = '#FFD700';
    } else {
      accessInfo.innerHTML = '<i class="fa-solid fa-lock"></i> Tylko kursy darmowe są dostępne. <a href="../sub/subskrypcja.html" style="color:#0ff;text-decoration:underline;">Aktywuj subskrypcję</a> aby uzyskać pełny dostęp!';
      accessInfo.style.color = '#ff5c5c';
    }

    // Kursy PRO
    document.querySelectorAll('.course-card[data-access="pro"]').forEach(card => {
      const unlocked = userAccess === 'pro';
      card.dataset.locked = !unlocked;
      card.querySelector('.course-btn').disabled = !unlocked;
    });
    // Kursy BASIC
    document.querySelectorAll('.course-card[data-access="basic"]').forEach(card => {
      const unlocked = userAccess === 'pro' || userAccess === 'basic';
      card.dataset.locked = !unlocked;
      card.querySelector('.course-btn').disabled = !unlocked;
    });
    // Kursy FREE
    document.querySelectorAll('.course-card[data-access="free"]').forEach(card => {
      card.dataset.locked = false;
      card.querySelector('.course-btn').disabled = false;
    });
  }

  // Obsługa kliknięcia w kurs – zawsze przekieruj na "coming soon"
  document.querySelectorAll('.course-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const card = this.closest('.course-card');
      if (card.dataset.locked === "true") {
        alert('Nie masz dostępu do tego kursu. Aktywuj odpowiednią subskrypcję!');
        return;
      }
      // Przekierowanie na stronę "Wkrótce dostępne"
      window.location.href = "coming-soon.html";
    });
  });

  checkSubscription();
});
