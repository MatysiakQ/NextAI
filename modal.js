console.log("modals.js is running");
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOMContentLoaded in modals.js");
  console.log("logout-modal in DOM:", !!document.getElementById("logout-modal"));
  console.log("showLogoutModal in localStorage:", localStorage.getItem("showLogoutModal"));
        document.body.addEventListener('click', function (e) {
          // Obsłuż kliknięcie na dowolny element z atrybutem data-logout lub id logout
          let target = e.target;
          // Szukaj po id lub data-logout
          while (target && target !== document.body) {
            if (
              target.matches('[data-logout]') ||
              target.id === 'logout2-btn' ||
              target.id === 'logout-btn' ||
              target.id === 'user-logout-btn' ||
              (target.tagName === 'A' && target.href && target.href.includes('auth.php?action=logout'))
            ) {
              e.preventDefault();
              fetch("userpanel/auth.php?action=logout", { credentials: "include" })
                .then(() => {
                  localStorage.setItem("showLogoutModal", "1");
                  setTimeout(() => window.location.href = "/index.html", 300);
                });
              return;
            }
            target = target.parentElement;
          }
        });
  if (localStorage.getItem("showLogoutModal") === "1") {
    console.log("showLogoutModal flag detected in localStorage");
    localStorage.removeItem("showLogoutModal");

    const modal = document.getElementById("logout-modal");
    console.log("Modal element:", modal);

    if (modal) {
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";

      const okBtn = document.getElementById("logout-modal-ok-btn");
      if (okBtn) {
        okBtn.onclick = function () {
          modal.style.display = "none";
          document.body.style.overflow = "auto";
        };
      }
    } else {
      console.warn("Modal element NOT FOUND in DOM.");
    }
  }
});
