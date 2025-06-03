document.addEventListener('DOMContentLoaded', () => {
  const userMenuToggle = document.getElementById('user-menu-toggle');
  const userMenu = document.getElementById('user-menu');
  let isUserLoggedIn = false;

  if (!(userMenuToggle && userMenu)) return;

async function checkLoginStatus() {
  try {
    const res = await fetch('./userpanel/auth.php?action=subscriptions', { 
      credentials: 'include' 
    });
    const data = await res.json();
    isUserLoggedIn = !!data.success;
    renderUserMenu();
  } catch {
    isUserLoggedIn = false; 
    renderUserMenu();
  }
}

  function renderUserMenu() {
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

  userMenuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenu.classList.toggle('hidden');
    userMenuToggle.classList.toggle('active', !userMenu.classList.contains('hidden'));
  });

  document.addEventListener('click', (e) => {
    if (!userMenu.classList.contains('hidden')) {
      if (!userMenu.contains(e.target) && !userMenuToggle.contains(e.target)) {
        userMenu.classList.add('hidden');
        userMenuToggle.classList.remove('active');
      }
    }
  });

  userMenu.addEventListener('click', async function (e) {
    if (e.target.id === 'user-login-btn') {
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
      userMenuToggle.classList.remove('active');
    }
    if (e.target.id === 'user-terms-link') {
      e.preventDefault();
      window.location.href = '../main/Regulamin_NextAi.pdf';
    }
  });

  checkLoginStatus();
});
