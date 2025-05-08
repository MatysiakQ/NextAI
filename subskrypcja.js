const stripe = Stripe("pk_test_..."); // Uzupełnij kluczem publicznym z Stripe
const elements = stripe.elements();
const card = elements.create("card", {
  style: {
    base: {
      iconColor: "#0ff",
      color: "#fff",
      fontFamily: "'Source Code Pro', monospace",
      fontSize: "16px",
      "::placeholder": {
        color: "#888"
      }
    },
    invalid: {
      color: "#ff5c5c"
    }
  }
});
card.mount("#card-element");

document.getElementById("subscription-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const plan = document.getElementById("plan").value;

  // Krok 1: utwórz subskrypcję w backendzie
  const res = await fetch("payment.php", {
    method: "POST",
    body: new URLSearchParams({ email, plan })
  });
  const data = await res.json();

  if (!data.success) {
    document.getElementById("card-errors").textContent = data.message;
    return;
  }

  // Krok 2: potwierdź płatność
  const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
    payment_method: {
      card,
      billing_details: {
        email
      }
    }
  });

  if (error) {
    document.getElementById("card-errors").textContent = error.message;
  } else if (paymentIntent.status === "succeeded") {
    alert("Subskrypcja aktywna! Dziękujemy.");
    document.getElementById("subscription-form").reset();
    card.clear();
  }
});
