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

// Flaga do kontroli wyświetlania panelu "Brak aktywnej subskrypcji"
let noActiveSubscriptionShown = false;

// Obsługa nawigacji
Object.entries(navBtns2).forEach(([key, btn]) => {
  if (btn) {
    btn.addEventListener('click', () => {
      Object.values(navBtns2).forEach(b => b && b.classList.remove('active'));
      Object.values(sections2).forEach(s => s && s.classList.remove('active'));
      btn.classList.add('active');
      if (sections2[key]) sections2[key].classList.add('active');

      // Resetuj flagę przy każdej zmianie sekcji
      noActiveSubscriptionShown = false;

      // Jeśli przechodzimy do sekcji subskrypcji, załaduj je i aktywny pakiet
      if (key === 'subscriptions') {
        loadSubscriptions();
        loadActivePackageInfo();
      }
      // Jeśli przechodzimy do profilu, załaduj dane użytkownika
      if (key === 'profile') {
        loadUserData();
      }
      // Po przejściu do sekcji "Moje kursy" wyświetl kursy
      if (key === 'courses') {
        renderUserCourses();
      }
    });
  }
});

// Mapowanie Stripe price_id na nazwę planu
function mapPriceIdToPlan(priceId) {
  switch (priceId) {
    case 'price_1RQpnDFQBh6Vdz2pKIXTtsV4':
      return 'Basic';
    case 'price_1RRFwiFQBh6Vdz2pXy7d20TI':
      return 'Pro';
    case 'price_1RW3LMFQBh6Vdz2pOsrR6BQ9':
      return 'Basic Roczny';
    case 'price_1RW3M4FQBh6Vdz2pQKmpJGmW':
      return 'Pro Roczny';
    default:
      return priceId || 'Nieznany plan';
  }
}

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
        // Ustal nazwę planu z price_id jeśli istnieje, w przeciwnym razie z plan
        let planName = sub.plan;
        if (sub.price_id) {
          planName = mapPriceIdToPlan(sub.price_id);
        } else if (sub.plan && sub.plan.startsWith('price_')) {
          planName = mapPriceIdToPlan(sub.plan);
        }
        // Wyznacz datę odnowienia na podstawie typu subskrypcji
        let renewDate = 'N/A';
        if (sub.current_period_end) {
          const end = new Date(sub.current_period_end);
          if (planName && planName.toLowerCase().includes('roczny')) {
            end.setFullYear(end.getFullYear() + 1);
          } else {
            end.setMonth(end.getMonth() + 1);
          }
          renewDate = end.toLocaleDateString('pl-PL');
        }

        const statusText = getStatusText(sub.status, sub.cancel_at_period_end);

        activePackageDiv.innerHTML = `
          <div class="active-package-card">
            <h4><i class="fa-solid fa-crown"></i> Aktywny pakiet</h4>
            <div class="package-details">
              <p><strong>Plan:</strong> ${planName || 'Nieznany'}</p>
              <p><strong>Status:</strong> ${statusText}</p>
              <p><strong>Odnawia się:</strong> ${renewDate}</p>
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
        noActiveSubscriptionShown = false;
      } else {
        if (!noActiveSubscriptionShown) {
          activePackageDiv.innerHTML = `
            <div class="no-package-card">
              <h4><i class="fa-solid fa-info-circle"></i> Brak aktywnego pakietu</h4>
              <p>Nie masz obecnie aktywnej subskrypcji.</p>
              <a href="../sub/subskrypcja.html" class="subscribe-link">Wybierz pakiet</a>
            </div>
          `;
          noActiveSubscriptionShown = true;
        } else {
          activePackageDiv.innerHTML = '';
        }
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
      if (avatarImg) {
        if (data.user.avatar) {
          avatarImg.innerHTML = `<img src="${data.user.avatar}?${Date.now()}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
          avatarImg.innerHTML = '<i class="fa-solid fa-user"></i>';
        }
      }
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
          window.location.href = "login.php";
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => { // <-- poprawka: brakowało nawiasów wokół argumentu
      // Pokaż tylko NAJNOWSZĄ subskrypcję (tę na górze) i ukryj pozostałe
      if (data.success && data.subscriptions && data.subscriptions.length > 0) {
        list.innerHTML = '';
        noActiveSubscriptionShown = false;

        // Znajdź pierwszą subskrypcję o statusie 'active' lub 'trialing', jeśli nie ma to po prostu pierwszą
        let sub = data.subscriptions.find(s => s.status === 'active' || s.status === 'trialing') || data.subscriptions[0];

        // Ustal nazwę planu z price_id jeśli istnieje, w przeciwnym razie z plan
        let planName = sub.plan;
        if (sub.price_id) {
          planName = mapPriceIdToPlan(sub.price_id);
        } else if (sub.plan && sub.plan.startsWith('price_')) {
          planName = mapPriceIdToPlan(sub.plan);
        }

        const statusText = getStatusText(sub.status, sub.cancel_at_period_end);
        const statusClass = getStatusClass(sub.status, sub.cancel_at_period_end);
        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pl-PL') : 'N/A';
        const createdAt = sub.created_at ? new Date(sub.created_at).toLocaleDateString('pl-PL') : 'N/A';

        list.innerHTML = `
          <div class="subscription2-card">
            <div class="subscription-header">
              <h4>Pakiet: ${planName || 'N/A'}</h4>
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

        // Dodaj event listener do przycisku anulowania subskrypcji
        const cancelBtn = list.querySelector('.subscription2-cancel-btn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', (event) => {
            const subId = event.target.closest('.subscription2-cancel-btn').dataset.subscriptionId;
            showCancelModal(subId);
          });
        }

      } else if (data.success && (!data.subscriptions || data.subscriptions.length === 0)) {
        // Pokazuj tylko JEDEN kafelek "Brak aktywnej subskrypcji"
        if (!noActiveSubscriptionShown) {
          list.innerHTML = `
            <div class="no-package-card">
              <h4><i class="fa-solid fa-info-circle"></i> Brak aktywnej subskrypcji</h4>
              <p>Nie masz obecnie aktywnej subskrypcji.</p>
              <a href="../sub/subskrypcja.html" class="subscribe-link">Wybierz pakiet</a>
            </div>
          `;
          noActiveSubscriptionShown = true;
        } else {
          list.innerHTML = '';
        }
      } else {
        list.innerHTML = `<p>Błąd ładowania subskrypcji: ${data.message || 'Nieznany błąd'}</p>`;
      }
    })
    .catch(error => {
      console.error('Błąd pobierania subskrypcji:', error);
      if (list.innerHTML === '' || list.innerHTML.includes('Ładowanie subskrypcji')) {
        list.innerHTML = '<p>Wystąpił błąd podczas ładowania subskrypcji.</p>';
      }
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
    .then(res => res.json())
    .then(data => { // <-- poprawka tutaj
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

  if (showChangeUsernameBtn && changeUsernameForm) {
    showChangeUsernameBtn.onclick = function () {
      changeUsernameForm.style.display = "flex";
      changeEmailForm.style.display = "none";
      changePasswordForm.style.display = "none";
      profileError.textContent = "";
      profileSuccess.style.display = "none";
    };
  }
  if (showChangeEmailBtn && changeEmailForm) {
    showChangeEmailBtn.onclick = function () {
      changeEmailForm.style.display = "flex";
      changeUsernameForm.style.display = "none";
      changePasswordForm.style.display = "none";
      profileError.textContent = "";
      profileSuccess.style.display = "none";
    };
  }
  if (showChangePasswordBtn && changePasswordForm) {
    showChangePasswordBtn.onclick = function () {
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
    cancelUsernameBtn.onclick = function () {
      changeUsernameForm.style.display = "none";
      profileError.textContent = "";
      profileSuccess.style.display = "none";
      document.getElementById('new-username').value = "";
    };
  }
  const cancelEmailBtn = document.getElementById('cancel-email-btn');
  if (cancelEmailBtn && changeEmailForm) {
    cancelEmailBtn.onclick = function () {
      changeEmailForm.style.display = "none";
      profileError.textContent = "";
      profileSuccess.style.display = "none";
      document.getElementById('new-email').value = "";
    };
  }
  const cancelPasswordBtn = document.getElementById('cancel-password-btn');
  if (cancelPasswordBtn && changePasswordForm) {
    cancelPasswordBtn.onclick = function () {
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
    saveUsernameBtn.onclick = function () {
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
    saveEmailBtn.onclick = function () {
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
    savePasswordBtn.onclick = function () {
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
  // Sprawdzenie autoryzacji przed ładowaniem panelu
  fetch("auth.php?action=user_data")
    .then(res => {
      if (!res.ok) {
        window.location.href = "login.php";
        return;
      }
      return res.json();
    })
    .then(data => {
      if (!data || !data.success) {
        window.location.href = "login.php";
      } else {
        loadUserData(); // <- wywołaj od razu po wejściu
        loadActivePackageInfo();
      }
    })
    .catch(() => window.location.href = "login.php");

  // Wylogowywanie (poprawiona obsługa: przekierowanie na stronę główną po wylogowaniu)
  const logout2Btn = document.getElementById("logout2-btn");
  if (logout2Btn) {
    logout2Btn.onclick = function () {
      fetch("auth.php?action=logout", { credentials: "include" })
        .then(() => {
          localStorage.setItem("justLoggedOut", "1");
          window.location.href = "/index.html";
        })
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

// Globalna obsługa dowolnego przycisku wylogowania
document.body.addEventListener("click", function (e) {
  const target = e.target.closest("#logout-btn, #logout2-btn");
  if (target) {
    fetch("auth.php?action=logout", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        localStorage.setItem("justLoggedOut", "1");
        window.location.href = data.redirectTo || "/index.html";
      })
      .catch(error => {
        console.error("Błąd podczas wylogowywania:", error);
        alert("Wystąpił błąd podczas wylogowywania.");
      });
  }
});
document.addEventListener('DOMContentLoaded', function () {
  const mainpageBtn = document.getElementById('nav-mainpage-btn');
  if (mainpageBtn) {
    mainpageBtn.addEventListener('click', function () {
      window.location.href = '/index.html';
    });
  }
});

// Obsługa uploadu avatara
document.addEventListener('DOMContentLoaded', () => {
  const avatarDiv = document.getElementById('profile2-avatar');
  const avatarInput = document.getElementById('avatar2-upload');
  const avatarImg = document.getElementById('avatar2-img');
  const avatarError = document.getElementById('avatar2-error');
  const avatarRemoveBtn = document.getElementById('avatar2-remove-btn');

  if (avatarDiv && avatarInput) {
    avatarDiv.addEventListener('click', (e) => {
      if (e.target !== avatarInput) avatarInput.click();
    });

    avatarInput.addEventListener('change', async function () {
      avatarError.textContent = '';
      const file = this.files && this.files[0];
      if (!file) return;

      // Walidacja typu
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        avatarError.textContent = 'Dozwolone formaty: JPG, PNG, WEBP.';
        this.value = '';
        return;
      }
      // Walidacja rozmiaru
      if (file.size > 2 * 1024 * 1024) {
        avatarError.textContent = 'Maksymalny rozmiar pliku to 2MB.';
        this.value = '';
        return;
      }

      // Podgląd avatara (opcjonalnie)
      const reader = new FileReader();
      reader.onload = function (e) {
        if (avatarImg) {
          avatarImg.innerHTML = `<img src="${e.target.result}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
      };
      reader.readAsDataURL(file);

      // Wysyłka do backendu
      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const res = await fetch('upload_avatar.php', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        const data = await res.json();
        if (!data.success) {
          avatarError.textContent = data.message || 'Błąd podczas zapisu avatara.';
          // Przywróć domyślną ikonę jeśli błąd
          avatarImg.innerHTML = '<i class="fa-solid fa-user"></i>';
        } else if (data.url) {
          // Ustaw nowy avatar (jeśli backend zwraca url)
          avatarImg.innerHTML = `<img src="${data.url}?${Date.now()}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
      } catch (err) {
        avatarError.textContent = 'Błąd sieci podczas zapisu avatara.';
        avatarImg.innerHTML = '<i class="fa-solid fa-user"></i>';
      }
    });
  }

  // Obsługa usuwania avatara
  if (avatarRemoveBtn) {
    avatarRemoveBtn.addEventListener('click', async function () {
      avatarError.textContent = '';
      if (!confirm('Czy na pewno chcesz usunąć avatar?')) return;
      try {
        const res = await fetch('upload_avatar.php', {
          method: 'POST',
          body: new URLSearchParams({ action: 'remove' }),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          avatarImg.innerHTML = '<i class="fa-solid fa-user"></i>';
        } else {
          avatarError.textContent = data.message || 'Błąd podczas usuwania avatara.';
        }
      } catch {
        avatarError.textContent = 'Błąd sieci podczas usuwania avatara.';
      }
    });
  }

  // Inicjalne załadowanie avatara
  fetch('auth.php?action=user_data')
    .then(res => res.json())
    .then(data => {
      if (data.success && data.user && data.user.avatar) {
        avatarImg.innerHTML = `<img src="${data.user.avatar}?${Date.now()}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        avatarImg.innerHTML = '<i class="fa-solid fa-user"></i>';
      }
    })
    .catch(() => {
      avatarImg.innerHTML = '<i class="fa-solid fa-user"></i>';
    });
});

// Lista kursów (możesz rozbudować o pobieranie z backendu)
const ALL_COURSES = [
  {
    id: 'free-1',
    title: 'Wprowadzenie do AI',
    desc: 'Podstawy sztucznej inteligencji i automatyzacji.',
    access: 'free'
  },
  {
    id: 'basic-1',
    title: 'Automatyzacja w biznesie',
    desc: 'Praktyczne workflowy i narzędzia automatyzacji.',
    access: 'basic'
  },
  {
    id: 'pro-1',
    title: 'Zaawansowane integracje API',
    desc: 'Integracje systemów, webhooki, RPA.',
    access: 'pro'
  },
];

// Dodaj globalny stan filtrów i wyszukiwania
let courseFilters = {
  access: 'all', // all | free | basic | pro | enterprise
  status: 'all', // all | started | completed
  search: ''
};

// Przykładowy status ukończenia kursów (w praktyce pobierz z backendu/usera)
let userCourseStatus = {}; // { [courseId]: 'started' | 'completed' }

// Funkcja do pobrania statusów kursów użytkownika (tu: localStorage demo)
function getUserCourseStatuses() {
  try {
    const data = localStorage.getItem('userCourseStatus');
    if (data) userCourseStatus = JSON.parse(data);
    else userCourseStatus = {};
  } catch {
    userCourseStatus = {};
  }
}

// Funkcja do ustawiania statusu kursu (demo, w praktyce zapisz na backendzie)
function setUserCourseStatus(courseId, status) {
  userCourseStatus[courseId] = status;
  localStorage.setItem('userCourseStatus', JSON.stringify(userCourseStatus));
}

// Funkcja do pobrania kursów z backendu (z pliku JSON)
async function fetchAllCoursesFromBackend() {
  try {
    const res = await fetch('/courses/courses.json', { credentials: 'omit', cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    // Oczekiwany format: [{id, title, desc, access, link}, ...]
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

// Nowy panel filtrów kursów (nie modal na całą stronę, tylko wysuwane okienko)
function renderCourseFilters(container, onChange) {
  // Przycisk otwierający panel
  container.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:16px 24px;align-items:center;justify-content:space-between;margin-bottom:18px;position:relative;">
      <input type="text" id="course-search-input" placeholder="Szukaj kursu..." style="flex:1 1 180px;max-width:260px;padding:8px 12px;border-radius:8px;border:1px solid #222;background:#181a2b;color:#0ff;font-size:1em;">
      <button id="toggle-filters-btn" style="background:#0ff;color:#181818;padding:8px 18px;border-radius:7px;font-weight:bold;border:none;cursor:pointer;transition:background 0.2s;">Filtruj <i class="fa fa-filter"></i></button>
      <div id="course-filters-panel"
        style="display:none;position:absolute;top:110%;right:0;z-index:1000;background:#181a2b;border-radius:18px;box-shadow:0 4px 32px #000a;padding:32px 24px 20px 24px;min-width:340px;max-width:95vw;transition:opacity 0.2s;opacity:1;">
        <button id="close-filters-panel" style="position:absolute;top:10px;right:14px;background:none;border:none;color:#0ff;font-size:1.5em;cursor:pointer;"><i class="fa fa-times"></i></button>
        <div style="margin-bottom:24px;">
          <div style="color:#0ff;font-weight:bold;font-size:1.1em;margin-bottom:10px;">Rodzaj pakietu</div>
          <div style="display:flex;gap:14px;">
            <div class="filter-square filter-access" data-value="free" tabindex="0" style="flex:1;min-width:70px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 0;border-radius:10px;background:#0ff1;color:#0ff;font-weight:bold;font-size:1.05em;transition:all 0.15s;border:2px solid #0ff;">
              DARMOWE
            </div>
            <div class="filter-square filter-access" data-value="basic" tabindex="0" style="flex:1;min-width:70px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 0;border-radius:10px;background:#ffd70022;color:#FFD700;font-weight:bold;font-size:1.05em;transition:all 0.15s;border:2px solid #FFD700;">
              BASIC
            </div>
            <div class="filter-square filter-access" data-value="pro" tabindex="0" style="flex:1;min-width:70px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 0;border-radius:10px;background:#00ffae22;color:#00ffae;font-weight:bold;font-size:1.05em;transition:all 0.15s;border:2px solid #00ffae;">
              PRO
            </div>
          </div>
        </div>
        <div style="margin-bottom:10px;">
          <div style="color:#0ff;font-weight:bold;font-size:1.1em;margin-bottom:10px;">Status kursu</div>
          <div style="display:flex;gap:14px;">
            <div class="filter-square filter-status" data-value="completed" tabindex="0" style="flex:1;min-width:70px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 0;border-radius:10px;background:#00ffae22;color:#00ffae;font-weight:bold;font-size:1.05em;transition:all 0.15s;border:2px solid #00ffae;">
              Ukończony
            </div>
            <div class="filter-square filter-status" data-value="started" tabindex="0" style="flex:1;min-width:70px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 0;border-radius:10px;background:#ffd70022;color:#FFD700;font-weight:bold;font-size:1.05em;transition:all 0.15s;border:2px solid #FFD700;">
              Rozpoczęty
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
          <button id="clear-filters-btn" style="background:#232946;color:#0ff;padding:7px 15px;border-radius:7px;font-size:1em;font-weight:bold;border:none;cursor:pointer;transition:background 0.2s;">Wyczyść</button>
          <button id="apply-filters-btn" style="background:#0ff;color:#181818;padding:7px 15px;border-radius:7px;font-size:1em;font-weight:bold;border:none;cursor:pointer;transition:background 0.2s;">Zastosuj</button>
        </div>
      </div>
    </div>
  `;

  // Obsługa wyszukiwarki
  container.querySelector('#course-search-input').addEventListener('input', e => {
    courseFilters.search = e.target.value.trim().toLowerCase();
    onChange();
  });

  // Panel filtrów
  const panel = container.querySelector('#course-filters-panel');
  const toggleBtn = container.querySelector('#toggle-filters-btn');
  const closeBtn = container.querySelector('#close-filters-panel');

  // Otwieranie panelu
  toggleBtn.onclick = () => {
    panel.style.display = 'block';
    setTimeout(() => { panel.style.opacity = '1'; }, 10);
    // Zaznacz aktywne filtry
    panel.querySelectorAll('.filter-access').forEach(el => {
      el.classList.toggle('active', (courseFilters.accessArr || []).includes(el.dataset.value));
      el.style.boxShadow = el.classList.contains('active') ? '0 0 0 3px #0ff8' : '';
      el.style.background = el.classList.contains('active') ? '#0ff4' : el.style.background;
      if (el.dataset.value === 'basic') el.style.background = el.classList.contains('active') ? '#ffd70066' : '#ffd70022';
      if (el.dataset.value === 'pro') el.style.background = el.classList.contains('active') ? '#00ffae66' : '#00ffae22';
    });
    panel.querySelectorAll('.filter-status').forEach(el => {
      el.classList.toggle('active', (courseFilters.statusArr || []).includes(el.dataset.value));
      el.style.boxShadow = el.classList.contains('active') ? '0 0 0 3px #0ff8' : '';
      el.style.background = el.classList.contains('active') ? '#0ff4' : el.style.background;
      if (el.dataset.value === 'started') el.style.background = el.classList.contains('active') ? '#ffd70066' : '#ffd70022';
      if (el.dataset.value === 'completed') el.style.background = el.classList.contains('active') ? '#00ffae66' : '#00ffae22';
    });
  };
  // Zamknięcie panelu
  closeBtn.onclick = () => {
    panel.style.opacity = '0';
    setTimeout(() => { panel.style.display = 'none'; }, 150);
  };
  // Zamknięcie kliknięciem poza panel
  document.addEventListener('mousedown', function (e) {
    if (panel.style.display === 'block' && !panel.contains(e.target) && !toggleBtn.contains(e.target)) {
      panel.style.opacity = '0';
      setTimeout(() => { panel.style.display = 'none'; }, 150);
    }
  });
  // Zamknięcie klawiszem Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.style.display === 'block') {
      panel.style.opacity = '0';
      setTimeout(() => { panel.style.display = 'none'; }, 150);
    }
  });

  // Obsługa wyboru kwadracików (multi-select)
  if (!courseFilters.accessArr) courseFilters.accessArr = [];
  if (!courseFilters.statusArr) courseFilters.statusArr = [];
  panel.querySelectorAll('.filter-access').forEach(el => {
    el.onclick = () => {
      const val = el.dataset.value;
      if (courseFilters.accessArr.includes(val)) {
        courseFilters.accessArr = courseFilters.accessArr.filter(v => v !== val);
      } else {
        courseFilters.accessArr.push(val);
      }
      el.classList.toggle('active');
      el.style.boxShadow = el.classList.contains('active') ? '0 0 0 3px #0ff8' : '';
      el.style.background = el.classList.contains('active') ? '#0ff4' : (val === 'basic' ? '#ffd70022' : val === 'pro' ? '#00ffae22' : '#0ff1');
      if (val === 'basic' && el.classList.contains('active')) el.style.background = '#ffd70066';
      if (val === 'pro' && el.classList.contains('active')) el.style.background = '#00ffae66';
    };
  });
  panel.querySelectorAll('.filter-status').forEach(el => {
    el.onclick = () => {
      const val = el.dataset.value;
      if (courseFilters.statusArr.includes(val)) {
        courseFilters.statusArr = courseFilters.statusArr.filter(v => v !== val);
      } else {
        courseFilters.statusArr.push(val);
      }
      el.classList.toggle('active');
      el.style.boxShadow = el.classList.contains('active') ? '0 0 0 3px #0ff8' : '';
      el.style.background = el.classList.contains('active') ? '#0ff4' : (val === 'started' ? '#ffd70022' : '#00ffae22');
      if (val === 'started' && el.classList.contains('active')) el.style.background = '#ffd70066';
      if (val === 'completed' && el.classList.contains('active')) el.style.background = '#00ffae66';
    };
  });

  // Zastosuj filtry
  panel.querySelector('#apply-filters-btn').onclick = () => {
    panel.style.opacity = '0';
    setTimeout(() => { panel.style.display = 'none'; }, 150);
    onChange();
  };
  // Wyczyść filtry
  panel.querySelector('#clear-filters-btn').onclick = () => {
    courseFilters.accessArr = [];
    courseFilters.statusArr = [];
    onChange();
    panel.style.opacity = '0';
    setTimeout(() => { panel.style.display = 'none'; }, 150);
  };
}

// Funkcja do renderowania kursów w sekcji "Moje kursy"
async function renderUserCourses() {
  const coursesSection = document.getElementById('section2-courses');
  if (!coursesSection) return;
  let container = document.getElementById('user-courses-list');
  if (!container) {
    container = document.createElement('div');
    container.id = 'user-courses-list';
    coursesSection.appendChild(container);
  }
  // Zwiększ rozmiar okna "Moje kursy"
  coursesSection.style.minHeight = '700px';
  coursesSection.style.maxWidth = '1200px';
  coursesSection.style.margin = '0 auto';

  container.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px 0;">Ładowanie kursów...</div>';

  // Pobierz statusy kursów użytkownika (demo: localStorage)
  getUserCourseStatuses();

  let accessLevel = 'free';
  let allCourses = [];
  try {
    [accessLevel, allCourses] = await Promise.all([
      getUserCourseAccessLevel(),
      fetchAllCoursesFromBackend()
    ]);
  } catch (err) {
    console.error('Błąd pobierania kursów lub uprawnień:', err);
    container.innerHTML = '<div style="color:#ff5c5c;text-align:center;padding:30px 0;">Błąd ładowania kursów. Spróbuj odświeżyć stronę.</div>';
    return;
  }

  // Jeśli fetchAllCoursesFromBackend zwraca pustą tablicę lub błąd
  if (!Array.isArray(allCourses) || allCourses.length === 0) {
    container.innerHTML = '<div style="color:#ff5c5c;text-align:center;padding:30px 0;">Brak kursów do wyświetlenia.<br>Skontaktuj się z administratorem lub spróbuj później.</div>';
    console.error('Brak kursów lub nie udało się pobrać pliku courses.json');
    return;
  }

  // Sekcja filtrów i wyszukiwarki
  let filtersDiv = document.getElementById('user-courses-filters');
  if (!filtersDiv) {
    filtersDiv = document.createElement('div');
    filtersDiv.id = 'user-courses-filters';
    coursesSection.insertBefore(filtersDiv, container);
  }
  renderCourseFilters(filtersDiv, () => renderUserCourses());

  // Filtrowanie wg uprawnień
  let visibleCourses = allCourses.filter(course => {
    if (course.access === 'free') return true;
    if (course.access === 'basic' && (accessLevel === 'basic' || accessLevel === 'pro' || accessLevel === 'enterprise')) return true;
    if (course.access === 'pro' && (accessLevel === 'pro' || accessLevel === 'enterprise')) return true;
    if (course.access === 'enterprise' && accessLevel === 'enterprise') return true;
    return false;
  });

  // Filtrowanie po rodzaju pakietu (multi)
  if (courseFilters.accessArr && courseFilters.accessArr.length > 0) {
    visibleCourses = visibleCourses.filter(c => courseFilters.accessArr.includes(c.access));
  }
  // Filtrowanie po statusie ukończenia (multi)
  if (courseFilters.statusArr && courseFilters.statusArr.length > 0) {
    visibleCourses = visibleCourses.filter(c => courseFilters.statusArr.includes(userCourseStatus[c.id]));
  }
  // Filtrowanie po nazwie (wyszukiwarka)
  if (courseFilters.search) {
    visibleCourses = visibleCourses.filter(c => c.title.toLowerCase().includes(courseFilters.search));
  }

  if (visibleCourses.length === 0) {
    container.innerHTML = '<div style="color:#ff5c5c;text-align:center;padding:30px 0;">Nie znaleziono kursów.<br><a href="../sub/subskrypcja.html" style="color:#0ff;text-decoration:underline;">Aktywuj subskrypcję</a></div>';
    return;
  }

  // Wyświetlanie w dwóch kolumnach, ładniejsze kafelki
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:22px;">
      ${visibleCourses.map(course => {
        // Kolor i tekst badge
        let badgeColor = '#0ff', badgeBg = '#0ff1', badgeText = 'DARMOWY';
        if (course.access === 'basic') { badgeColor = '#FFD700'; badgeBg = '#ffd70022'; badgeText = 'BASIC'; }
        if (course.access === 'pro') { badgeColor = '#00ffae'; badgeBg = '#00ffae22'; badgeText = 'PRO'; }
        if (course.access === 'enterprise') { badgeColor = '#ff5c5c'; badgeBg = '#ff5c5c22'; badgeText = 'ENTERPRISE'; }
        // Status ukończenia
        const status = userCourseStatus[course.id] || 'notstarted';
        let statusLabel = '';
        if (status === 'started') statusLabel = `<span class="course-status started" style="background:#ffd70022;color:#FFD700;border-radius:6px;padding:2px 10px;margin-left:8px;font-size:0.93em;">Rozpoczęty</span>`;
        if (status === 'completed') statusLabel = `<span class="course-status completed" style="background:#00ffae22;color:#00ffae;border-radius:6px;padding:2px 10px;margin-left:8px;font-size:0.93em;">Ukończony</span>`;
        return `
        <div class="user-course-card" style="background:linear-gradient(120deg,#181818 80%,#232946 100%);border-radius:18px;padding:22px 20px 20px 20px;box-shadow:0 2px 18px #0005;position:relative;overflow:hidden;transition:box-shadow 0.2s;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
            <span class="user-course-badge" style="display:inline-block;padding:4px 16px;border-radius:12px;font-size:1em;font-weight:bold;background:${badgeBg};color:${badgeColor};box-shadow:0 1px 6px ${badgeBg};letter-spacing:1px;">
              ${badgeText}
            </span>
            ${statusLabel}
          </div>
          <div style="font-size:1.18em;font-weight:bold;color:#fff;margin-bottom:7px;letter-spacing:0.5px;">${course.title}</div>
          <div style="color:#b8f6f6;margin:0 0 18px 0;font-size:1em;opacity:0.92;">${course.desc}</div>
          <div style="display:flex;gap:10px;align-items:center;">
            <a href="/courses/${course.link}" class="user-course-link-btn" style="background:linear-gradient(90deg,#0ff,#00ffae);color:#181818;padding:9px 22px;border-radius:8px;font-weight:bold;text-decoration:none;transition:background 0.2s,box-shadow 0.2s;box-shadow:0 2px 8px #0ff2;font-size:1em;">Przejdź do kursu</a>
            <button type="button" class="user-course-status-btn" data-course-id="${course.id}" style="background:#232946;color:#0ff;padding:8px 14px;border-radius:8px;font-size:0.98em;font-weight:bold;border:none;cursor:pointer;transition:background 0.2s;">${status === 'completed' ? 'Oznacz jako rozpoczęty' : 'Oznacz jako ukończony'}</button>
          </div>
        </div>
        `;
      }).join('')}
    </div>
  `;

  // Obsługa przycisków statusu ukończenia
  container.querySelectorAll('.user-course-status-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const courseId = this.dataset.courseId;
      const current = userCourseStatus[courseId];
      if (current === 'completed') setUserCourseStatus(courseId, 'started');
      else setUserCourseStatus(courseId, 'completed');
      renderUserCourses();
    });
  });
}

// Funkcja do pobrania poziomu dostępu użytkownika (free/basic/pro/enterprise)
async function getUserCourseAccessLevel() {
  try {
    const res = await fetch('auth.php?action=check_active_subscription', { credentials: 'include' });
    const data = await res.json();
    if (data.success && data.subscription && data.subscription.plan) {
      const plan = (data.subscription.plan || '').toLowerCase();
      if (plan.includes('enterprise')) return 'enterprise';
      if (plan.includes('pro')) return 'pro';
      if (plan.includes('basic')) return 'basic';
    }
    return 'free';
  } catch {
    return 'free';
  }
}
