document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-registro");

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const usuario = form.usuario.value.trim();
    const email = form.email.value.trim();

    if (!usuario || !email) {
      alert("Preencha usuário e e-mail para continuar.");
      return;
    }

    // Hard coded — apenas feedback visual por enquanto
    alert(`Conta registrada:\nUsuário: ${usuario}\nE-mail: ${email}`);
  });
});
