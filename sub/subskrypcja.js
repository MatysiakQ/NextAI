document.addEventListener("DOMContentLoaded", function () {

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
  
  // Obsługa pokazywania pól do faktury
  const invoiceToggle = document.getElementById("want-invoice");
  const invoiceFields = document.getElementById("invoice-fields");
  
  invoiceToggle.addEventListener("change", () => {
    const form = document.getElementById("subscription-form");
  
    if (invoiceToggle.checked) {
      invoiceFields.classList.remove("hidden");
      form.classList.add("expanded");
    } else {
      invoiceFields.classList.add("hidden");
      form.classList.remove("expanded");
    }
  });
  
  
  document.getElementById("subscription-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("email").value;
    const plan = document.getElementById("plan").value;
    
    const invoiceData = invoiceToggle.checked
    ? {
      company_name: document.getElementById("company-name").value,
      company_nip: document.getElementById("company-nip").value,
      company_address: document.getElementById("company-address").value,
      company_zip: document.getElementById("company-zip").value,
      company_city: document.getElementById("company-city").value,
    }
    : {};
    
    const formData = new URLSearchParams({
      email,
      plan,
      ...invoiceData
    });
    
    document.getElementById("form-loader").classList.remove("hidden");
    document.getElementById("card-errors").textContent = "";
    document.getElementById("form-success").classList.add("hidden");
    
    // Krok 1: utwórz subskrypcję
    const res = await fetch("payment.php", {
      method: "POST",
      body: formData
    });
    
    const data = await res.json();
    
    if (!data.success) {
      document.getElementById("card-errors").textContent = data.message;
      document.getElementById("form-loader").classList.add("hidden");
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
      document.getElementById("form-loader").classList.add("hidden");
    } else if (paymentIntent.status === "succeeded") {
      document.getElementById("form-success").classList.remove("hidden");
      document.getElementById("subscription-form").reset();
      card.clear();
    }
    
    document.getElementById("form-loader").classList.add("hidden");
  });
});
