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
Object.entries(navBtns2).forEach(([key, btn]) => {
  btn.addEventListener('click', () => {
    Object.values(navBtns2).forEach(b => b.classList.remove('active'));
    Object.values(sections2).forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    sections2[key].classList.add('active');
  });
});

// Załaduj dane użytkownika z backendu (pobierz z auth.php po zalogowaniu)
function loadUserData() {
  fetch('auth.php?action=subscriptions')
    .then(res => res.json())
    .then(data => {
      if (!data.success || !data.user) {
        document.getElementById('profile2-username').value = "Użytkownik";
        document.getElementById('profile2-email').value = "";
        // Avatar domyślny
        document.getElementById('avatar2-img').innerHTML = '<i class="fa-solid fa-user"></i>';
        return;
      }
      document.getElementById('profile2-username').value = data.user.username || data.user.email.split('@')[0];
      document.getElementById('profile2-email').value = data.user.email;
      // Avatar
      if (data.user.avatar) {
        document.getElementById('avatar2-img').innerHTML = `<img src="${data.user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        document.getElementById('avatar2-img').innerHTML = '<i class="fa-solid fa-user"></i>';
      }
    })
    .catch(() => {
      document.getElementById('profile2-username').value = "Użytkownik";
      document.getElementById('profile2-email').value = "";
      document.getElementById('avatar2-img').innerHTML = '<i class="fa-solid fa-user"></i>';
    });
}
document.addEventListener('DOMContentLoaded', loadUserData);

// Obsługa formularza profilu (Zapisz zmiany + avatar)
document.getElementById('profile2-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const username = document.getElementById('profile2-username').value.trim();
  const email = document.getElementById('profile2-email').value.trim();
  const password = document.getElementById('profile2-password') ? document.getElementById('profile2-password').value : '';
  const password2 = document.getElementById('profile2-password2') ? document.getElementById('profile2-password2').value : '';
  const oldPassword = document.getElementById('profile2-old-password') ? document.getElementById('profile2-old-password').value : '';
  const errorBox = document.getElementById('profile2-error');
  const successBox = document.getElementById('profile2-success');
  errorBox.textContent = "";
  successBox.style.display = "none";

  if (!username) {
    errorBox.textContent = "Podaj nazwę użytkownika.";
    return;
  }
  if (!email) {
    errorBox.textContent = "Podaj email.";
    return;
  }
  if (password && password.length < 6) {
    errorBox.textContent = "Hasło musi mieć min. 6 znaków.";
    return;
  }
  if (password && password !== password2) {
    errorBox.textContent = "Hasła nie są takie same!";
    return;
  }

  // Jeśli użytkownik zmienia hasło, wymagaj starego hasła i sprawdź wymagania
  if (password) {
    if (!oldPassword) {
      errorBox.textContent = "Podaj stare hasło.";
      return;
    }
    if (!/(?=.*[A-Z])(?=.*\d).{6,}/.test(password)) {
      errorBox.textContent = "Hasło musi mieć min. 6 znaków, 1 wielką literę i 1 cyfrę.";
      return;
    }
  }

  const formData = new FormData();
  formData.append('action', 'update_profile');
  formData.append('username', username);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('password2', password2);
  formData.append('old_password', oldPassword);

  // Dodaj avatar jeśli wybrano plik
  if (avatar2Input.files && avatar2Input.files[0]) {
    formData.append('avatar', avatar2Input.files[0]);
  }

  fetch('auth.php', {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        successBox.style.display = "block";
        errorBox.textContent = "";
        loadUserData();
        if (document.getElementById('change-password-form')) {
          document.getElementById('change-password-form').style.display = "none";
        }
        if (document.getElementById('change-password-btn')) {
          document.getElementById('change-password-btn').style.display = "";
        }
        if (document.getElementById('profile2-password')) document.getElementById('profile2-password').value = "";
        if (document.getElementById('profile2-password2')) document.getElementById('profile2-password2').value = "";
        // Avatar odświeżony przez loadUserData
      } else {
        errorBox.textContent = data.message || "Błąd zapisu danych.";
        successBox.style.display = "none";
      }
    })
    .catch(() => {
      errorBox.textContent = "Błąd połączenia z serwerem.";
      successBox.style.display = "none";
    });
});

// Avatar upload (podgląd lokalny)
const avatar2 = document.getElementById('profile2-avatar');
const avatar2Input = document.getElementById('avatar2-upload');
const avatar2Img = document.getElementById('avatar2-img');
avatar2.addEventListener('click', () => avatar2Input.click());
avatar2Input.addEventListener('change', function() {
  if (this.files && this.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      avatar2Img.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    };
    reader.readAsDataURL(this.files[0]);
  }
});

// Zmiana hasła (pokaz/ukryj formularz)
const changePasswordBtn = document.getElementById('change-password-btn');
const changePasswordForm = document.getElementById('change-password-form');
if (changePasswordBtn && changePasswordForm) {
  changePasswordBtn.onclick = function () {
    changePasswordForm.style.display = "flex";
    changePasswordBtn.style.display = "none";
    // Wyczyść stare hasło przy każdym otwarciu
    if (document.getElementById('profile2-old-password')) {
      document.getElementById('profile2-old-password').value = "";
    }
  };
  document.getElementById('cancel-password-btn').onclick = function () {
    changePasswordForm.style.display = "none";
    changePasswordBtn.style.display = "";
    if (document.getElementById('profile2-old-password')) document.getElementById('profile2-old-password').value = "";
    document.getElementById('profile2-password').value = "";
    document.getElementById('profile2-password2').value = "";
  };
  document.getElementById('save-password-btn').onclick = function () {
    // Wymagaj starego hasła przy próbie zmiany
    const oldPass = document.getElementById('profile2-old-password').value;
    const pass1 = document.getElementById('profile2-password').value;
    const pass2 = document.getElementById('profile2-password2').value;
    if (!oldPass) {
      alert("Podaj stare hasło.");
      return;
    }
    if (pass1.length < 6) {
      alert("Nowe hasło musi mieć min. 6 znaków.");
      return;
    }
    if (!/(?=.*[A-Z])(?=.*\d).{6,}/.test(pass1)) {
      alert("Hasło musi mieć min. 6 znaków, 1 wielką literę i 1 cyfrę.");
      return;
    }
    if (pass1 !== pass2) {
      alert("Hasła nie są takie same!");
      return;
    }
    // Zamknij formularz, zapis jest przez submit formularza głównego
    changePasswordForm.style.display = "none";
    changePasswordBtn.style.display = "";
  };
}

// Wylogowywanie
document.getElementById("logout2-btn").onclick = function() {
  fetch("auth.php?action=logout")
    .then(() => window.location.href = "login.html");
};

// Subskrypcje (mock, potem pobierz z backendu)
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById("subscriptions2-list");
  if (!list) return;
  list.innerHTML = `
    <div class="subscription2-card">
      <b>Pakiet:</b> Pro<br>
      <b>Status:</b> <span class="subscription2-status active">Aktywna</span><br>
      <b>Data:</b> 2024-06-01<br>
      <button class="subscription2-cancel-btn">Anuluj subskrypcję</button>
    </div>
    <div class="subscription2-card">
      <b>Pakiet:</b> Basic<br>
      <b>Status:</b> <span class="subscription2-status pending">Oczekuje</span><br>
      <b>Data:</b> 2024-05-01<br>
      <button class="subscription2-cancel-btn">Anuluj subskrypcję</button>
    </div>
  `;
  list.querySelectorAll('.subscription2-cancel-btn').forEach(btn => {
    btn.onclick = () => {
      btn.textContent = "Anulowano";
      btn.disabled = true;
    };
  });
});
