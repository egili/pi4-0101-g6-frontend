/**
 * Camada HTTP do Cliente (Fetch) para Back-end 1 e Back-end 2.
 * Sucesso só com resposta explícita; queda durante gravação é rastreada.
 */
(function (global) {
  const STORAGE_QUEDA = "cofre:quedaDuranteGravacao";

  const BASES = {
    backend1:
      global.localStorage?.getItem("BACKEND1_URL") ||
      "http://localhost:8080",
    backend2:
      global.localStorage?.getItem("BACKEND2_URL") ||
      "http://localhost:8081",
  };

  const status = {
    online: null,
    mensagem: "Verificando conexão com os servidores…",
    duranteGravacao: false,
    backend1: null,
    backend2: null,
  };

  const listeners = new Set();
  let gravacaoAtiva = null;

  function baseUrl(alvo) {
    const key = String(alvo || "").toLowerCase();
    if (key === "backend1" || key === "be1" || key === "1") return BASES.backend1;
    if (key === "backend2" || key === "be2" || key === "2") return BASES.backend2;
    throw criarErroRede("ERRO_CONEXAO", `Alvo de API desconhecido: ${alvo}`);
  }

  function emitirStatus(parcial) {
    Object.assign(status, parcial || {});
    listeners.forEach((fn) => {
      try {
        fn({ ...status });
      } catch (_) {
        /* listener isolado */
      }
    });
  }

  function onStatusChange(fn) {
    if (typeof fn === "function") listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function getStatus() {
    return { ...status };
  }

  function houveQuedaDuranteGravacao() {
    try {
      return global.sessionStorage?.getItem(STORAGE_QUEDA) === "1";
    } catch (_) {
      return false;
    }
  }

  function marcarQuedaDuranteGravacao(writeId) {
    try {
      global.sessionStorage?.setItem(STORAGE_QUEDA, "1");
      if (writeId) {
        global.sessionStorage?.setItem(`${STORAGE_QUEDA}:id`, String(writeId));
      }
    } catch (_) {
      /* storage indisponível */
    }
    emitirStatus({
      online: false,
      duranteGravacao: true,
      mensagem:
        "Conexão caiu durante uma gravação. Faça novo login e confira a lista antes de repetir.",
    });
  }

  function limparGravacaoPendente() {
    try {
      global.sessionStorage?.removeItem(STORAGE_QUEDA);
      global.sessionStorage?.removeItem(`${STORAGE_QUEDA}:id`);
    } catch (_) {
      /* storage indisponível */
    }
    gravacaoAtiva = null;
    emitirStatus({ duranteGravacao: false });
  }

  function criarErroRede(codigo, mensagem, extras) {
    const erro = new Error(mensagem || codigo || "ERRO_CONEXAO");
    erro.codigo = codigo || "ERRO_CONEXAO";
    erro.rede = true;
    if (extras && typeof extras === "object") {
      Object.assign(erro, extras);
    }
    return erro;
  }

  function extrairCodigoErro(data, fallback) {
    if (!data || typeof data !== "object") return fallback;
    return (
      data.codigo ||
      data.erro ||
      data.error ||
      data.message ||
      data.mensagem ||
      fallback
    );
  }

  function exigirResposta(resultado, mensagemSemResposta) {
    if (resultado == null) {
      throw criarErroRede(
        "SEM_RESPOSTA",
        mensagemSemResposta || "Comando sem resposta do servidor."
      );
    }

    if (typeof resultado === "object") {
      const codigo = extrairCodigoErro(resultado, null);
      const codigosErro = [
        "USUARIO_JA_EXISTE",
        "CAMPO_OBRIGATORIO_AUSENTE",
        "ERRO_CONEXAO",
        "ERRO_BANCO",
        "SEM_RESPOSTA",
        "CREDENCIAL_INVALIDA",
        "TOKEN_INVALIDO",
      ];
      if (resultado.ok === false || (codigo && codigosErro.includes(codigo))) {
        const err = new Error(codigo || mensagemSemResposta);
        err.codigo = codigo || "ERRO_BANCO";
        err.rede = err.codigo === "ERRO_CONEXAO";
        err.payload = resultado;
        throw err;
      }
    }

    return resultado;
  }

  async function lerCorpo(response) {
    const texto = await response.text();
    if (!texto) return null;
    try {
      return JSON.parse(texto);
    } catch (_) {
      return { mensagem: texto };
    }
  }

  async function request(alvo, path, options) {
    const opts = options || {};
    const method = (opts.method || "GET").toUpperCase();
    const isWrite = opts.isWrite === true;
    const writeId = opts.writeId || null;
    const url = `${baseUrl(alvo).replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

    if (isWrite) {
      gravacaoAtiva = writeId || `${method}:${url}`;
    }

    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs || 12000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(opts.body != null
            ? { "Content-Type": "application/json" }
            : {}),
          ...(opts.headers || {}),
        },
        body: opts.body != null ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
        mode: "cors",
      });

      const data = await lerCorpo(response);

      if (!response.ok) {
        const codigo = extrairCodigoErro(
          data,
          response.status >= 500 ? "ERRO_BANCO" : "CAMPO_OBRIGATORIO_AUSENTE"
        );
        const err = new Error(
          (data && (data.mensagem || data.message)) || String(codigo)
        );
        err.codigo = codigo;
        err.rede = response.status === 0 || response.status >= 502;
        err.status = response.status;
        err.payload = data;
        throw err;
      }

      if (isWrite) {
        gravacaoAtiva = null;
      }

      return data;
    } catch (erro) {
      const abortado = erro && erro.name === "AbortError";
      const rede =
        abortado ||
        erro?.rede === true ||
        erro instanceof TypeError ||
        (erro && /Failed to fetch|NetworkError|Load failed/i.test(erro.message || ""));

      if (rede && isWrite && gravacaoAtiva) {
        marcarQuedaDuranteGravacao(gravacaoAtiva);
      } else if (rede) {
        emitirStatus({
          online: false,
          mensagem:
            "Falha de conexão com o servidor. Teste a conexão e faça um novo login.",
        });
      }

      if (erro && erro.codigo) throw erro;

      throw criarErroRede(
        "ERRO_CONEXAO",
        abortado
          ? "Tempo esgotado ao falar com o servidor."
          : "Falha de conexão com o servidor.",
        { causa: erro }
      );
    } finally {
      clearTimeout(timer);
      if (isWrite) {
        gravacaoAtiva = null;
      }
    }
  }

  function get(alvo, path, options) {
    return request(alvo, path, { ...(options || {}), method: "GET" });
  }

  function post(alvo, path, body, options) {
    return request(alvo, path, {
      ...(options || {}),
      method: "POST",
      body,
    });
  }

  async function ping(alvo) {
    try {
      await get(alvo, "/api/health", { timeoutMs: 5000, isWrite: false });
      return true;
    } catch (_) {
      return false;
    }
  }

  async function testarConexoes() {
    emitirStatus({
      online: null,
      mensagem: "Testando conexão com Back-end 1 e Back-end 2…",
    });

    const [ok1, ok2] = await Promise.all([ping("backend1"), ping("backend2")]);

    const online = ok1 && ok2;
    let mensagem;
    if (online) {
      mensagem = "Conexão OK com Back-end 1 e Back-end 2.";
    } else if (!ok1 && !ok2) {
      mensagem = "Sem resposta do Back-end 1 e do Back-end 2.";
    } else if (!ok1) {
      mensagem = "Sem resposta do Back-end 1 (cadastro/persistência).";
    } else {
      mensagem = "Sem resposta do Back-end 2 (módulo de criptografia / hash).";
    }

    emitirStatus({
      online,
      mensagem,
      backend1: ok1,
      backend2: ok2,
      duranteGravacao: houveQuedaDuranteGravacao(),
    });

    return { online, backend1: ok1, backend2: ok2, mensagem };
  }

  global.HttpClient = {
    BASES,
    get,
    post,
    request,
    testarConexoes,
    getStatus,
    onStatusChange,
    exigirResposta,
    criarErroRede,
    houveQuedaDuranteGravacao,
    limparGravacaoPendente,
    marcarQuedaDuranteGravacao,
  };
})(window);
