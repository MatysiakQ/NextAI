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

// Funkcja do pobrania poziomu dostępu użytkownika (free/basic/pro)
async function getUserCourseAccessLevel() {
  try {
    const res = await fetch('auth.php?action=check_active_subscription', { credentials: 'include' });
    const data = await res.json();
    if (data.success && data.subscription && data.subscription.plan) {
      const plan = (data.subscription.plan || '').toLowerCase();
      if (plan.includes('pro')) return 'pro';
      if (plan.includes('basic')) return 'basic';
    }
    return 'free';
  } catch {
    return 'free';
  }
}

// Funkcja do pobrania kursów z backendu (np. z pliku PHP/JSON)
async function fetchAllCoursesFromBackend() {
  try {
    const res = await fetch('/courses/courses.json', { credentials: 'omit', cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    // Oczekiwany format: [{title, desc, access, link}, ...]
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
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
  container.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px 0;">Ładowanie kursów...</div>';

  // Jeśli użytkownik nie ma subskrypcji (niezalogowany lub brak suba), getUserCourseAccessLevel zwróci 'free'
  const [accessLevel, allCourses] = await Promise.all([
    getUserCourseAccessLevel(),
    fetchAllCoursesFromBackend()
  ]);

  // Pokazuj zawsze kursy darmowe, nawet jeśli accessLevel to 'free'
  const visibleCourses = allCourses.filter(course => {
    if (course.access === 'free') return true;
    if (course.access === 'basic' && (accessLevel === 'basic' || accessLevel === 'pro')) return true;
    if (course.access === 'pro' && accessLevel === 'pro') return true;
    return false;
  });

  if (visibleCourses.length === 0) {
    container.innerHTML = '<div style="color:#ff5c5c;text-align:center;padding:30px 0;">Nie masz dostępu do żadnych kursów.<br><a href="../sub/subskrypcja.html" style="color:#0ff;text-decoration:underline;">Aktywuj subskrypcję</a></div>';
    return;
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px;">
      ${visibleCourses.map(course => `
        <div class="user-course-card" style="background:#181818;border-radius:12px;padding:18px 16px;box-shadow:0 2px 12px #0003;">
          <div style="font-size:1.15em;font-weight:bold;color:#0ff;">${course.title}</div>
          <div style="color:#ccc;margin:6px 0 10px 0;">${course.desc}</div>
          <span class="user-course-badge" style="display:inline-block;padding:3px 12px;border-radius:8px;font-size:0.95em;background:${course.access==='pro' ? '#00ffae22' : course.access==='basic' ? '#ffd70022' : '#0ff2'};color:${course.access==='pro' ? '#00ffae' : course.access==='basic' ? '#FFD700' : '#0ff'};">
            ${course.access === 'pro' ? 'PRO' : course.access === 'basic' ? 'BASIC' : 'DARMOWY'}
          </span>
          <div style="margin-top:12px;">
            <a href="/courses/${course.link}" class="user-course-link-btn" style="background:#0ff;color:#181818;padding:8px 18px;border-radius:7px;font-weight:bold;text-decoration:none;transition:background 0.2s;">Przejdź do kursu</a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
