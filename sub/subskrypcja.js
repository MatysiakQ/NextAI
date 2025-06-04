document.addEventListener("DOMContentLoaded", function () {
  const emailInput = document.getElementById("email");
  const form = document.getElementById("subscription-form");
  const billingSwitch = document.getElementById("billing-switch");
  const planSelect = document.getElementById("plan");
  const billingTypeInput = document.getElementById("billing-type");
  const errorBox = document.getElementById("card-errors");
  const loader = document.getElementById("form-loader");
  const successBox = document.getElementById("form-success");

  const originalOptions = [
    { value: "basic", text: "Basic – 599 zł / msc" },
    { value: "pro", text: "Pro – 1199 zł / msc" }
  ];
  const yearlyOptions = [
    { value: "basic", text: "Basic – 480 zł / msc (Z zoobowiązaniem rocznym)" },
    { value: "pro", text: "Pro – 910 zł / msc (Z zoobowiązaniem rocznym)" }
  ];

  let isYearly = false;

  async function checkLoginStatus() {
    try {
      const response = await fetch('/userpanel/auth.php?action=verify', {
        credentials: 'include'
      });
      const data = await response.json();
      return data.success === true && data.logged_in === true;
    } catch (error) {
      return false;
    }
  }

  function showLoginModal() {
    const modalHTML = `
      <div id="login-required-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      ">
        <div style="
          background: #1a1a1a;
          border-radius: 12px;
          padding: 30px;
          max-width: 400px;
          width: 90%;
          border: 2px solid #0ff;
          box-shadow: 0 20px 40px rgba(0, 255, 255, 0.3);
          text-align: center;
          position: relative;
        ">
          <h3 style="color: #0ff; margin: 0 0 20px 0; font-size: 24px;">Wymagane logowanie</h3>
          <p style="color: #ccc; margin-bottom: 30px; line-height: 1.6;">
            Aby zakupić subskrypcję musisz się zalogować
          </p>
          <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <a href="../userpanel/login.html" style="
              background: linear-gradient(135deg, #0ff, #00bcd4);
              color: #000;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              transition: all 0.3s ease;
              min-width: 120px;
              display: inline-block;
            ">Zaloguj się</a>
            <a href="../userpanel/register.html" style="
              background: linear-gradient(135deg, #ff5c5c, #ff3742);
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              transition: all 0.3s ease;
              min-width: 120px;
              display: inline-block;
            ">Zarejestruj się</a>
          </div>
          <button id="close-login-modal" style="
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            color: #0ff;
            font-size: 24px;
            cursor: pointer;
          ">&times;</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('close-login-modal').addEventListener('click', () => {
      document.getElementById('login-required-modal').remove();
    });
    document.getElementById('login-required-modal').addEventListener('click', (e) => {
      if (e.target.id === 'login-required-modal') {
        document.getElementById('login-required-modal').remove();
      }
    });
  }

  if (billingSwitch && billingTypeInput && planSelect) {
    billingSwitch.addEventListener("click", () => {
      isYearly = !isYearly;
      billingSwitch.textContent = isYearly
        ? "Przełącz na płatność miesięczną"
        : "Przełącz na płatność roczną";

      billingTypeInput.value = isYearly ? "yearly" : "monthly";

      const options = isYearly ? yearlyOptions : originalOptions;
      const currentValue = planSelect.value;
      planSelect.innerHTML = "";
      options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.text;
        planSelect.appendChild(option);
      });
      planSelect.value = currentValue;
    });
  }

  emailInput.addEventListener("input", (e) => {
    // usunięto logowanie do konsoli
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value;

    const isLoggedIn = await checkLoginStatus();
    if (!isLoggedIn) {
      showLoginModal();
      return;
    }

    errorBox.textContent = "";
    errorBox.classList.remove("active");
    loader.classList.remove("hidden");
    successBox.classList.add("hidden");

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      errorBox.textContent = "Podaj poprawny adres e-mail.";
      errorBox.classList.add("active");
      loader.classList.add("hidden");
      return;
    }

    const plan = planSelect.value;
    const billingType = billingTypeInput.value;

    const formData = new URLSearchParams({ email, plan, billing_type: billingType });

    try {
      const res = await fetch("checkout.php", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (data.success && data.url) {
        successBox.classList.remove("hidden");
        window.location.href = data.url;
      } else {
        errorBox.textContent = data.message || "Wystąpił błąd podczas przekierowania.";
        errorBox.classList.add("active");
      }
    } catch (err) {
      errorBox.textContent = "Błąd połączenia z serwerem.";
      errorBox.classList.add("active");
    } finally {
      loader.classList.add("hidden");
    }
  });
});
