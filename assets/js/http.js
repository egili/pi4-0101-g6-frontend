/**
 * Estrutura de comunicação HTTP (Fetch) do Cliente no navegador.
 *
 * - Testa conexão com Back-end 1 e Back-end 2
 * - Trata erros de rede
 * - Nunca considera sucesso sem resposta explícita do servidor
 * - Se a conexão cair: marca offline e orienta nova conexão + novo login
 * - Se cair no meio de gravação: persiste flag para o usuário conferir
 *   a lista de credenciais antes de repetir
 */
(function (global) {
  const STORAGE_QUEDA = "cofre:quedaDuranteGravacao";
  const STORAGE_WRITE_ID = "cofre:quedaDuranteGravacao:id";

  const BASES = {
    backend1:
      (global.localStorage && global.localStorage.getItem("BACKEND1_URL")) ||
      "http://localhost:8080",
    backend2:
      (global.localStorage && global.localStorage.getItem("BACKEND2_URL")) ||
      "http://localhost:8081",
  };

  const PATH_TESTE = "/api/health";

  const status = {
    online: null,
    mensagem: "Verificando conexão com os servidores…",
    duranteGravacao: false,
    backend1: null,
    backend2: null,
  };

  const listeners = new Set();
  let gravacaoAtiva = null;
  let monitorId = null;
  let ultimoOnline = null;

  function baseUrl(alvo) {
    const key = String(alvo || "").toLowerCase();
    if (key === "backend1" || key === "be1" || key === "1") return BASES.backend1;
    if (key === "backend2" || key === "be2" || key === "2") return BASES.backend2;
    throw criarErroRede("ERRO_CONEXAO", `Alvo de API desconhecido: ${alvo}`);
  }

  function emitirStatus(parcial) {
    const antes = status.online;
    Object.assign(status, parcial || {});
    if (
      status.duranteGravacao !== true &&
      houveQuedaDuranteGravacao()
    ) {
      status.duranteGravacao = true;
    }
    ultimoOnline = status.online;

    // Queda detectada: avisa consumidores (UI pede nova conexão + novo login)
    if (antes === true && status.online === false) {
      status.mensagem =
        status.mensagem ||
        "Conexão caiu. Teste a conexão novamente e faça um novo login.";
    }

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
      return global.sessionStorage.getItem(STORAGE_QUEDA) === "1";
    } catch (_) {
      return false;
    }
  }

  function marcarQuedaDuranteGravacao(writeId) {
    try {
      global.sessionStorage.setItem(STORAGE_QUEDA, "1");
      if (writeId) {
        global.sessionStorage.setItem(STORAGE_WRITE_ID, String(writeId));
      }
    } catch (_) {
      /* storage indisponível */
    }
    emitirStatus({
      online: false,
      duranteGravacao: true,
      mensagem:
        "Conexão caiu durante uma gravação. Faça nova conexão e novo login. Depois confira a lista de credenciais no cofre antes de repetir.",
    });
  }

  function limparGravacaoPendente() {
    try {
      global.sessionStorage.removeItem(STORAGE_QUEDA);
      global.sessionStorage.removeItem(STORAGE_WRITE_ID);
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
    return data.codigo || data.erro || data.error || fallback;
  }

  /**
   * Garante que um comando só é tratado como sucesso com resposta explícita.
   * Sem corpo / null → erro SEM_RESPOSTA (nunca sucesso silencioso).
   */
  function exigirResposta(resultado, mensagemSemResposta) {
    if (resultado == null) {
      throw criarErroRede(
        "SEM_RESPOSTA",
        mensagemSemResposta ||
          "Comando sem resposta do servidor. Nada foi confirmado como sucesso."
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

      if (resultado.ok === false || (codigo && codigosErro.includes(String(codigo)))) {
        const err = new Error(
          resultado.mensagem || resultado.message || codigo || mensagemSemResposta
        );
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

  function ehErroDeRede(erro) {
    if (!erro) return false;
    if (erro.rede === true) return true;
    if (erro.name === "AbortError") return true;
    if (erro instanceof TypeError) return true;
    return /Failed to fetch|NetworkError|Load failed|Network request failed/i.test(
      erro.message || ""
    );
  }

  async function request(alvo, path, options) {
    const opts = options || {};
    const method = (opts.method || "GET").toUpperCase();
    const isWrite = opts.isWrite === true;
    const writeId = opts.writeId || null;
    const url = `${baseUrl(alvo).replace(/\/$/, "")}${
      path.startsWith("/") ? path : `/${path}`
    }`;

    const writeToken = isWrite ? writeId || `${method}:${url}` : null;
    if (writeToken) {
      gravacaoAtiva = writeToken;
    }

    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs || 12000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(opts.body != null ? { "Content-Type": "application/json" } : {}),
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

        if (err.rede && writeToken) {
          marcarQuedaDuranteGravacao(writeToken);
        }
        throw err;
      }

      // Sucesso HTTP só vale se houver corpo quando a chamada exige resposta
      if (opts.requireBody === true && data == null) {
        throw criarErroRede(
          "SEM_RESPOSTA",
          opts.emptyMessage ||
            "Comando sem resposta do servidor. Nada foi confirmado como sucesso."
        );
      }

      return data;
    } catch (erro) {
      const rede = ehErroDeRede(erro);

      if (rede && writeToken) {
        marcarQuedaDuranteGravacao(writeToken);
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
        erro && erro.name === "AbortError"
          ? "Tempo esgotado ao falar com o servidor."
          : "Falha de conexão com o servidor.",
        { causa: erro }
      );
    } finally {
      clearTimeout(timer);
      if (writeToken && gravacaoAtiva === writeToken) {
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

  /**
   * Requisição de teste isolada para um backend (health-check).
   * Retorna { ok, alvo, url, erro? } — nunca lança.
   */
  async function enviarRequisicaoTeste(alvo) {
    const url = `${baseUrl(alvo).replace(/\/$/, "")}${PATH_TESTE}`;
    try {
      const data = await get(alvo, PATH_TESTE, {
        timeoutMs: 5000,
        isWrite: false,
      });
      return { ok: true, alvo, url, data };
    } catch (erro) {
      return {
        ok: false,
        alvo,
        url,
        erro: {
          codigo: erro.codigo || "ERRO_CONEXAO",
          mensagem: erro.message || "Sem resposta",
        },
      };
    }
  }

  async function testarConexoes() {
    emitirStatus({
      online: null,
      mensagem: "Testando conexão com Back-end 1 e Back-end 2…",
    });

    const [t1, t2] = await Promise.all([
      enviarRequisicaoTeste("backend1"),
      enviarRequisicaoTeste("backend2"),
    ]);

    const ok1 = t1.ok === true;
    const ok2 = t2.ok === true;
    const online = ok1 && ok2;

    let mensagem;
    if (online) {
      mensagem = "Conexão OK com Back-end 1 e Back-end 2.";
    } else if (!ok1 && !ok2) {
      mensagem =
        "Sem resposta do Back-end 1 e do Back-end 2. Teste a conexão e faça um novo login.";
    } else if (!ok1) {
      mensagem =
        "Sem resposta do Back-end 1. Teste a conexão e faça um novo login.";
    } else {
      mensagem =
        "Sem resposta do Back-end 2. Teste a conexão e faça um novo login.";
    }

    if (houveQuedaDuranteGravacao()) {
      mensagem +=
        " Houve queda durante uma gravação — confira a lista de credenciais no cofre antes de repetir.";
    }

    emitirStatus({
      online,
      mensagem,
      backend1: ok1,
      backend2: ok2,
      duranteGravacao: houveQuedaDuranteGravacao(),
    });

    return {
      online,
      backend1: ok1,
      backend2: ok2,
      mensagem,
      testes: { backend1: t1, backend2: t2 },
    };
  }

  /**
   * Monitor periódico: detecta queda enquanto o Cliente está aberto.
   */
  function iniciarMonitor(intervaloMs) {
    pararMonitor();
    const ms = intervaloMs || 20000;
    monitorId = global.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      testarConexoes().catch(() => {
        /* status já atualizado */
      });
    }, ms);
  }

  function pararMonitor() {
    if (monitorId != null) {
      global.clearInterval(monitorId);
      monitorId = null;
    }
  }

  // Offline do navegador → trata como queda de conexão
  if (global.addEventListener) {
    global.addEventListener("offline", () => {
      if (gravacaoAtiva) {
        marcarQuedaDuranteGravacao(gravacaoAtiva);
      } else {
        emitirStatus({
          online: false,
          mensagem:
            "Navegador offline. Teste a conexão e faça um novo login.",
        });
      }
    });
  }

  global.HttpClient = {
    BASES,
    PATH_TESTE,
    get,
    post,
    request,
    enviarRequisicaoTeste,
    testarConexoes,
    getStatus,
    onStatusChange,
    exigirResposta,
    criarErroRede,
    houveQuedaDuranteGravacao,
    limparGravacaoPendente,
    marcarQuedaDuranteGravacao,
    iniciarMonitor,
    pararMonitor,
  };
})(window);
