document.addEventListener("DOMContentLoaded", () => {

  function markError(field, message, errorBox) {
    field.classList.add("field-error");
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.style.color = "#ff5c5c";
    }
  }

  function clearErrors(form) {
    form.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error"));
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors(loginForm);
      const email = loginForm.querySelector('input[name="email"]');
      const password = loginForm.querySelector('input[name="password"]');
      const errorBox = document.getElementById("login-error");
      errorBox.textContent = "";

      if (!email.value.trim()) {
        markError(email, "Podaj login lub email", errorBox);
        return;
      }
      if (email.value.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        markError(email, "Wprowadź poprawny adres e-mail.", errorBox);
        return;
      }
      if (!password.value) {
        markError(password, "Podaj hasło", errorBox);
        return;
      }

      const recaptcha = document.querySelector('.g-recaptcha-response')?.value;
      if (document.querySelector('.g-recaptcha') && !recaptcha) {
        errorBox.textContent = "Potwierdź, że nie jesteś robotem.";
        errorBox.style.color = "#ff5c5c";
        return;
      }

      let data;
      try {
        const res = await fetch("auth.php", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          credentials: "include",
          body: `action=login&email=${encodeURIComponent(email.value.trim())}&password=${encodeURIComponent(password.value)}${recaptcha ? `&g-recaptcha-response=${encodeURIComponent(recaptcha)}` : ""}`
        });
        if (!res.ok) {
          errorBox.textContent = "Błąd połączenia z serwerem.";
          errorBox.style.color = "#ff5c5c";
          return;
        }
        try {
          data = await res.json();
        } catch {
          errorBox.textContent = "Błąd odpowiedzi serwera.";
          errorBox.style.color = "#ff5c5c";
          return;
        }
      } catch {
        errorBox.textContent = "Błąd połączenia z serwerem.";
        errorBox.style.color = "#ff5c5c";
        return;
      }
      if (data.success) {
        const redirect = localStorage.getItem("afterLoginRedirect");
        if (redirect) {
          localStorage.removeItem("afterLoginRedirect");
          window.location.href = redirect;
        } else {
          window.location.href = "user_panel.html";
        }
      } else {
        if (data.message?.toLowerCase().includes("nieprawidłowe")) {
          errorBox.textContent = "Niepoprawny login/hasło";
          errorBox.style.color = "#ff5c5c";
          markError(email, "", null);
          markError(password, "", null);
        } else if (data.message?.toLowerCase().includes("email")) {
          markError(email, data.message, errorBox);
        } else if (data.message?.toLowerCase().includes("hasło")) {
          markError(password, data.message, errorBox);
        } else {
          markError(email, data.message || "Wystąpił błąd podczas logowania", errorBox);
          markError(password, data.message || "Wystąpił błąd podczas logowania", errorBox);
        }
      }
    });
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors(registerForm);
      const username = document.getElementById("register-username");
      const email = document.getElementById("register-email");
      const password = document.getElementById("register-password");
      const password2 = document.getElementById("register-password2");
      const errorBox = document.getElementById("register-error");
      errorBox.textContent = "";

      if (!username.value.trim()) {
        markError(username, "Podaj login", errorBox);
        return;
      }
      if (!/^[a-zA-Z0-9_\-\.]{3,32}$/.test(username.value.trim())) {
        markError(
          username,
          "Nieprawidłowy login (3-32 znaki, tylko litery, cyfry, _, -, .)",
          errorBox
        );
        return;
      }
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
      if (!/(?=.*[A-Z])(?=.*\d).{6,}/.test(password.value)) {
        markError(
          password,
          "Hasło musi mieć min. 6 znaków, 1 wielką literę i 1 cyfrę.",
          errorBox
        );
        return;
      }
      if (password.value !== password2.value) {
        markError(password2, "Hasła nie są takie same!", errorBox);
        return;
      }

      const recaptcha = document.querySelector('.g-recaptcha-response')?.value;
      if (document.querySelector('.g-recaptcha') && !recaptcha) {
        errorBox.textContent = "Potwierdź, że nie jesteś robotem.";
        errorBox.style.color = "#ff5c5c";
        return;
      }

      let data;
      try {
        const res = await fetch("auth.php", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          credentials: "include",
          body: `action=register&username=${encodeURIComponent(
            username.value.trim()
          )}&email=${encodeURIComponent(email.value.trim())}&password=${encodeURIComponent(
            password.value
          )}&password2=${encodeURIComponent(password2.value)}${recaptcha ? `&g-recaptcha-response=${encodeURIComponent(recaptcha)}` : ""}`
        });
        if (!res.ok) {
          errorBox.textContent = "Błąd połączenia z serwerem.";
          errorBox.style.color = "#ff5c5c";
          return;
        }
        try {
          data = await res.json();
        } catch {
          errorBox.textContent = "Błąd odpowiedzi serwera.";
          errorBox.style.color = "#ff5c5c";
          return;
        }
      } catch {
        errorBox.textContent = "Błąd połączenia z serwerem.";
        errorBox.style.color = "#ff5c5c";
        return;
      }
      if (data.success) {
        window.location.href = "user_panel.html";
      } else {
        if (data.message?.toLowerCase().includes("e-mailu") || data.message?.toLowerCase().includes("email")) {
          markError(email, data.message, errorBox);
        } else if (data.message?.toLowerCase().includes("login")) {
          markError(username, data.message, errorBox);
        } else if (data.message?.toLowerCase().includes("hasło")) {
          markError(password, data.message, errorBox);
          markError(password2, data.message, errorBox);
        } else {
          errorBox.textContent = data.message || "Wystąpił błąd podczas rejestracji";
        }
      }
    });
  }

  if (window.location.pathname.endsWith("user_panel.html")) {
    fetch("auth.php?action=user_data", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          window.location.href = "login.html";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data || !data.success) {
          window.location.href = "login.html";
          return;
        }
        loadSubscriptionsForMainPage();
      })
      .catch(() => {
        window.location.href = "login.html";
      });

    // OBSŁUGA WSZYSTKICH PRZYCISKÓW LOGOUT
    const logoutIds = ["logout2-btn", "logout-btn", "user-logout-btn"];
    logoutIds.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.onclick = function () {
          fetch("auth.php?action=logout", { credentials: "include" }).then(() => {
            localStorage.setItem("showLogoutModal", "1");
            setTimeout(() => window.location.href = "/index.html", 150);
          });
        };
      }
    });
  }

  function loadSubscriptionsForMainPage() {
    fetch("auth.php?action=subscriptions", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const list = document.getElementById("subscriptions-list");
        if (!list) return;

        if (!data.success) {
          list.textContent = "Błąd ładowania subskrypcji.";
          return;
        }
        if (data.subscriptions?.length) {
          list.innerHTML = data.subscriptions
            .map(
              (sub) => `<div class="subscription-card">
                <b>Pakiet:</b> ${sub.plan || "N/A"}<br>
                <b>Status:</b> ${sub.status || "N/A"}<br>
                <b>Data:</b> ${sub.created_at || "N/A"}
              </div>`
            )
            .join("");
        } else {
          list.textContent = "Brak aktywnych subskrypcji.";
        }
      })
      .catch(() => {
        const list = document.getElementById("subscriptions-list");
        if (list) list.textContent = "Błąd ładowania subskrypcji.";
      });
  }
});
