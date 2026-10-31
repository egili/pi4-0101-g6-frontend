document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-login");
  const alerta = document.getElementById("form-alerta");
  const botao = form?.querySelector('button[type="submit"]');

  if (!form) return;

  function exibirAlerta(mensagem, tipo) {
    if (!alerta) {
      window.alert(mensagem);
      return;
    }
    alerta.hidden = false;
    alerta.textContent = mensagem;
    alerta.className = `form-alerta form-alerta--${tipo}`;
    alerta.setAttribute("role", tipo === "erro" ? "alert" : "status");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usuario = form.usuario.value.trim();
    const senha = form.senha.value;

    if (!usuario || !senha) {
      exibirAlerta("Preencha usuário e senha mestra para continuar.", "erro");
      return;
    }

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Verificando conexão…";
    }

    try {
      const conexao = await HttpClient.testarConexoes();

      if (!conexao.online) {
        exibirAlerta(
          conexao.mensagem +
            " Não é possível entrar sem resposta dos servidores.",
          "erro"
        );
        return;
      }

      // Login completo (CT3) ainda será ligado aos backends.
      // Só avança com conexão confirmada — nunca sucesso sem resposta.
      if (HttpClient.houveQuedaDuranteGravacao()) {
        exibirAlerta(
          "Conexão OK. Ao abrir o cofre, confira a lista de credenciais antes de repetir qualquer gravação.",
          "sucesso"
        );
      }

      window.location.href = "cofre.html";
    } catch (erro) {
      exibirAlerta(
        ApiCliente.mensagemErro(erro.codigo, erro.message),
        "erro"
      );
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Entrar";
      }
    }
  });
});
