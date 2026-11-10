document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-registro");
  const alerta = document.getElementById("form-alerta");
  const botao = form?.querySelector('button[type="submit"]');

  if (!form || !alerta) return;

  function exibirAlerta(mensagem, tipo) {
    alerta.hidden = false;
    alerta.textContent = mensagem;
    alerta.className = `form-alerta form-alerta--${tipo}`;
    alerta.setAttribute("role", tipo === "erro" ? "alert" : "status");
  }

  function limparAlerta() {
    alerta.hidden = true;
    alerta.textContent = "";
    alerta.className = "form-alerta";
    alerta.removeAttribute("role");
  }

  function validarCampos(username, senha) {
    if (!username) {
      return "Informe o nome de usuário.";
    }

    if (username.length < 3) {
      return "O nome de usuário deve ter pelo menos 3 caracteres.";
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return "O nome de usuário contém caracteres inválidos.";
    }

    if (!senha) {
      return "Informe a senha mestra.";
    }

    if (senha.length < 8) {
      return "A senha mestra deve ter pelo menos 8 caracteres.";
    }

    return null;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    limparAlerta();

    const username = form.usuario.value.trim();
    const senhaMestra = form.senha.value;

    const erroValidacao = validarCampos(username, senhaMestra);
    if (erroValidacao) {
      exibirAlerta(erroValidacao, "erro");
      return;
    }

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Criando conta…";
    }

    try {
      const conexao = await HttpClient.testarConexoes();
      if (!conexao.online) {
        exibirAlerta(
          (conexao.mensagem || "Sem resposta dos servidores.") +
            " O cadastro não foi confirmado. Teste a conexão e faça um novo login.",
          "erro"
        );
        return;
      }

      // O Cliente gera salt e hash e envia ao Servidor; a chave não sai dele (ADR 0002)
      const resultado = await ApiCliente.cadastrar({ username, senha: senhaMestra });

      // Sucesso só com resposta explícita do Back-end 1
      if (!resultado) {
        exibirAlerta(
          "Cadastro sem resposta do servidor. Nada foi confirmado como sucesso.",
          "erro"
        );
        return;
      }

      const sucesso = resultado.mensagem || "Conta criada com sucesso.";
      exibirAlerta(sucesso, "sucesso");
      form.reset();

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1200);
    } catch (erro) {
      const codigo = erro.codigo || erro.message;
      let msg = mensagemErro(codigo, erro.message);
      if (erro.rede || codigo === "ERRO_CONEXAO") {
        msg +=
          " Reconecte e faça login novamente. Se a queda foi no meio da gravação, confira a lista de credenciais antes de repetir.";
      }
      exibirAlerta(msg, "erro");
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Criar conta";
      }
    }
  });
});
