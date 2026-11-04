/**
 * APIs de domínio do Cliente sobre a camada HttpClient (Fetch).
 * Implementa os contratos CT1 (cadastro) e CT2 (salvar credencial com cifragem local).
 */
(function (global) {
  const STORAGE_TOKEN = "cofre:token";
  const STORAGE_CHAVE = "cofre:chaveCifra";
  const STORAGE_USUARIO = "cofre:usuario";
  const STORAGE_UID = "cofre:usuarioId";

  const ERROS = {
    // CT1
    USUARIO_JA_EXISTE: "Este nome de usuário já existe.",
    CAMPO_OBRIGATORIO_AUSENTE: "Preencha todos os campos obrigatórios.",
    // CT2
    SESSAO_INVALIDA: "Sessão inválida ou expirada. Faça login novamente.",
    USUARIO_NAO_ENCONTRADO: "Usuário não encontrado.",
    DADOS_INVALIDOS: "Dados inválidos. Verifique os campos da credencial.",
    // Gerais
    ERRO_CONEXAO: "Falha de conexão com o servidor.",
    ERRO_BANCO: "Erro ao salvar no banco de dados.",
    SEM_RESPOSTA: "Comando sem resposta do servidor. Nada foi confirmado como sucesso.",
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
    } catch (_) {
      /* storage indisponível */
    }
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
    } catch (_) {
      /* storage indisponível */
    }
  }

  /**
   * Garante que haja uma chave simétrica de sessão de 256 bits disponível.
   */
  function obterOuGerarChaveSessao() {
    let chave = obterSessao().chaveCifra;
    if (chave) return chave;

    // Gera chave temporária de 256 bits se o usuário entrou direto na tela
    const raw = (global.crypto || window.crypto).getRandomValues(new Uint8Array(32));
    chave = btoa(String.fromCharCode(...raw));
    salvarSessao({ chaveCifra: chave });
    return chave;
  }

  // --- Cifragem Local (Zero-Trust via Web Crypto API) ---

  /**
   * Cifra localmente texto plano usando AES-GCM (256 bits) com IV aleatório de 12 bytes.
   * Executa 100% no navegador do cliente, sem expor o texto claro à rede.
   *
   * @param {string} textoPlano Texto a ser cifrado
   * @param {string} chaveBase64 Chave simétrica AES em Base64
   * @returns {Promise<{dadosCifrados: string, iv: string}>}
   */
  async function cifrarLocalmente(textoPlano, chaveBase64) {
    if (!textoPlano) {
      throw HttpClient.criarErroRede("DADOS_INVALIDOS", "Texto para cifragem não pode ser vazio.");
    }

    const chaveStr = chaveBase64 || obterOuGerarChaveSessao();
    const cryptoObj = global.crypto || window.crypto;

    if (!cryptoObj || !cryptoObj.subtle) {
      throw new Error("Web Crypto API não suportada neste ambiente.");
    }

    // 1. Gera IV novo, aleatório e exclusivo (12 bytes)
    const ivBytes = cryptoObj.getRandomValues(new Uint8Array(12));

    // 2. Converte a chave Base64 para Uint8Array
    const chaveRaw = Uint8Array.from(atob(chaveStr), (c) => c.charCodeAt(0));

    // 3. Importa a chave AES-GCM
    const cryptoKey = await cryptoObj.subtle.importKey(
      "raw",
      chaveRaw,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    // 4. Cifra com AES-GCM (tag de 128 bits anexada ao final pelo Web Crypto)
    const encodedPlain = new TextEncoder().encode(textoPlano);
    const cipherBuffer = await cryptoObj.subtle.encrypt(
      { name: "AES-GCM", iv: ivBytes, tagLength: 128 },
      cryptoKey,
      encodedPlain
    );

    // 5. Codifica ambos em Base64
    const dadosCifrados = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));
    const iv = btoa(String.fromCharCode(...ivBytes));

    return { dadosCifrados, iv };
  }

  // --- Operações de Rede (Back-end 1 e Back-end 2) ---

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
      {
        isWrite: true,
        writeId: `register:${username}`,
        requireBody: true,
        emptyMessage:
          "Cadastro sem resposta do servidor. Nada foi confirmado como sucesso.",
      }
    );

    const data = HttpClient.exigirResposta(
      resultado,
      "Sem resposta do Back-end 1 ao cadastrar. Confira antes de repetir."
    );

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

  /**
   * Back-end 1 / CT2: envia credencial já cifrada com o token de autorização.
   *
   * @param {Object} params
   * @param {string} params.servico Nome do serviço
   * @param {string} params.usuarioServico Login do serviço
   * @param {string} params.dadosCifrados Blob cifrado em Base64
   * @param {string} params.iv Vetor de inicialização em Base64
   * @param {string} [params.token] Token JWT (se omitido, busca da sessão)
   * @returns {Promise<{credencialId: number, mensagem: string}>}
   */
  async function salvarCredencial({ servico, usuarioServico, dadosCifrados, iv, token }) {
    if (!servico || !usuarioServico || !dadosCifrados || !iv) {
      throw HttpClient.criarErroRede(
        "DADOS_INVALIDOS",
        "Preencha todos os campos da credencial."
      );
    }

    const tokenAtivo = token || obterSessao().token;
    if (!tokenAtivo) {
      throw HttpClient.criarErroRede(
        "SESSAO_INVALIDA",
        "Sessão inválida ou expirada. Faça login novamente."
      );
    }

    const headers = {
      Authorization: `Bearer ${tokenAtivo}`,
      tokenSessao: tokenAtivo,
    };

    const resultado = await HttpClient.post(
      "backend1",
      "/credentials",
      { servico, usuarioServico, dadosCifrados, iv },
      {
        headers,
        isWrite: true,
        writeId: `save_cred:${servico}:${usuarioServico}`,
        requireBody: true,
        emptyMessage:
          "Salvamento sem resposta do servidor. Nada foi confirmado como sucesso.",
      }
    );

    const data = HttpClient.exigirResposta(
      resultado,
      "Sem resposta do Back-end 1 ao salvar a credencial."
    );

    const credencialId = data.credencialId ?? data.credencial_id ?? data.id;
    if (credencialId == null) {
      throw HttpClient.criarErroRede(
        "SEM_RESPOSTA",
        "Servidor não confirmou o ID da credencial salva."
      );
    }

    return {
      credencialId,
      mensagem: data.mensagem || "Credencial salva com sucesso",
    };
  }

  /**
   * Fluxo interativo completo do comando de salvar credencial:
   * 1. Cifra a senha localmente no cliente (Zero-Trust)
   * 2. Envia os dados cifrados e o IV ao servidor com o token da sessão
   *
   * @param {Object} params
   * @param {string} params.servico Nome do serviço (ex: Gmail, GitHub)
   * @param {string} params.usuarioServico Login do serviço (ex: email@gmail.com)
   * @param {string} params.senha Senha em claro (será cifrada antes de sair da memória)
   * @param {string} [params.chaveCifra] Chave AES-256 (se omitido, usa chave da sessão)
   * @param {string} [params.token] Token JWT ativo
   * @returns {Promise<{credencialId: number, mensagem: string, dadosCifrados: string, iv: string}>}
   */
  async function executarSalvarCredencial({ servico, usuarioServico, senha, chaveCifra, token }) {
    if (!servico || !servico.trim()) {
      throw HttpClient.criarErroRede("DADOS_INVALIDOS", "O nome do serviço é obrigatório.");
    }
    if (!usuarioServico || !usuarioServico.trim()) {
      throw HttpClient.criarErroRede("DADOS_INVALIDOS", "O usuário/login do serviço é obrigatório.");
    }
    if (!senha) {
      throw HttpClient.criarErroRede("DADOS_INVALIDOS", "A senha do serviço é obrigatória.");
    }

    // Cifragem local exclusiva no processo do cliente
    const chave = chaveCifra || obterOuGerarChaveSessao();
    const { dadosCifrados, iv } = await cifrarLocalmente(senha, chave);

    // Envio para o Back-end 1 (apenas blobs cifrados e IV)
    const resposta = await salvarCredencial({
      servico: servico.trim(),
      usuarioServico: usuarioServico.trim(),
      dadosCifrados,
      iv,
      token,
    });

    return {
      credencialId: resposta.credencialId,
      mensagem: resposta.mensagem,
      dadosCifrados,
      iv,
    };
  }

  global.ApiCliente = {
    mensagemErro,
    salvarSessao,
    obterSessao,
    limparSessao,
    cifrarLocalmente,
    gerarHashSenha,
    cadastrarUsuario,
    salvarCredencial,
    executarSalvarCredencial,
  };

  // Compatibilidade com scripts globais
  global.mensagemErro = mensagemErro;
  global.gerarHashSenha = gerarHashSenha;
  global.cadastrarUsuario = cadastrarUsuario;
  global.salvarCredencial = salvarCredencial;
  global.cifrarLocalmente = cifrarLocalmente;
  global.executarSalvarCredencial = executarSalvarCredencial;
})(window);
