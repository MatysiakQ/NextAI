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
  btn.addEventListener('click', () => {
    Object.values(navBtns2).forEach(b => b.classList.remove('active'));
    Object.values(sections2).forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    sections2[key].classList.add('active');

    // Jeśli przechodzimy do sekcji subskrypcji, załaduj je
    if (key === 'subscriptions') {
      loadSubscriptions();
    }
  });
});

// Załaduj dane użytkownika z backendu (pobierz z auth.php po zalogowaniu)
function loadUserData() {
  fetch('auth.php?action=user_data') // Zmieniono na 'user_data'
    .then(res => res.json())
    .then(data => {
      if (!data.success || !data.user) {
        document.getElementById('profile2-username').value = "Użytkownik";
        document.getElementById('profile2-email').value = "";
        document.getElementById('avatar2-img').innerHTML = '<i class="fa-solid fa-user"></i>';
        return;
      }
      document.getElementById('profile2-username').value = data.user.username || "Brak nazwy";
      document.getElementById('profile2-email').value = data.user.email;
      // Możesz tutaj ustawić avatar, jeśli masz url w danych użytkownika
      document.getElementById('avatar2-img').innerHTML = '<i class="fa-solid fa-user"></i>'; // Domyślna ikona
    })
    .catch(error => {
      console.error("Błąd ładowania danych użytkownika:", error);
      document.getElementById('profile2-username').value = "Błąd";
      document.getElementById('profile2-email').value = "Błąd";
      document.getElementById('avatar2-img').innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    });
}

// Funkcja do ładowania subskrypcji z backendu
function loadSubscriptions() {
  const list = document.getElementById("subscriptions2-list");
  if (!list) return;

  list.innerHTML = '<p>Ładowanie subskrypcji...</p>'; // Wskazówka ładowania

  fetch('auth.php?action=subscriptions') // Wywołaj nową akcję 'subscriptions'
    .then(res => {
        if (!res.ok) {
            if (res.status === 401) {
                // Nieautoryzowany, przekieruj do logowania
                window.location.href = "login.html";
                return;
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
      if (data.success && data.subscriptions) {
        list.innerHTML = ''; // Wyczyść poprzednią zawartość

        if (data.subscriptions.length === 0) {
          list.innerHTML = '<p>Brak aktywnych subskrypcji.</p>';
          return;
        }

        data.subscriptions.forEach(sub => {
          const statusClass = sub.status === 'active' ? 'active' : (sub.status === 'canceled' ? 'cancelled' : 'inactive');
          const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pl-PL') : 'N/A';
          const createdAt = new Date(sub.created_at).toLocaleDateString('pl-PL');

          list.innerHTML += `
            <div class="subscription2-card">
              <b>Pakiet:</b> ${sub.plan}<br>
              <b>Status:</b> <span class="subscription2-status ${statusClass}">${sub.status === 'active' ? 'Aktywna' : (sub.status === 'canceled' ? 'Anulowana' : sub.status)}</span><br>
              <b>Data utworzenia:</b> ${createdAt}<br>
              <b>Wygasa:</b> ${currentPeriodEnd}<br>
              ${sub.status === 'active' ? `<button class="subscription2-cancel-btn" data-subscription-id="${sub.stripe_subscription_id}">Anuluj subskrypcję</button>` : ''}
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
    fetch('auth.php', { // Wysyłamy do auth.php
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel_subscription', subscriptionId: subscriptionId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Anulowanie subskrypcji zostało zainicjowane.');
            loadSubscriptions(); // Odśwież listę subskrypcji po anulowaniu
        } else {
            alert('Błąd podczas anulowania subskrypcji: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Błąd sieci podczas anulowania subskrypcji:', error);
        alert('Wystąpił błąd sieci podczas anulowania subskrypcji.');
    });
}


// Inicjalizacja ładowania danych użytkownika przy starcie
document.addEventListener('DOMContentLoaded', () => {
    // Sprawdzenie autoryzacji przed ładowaniem panelu
    fetch("auth.php?action=user_data") // Używamy user_data do sprawdzenia czy user jest zalogowany
        .then(res => {
            if (!res.ok) {
                window.location.href = "login.html"; // Jeśli nie jest zalogowany, przekieruj
                return;
            }
            return res.json();
        })
        .then(data => {
            if (!data.success) {
                window.location.href = "login.html";
            } else {
                loadUserData(); // Załaduj dane użytkownika
                // Upewnij się, że domyślnie aktywna sekcja to "Mój profil"
                // i załaduj subskrypcje tylko gdy użytkownik kliknie na "Moje subskrypcje"
            }
        })
        .catch(() => window.location.href = "login.html");
});


// ... (reszta istniejącego kodu user_panel.js)

// Reszta kodu obsługująca zmiany hasła, itp.
const profile2UsernameInput = document.getElementById('profile2-username');
const profile2EmailInput = document.getElementById('profile2-email');
const profile2SaveBtn = document.getElementById('profile2-save-btn');
const profile2Success = document.getElementById('profile2-success');

if (profile2SaveBtn) {
  profile2SaveBtn.addEventListener('click', () => {
    // Tutaj logika zapisu danych profilu (jeśli jest)
    // console.log("Zapisuję profil...");
    // profile2Success.style.display = 'block';
    // setTimeout(() => { profile2Success.style.display = 'none'; }, 3000);
  });
}

const changePasswordBtn = document.getElementById('change-password-btn');
const changePasswordForm = document.getElementById('change-password-form');
const cancelPasswordChangeBtn = document.getElementById('cancel-password-change-btn');
const savePasswordBtn = document.getElementById('save-password-btn');

if (changePasswordBtn && changePasswordForm && cancelPasswordChangeBtn && savePasswordBtn) {
  changePasswordBtn.onclick = function() {
    changePasswordForm.style.display = "block";
    changePasswordBtn.style.display = "none";
  };
  cancelPasswordChangeBtn.onclick = function() {
    changePasswordForm.style.display = "none";
    changePasswordBtn.style.display = "";
    document.getElementById('profile2-old-password').value = "";
    document.getElementById('profile2-password').value = "";
    document.getElementById('profile2-password2').value = "";
  };
  savePasswordBtn.onclick = function() {
    const oldPass = document.getElementById('profile2-old-password').value;
    const pass1 = document.getElementById('profile2-password').value;
    const pass2 = document.getElementById('profile2-password2').value;
    if (oldPass.length < 6) {
      alert("Stare hasło musi mieć min. 6 znaków.");
      return;
    }
    // Dodaj weryfikację na silne hasło (np. 1 duża litera, 1 cyfra, min. 6 znaków)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(pass1)) {
        alert("Nowe hasło musi mieć min. 6 znaków, zawierać co najmniej jedną dużą literę i jedną cyfrę.");
        return;
    }
    if (pass1 !== pass2) {
      alert("Hasła nie są takie same!");
      return;
    }
    // TODO: Wyślij na backend (wymaga dedykowanego endpointu np. auth.php?action=change_password)
    // W obecnej formie to tylko alert, a nie faktyczna zmiana hasła.
    // Powinien być tu fetch do backendu.
    alert("Hasło zostało zmienione! (Wymaga implementacji na backendzie)");

    changePasswordForm.style.display = "none";
    changePasswordBtn.style.display = "";
    document.getElementById('profile2-old-password').value = "";
    document.getElementById('profile2-password').value = "";
    document.getElementById('profile2-password2').value = "";
  };
}

// Wylogowywanie
document.getElementById("logout2-btn").onclick = function() {
  fetch("auth.php?action=logout")
    .then(() => window.location.href = "login.html")
    .catch(error => {
        console.error("Błąd podczas wylogowywania:", error);
        alert("Wystąpił błąd podczas wylogowywania.");
    });
};