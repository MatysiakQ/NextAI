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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
  <?php
    require_once __DIR__ . '/../vendor/autoload.php';
    $dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
    $dotenv->load();
    $clientId = $_ENV['GOOGLE_CLIENT_ID'] ?? '';
  ?>
  <meta name="google-client-id" content="<?= htmlspecialchars($clientId) ?>">
  <style>
    .g_id_signin {
      display: inline-block;
      margin-top: 20px;
    }
  </style>
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
      <!-- Google Login -->
      <div style="display:flex; justify-content:center; margin-top:20px;">
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
          data-theme="outline"
          data-text="sign_in_with"
          data-size="large"
          data-logo_alignment="left">
        </div>
      </div>

      <p style="text-align:center">
        Nie masz konta? <a href="register.html">Zarejestruj się</a><br>
        <a href="reset_password_code.html" id="forgot-password-link" style="color:#0ff;">Zapomniałeś hasła?</a>
      </p>
    </form>
  </section>

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
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (res.ok && data.success) {
            window.location.href = data.redirect || "user_panel.html";
          } else {
            alert(data.message || "Błąd logowania Google.");
          }
        } catch {
          alert("Błąd połączenia z serwerem:\n" + text);
        }
      })
      .catch((err) => {
        alert("Błąd sieci:\n" + (err.message || err));
      });
    }

    // Obsługa klasycznego logowania
    document.addEventListener("DOMContentLoaded", function () {
      const form = document.getElementById("login-form");
      const errorBox = document.getElementById("login-error");
      form?.addEventListener("submit", async function (e) {
        e.preventDefault();
        errorBox.textContent = "";

        // Sprawdź czy reCAPTCHA jest załadowana i zaznaczona
        let recaptchaToken = "";
        try {
          if (typeof grecaptcha !== "undefined") {
            recaptchaToken = grecaptcha.getResponse();
          }
        } catch {}
        if (!recaptchaToken) {
          errorBox.textContent = "Potwierdź, że nie jesteś robotem.";
          return;
        }

        try {
          const res = await fetch("auth.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `action=login&email=${encodeURIComponent(form.email.value)}&password=${encodeURIComponent(form.password.value)}&g-recaptcha-response=${encodeURIComponent(recaptchaToken)}`
          });
          if (res.status === 401) {
            errorBox.textContent = "Błędny login lub hasło.";
            grecaptcha.reset();
            return;
          }
          if (!res.ok) {
            errorBox.textContent = "Błąd połączenia z serwerem.";
            grecaptcha.reset();
            return;
          }
          const data = await res.json();
          if (data.success) {
            window.location.href = "user_panel.html";
          } else {
            errorBox.textContent = data.message || "Błąd logowania.";
            grecaptcha.reset();
          }
        } catch {
          errorBox.textContent = "Błąd połączenia z serwerem.";
          if (typeof grecaptcha !== "undefined") grecaptcha.reset();
        }
      });
    });
  </script>
</body>
</html>
