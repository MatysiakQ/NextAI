// user_panel.js
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
    });
  }
});

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
          const statusClass = sub.status === 'active' ? 'active' : (sub.status === 'canceled' ? 'cancelled' : 'inactive');
          const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pl-PL') : 'N/A';
          const createdAt = sub.created_at ? new Date(sub.created_at).toLocaleDateString('pl-PL') : 'N/A';

          list.innerHTML += `
            <div class="subscription2-card">
              <b>Pakiet:</b> ${sub.plan || 'N/A'}<br>
              <b>Status:</b> <span class="subscription2-status ${statusClass}">${sub.status === 'active' ? 'Aktywna' : (sub.status === 'canceled' ? 'Anulowana' : sub.status)}</span><br>
              <b>Data utworzenia:</b> ${createdAt}<br>
              <b>Wygasa:</b> ${currentPeriodEnd}<br>
              ${sub.status === 'active' && sub.stripe_subscription_id ? `<button class="subscription2-cancel-btn" data-subscription-id="${sub.stripe_subscription_id}">Anuluj subskrypcję</button>` : ''}
            </div>
          `;
        });

        // Dodaj event listenery do przycisków anulowania subskrypcji
        document.querySelectorAll('.subscription2-cancel-btn').forEach(button => {
          button.addEventListener('click', (event) => {
            const subId = event.target.dataset.subscriptionId;
            if (confirm('Czy na pewno chcesz anulować tę subskrypcję?')) {
              cancelSubscription(subId);
            }
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

// Funkcja do anulowania subskrypcji
function cancelSubscription(subscriptionId) {
    if (!subscriptionId) {
        alert('Błąd: Brak ID subskrypcji');
        return;
    }

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
            loadSubscriptions(); // Odśwież listę subskrypcji po anulowaniu
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
    // Walidacja po stronie klienta
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

    // Wyślij żądanie do backendu
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
            // Wyczyść formularz
            document.getElementById('profile2-old-password').value = "";
            document.getElementById('profile2-password').value = "";
            document.getElementById('profile2-password2').value = "";
            // Ukryj formularz zmiany hasła
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
});