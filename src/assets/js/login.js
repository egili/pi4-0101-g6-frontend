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
          (conexao.mensagem || "Sem resposta dos servidores.") +
            " Não é possível entrar sem resposta. Teste a conexão e tente um novo login.",
          "erro"
        );
        return;
      }

      if (!conexao.testes?.backend1?.ok || !conexao.testes?.backend2?.ok) {
        exibirAlerta(
          "Teste de conexão incompleto. Nada foi confirmado como sucesso.",
          "erro"
        );
        return;
      }

      if (HttpClient.houveQuedaDuranteGravacao()) {
        exibirAlerta(
          "Conexão OK. No cofre, confira a lista de credenciais antes de repetir qualquer gravação.",
          "sucesso"
        );
        await new Promise((r) => setTimeout(r, 900));
      }

      // 1. Busca o salt do usuário no banco (Back-end 1)
      let saltUsuario;
      try {
        saltUsuario = await ApiCliente.buscarSalt(usuario);
      } catch (e) {
        throw HttpClient.criarErroRede("USUARIO_NAO_ENCONTRADO", "Usuário não encontrado.");
      }

      // 2. Manda a senha + o salt para o Back-end 2 gerar o hash correto
      const { senhaMestraHash } = await ApiCliente.gerarHashSenha(senha, saltUsuario);

      // 3. Manda o hash para o Back-end 1 validar e gerar o Token JWT
      const resultado = await HttpClient.post(
        "backend1",
        "/login",
        { username: usuario, hashLogin: senhaMestraHash },
        { isWrite: false }
      );
      
      const data = HttpClient.exigirResposta(resultado, "Sem resposta do Cliente ao fazer login.");

      // 4. Salva o Token JWT e os dados do usuário
      ApiCliente.salvarSessao({ 
        token: data.token, 
        usuario: usuario, 
        usuarioId: data.usuarioId 
      });

      window.location.href = "cofre.html";
    } catch (erro) {
      exibirAlerta(
        (window.ApiCliente && ApiCliente.mensagemErro
          ? ApiCliente.mensagemErro(erro.codigo, erro.message)
          : erro.message) ||
          "Falha de conexão. Teste a conexão e faça um novo login.",
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