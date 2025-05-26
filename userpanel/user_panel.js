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

// Avatar upload (frontend, backend obsłuż potem)
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
    // TODO: Wyślij na backend
  }
});

// Załaduj dane użytkownika (mock, potem pobierz z backendu)
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('profile2-username').value = "Użytkownik";
  document.getElementById('profile2-email').textContent = "user@example.com";
});

// Zmiana e-maila
const changeEmailBtn = document.getElementById('change-email-btn');
const changeEmailForm = document.getElementById('change-email-form');
const profile2Email = document.getElementById('profile2-email');
const profile2EmailInput = document.getElementById('profile2-email-input');
const saveEmailBtn = document.getElementById('save-email-btn');
const cancelEmailBtn = document.getElementById('cancel-email-btn');

changeEmailBtn.onclick = () => {
  changeEmailForm.style.display = "flex";
  profile2EmailInput.value = profile2Email.textContent;
  changeEmailBtn.style.display = "none";
};
cancelEmailBtn.onclick = () => {
  changeEmailForm.style.display = "none";
  changeEmailBtn.style.display = "";
};
saveEmailBtn.onclick = () => {
  const newEmail = profile2EmailInput.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    alert("Podaj poprawny adres e-mail.");
    return;
  }
  // TODO: Wyślij na backend
  profile2Email.textContent = newEmail;
  changeEmailForm.style.display = "none";
  changeEmailBtn.style.display = "";
};

// Zmiana hasła
const changePasswordBtn = document.getElementById('change-password-btn');
const changePasswordForm = document.getElementById('change-password-form');
const profile2Password = document.getElementById('profile2-password');
const profile2Password2 = document.getElementById('profile2-password2');
const savePasswordBtn = document.getElementById('save-password-btn');
const cancelPasswordBtn = document.getElementById('cancel-password-btn');

changePasswordBtn.onclick = () => {
  changePasswordForm.style.display = "flex";
  changePasswordBtn.style.display = "none";
};
cancelPasswordBtn.onclick = () => {
  changePasswordForm.style.display = "none";
  changePasswordBtn.style.display = "";
  profile2Password.value = "";
  profile2Password2.value = "";
};
savePasswordBtn.onclick = () => {
  const pass1 = profile2Password.value;
  const pass2 = profile2Password2.value;
  if (pass1.length < 6) {
    alert("Hasło musi mieć min. 6 znaków.");
    return;
  }
  if (pass1 !== pass2) {
    alert("Hasła nie są takie same!");
    return;
  }
  // TODO: Wyślij na backend
  changePasswordForm.style.display = "none";
  changePasswordBtn.style.display = "";
  profile2Password.value = "";
  profile2Password2.value = "";
  alert("Hasło zostało zmienione!");
};

// Wylogowywanie
document.getElementById("logout2-btn").onclick = function() {
  fetch("auth.php?action=logout").then(() => window.location.href = "login.html");
};

// Subskrypcje (mock, potem pobierz z backendu)
document.addEventListener('DOMContentLoaded', () => {
  // TODO: pobierz subskrypcje z backendu
  const list = document.getElementById("subscriptions2-list");
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
  // Obsługa anulowania (mock)
  list.querySelectorAll('.subscription2-cancel-btn').forEach(btn => {
    btn.onclick = () => {
      btn.textContent = "Anulowano";
      btn.disabled = true;
    };
  });
});
