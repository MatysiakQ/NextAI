document.addEventListener("DOMContentLoaded", () => {
  // Logowanie
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
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
        window.location.href = "panel.html";
      } else {
        errorBox.textContent = data.message || "Błąd logowania";
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
});