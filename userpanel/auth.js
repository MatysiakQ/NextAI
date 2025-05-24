document.addEventListener("DOMContentLoaded", () => {
  // Punkt 6: automatyczne przekierowanie jeśli już zalogowany
  if (
    window.location.pathname.endsWith("login.html") ||
    window.location.pathname.endsWith("register.html")
  ) {
    fetch("auth.php?action=subscriptions")
      .then(res => res.json())
      .then(data => {
        if (data.success) window.location.href = "user_panel.html";
      });
  }

  // Walidacja i efekty
  function markError(field, message, errorBox) {
    field.classList.add("field-error");
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.style.color = "#ff5c5c";
    }
  }

  function clearErrors(form) {
    form.querySelectorAll(".field-error").forEach(el => el.classList.remove("field-error"));
  }
  // Logowanie
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors(loginForm);
      const email = document.getElementById("email");
      const password = document.getElementById("password");
      const errorBox = document.getElementById("login-error");
      errorBox.textContent = "";

      if (!email.value.trim()) {
        markError(email, "Podaj email", errorBox);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        markError(email, "Wprowadź poprawny adres e-mail.", errorBox);
        return;
      }
      if (!password.value) {
        markError(password, "Podaj hasło", errorBox);
        return;
      }

      const res = await fetch("auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `action=login&email=${encodeURIComponent(email.value.trim())}&password=${encodeURIComponent(password.value)}`
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "user_panel.html";
      } else {
        if (data.message && data.message.toLowerCase().includes("email")) {
          markError(email, data.message, errorBox);
        } else if (data.message && data.message.toLowerCase().includes("hasło")) {
          markError(password, data.message, errorBox);
        } else {
          markError(email, data.message, errorBox);
          markError(password, data.message, errorBox);
        }
      }
    });
  }

  // Rejestracja
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors(registerForm);
      const email = document.getElementById("register-email");
      const password = document.getElementById("register-password");
      const password2 = document.getElementById("register-password2");
      const errorBox = document.getElementById("register-error");
      errorBox.textContent = "";

      if (!email.value.trim()) {
        markError(email, "Podaj email", errorBox);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        markError(email, "Wprowadź poprawny adres e-mail.", errorBox);
        return;
      }
      if (!password.value) {
        markError(password, "Podaj hasło", errorBox);
        return;
      }
      if (password.value !== password2.value) {
        markError(password2, "Hasła nie są takie same!", errorBox);
        return;
      }
      if (password.value.length < 6) {
        markError(password, "Hasło musi mieć min. 6 znaków.", errorBox);
        return;
      }

      const res = await fetch("auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `action=register&email=${encodeURIComponent(email.value.trim())}&password=${encodeURIComponent(password.value)}&password2=${encodeURIComponent(password2.value)}`
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "user_panel.html";
      } else {
        // Obsługa błędów z backendu
        if (data.message && data.message.toLowerCase().includes("email")) {
          markError(email, data.message, errorBox);
        } else if (data.message && data.message.toLowerCase().includes("hasło")) {
          markError(password, data.message, errorBox);
          markError(password2, data.message, errorBox);
        } else {
          // domyślnie podkreśl oba
          markError(email, data.message, errorBox);
          markError(password, data.message, errorBox);
        }
      }
    });
  }

  // Panel użytkownika – pobierz subskrypcje i ochrona dostępu
  if (window.location.pathname.endsWith("user_panel.html")) {
    fetch("auth.php?action=subscriptions")
      .then(res => res.json())
      .then(data => {
        const list = document.getElementById("subscriptions-list");
        if (!data.success) {
          window.location.href = "login.html";
          return;
        }
        if (data.subscriptions.length) {
          list.innerHTML = data.subscriptions.map(sub =>
            `<div class="subscription-card">
              <b>Pakiet:</b> ${sub.plan}<br>
              <b>Status:</b> ${sub.status}<br>
              <b>Data:</b> ${sub.created_at}
            </div>`
          ).join("");
        } else {
          list.textContent = "Brak aktywnych subskrypcji.";
        }
      });
    // Wylogowywanie
    document.getElementById("logout-btn").onclick = function() {
      fetch("auth.php?action=logout").then(() => window.location.href = "login.html");
    };
  }

  // Obsługa błędów i komunikatów
});