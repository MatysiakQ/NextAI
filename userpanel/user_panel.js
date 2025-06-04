
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

      // Jeśli przechodzimy do sekcji subskrypcji, załaduj je
      if (key === 'subscriptions') {
        loadSubscriptions();
      }
      // Jeśli przechodzimy do profilu, załaduj aktywny pakiet
      if (key === 'profile') {
        loadActivePackageInfo();
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

        // Dodaj event listener do przycisku anulowania w sekcji profilu
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
            <a href="/" class="subscribe-link">Wybierz pakiet</a>
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
      const usernameInput = document.getElementById('profile2-username');
      const emailInput = document.getElementById('profile2-email');
      const avatarImg = document.getElementById('avatar2-img');

      if (!data.success || !data.user) {
        if (usernameInput) usernameInput.value = "Użytkownik";
        if (emailInput) emailInput.value = "";
        if (avatarImg) avatarImg.innerHTML = '<i class="fa-solid fa-user"></i>';
        return;
      }
      
      if (usernameInput) usernameInput.value = data.user.username || "Brak nazwy";
      if (emailInput) emailInput.value = data.user.email || "";
      if (avatarImg) avatarImg.innerHTML = '<i class="fa-solid fa-user"></i>';
    })
    .catch(error => {
      console.error("Błąd ładowania danych użytkownika:", error);
      const usernameInput = document.getElementById('profile2-username');
      const emailInput = document.getElementById('profile2-email');
      const avatarImg = document.getElementById('avatar2-img');
      
      if (usernameInput) usernameInput.value = "Błąd";
      if (emailInput) emailInput.value = "Błąd";
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
          list.innerHTML = '<p>Brak aktywnych subskrypcji.</p>';
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

// Funkcja do zmiany hasła
function changePassword(oldPassword, newPassword, confirmPassword) {
    if (!oldPassword || !newPassword || !confirmPassword) {
        alert("Wszystkie pola są wymagane.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("Nowe hasła nie są takie same!");
        return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
        alert("Nowe hasło musi mieć min. 6 znaków, zawierać co najmniej jedną dużą literę i jedną cyfrę.");
        return;
    }

    fetch('auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'change_password',
            oldPassword: oldPassword,
            newPassword: newPassword,
            confirmNewPassword: confirmPassword
        })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            alert("Hasło zostało pomyślnie zmienione!");
            document.getElementById('profile2-old-password').value = "";
            document.getElementById('profile2-password').value = "";
            document.getElementById('profile2-password2').value = "";
            const changePasswordForm = document.getElementById('change-password-form');
            const changePasswordBtn = document.getElementById('change-password-btn');
            if (changePasswordForm) changePasswordForm.style.display = "none";
            if (changePasswordBtn) changePasswordBtn.style.display = "";
        } else {
            alert('Błąd podczas zmiany hasła: ' + (data.message || 'Nieznany błąd'));
        }
    })
    .catch(error => {
        console.error('Błąd podczas zmiany hasła:', error);
        alert('Wystąpił błąd podczas zmiany hasła.');
    });
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
            if (!data.success) {
                window.location.href = "login.html";
            } else {
                loadUserData();
                loadActivePackageInfo(); // Załaduj informacje o aktywnym pakiecie przy starcie
            }
        })
        .catch(() => window.location.href = "login.html");

    // Obsługa zmiany hasła
    const changePasswordBtn = document.getElementById('change-password-btn');
    const changePasswordForm = document.getElementById('change-password-form');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');
    const savePasswordBtn = document.getElementById('save-password-btn');

    if (changePasswordBtn && changePasswordForm) {
        changePasswordBtn.onclick = function() {
            changePasswordForm.style.display = "flex";
            changePasswordBtn.style.display = "none";
        };
    }

    if (cancelPasswordBtn && changePasswordForm && changePasswordBtn) {
        cancelPasswordBtn.onclick = function() {
            changePasswordForm.style.display = "none";
            changePasswordBtn.style.display = "";
            document.getElementById('profile2-old-password').value = "";
            document.getElementById('profile2-password').value = "";
            document.getElementById('profile2-password2').value = "";
        };
    }

    if (savePasswordBtn) {
        savePasswordBtn.onclick = function() {
            const oldPass = document.getElementById('profile2-old-password').value;
            const pass1 = document.getElementById('profile2-password').value;
            const pass2 = document.getElementById('profile2-password2').value;
            
            changePassword(oldPass, pass1, pass2);
        };
    }

    // Przycisk powrotu na stronę główną
    const navMainpageBtn = document.getElementById("nav-mainpage-btn");
    if (navMainpageBtn) {
        navMainpageBtn.onclick = function() {
            window.location.href = "/";
        };
    }

    // Wylogowywanie
    const logout2Btn = document.getElementById("logout2-btn");
    if (logout2Btn) {
        logout2Btn.onclick = function() {
            fetch("auth.php?action=logout")
                .then(() => window.location.href = "login.html")
                .catch(error => {
                    console.error("Błąd podczas wylogowywania:", error);
                    alert("Wystąpił błąd podczas wylogowywania.");
                });
        };
    }

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
