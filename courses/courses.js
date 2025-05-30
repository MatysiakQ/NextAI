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

  // Funkcja do pobrania statusu subskrypcji użytkownika
  async function checkSubscription() {
    try {
      const res = await fetch('../userpanel/auth.php?action=subscriptions', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.subscription) {
        if (data.subscription === 'pro') userAccess = 'pro';
        else if (data.subscription === 'basic') userAccess = 'basic';
        else userAccess = 'free';
      } else {
        userAccess = 'free';
      }
    } catch {
      userAccess = 'free';
    }
    updateAccessUI();
  }

  // Blokowanie/odblokowanie kursów na podstawie uprawnień
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
      card.dataset.locked = userAccess !== 'pro';
      card.querySelector('.course-btn').disabled = userAccess !== 'pro';
    });
    // Kursy BASIC
    document.querySelectorAll('.course-card[data-access="basic"]').forEach(card => {
      card.dataset.locked = (userAccess !== 'pro' && userAccess !== 'basic');
      card.querySelector('.course-btn').disabled = (userAccess !== 'pro' && userAccess !== 'basic');
    });
    // Kursy FREE
    document.querySelectorAll('.course-card[data-access="free"]').forEach(card => {
      card.dataset.locked = false;
      card.querySelector('.course-btn').disabled = false;
    });
  }

  // Obsługa kliknięcia w kurs
  document.querySelectorAll('.course-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const card = this.closest('.course-card');
      if (card.dataset.locked === "true") {
        alert('Nie masz dostępu do tego kursu. Aktywuj odpowiednią subskrypcję!');
        return;
      }
      // Przekierowanie do kursu (możesz podmienić na rzeczywiste linki)
      window.location.href = this.dataset.link;
    });
  });

  checkSubscription();
});
