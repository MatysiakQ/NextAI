document.addEventListener("DOMContentLoaded", function () {
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Reset błędów
    errorBox.textContent = "";
    errorBox.classList.remove("active");
    loader.classList.remove("hidden");
    successBox.classList.add("hidden");

    const email = document.getElementById("email").value.trim();
    const plan = planSelect.value;
    const billingType = billingTypeInput.value;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      errorBox.textContent = "Podaj poprawny adres e-mail.";
      errorBox.classList.add("active");
      loader.classList.add("hidden");
      return;
    }

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
      console.error(err);
      errorBox.textContent = "Błąd połączenia z serwerem.";
      errorBox.classList.add("active");
    } finally {
      loader.classList.add("hidden");
    }
  });
});
