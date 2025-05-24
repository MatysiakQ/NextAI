document.addEventListener("DOMContentLoaded", () => {
  // Logowanie
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // To musi być!
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const errorBox = document.getElementById("login-error");
      errorBox.textContent = "";

      const res = await fetch("auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "user_panel.html";
      } else {
        errorBox.textContent = data.message || "Błąd logowania";
      }
    });
  }

  // Rejestracja
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("register-email").value.trim();
      const password = document.getElementById("register-password").value;
      const password2 = document.getElementById("register-password2").value;
      const errorBox = document.getElementById("register-error");
      errorBox.textContent = "";

      if (password !== password2) {
        errorBox.textContent = "Hasła nie są takie same!";
        return;
      }
      if (password.length < 6) {
        errorBox.textContent = "Hasło musi mieć min. 6 znaków.";
        return;
      }

      const res = await fetch("auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `action=register&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "user_panel.html";
      } else {
        errorBox.textContent = data.message || "Błąd rejestracji";
      }
    });
  }

  // Panel użytkownika – pobierz subskrypcje
  if (window.location.pathname.endsWith("panel.html")) {
    fetch("auth.php?action=subscriptions")
      .then(res => res.json())
      .then(data => {
        const list = document.getElementById("subscriptions-list");
        if (data.success && data.subscriptions.length) {
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

  function markError(field, message, errorBox) {
    field.classList.add("field-error");
    if (errorBox) errorBox.textContent = message;
  }

  function clearErrors(form) {
    form.querySelectorAll(".field-error").forEach(el => el.classList.remove("field-error"));
  }
});