/**
 * APIs de domínio do Cliente sobre a camada HttpClient (Fetch).
 * Implementa os contratos CT1 (cadastro), CT2 (salvar credencial) e CT4 (listar e revelar).
 */
(function (global) {
  const STORAGE_TOKEN = "cofre:token";
  const STORAGE_CHAVE = "cofre:chaveCifra";
  const STORAGE_USUARIO = "cofre:usuario";
  const STORAGE_UID = "cofre:usuarioId";

  const ERROS = {
    USUARIO_JA_EXISTE: "Este nome de usuário já existe.",
    CAMPO_OBRIGATORIO_AUSENTE: "Preencha todos os campos obrigatórios.",
    SESSAO_INVALIDA: "Sessão inválida ou expirada. Faça login novamente.",
    CREDENCIAL_NAO_ENCONTRADA: "Credencial não encontrada.",
    ACESSO_NEGADO: "Você não tem permissão para esta credencial.",
    USUARIO_NAO_ENCONTRADO: "Usuário não encontrado.",
    SENHA_INCORRETA: "Senha mestra do backup incorreta ou arquivo corrompido.",
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

  // --- Gerenciamento de Sessão Ativa no Cliente ---

  function salvarSessao({ token, chaveCifra, usuario, usuarioId }) {
    try {
      if (token) global.sessionStorage.setItem(STORAGE_TOKEN, token);
      if (chaveCifra) global.sessionStorage.setItem(STORAGE_CHAVE, chaveCifra);
      if (usuario) global.sessionStorage.setItem(STORAGE_USUARIO, usuario);
      if (usuarioId != null) global.sessionStorage.setItem(STORAGE_UID, String(usuarioId));
    } catch (_) {}
  }

  function obterSessao() {
    try {
      return {
        token: global.sessionStorage.getItem(STORAGE_TOKEN),
        chaveCifra: global.sessionStorage.getItem(STORAGE_CHAVE),
        usuario: global.sessionStorage.getItem(STORAGE_USUARIO),
        usuarioId: global.sessionStorage.getItem(STORAGE_UID),
      };
    } catch (_) {
      return { token: null, chaveCifra: null, usuario: null, usuarioId: null };
    }
  }

  function limparSessao() {
    try {
      global.sessionStorage.removeItem(STORAGE_TOKEN);
      global.sessionStorage.removeItem(STORAGE_CHAVE);
      global.sessionStorage.removeItem(STORAGE_USUARIO);
      global.sessionStorage.removeItem(STORAGE_UID);
    } catch (_) {}
  }

  function obterOuGerarChaveSessao() {
    let chave = obterSessao().chaveCifra;
    if (chave) return chave;

    const raw = (global.crypto || window.crypto).getRandomValues(new Uint8Array(32));
    chave = btoa(String.fromCharCode(...raw));
    salvarSessao({ chaveCifra: chave });
    return chave;
  }

  // --- Cifragem Local (Zero-Trust via Web Crypto API) ---

  async function cifrarLocalmente(textoPlano, chaveBase64) {
    if (!textoPlano) {
      throw HttpClient.criarErroRede("DADOS_INVALIDOS", "Texto para cifragem não pode ser vazio.");
    }

    const chaveStr = chaveBase64 || obterOuGerarChaveSessao();
    const cryptoObj = global.crypto || window.crypto;

    if (!cryptoObj || !cryptoObj.subtle) {
      throw new Error("Web Crypto API não suportada neste ambiente.");
    }

    const ivBytes = cryptoObj.getRandomValues(new Uint8Array(12));
    const chaveRaw = Uint8Array.from(atob(chaveStr), (c) => c.charCodeAt(0));

    const cryptoKey = await cryptoObj.subtle.importKey(
      "raw",
      chaveRaw,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    const encodedPlain = new TextEncoder().encode(textoPlano);
    const cipherBuffer = await cryptoObj.subtle.encrypt(
      { name: "AES-GCM", iv: ivBytes, tagLength: 128 },
      cryptoKey,
      encodedPlain
    );

    const dadosCifrados = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));
    const iv = btoa(String.fromCharCode(...ivBytes));

    return { dadosCifrados, iv };
  }

  // --- Operações de Rede (Back-end 1 e Back-end 2) ---

  async function buscarSalt(username) {
    const resultado = await HttpClient.get("backend1", `/salt/${username}`, { 
      isWrite: false,
      requireBody: true 
    });
    const data = HttpClient.exigirResposta(resultado, "Erro ao buscar salt.");
    return data.salt;
  }

  async function gerarHashSenha(senhaMestra, saltEnviado) {
    const body = { senha: senhaMestra };
    if (saltEnviado) {
      body.salt = saltEnviado;
    }

    const resultado = await HttpClient.post(
      "backend2", 
      "/api/crypto/derivar", 
      body, 
      { isWrite: false }
    );

    const data = HttpClient.exigirResposta(resultado, "Sem resposta do Back-end 2 ao gerar o hash.");

    const salt = data.salt;
    const senhaMestraHash = data.hashLogin;
    const chaveCifra = data.chaveCifra;

    if (!senhaMestraHash || !salt) {
      throw HttpClient.criarErroRede("CAMPO_OBRIGATORIO_AUSENTE", "Resposta inválida do módulo de criptografia.");
    }

    if (chaveCifra) {
      salvarSessao({ chaveCifra });
    }

    return { salt, senhaMestraHash };
  }

  async function cadastrarUsuario({ username, senhaMestraHash, salt }) {
    if (!username || !senhaMestraHash || !salt) {
      throw HttpClient.criarErroRede("CAMPO_OBRIGATORIO_AUSENTE", "Preencha todos os campos obrigatórios.");
    }

    const resultado = await HttpClient.post(
      "backend1",
      "/usuarios", 
      { username, senhaMestraHash, salt },
      { isWrite: true, writeId: `register:${username}`, requireBody: true }
    );

    const data = HttpClient.exigirResposta(resultado, "Sem resposta do Back-end 1 ao cadastrar.");
    
    if (data.usuarioId == null && data.usuario_id == null && data.id == null) {
      throw HttpClient.criarErroRede("SEM_RESPOSTA", "Cadastro sem usuarioId do servidor.");
    }

    return { 
      usuarioId: data.usuarioId ?? data.usuario_id ?? data.id, 
      mensagem: data.mensagem || "Conta criada com sucesso" 
    };
  }

  async function salvarCredencial({ servico, usuarioServico, dadosCifrados, iv, token }) {
    if (!servico || !usuarioServico || !dadosCifrados || !iv) {
      throw HttpClient.criarErroRede("DADOS_INVALIDOS", "Preencha todos os campos da credencial.");
    }

    const tokenAtivo = token || obterSessao().token;
    if (!tokenAtivo) {
      throw HttpClient.criarErroRede("SESSAO_INVALIDA", "Sessão inválida ou expirada. Faça login novamente.");
    }

    const headers = {
      Authorization: `Bearer ${tokenAtivo}`,
      tokenSessao: tokenAtivo,
    };

    const resultado = await HttpClient.post(
      "backend1",
      "/credentials",
      { servico, usuarioServico, dadosCifrados, iv },
      { headers, isWrite: true, writeId: `save_cred:${servico}:${usuarioServico}`, requireBody: true }
    );

    const data = HttpClient.exigirResposta(resultado, "Sem resposta do Back-end 1 ao salvar a credencial.");
    const credencialId = data.credencialId ?? data.credencial_id ?? data.id;
    
    if (credencialId == null) {
      throw HttpClient.criarErroRede("SEM_RESPOSTA", "Servidor não confirmou o ID da credencial salva.");
    }

    return { credencialId, mensagem: data.mensagem || "Credencial salva com sucesso" };
  }

  async function executarSalvarCredencial({ servico, usuarioServico, senha, chaveCifra, token }) {
    if (!servico || !servico.trim()) throw HttpClient.criarErroRede("DADOS_INVALIDOS", "O nome do serviço é obrigatório.");
    if (!usuarioServico || !usuarioServico.trim()) throw HttpClient.criarErroRede("DADOS_INVALIDOS", "O usuário/login do serviço é obrigatório.");
    if (!senha) throw HttpClient.criarErroRede("DADOS_INVALIDOS", "A senha do serviço é obrigatória.");

    const chave = chaveCifra || obterOuGerarChaveSessao();
    const { dadosCifrados, iv } = await cifrarLocalmente(senha, chave);

    const resposta = await salvarCredencial({ servico: servico.trim(), usuarioServico: usuarioServico.trim(), dadosCifrados, iv, token });
    return { credencialId: resposta.credencialId, mensagem: resposta.mensagem, dadosCifrados, iv };
  }

  async function listarCredenciais(token) {
    const tokenAtivo = token || obterSessao().token;
    if (!tokenAtivo) throw HttpClient.criarErroRede("SESSAO_INVALIDA", "Sessão inválida ou expirada. Faça login novamente.");

    const resultado = await HttpClient.get("backend1", "/credentials", {
      headers: { Authorization: `Bearer ${tokenAtivo}` },
      requireBody: true,
    });

    const data = HttpClient.exigirResposta(resultado, "Listagem sem resposta do Back-end 1.");
    if (!Array.isArray(data)) throw HttpClient.criarErroRede("SEM_RESPOSTA", "Listagem sem lista de credenciais.");
    
    return data;
  }

  async function decifrarSenha({ dadosCifrados, iv, chaveCifra }) {
    const chave = chaveCifra || obterSessao().chaveCifra;
    if (!dadosCifrados || !iv) throw HttpClient.criarErroRede("DADOS_INVALIDOS", "Esta credencial não tem blob para decifrar.");
    if (!chave) throw HttpClient.criarErroRede("SESSAO_INVALIDA", "Sessão sem chave de cifra. Faça login novamente.");

    const resultado = await HttpClient.post("backend2", "/api/crypto/decifrar", { dadosCifrados, iv, chaveCifra: chave }, { isWrite: false, requireBody: true });
    const data = HttpClient.exigirResposta(resultado, "Decifragem sem resposta do Back-end 2.");

    if (!data || typeof data.senha !== "string") throw HttpClient.criarErroRede("SEM_RESPOSTA", "Back-end 2 não devolveu a senha.");
    return data.senha;
  }

  // Exportar Backup
  async function exportarBackup() {
    const tokenAtivo = obterSessao().token;
    if (!tokenAtivo) {
      throw HttpClient.criarErroRede("SESSAO_INVALIDA", "Sessão inválida ou expirada. Faça login novamente.");
    }

    const resultado = await HttpClient.get("backend1", "/backup", {
      headers: { Authorization: `Bearer ${tokenAtivo}` },
      requireBody: true,
      emptyMessage: "Exportação sem resposta do servidor.",
    });

    return HttpClient.exigirResposta(resultado, "Sem resposta do Back-end 1 ao exportar o backup.");
  }

  /*
   Importar Backup
   Deriva a chave antiga, decifra as credenciais do arquivo, re-cifra com a chave da sessão atual
   e envia para o Back-end 1 salvar via POST /backup.
   */
  async function importarBackup(arquivoJson, senhaDigitada) {
    const { token, chaveCifra: chaveAtual } = obterSessao();
    
    if (!token || !chaveAtual) {
      throw HttpClient.criarErroRede("SESSAO_INVALIDA", "Sessão inválida ou expirada. Faça login novamente.");
    }

    const saltAntigo = arquivoJson.usuario?.salt;
    const credenciais = arquivoJson.credenciais;

    if (!saltAntigo || !Array.isArray(credenciais) || credenciais.length === 0) {
      throw HttpClient.criarErroRede("DADOS_INVALIDOS", "Arquivo .vault inválido ou incompleto.");
    }

    // 1. Deriva a chave antiga (sem sobrescrever a chaveAtual na sessão)
    const resultadoChave = await HttpClient.post(
      "backend2", 
      "/api/crypto/derivar", 
      { senha: senhaDigitada, salt: saltAntigo }, 
      { isWrite: false }
    );
    const dataChave = HttpClient.exigirResposta(resultadoChave, "Sem resposta do Back-end 2 ao derivar a chave do backup.");
    const chaveAntiga = dataChave.chaveCifra;

    if (!chaveAntiga) {
      throw HttpClient.criarErroRede("DADOS_INVALIDOS", "Falha ao derivar a chave do backup.");
    }

    const credenciaisReCifradas = [];

    // 2. Para cada credencial: decifra com a chave antiga e cifra com a chave atual
    for (const cred of credenciais) {
      let senhaClara;
      try {
        senhaClara = await decifrarSenha({ 
          dadosCifrados: cred.dadosCifrados, 
          iv: cred.iv, 
          chaveCifra: chaveAntiga 
        });
      } catch (e) {
        throw HttpClient.criarErroRede("SENHA_INCORRETA", "Senha mestra do backup incorreta ou arquivo corrompido.");
      }

      const { dadosCifrados, iv } = await cifrarLocalmente(senhaClara, chaveAtual);
      
      credenciaisReCifradas.push({
        servico: cred.servico,
        usuarioServico: cred.usuarioServico,
        dadosCifrados: dadosCifrados,
        iv: iv
      });
    }

    // 3. Envia a lista re-cifrada para o Back-end 1 salvar
    const resultado = await HttpClient.post(
      "backend1",
      "/backup",
      credenciaisReCifradas,
      {
        headers: { Authorization: `Bearer ${token}` },
        isWrite: true,
        requireBody: true,
        emptyMessage: "Importação sem resposta do servidor."
      }
    );

    return HttpClient.exigirResposta(resultado, "Sem resposta do Back-end 1 ao salvar a importação.");
  }

  // Editar e excluir
  async function editarCredencial({ id, servico, usuarioServico, senha }) {
    const { token, chaveCifra } = obterSessao();
    if (!token || !chaveCifra) {
      throw HttpClient.criarErroRede("SESSAO_INVALIDA", "Sessão inválida ou expirada. Faça login novamente.");
    }
    if (!id || !servico || !usuarioServico || !senha) {
      throw HttpClient.criarErroRede("DADOS_INVALIDOS", "Preencha todos os campos da credencial.");
    }

    const { dadosCifrados, iv } = await cifrarLocalmente(senha, chaveCifra);

    const resultado = await HttpClient.put(
      "backend1",
      `/credentials/${encodeURIComponent(id)}`,
      { servico, usuarioServico, dadosCifrados, iv },
      {
        headers: { Authorization: `Bearer ${token}` },
        isWrite: true,
        writeId: `edit_cred:${id}`,
        requireBody: true,
        emptyMessage: "Edição sem resposta do servidor. Nada foi confirmado como sucesso.",
      }
    );

    return HttpClient.exigirResposta(resultado, "Edição sem resposta do Back-end 1.");
  }

  async function excluirCredencial({ id }) {
    const { token } = obterSessao();
    if (!token) {
      throw HttpClient.criarErroRede("SESSAO_INVALIDA", "Sessão inválida ou expirada. Faça login novamente.");
    }

    const resultado = await HttpClient.del("backend1", `/credentials/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      isWrite: true,
      writeId: `del_cred:${id}`,
      requireBody: true,
      emptyMessage: "Exclusão sem resposta do servidor. Nada foi confirmado como sucesso.",
    });

    return HttpClient.exigirResposta(resultado, "Exclusão sem resposta do Back-end 1.");
  }

  global.ApiCliente = {
    mensagemErro,
    salvarSessao,
    obterSessao,
    limparSessao,
    cifrarLocalmente,
    buscarSalt,
    gerarHashSenha,
    cadastrarUsuario,
    salvarCredencial,
    executarSalvarCredencial,
    listarCredenciais,
    decifrarSenha,
    exportarBackup,
    importarBackup, 
    editarCredencial,
    excluirCredencial,
  };

  // Compatibilidade com scripts globais
  global.mensagemErro = mensagemErro;
  global.buscarSalt = buscarSalt;
  global.gerarHashSenha = gerarHashSenha;
  global.cadastrarUsuario = cadastrarUsuario;
  global.salvarCredencial = salvarCredencial;
  global.cifrarLocalmente = cifrarLocalmente;
  global.executarSalvarCredencial = executarSalvarCredencial;
  global.listarCredenciais = listarCredenciais;
  global.decifrarSenha = decifrarSenha;
  global.exportarBackup = exportarBackup;
  global.importarBackup = importarBackup;
})(window);