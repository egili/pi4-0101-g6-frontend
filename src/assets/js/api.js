/**
 * Cliente do navegador: fala só com o Cliente (Back-end 2), pela API HTTP.
 * Não guarda token nem chave de cifragem: os dois ficam no Cliente (ADR 0002 e 0005).
 */
(function (global) {
  const STORAGE_USUARIO = "cofre:usuario";
  const STORAGE_UID = "cofre:usuarioId";

  const ERROS = {
    USUARIO_JA_EXISTE: "Este nome de usuário já existe.",
    CAMPO_OBRIGATORIO_AUSENTE: "Preencha todos os campos obrigatórios.",
    SESSAO_INVALIDA: "Sessão inválida ou expirada. Faça login novamente.",
    CREDENCIAL_NAO_ENCONTRADA: "Credencial não encontrada.",
    ACESSO_NEGADO: "Você não tem permissão para esta credencial.",
    USUARIO_NAO_ENCONTRADO: "Usuário não encontrado.",
    SENHA_INCORRETA: "Senha incorreta, ou o arquivo de backup está corrompido.",
    MUITAS_TENTATIVAS: "Muitas tentativas de login. Aguarde 15 minutos e tente de novo.",
    DADOS_INVALIDOS: "Dados inválidos. Verifique os campos da credencial.",
    FALHA_DECIFRAGEM: "Não foi possível decifrar a senha deste serviço.",
    ERRO_CONEXAO: "Falha de conexão com o servidor.",
    ERRO_BANCO: "Erro ao salvar no banco de dados.",
    SEM_RESPOSTA: "Comando sem resposta do servidor. Nada foi confirmado como sucesso.",
    BACKUP_VAZIO: "Você não tem credenciais salvas para exportar.",
  };

  function mensagemErro(codigo, fallback) {
    if (!codigo) return fallback || "Ocorreu um erro inesperado.";
    return ERROS[codigo] || fallback || codigo;
  }

  // --- Sessão no navegador: só o nome e o id, nunca token ou chave ---

  function salvarSessao({ usuario, usuarioId }) {
    try {
      if (usuario) global.sessionStorage.setItem(STORAGE_USUARIO, usuario);
      if (usuarioId != null) global.sessionStorage.setItem(STORAGE_UID, String(usuarioId));
    } catch (_) {}
  }

  function obterSessao() {
    try {
      return {
        usuario: global.sessionStorage.getItem(STORAGE_USUARIO),
        usuarioId: global.sessionStorage.getItem(STORAGE_UID),
      };
    } catch (_) {
      return { usuario: null, usuarioId: null };
    }
  }

  function limparSessao() {
    try {
      global.sessionStorage.removeItem(STORAGE_USUARIO);
      global.sessionStorage.removeItem(STORAGE_UID);
    } catch (_) {}
    HttpClient.post("backend2", "/api/logout", {}, { isWrite: false }).catch(() => {});
  }

  // --- Conta ---

  async function login(username, senha) {
    if (!username || !senha) {
      throw HttpClient.criarErroRede("CAMPO_OBRIGATORIO_AUSENTE", "Preencha usuário e senha mestra para continuar.");
    }
    const resultado = await HttpClient.post("backend2", "/api/login", { username, senha }, { isWrite: false });
    return HttpClient.exigirResposta(resultado, "Sem resposta do Cliente ao fazer login.");
  }

  async function cadastrar({ username, senha }) {
    if (!username || !senha) {
      throw HttpClient.criarErroRede("CAMPO_OBRIGATORIO_AUSENTE", "Preencha todos os campos obrigatórios.");
    }
    const resultado = await HttpClient.post(
      "backend2",
      "/api/cadastro",
      { username, senha },
      { isWrite: true, writeId: `register:${username}`, requireBody: true }
    );
    const data = HttpClient.exigirResposta(resultado, "Sem resposta do Cliente ao cadastrar.");
    if (data.usuarioId == null) {
      throw HttpClient.criarErroRede("SEM_RESPOSTA", "Cadastro sem usuarioId do servidor. Nada foi confirmado como sucesso.");
    }
    return { usuarioId: data.usuarioId, mensagem: data.mensagem || "Conta criada com sucesso" };
  }

  // --- Credenciais (o Cliente cifra e decifra) ---

  async function executarSalvarCredencial({ servico, usuarioServico, senha }) {
    if (!servico || !servico.trim()) throw HttpClient.criarErroRede("DADOS_INVALIDOS", "O nome do serviço é obrigatório.");
    if (!usuarioServico || !usuarioServico.trim()) throw HttpClient.criarErroRede("DADOS_INVALIDOS", "O usuário/login do serviço é obrigatório.");
    if (!senha) throw HttpClient.criarErroRede("DADOS_INVALIDOS", "A senha do serviço é obrigatória.");

    const resultado = await HttpClient.post(
      "backend2",
      "/api/credenciais",
      { servico: servico.trim(), usuarioServico: usuarioServico.trim(), senha },
      {
        isWrite: true,
        writeId: `save_cred:${servico}:${usuarioServico}`,
        requireBody: true,
        emptyMessage: "Salvamento sem resposta do servidor. Nada foi confirmado como sucesso.",
      }
    );
    const data = HttpClient.exigirResposta(resultado, "Sem resposta do Cliente ao salvar a credencial.");
    if (data.credencialId == null) {
      throw HttpClient.criarErroRede("SEM_RESPOSTA", "Servidor não confirmou o ID da credencial salva.");
    }
    return { credencialId: data.credencialId, mensagem: data.mensagem || "Credencial salva com sucesso" };
  }

  async function listarCredenciais() {
    const resultado = await HttpClient.get("backend2", "/api/credenciais", { requireBody: true });
    const data = HttpClient.exigirResposta(resultado, "Listagem sem resposta do Cliente.");
    if (!Array.isArray(data)) throw HttpClient.criarErroRede("SEM_RESPOSTA", "Listagem sem lista de credenciais.");
    return data;
  }

  async function decifrarSenha({ id }) {
    if (id == null) throw HttpClient.criarErroRede("DADOS_INVALIDOS", "Credencial sem identificador.");
    const resultado = await HttpClient.get("backend2", `/api/credenciais/${encodeURIComponent(id)}/senha`, { requireBody: true });
    const data = HttpClient.exigirResposta(resultado, "Decifragem sem resposta do Cliente.");
    if (!data || typeof data.senha !== "string") throw HttpClient.criarErroRede("SEM_RESPOSTA", "Cliente não devolveu a senha.");
    return data.senha;
  }

  async function editarCredencial({ id, servico, usuarioServico, senha }) {
    if (!id || !servico || !usuarioServico || !senha) {
      throw HttpClient.criarErroRede("DADOS_INVALIDOS", "Preencha todos os campos da credencial.");
    }
    const resultado = await HttpClient.put(
      "backend2",
      `/api/credenciais/${encodeURIComponent(id)}`,
      { servico, usuarioServico, senha },
      {
        isWrite: true,
        writeId: `edit_cred:${id}`,
        requireBody: true,
        emptyMessage: "Edição sem resposta do servidor. Nada foi confirmado como sucesso.",
      }
    );
    return HttpClient.exigirResposta(resultado, "Edição sem resposta do Cliente.");
  }

  async function excluirCredencial({ id }) {
    const resultado = await HttpClient.del("backend2", `/api/credenciais/${encodeURIComponent(id)}`, {
      isWrite: true,
      writeId: `del_cred:${id}`,
      requireBody: true,
      emptyMessage: "Exclusão sem resposta do servidor. Nada foi confirmado como sucesso.",
    });
    return HttpClient.exigirResposta(resultado, "Exclusão sem resposta do Cliente.");
  }

  // --- Backup (.vault, ADR 0006): o Cliente monta e lê o arquivo ---

  async function exportarBackup(senhaBackup) {
    if (!senhaBackup) throw HttpClient.criarErroRede("CAMPO_OBRIGATORIO_AUSENTE", "Digite a senha do backup para exportar.");
    const resultado = await HttpClient.post("backend2", "/api/backup/exportar", { senhaBackup }, {
      isWrite: false,
      requireBody: true,
      emptyMessage: "Exportação sem resposta do Cliente.",
    });
    return HttpClient.exigirResposta(resultado, "Sem resposta do Cliente ao exportar o backup.");
  }

  async function importarBackup(vault, senhaBackup) {
    if (!vault || !senhaBackup) throw HttpClient.criarErroRede("CAMPO_OBRIGATORIO_AUSENTE", "Informe o arquivo e a senha do backup.");
    const resultado = await HttpClient.post(
      "backend2",
      "/api/backup/importar",
      { vault, senhaBackup },
      { isWrite: true, writeId: "import_backup", requireBody: true, emptyMessage: "Importação sem resposta do Cliente." }
    );
    return HttpClient.exigirResposta(resultado, "Sem resposta do Cliente ao importar o backup.");
  }

  global.ApiCliente = {
    mensagemErro,
    salvarSessao,
    obterSessao,
    limparSessao,
    login,
    cadastrar,
    executarSalvarCredencial,
    listarCredenciais,
    decifrarSenha,
    editarCredencial,
    excluirCredencial,
    exportarBackup,
    importarBackup,
  };
})(window);
