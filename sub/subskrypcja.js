document.addEventListener("DOMContentLoaded", function () {
  const stripeKey = document.querySelector('meta[name="stripe-pk"]')?.content || "pk_test_placeholder";
  const stripe = Stripe(stripeKey);
  const elements = stripe.elements();

  const style = {
    base: {
      iconColor: "#0ff",
      color: "#fff",
      fontFamily: "'Source Code Pro', monospace",
      fontSize: "16px",
      "::placeholder": {
        color: "#888",
      },
    },
    invalid: {
      color: "#ff5c5c",
    },
  };

  const cardNumber = elements.create("cardNumber", { style });
  const cardExpiry = elements.create("cardExpiry", { style });
  const cardCvc = elements.create("cardCvc", { style });

  cardNumber.mount("#card-number-element");
  cardExpiry.mount("#card-expiry-element");
  cardCvc.mount("#card-cvc-element");

  const invoiceToggle = document.getElementById("want-invoice");
  const invoiceFields = document.getElementById("invoice-fields");
  const form = document.getElementById("subscription-form");

  // 🔄 Przywracanie danych z localStorage
  const savedData = JSON.parse(localStorage.getItem("subscriptionForm")) || {};
  for (const key in savedData) {
    const field = document.getElementById(key);
    if (field) {
      if (field.type === "checkbox") {
        field.checked = savedData[key];
      } else {
        field.value = savedData[key];
      }
    }
  }
  if (invoiceToggle.checked) {
    invoiceFields.classList.remove("hidden");
    form.classList.add("expanded");
  }

  // 🔐 Zapisywanie zmian do localStorage
  form.querySelectorAll("input, select").forEach(field => {
    field.addEventListener("input", () => {
      const current = JSON.parse(localStorage.getItem("subscriptionForm")) || {};
      current[field.id] = field.type === "checkbox" ? field.checked : field.value;
      localStorage.setItem("subscriptionForm", JSON.stringify(current));
    });
  });

  invoiceToggle.addEventListener("change", () => {
    if (invoiceToggle.checked) {
      invoiceFields.classList.remove("hidden");
      form.classList.add("expanded");
    } else {
      invoiceFields.classList.add("hidden");
      form.classList.remove("expanded");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.querySelector(".subscribe-button");
    const loader = document.getElementById("form-loader");
    const success = document.getElementById("form-success");
    const errorBox = document.getElementById("card-errors");

    form.querySelectorAll(".field-error").forEach(el => el.classList.remove("field-error"));
    errorBox.textContent = "";

    const emailField = document.getElementById("email");
    const cardNameField = document.getElementById("card-name");
    const email = emailField.value.trim();
    const plan = document.getElementById("plan").value;
    const cardName = cardNameField.value.trim();

    let hasError = false;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      markError(emailField, "Wprowadź poprawny adres e-mail.");
      hasError = true;
    }

    if (!cardName || cardName.length < 2) {
      markError(cardNameField, "Podaj imię i nazwisko do płatności.");
      hasError = true;
    }

    let invoiceData = {};
    if (invoiceToggle.checked) {
      const fields = {
        company_name: document.getElementById("company-name"),
        company_nip: document.getElementById("company-nip"),
        company_address: document.getElementById("company-address"),
        company_zip: document.getElementById("company-zip"),
        company_city: document.getElementById("company-city"),
      };

      for (const [key, field] of Object.entries(fields)) {
        const value = field.value.trim();

        if (!value) {
          markError(field, "Uzupełnij wszystkie dane do faktury.");
          hasError = true;
        }

        if (key === "company_nip" && !/^\d{10}$/.test(value)) {
          markError(field, "NIP powinien mieć dokładnie 10 cyfr.");
          hasError = true;
        }

        if (key === "company_zip" && !/^\d{2}-\d{3}$/.test(value)) {
          markError(field, "Kod pocztowy powinien mieć format XX-XXX.");
          hasError = true;
        }

        invoiceData[key] = value;
      }
    }

    if (hasError) return;

    const formData = new URLSearchParams({
      email,
      plan,
      ...invoiceData,
    });

    loader.classList.remove("hidden");
    success.classList.add("hidden");
    submitBtn.disabled = true;

    try {
      // // NA CZAS TESTÓW
      // try {
      //   const res = await fetch("http://localhost:5678/webhook-test/invoice", {
      //     method: "POST",
      //     body: formData,
      //   });

      //   if (!res.ok) {
      //     throw new Error("Błąd połączenia z webhookiem");
      //   }

      //   const resultText = await res.text();
      //   console.log("Wysłano dane do webhooka:", resultText);

      //   document.getElementById("subscription-success").style.display = "block";
      //   form.reset();
      //   invoiceFields.style.display = "none";

      // } catch (error) {
      //   console.error("Błąd podczas wysyłki do n8n:", error);
      //   document.getElementById("subscription-error").style.display = "block";
      // }

      const res = await fetch("payment.php", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        errorBox.textContent = data.message || "Wystąpił błąd przy tworzeniu subskrypcji.";
        return;
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: {
            name: cardName,
            email,
          },
        },
      });

      if (error) {
        errorBox.textContent = error.message;
      } else if (paymentIntent.status === "succeeded") {
        success.classList.remove("hidden");
        form.reset();
        localStorage.removeItem("subscriptionForm");
        cardNumber.clear();
        cardExpiry.clear();
        cardCvc.clear();
        invoiceFields.classList.add("hidden");
        form.classList.remove("expanded");
      }
    } catch (err) {
      console.error(err);
      errorBox.textContent = "Błąd połączenia z serwerem. Spróbuj ponownie.";
    } finally {
      loader.classList.add("hidden");
      submitBtn.disabled = false;
    }
  });

  function markError(field, message) {
    field.classList.add("field-error");
    document.getElementById("card-errors").textContent = message;
  }

  // Funkcja do odczytania parametrów URL
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // Odczytaj parametr "package" z URL
  const selectedPackage = getQueryParam("package");

  // Ustaw domyślny pakiet na podstawie parametru
  if (selectedPackage) {
    const planSelect = document.getElementById("plan");
    if (planSelect) {
      planSelect.value = selectedPackage; // Ustaw odpowiednią wartość w selekcie
    }
  }

  // Nowa funkcjonalność: Ustawienie domyślnego pakietu i typu płatności
  const selectedPackageDefault = getQueryParam('package') || 'basic';
  const billingType = getQueryParam('billing') || 'monthly';

  // Ustaw domyślny pakiet w selekcie
  if (planSelect) {
    planSelect.value = selectedPackageDefault;
  }

  // Wyświetl odpowiedni typ płatności
  const billingInfo = document.createElement('p');
  billingInfo.textContent = billingType === 'yearly'
    ? 'Wybrano płatność roczną (oszczędzasz 20%)'
    : 'Wybrano płatność miesięczną';
  billingInfo.style.fontWeight = 'bold';
  billingInfo.style.color = 'green';

  form.insertBefore(billingInfo, form.firstChild);
});

