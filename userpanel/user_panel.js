// Przełączanie sekcji
const navBtns2 = {
  profile: document.getElementById('nav2-profile'),
  subscriptions: document.getElementById('nav2-subscriptions'),
  courses: document.getElementById('nav2-courses')
};
const sections2 = {
  profile: document.getElementById('section2-profile'),
  subscriptions: document.getElementById('section2-subscriptions'),
  courses: document.getElementById('section2-courses')
};

// Obsługa nawigacji
Object.entries(navBtns2).forEach(([key, btn]) => {
  if (btn) {
    btn.addEventListener('click', () => {
      Object.values(navBtns2).forEach(b => b && b.classList.remove('active'));
      Object.values(sections2).forEach(s => s && s.classList.remove('active'));
      btn.classList.add('active');
      if (sections2[key]) sections2[key].classList.add('active');

      // Jeśli przechodzimy do sekcji subskrypcji, załaduj je i aktywny pakiet
      if (key === 'subscriptions') {
        loadSubscriptions();
        loadActivePackageInfo();
      }
      // Jeśli przechodzimy do profilu, załaduj dane użytkownika
      if (key === 'profile') {
        loadUserData();
      }
    });
  }
});

// Funkcja do ładowania informacji o aktywnym pakiecie
function loadActivePackageInfo() {
  const activePackageDiv = document.getElementById('active-package-info');
  if (!activePackageDiv) return;

  activePackageDiv.innerHTML = '<p>Ładowanie informacji o pakiecie...</p>';

  fetch('auth.php?action=check_active_subscription')
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      if (data.success && data.subscription) {
        const sub = data.subscription;
        const statusText = getStatusText(sub.status, sub.cancel_at_period_end);
        const endDate = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pl-PL') : 'N/A';
        
        activePackageDiv.innerHTML = `
          <div class="active-package-card">
            <h4><i class="fa-solid fa-crown"></i> Aktywny pakiet</h4>
            <div class="package-details">
              <p><strong>Plan:</strong> ${sub.plan || 'Nieznany'}</p>
              <p><strong>Status:</strong> ${statusText}</p>
              <p><strong>Odnawia się:</strong> ${endDate}</p>
              ${sub.cancel_at_period_end ? '<div class="cancel-notice"><i class="fa-solid fa-exclamation-triangle"></i> Subskrypcja zostanie anulowana po zakończeniu okresu rozliczeniowego</div>' : ''}
            </div>
            ${sub.status === 'active' && !sub.cancel_at_period_end && sub.stripe_subscription_id ? 
              `<button class="cancel-package-btn" data-subscription-id="${sub.stripe_subscription_id}">
                <i class="fa-solid fa-times"></i> Anuluj subskrypcję
              </button>` : ''}
          </div>
        `;

        // Dodaj event listener do przycisku anulowania
        const cancelBtn = activePackageDiv.querySelector('.cancel-package-btn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', (event) => {
            const subId = event.target.closest('.cancel-package-btn').dataset.subscriptionId;
            showCancelModal(subId);
          });
        }
      } else {
        activePackageDiv.innerHTML = `
          <div class="no-package-card">
            <h4><i class="fa-solid fa-info-circle"></i> Brak aktywnego pakietu</h4>
            <p>Nie masz obecnie aktywnej subskrypcji.</p>
            <a href="../sub/subskrypcja.html" class="subscribe-link">Wybierz pakiet</a>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('Błąd ładowania informacji o pakiecie:', error);
      activePackageDiv.innerHTML = `
        <div class="error-package-card">
          <p>Wystąpił błąd podczas ładowania informacji o pakiecie.</p>
        </div>
      `;
    });
}

// Funkcja do tłumaczenia statusów na polski
function getStatusText(status, cancelAtPeriodEnd) {
  if (cancelAtPeriodEnd) {
    return 'W trakcie anulowania';
  }
  
  switch (status) {
    case 'active':
      return 'Aktywna';
    case 'trialing':
      return 'W trakcie próby';
    case 'pending':
      return 'W toku';
    case 'canceled':
    case 'cancelled':
      return 'Anulowana';
    case 'incomplete':
      return 'Niepełna';
    case 'incomplete_expired':
      return 'Wygasła';
    case 'past_due':
      return 'Zaległa';
    case 'unpaid':
      return 'Nieopłacona';
    default:
      return status || 'Nieznany';
  }
}

// Załaduj dane użytkownika z backendu
function loadUserData() {
  fetch('auth.php?action=user_data')
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      const usernameStatic = document.getElementById('profile2-username-static');
      const emailStatic = document.getElementById('profile2-email-static');
      const avatarImg = document.getElementById('avatar2-img');

      if (!data.success || !data.user) {
        if (usernameStatic) usernameStatic.textContent = "Użytkownik";
        if (emailStatic) emailStatic.textContent = "";
        if (avatarImg) avatarImg.innerHTML = '<i class="fa-solid fa-user"></i>';
        return;
      }
      
      if (usernameStatic) usernameStatic.textContent = data.user.username || "Brak nazwy";
      if (emailStatic) emailStatic.textContent = data.user.email || "";
      if (avatarImg) avatarImg.innerHTML = '<i class="fa-solid fa-user"></i>';
    })
    .catch(error => {
      console.error("Błąd ładowania danych użytkownika:", error);
      const usernameStatic = document.getElementById('profile2-username-static');
      const emailStatic = document.getElementById('profile2-email-static');
      const avatarImg = document.getElementById('avatar2-img');
      
      if (usernameStatic) usernameStatic.textContent = "Błąd";
      if (emailStatic) emailStatic.textContent = "Błąd";
      if (avatarImg) avatarImg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    });
}

// Funkcja do ładowania subskrypcji z backendu
function loadSubscriptions() {
  const list = document.getElementById("subscriptions2-list");
  if (!list) return;

  list.innerHTML = '<p>Ładowanie subskrypcji...</p>';

  fetch('auth.php?action=subscriptions')
    .then(res => {
        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = "login.html";
                return;
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
      if (data.success && data.subscriptions) {
        list.innerHTML = '';

        if (data.subscriptions.length === 0) {
          // Nie pokazuj dolnego białego napisu, zostaw tylko kafelek z loadActivePackageInfo
          return;
        }

        data.subscriptions.forEach(sub => {
          const statusText = getStatusText(sub.status, sub.cancel_at_period_end);
          const statusClass = getStatusClass(sub.status, sub.cancel_at_period_end);
          const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pl-PL') : 'N/A';
          const createdAt = sub.created_at ? new Date(sub.created_at).toLocaleDateString('pl-PL') : 'N/A';

          list.innerHTML += `
            <div class="subscription2-card">
              <div class="subscription-header">
                <h4>Pakiet: ${sub.plan || 'N/A'}</h4>
                <span class="subscription2-status ${statusClass}">${statusText}</span>
              </div>
              <div class="subscription-details">
                <p><strong>Data utworzenia:</strong> ${createdAt}</p>
                <p><strong>Wygasa:</strong> ${currentPeriodEnd}</p>
                ${sub.cancel_at_period_end ? '<div class="cancel-notice"><i class="fa-solid fa-exclamation-triangle"></i> Subskrypcja zostanie anulowana po zakończeniu okresu rozliczeniowego</div>' : ''}
              </div>
              ${sub.status === 'active' && !sub.cancel_at_period_end && sub.stripe_subscription_id ? 
                `<button class="subscription2-cancel-btn" data-subscription-id="${sub.stripe_subscription_id}">
                  <i class="fa-solid fa-times"></i> Anuluj subskrypcję
                </button>` : ''}
            </div>
          `;
        });

        // Dodaj event listenery do przycisków anulowania subskrypcji
        document.querySelectorAll('.subscription2-cancel-btn').forEach(button => {
          button.addEventListener('click', (event) => {
            const subId = event.target.closest('.subscription2-cancel-btn').dataset.subscriptionId;
            showCancelModal(subId);
          });
        });

      } else {
        list.innerHTML = `<p>Błąd ładowania subskrypcji: ${data.message || 'Nieznany błąd'}</p>`;
      }
    })
    .catch(error => {
      console.error('Błąd pobierania subskrypcji:', error);
      list.innerHTML = '<p>Wystąpił błąd podczas ładowania subskrypcji.</p>';
    });
}

// Funkcja do określania klasy CSS dla statusu
function getStatusClass(status, cancelAtPeriodEnd) {
  if (cancelAtPeriodEnd) {
    return 'pending-cancel';
  }
  
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'pending':
      return 'trialing';
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    default:
      return 'inactive';
  }
}

// Funkcja do pokazania modala anulowania
function showCancelModal(subscriptionId) {
  const modal = document.getElementById('cancel-subscription-modal');
  if (!modal) {
    console.error('Modal anulowania subskrypcji nie został znaleziony');
    return;
  }
  
  // Przechowaj ID subskrypcji w modalu
  modal.dataset.subscriptionId = subscriptionId;
  modal.style.display = 'flex';
  
  // Zablokuj przewijanie tła
  document.body.style.overflow = 'hidden';
}

// Funkcja do ukrycia modala anulowania
function hideCancelModal() {
  const modal = document.getElementById('cancel-subscription-modal');
  if (modal) {
    modal.style.display = 'none';
    // Przywróć przewijanie tła
    document.body.style.overflow = 'auto';
  }
}

// Funkcja do anulowania subskrypcji
function cancelSubscription(subscriptionId) {
    if (!subscriptionId) {
        alert('Błąd: Brak ID subskrypcji');
        return;
    }

    // Ukryj modal
    hideCancelModal();

    fetch('auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel_subscription', subscriptionId: subscriptionId })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            alert('Anulowanie subskrypcji zostało zainicjowane.');
            // Odśwież listę subskrypcji i informacje o pakiecie
            loadSubscriptions();
            loadActivePackageInfo();
        } else {
            alert('Błąd podczas anulowania subskrypcji: ' + (data.message || 'Nieznany błąd'));
        }
    })
    .catch(error => {
        console.error('Błąd sieci podczas anulowania subskrypcji:', error);
        alert('Wystąpił błąd sieci podczas anulowania subskrypcji.');
    });
}

// Obsługa formularzy zmiany danych w profilu
document.addEventListener('DOMContentLoaded', () => {
  // Profile change buttons
  const showChangeUsernameBtn = document.getElementById('show-change-username-btn');
  const showChangeEmailBtn = document.getElementById('show-change-email-btn');
  const showChangePasswordBtn = document.getElementById('show-change-password-btn');
  const changeUsernameForm = document.getElementById('change-username-form');
  const changeEmailForm = document.getElementById('change-email-form');
  const changePasswordForm = document.getElementById('change-password-form');
  const profileError = document.getElementById('profile2-error');
  const profileSuccess = document.getElementById('profile2-success');
  const logoutIds = ["logout2-btn", "logout-btn", "user-logout-btn"];


  if (showChangeUsernameBtn && changeUsernameForm) {
    showChangeUsernameBtn.onclick = function() {
      changeUsernameForm.style.display = "flex";
      changeEmailForm.style.display = "none";
      changePasswordForm.style.display = "none";
      profileError.textContent = "";
      profileSuccess.style.display = "none";
    };
  }
  if (showChangeEmailBtn && changeEmailForm) {
    showChangeEmailBtn.onclick = function() {
      changeEmailForm.style.display = "flex";
      changeUsernameForm.style.display = "none";
      changePasswordForm.style.display = "none";
      profileError.textContent = "";
      profileSuccess.style.display = "none";
    };
  }
  if (showChangePasswordBtn && changePasswordForm) {
    showChangePasswordBtn.onclick = function() {
      changePasswordForm.style.display = "flex";
      changeUsernameForm.style.display = "none";
      changeEmailForm.style.display = "none";
      profileError.textContent = "";
      profileSuccess.style.display = "none";
    };
  }
  // Cancel buttons
  const cancelUsernameBtn = document.getElementById('cancel-username-btn');
  if (cancelUsernameBtn && changeUsernameForm) {
    cancelUsernameBtn.onclick = function() {
      changeUsernameForm.style.display = "none";
      profileError.textContent = "";
      profileSuccess.style.display = "none";
      document.getElementById('new-username').value = "";
    };
  }
  const cancelEmailBtn = document.getElementById('cancel-email-btn');
  if (cancelEmailBtn && changeEmailForm) {
    cancelEmailBtn.onclick = function() {
      changeEmailForm.style.display = "none";
      profileError.textContent = "";
      profileSuccess.style.display = "none";
      document.getElementById('new-email').value = "";
    };
  }
  const cancelPasswordBtn = document.getElementById('cancel-password-btn');
  if (cancelPasswordBtn && changePasswordForm) {
    cancelPasswordBtn.onclick = function() {
      changePasswordForm.style.display = "none";
      profileError.textContent = "";
      profileSuccess.style.display = "none";
      document.getElementById('profile2-old-password').value = "";
      document.getElementById('profile2-password').value = "";
      document.getElementById('profile2-password2').value = "";
    };
  }

  // Save username
  const saveUsernameBtn = document.getElementById('save-username-btn');
  if (saveUsernameBtn) {
    saveUsernameBtn.onclick = function() {
      const newUsername = document.getElementById('new-username').value.trim();
      profileError.textContent = "";
      profileSuccess.style.display = "none";
      if (!/^[a-zA-Z0-9_\-\.]{3,32}$/.test(newUsername)) {
        profileError.textContent = "Nieprawidłowy login (3-32 znaki, tylko litery, cyfry, _, -, .)";
        return;
      }
      fetch('auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `action=change_username&username=${encodeURIComponent(newUsername)}`
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          profileSuccess.textContent = "Login został zmieniony!";
          profileSuccess.style.display = "block";
          changeUsernameForm.style.display = "none";
          loadUserData();
        } else {
          profileError.textContent = data.message || "Błąd zmiany loginu.";
        }
      })
      .catch(() => {
        profileError.textContent = "Błąd sieci.";
      });
    };
  }

  // Save email
  const saveEmailBtn = document.getElementById('save-email-btn');
  if (saveEmailBtn) {
    saveEmailBtn.onclick = function() {
      const newEmail = document.getElementById('new-email').value.trim();
      profileError.textContent = "";
      profileSuccess.style.display = "none";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        profileError.textContent = "Nieprawidłowy adres e-mail.";
        return;
      }
      fetch('auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `action=change_email&email=${encodeURIComponent(newEmail)}`
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          profileSuccess.textContent = "E-mail został zmieniony!";
          profileSuccess.style.display = "block";
          changeEmailForm.style.display = "none";
          loadUserData();
        } else {
          profileError.textContent = data.message || "Błąd zmiany e-maila.";
        }
      })
      .catch(() => {
        profileError.textContent = "Błąd sieci.";
      });
    };
  }

  // Save password
  const savePasswordBtn = document.getElementById('save-password-btn');
  if (savePasswordBtn) {
    savePasswordBtn.onclick = function() {
      const oldPass = document.getElementById('profile2-old-password').value;
      const pass1 = document.getElementById('profile2-password').value;
      const pass2 = document.getElementById('profile2-password2').value;
      profileError.textContent = "";
      profileSuccess.style.display = "none";
      if (!oldPass || !pass1 || !pass2) {
        profileError.textContent = "Wszystkie pola są wymagane.";
        return;
      }
      if (pass1 !== pass2) {
        profileError.textContent = "Nowe hasła nie są takie same!";
        return;
      }
      if (!/^(?=.*[A-Z])(?=.*\d).{6,}$/.test(pass1)) {
        profileError.textContent = "Nowe hasło musi mieć min. 6 znaków, zawierać co najmniej jedną dużą literę i jedną cyfrę.";
        return;
      }
      fetch('auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          oldPassword: oldPass,
          newPassword: pass1,
          confirmNewPassword: pass2
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          profileSuccess.textContent = "Hasło zostało zmienione!";
          profileSuccess.style.display = "block";
          changePasswordForm.style.display = "none";
          document.getElementById('profile2-old-password').value = "";
          document.getElementById('profile2-password').value = "";
          document.getElementById('profile2-password2').value = "";
        } else {
          profileError.textContent = data.message || "Błąd zmiany hasła.";
        }
      })
      .catch(() => {
        profileError.textContent = "Błąd sieci.";
      });
    };
  }

  // Inicjalizacja ładowania danych użytkownika przy starcie
  document.addEventListener('DOMContentLoaded', () => {
    // Sprawdzenie autoryzacji przed ładowaniem panelu
    fetch("auth.php?action=user_data")
      .then(res => {
        if (!res.ok) {
          window.location.href = "login.html";
          return;
        }
        return res.json();
      })
      .then(data => {
        if (!data || !data.success) {
          window.location.href = "login.html";
        } else {
          loadUserData(); // <- wywołaj od razu po wejściu
          loadActivePackageInfo();
        }
      })
      .catch(() => window.location.href = "login.html");

    // Wylogowywanie (obsługa wszystkich przycisków z logoutIds)
    logoutIds.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener("click", () => {
          console.log(`🔒 Wylogowanie przez: ${id}`);
          fetch("auth.php?action=logout", { credentials: "include" })
            .then(() => {
              localStorage.setItem("showLogoutModal", "1");
              setTimeout(() => window.location.href = "/index.html", 300);
            })
            .catch(err => {
              console.error("❌ Błąd wylogowania:", err);
              alert("Wystąpił błąd podczas wylogowywania.");
            });
        });
      }
    });

    // Obsługa modala anulowania subskrypcji
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const keepSubscriptionBtn = document.getElementById('keep-subscription-btn');
    const modal = document.getElementById('cancel-subscription-modal');

    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', () => {
            const subscriptionId = modal?.dataset.subscriptionId;
            if (subscriptionId) {
                cancelSubscription(subscriptionId);
            }
        });
    }

    if (keepSubscriptionBtn) {
        keepSubscriptionBtn.addEventListener('click', hideCancelModal);
    }

    // Zamykanie modala po kliknięciu na tło
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideCancelModal();
            }
        });
    }

    // Zamykanie modala klawiszem Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideCancelModal();
        }
    });
  });

  const mainPageBtn = document.getElementById("nav-mainpage-btn");
  if (mainPageBtn) {
    mainPageBtn.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  }
});
