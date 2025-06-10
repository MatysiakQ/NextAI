// Obsługa logowania i rejestracji przez Google One Tap / Sign-In
(function() {
  // Ustaw client_id z meta tagu, jeśli nie jest ustawiony w #g_id_onload
  document.addEventListener("DOMContentLoaded", function () {
    var clientId = document.querySelector('meta[name="google-client-id"]')?.content;
    var gIdOnload = document.getElementById("g_id_onload");
    if (gIdOnload && clientId && !gIdOnload.getAttribute("data-client_id")) {
      gIdOnload.setAttribute("data-client_id", clientId);
    }
  });
})();

window.handleGoogleCredential = function(response) {
  if (!response || !response.credential) {
    alert("Błąd logowania Google: Brak tokenu.");
    return;
  }
  fetch("google_login.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "token=" + encodeURIComponent(response.credential)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      window.location.href = data.redirect || "user_panel.html";
    } else {
      alert(data.message || "Błąd logowania Google.");
    }
  })
  .catch(() => {
    alert("Błąd połączenia z serwerem Google.");
  });
};
