<!DOCTYPE html>
<html lang="pl">

<head>
  <meta charset="UTF-8">
  <title>Zaloguj się – NextAI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="panel.css">
  <link rel="icon" href="account.nextai.png" type="image/x-icon" />
  <script src="https://www.google.com/recaptcha/api.js" async defer></script>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <script src="https://accounts.google.com/gsi/client" async defer crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
  <?php
require_once __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__)); 
$dotenv->load();
$clientId = $_ENV['GOOGLE_CLIENT_ID'] ?? '';
?>
<meta name="google-client-id" content="<?= htmlspecialchars($clientId) ?>">
</head>

<body>
  <div class="background-grid"></div>
  <section class="packages animate-fade-in">
    <h2 class="section-title glitch" data-text="Logowanie">Logowanie</h2>
    <form id="login-form" class="contact-form" style="max-width:300px;margin:auto;">
      <label for="email">Login lub Email</label>
      <input type="text" id="email" name="email" autocomplete="username" required>
      <label for="password">Hasło</label>
      <input type="password" id="password" name="password" autocomplete="current-password" required>
      <div class="g-recaptcha" data-sitekey="6LcLGFgrAAAAAGj4rbYnbm78B8K8rFUioIgTSPuG"></div>

      <div class="button-wrapper" style="display:flex;justify-content:center;">
        <button type="submit">Zaloguj się</button>
      </div>
      <div id="login-error" style="color:#ff5c5c;margin-top:10px;"></div>
    </form>
    <!-- Google Sign-In: wyśrodkowany przycisk -->
    <div style="display: flex; justify-content: center; margin: 18px 0;">
      <div id="g_id_onload"
        data-client_id="<?= htmlspecialchars($clientId) ?>"
        data-context="signin"
        data-ux_mode="popup"
        data-callback="handleGoogleCredential"
        data-auto_prompt="false">
      </div>
      <div class="g_id_signin"
        data-type="standard"
        data-shape="rectangular"
        data-theme="filled_blue"
        data-text="sign_in_with"
        data-size="large"
        data-logo_alignment="left">
      </div>
    </div>
    <p style="text-align:center;margin-top:10px;">
      Nie masz konta?<br>
      <a href="register.html">Zarejestruj się</a><br>
      <a href="reset_password_code.html" id="forgot-password-link" style="color:#0ff;">Zapomniałeś hasła?</a>
    </p>

  </section>
  <div id="logout-modal" class="modal-overlay" style="display:none;">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Wylogowano</h3>
      </div>
      <div class="modal-body">
        <p>Zostałeś pomyślnie wylogowany.</p>
      </div>
      <div class="modal-footer">
        <button id="logout-modal-ok-btn" class="modal-btn keep-btn">OK</button>
      </div>
    </div>
  </div>
  <script>
    function showLogoutModal() {
      const modal = document.getElementById('logout-modal');
      if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        const okBtn = document.getElementById('logout-modal-ok-btn');
        if (okBtn) {
          okBtn.onclick = function() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            window.location.href = "login.html";
          };
        }
      }
    }
    if (localStorage.getItem("showLogoutModal") === "1") {
      localStorage.removeItem("showLogoutModal");
      showLogoutModal();
    }
    </script>
  <script src="auth.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function () {
      const form = document.getElementById("login-form");
      const errorBox = document.getElementById("login-error");
      if (form) {
        form.addEventListener("submit", async function (e) {
          e.preventDefault();
          errorBox.textContent = "";
          try {
            const res = await fetch("auth.php", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: `action=login&email=${encodeURIComponent(form.email.value)}&password=${encodeURIComponent(form.password.value)}&g-recaptcha-response=${encodeURIComponent(grecaptcha.getResponse())}`
            });
            if (res.status === 401) {
              errorBox.textContent = "Błędny login lub hasło.";
              return;
            }
            if (!res.ok) {
              errorBox.textContent = "Błąd połączenia z serwerem.";
              return;
            }
            const data = await res.json();
            if (data.success) {
              window.location.href = "user_panel.html";
            } else {
              errorBox.textContent = data.message || "Błąd logowania.";
            }
          } catch {
            errorBox.textContent = "Błąd połączenia z serwerem.";
          }
        });
      }
    });
  </script>
<script>
  function handleGoogleCredential(response) {
    if (!response || !response.credential) {
      alert("Błąd logowania Google: Brak tokenu.");
      return;
    }
    fetch("google_login.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "token=" + encodeURIComponent(response.credential)
    })
    .then(async res => {
      let text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        alert("Błąd połączenia z serwerem Google.\nNieprawidłowa odpowiedź serwera:\n" + text);
        return;
      }
      if (res.ok && data.success) {
        window.location.href = data.redirect || "user_panel.html";
      } else {
        alert((data && data.message) ? data.message : "Błąd logowania Google.");
      }
    })
    .catch((err) => {
      alert("Błąd połączenia z serwerem Google.\n" + (err.message || err));
    });
  }
</script>
</body>

</html>