document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-login");

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const usuario = form.usuario.value.trim();
    const senha = form.senha.value;

    if (!usuario || !senha) {
      alert("Preencha usuário/e-mail e senha mestra para continuar.");
      return;
    }

    window.location.href = "cofre.html";
  });
});

