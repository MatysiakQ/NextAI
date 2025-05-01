const contactForm = document.querySelector(".contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = contactForm.querySelector('input[name="email"]').value;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showModal({
        icon: "⚠️",
        iconColor: "orange",
        text: "Podaj poprawny adres email!",
        buttonText: "Popraw",
        buttonColor: "orange"
      });
      return;
    }

    const formData = new FormData(contactForm);
    fetch("submit_form.php", {
      method: "POST",
      body: formData,
    })
      .then(response => response.text())
      .then(data => {
        if (data.trim() === "OK") {
          showModal({
            icon: "🤖",
            iconColor: "#00ffe0",
            text: "Twoja wiadomość została wysłana! Agent AI już pracuje nad odpowiedzią.",
            buttonText: "Świetnie!",
            buttonColor: "#00ffe0"
          });
          contactForm.reset();
        } else {
          showModal({
            icon: "❌",
            iconColor: "red",
            text: "Nie udało się wysłać formularza. Spróbuj ponownie.",
            buttonText: "OK",
            buttonColor: "red"
          });
        }
      })
      .catch(error => {
        console.error("Błąd:", error);
        showModal({
          icon: "🚫",
          iconColor: "red",
          text: "Błąd sieci. Spróbuj później.",
          buttonText: "OK",
          buttonColor: "red"
        });
      });
  });
}

const formModal = document.getElementById("form-modal");
const modalIcon = document.getElementById("form-modal-icon");
const modalText = document.getElementById("form-modal-text");
const modalButton = document.getElementById("form-modal-button");

function showModal({ icon, iconColor, text, buttonText, buttonColor }) {
  modalIcon.textContent = icon;
  modalIcon.style.color = iconColor;
  modalText.textContent = text;
  modalButton.textContent = buttonText;
  modalButton.style.backgroundColor = buttonColor;
  formModal.classList.add("show");
}

function hideModal() {
  formModal.classList.remove("show");
}

if (modalButton) {
  modalButton.addEventListener("click", hideModal);
}

modalText.classList.add("glitch-text");
