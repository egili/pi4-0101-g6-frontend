/**
 * APIs de domínio do Cliente sobre a camada HttpClient (Fetch).
 */
(function (global) {
  const ERROS_CT1 = {
    USUARIO_JA_EXISTE: "Este nome de usuário já existe.",
    CAMPO_OBRIGATORIO_AUSENTE: "Preencha todos os campos obrigatórios.",
    ERRO_CONEXAO: "Falha de conexão com o servidor.",
    ERRO_BANCO: "Erro ao salvar no banco de dados.",
    SEM_RESPOSTA: "Comando sem resposta do servidor. Nada foi confirmado como sucesso.",
  };

  function mensagemErro(codigo, fallback) {
    if (!codigo) return fallback || "Ocorreu um erro inesperado.";
    return ERROS_CT1[codigo] || codigo;
  }

  /** Back-end 2: gera salt + hash (senha nunca vai ao Back-end 1). */
  async function gerarHashSenha(senhaMestra) {
    const resultado = await HttpClient.post(
      "backend2",
      "/api/hash",
      { senhaMestra },
      { isWrite: false }
    );

    const data = HttpClient.exigirResposta(
      resultado,
      "Sem resposta do Back-end 2 ao gerar o hash."
    );

    const salt = data.salt || data.saltUsuario;
    const senhaMestraHash =
      data.senhaMestraHash || data.hashLogin || data.hashAutenticacao;

    if (!senhaMestraHash || !salt) {
      throw HttpClient.criarErroRede(
        "CAMPO_OBRIGATORIO_AUSENTE",
        "Resposta inválida do módulo de criptografia."
      );
    }

    return { salt, senhaMestraHash };
  }

  /** Back-end 1 / CT1: persiste username + hash + salt. */
  async function cadastrarUsuario({ username, senhaMestraHash, salt }) {
    if (!username || !senhaMestraHash || !salt) {
      throw HttpClient.criarErroRede(
        "CAMPO_OBRIGATORIO_AUSENTE",
        "Preencha todos os campos obrigatórios."
      );
    }

    const resultado = await HttpClient.post(
      "backend1",
      "/api/cadastrarUsuario",
      { username, senhaMestraHash, salt },
      { isWrite: true, writeId: `register:${username}` }
    );

    const data = HttpClient.exigirResposta(
      resultado,
      "Sem resposta do Back-end 1 ao cadastrar. Confira antes de repetir."
    );

    // CT1 exige usuarioId na saída — sem isso não há confirmação de gravação
    if (data.usuarioId == null && data.usuario_id == null) {
      throw HttpClient.criarErroRede(
        "SEM_RESPOSTA",
        "Cadastro sem usuarioId do servidor. Nada foi confirmado como sucesso."
      );
    }

    return {
      usuarioId: data.usuarioId ?? data.usuario_id,
      mensagem: data.mensagem || "Conta criada com sucesso",
    };
  }

  global.ApiCliente = {
    mensagemErro,
    gerarHashSenha,
    cadastrarUsuario,
  };

  // Compatibilidade com scripts que usam as funções no escopo global
  global.mensagemErro = mensagemErro;
  global.gerarHashSenha = gerarHashSenha;
  global.cadastrarUsuario = cadastrarUsuario;
})(window);
