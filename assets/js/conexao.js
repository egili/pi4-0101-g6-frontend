/**
 * UI de conexão do Cliente:
 * - testa Back-end 1 e Back-end 2
 * - avisa queda (nunca sucesso sem resposta)
 * - pede nova conexão + novo login
 * - após queda em gravação, orienta conferir a lista de credenciais
 */
(function () {
  function garantirBanner() {
    let banner = document.getElementById("conexao-banner");
    if (banner) return banner;

    banner = document.createElement("div");
    banner.id = "conexao-banner";
    banner.className = "conexao-banner";
    banner.setAttribute("role", "status");
    banner.hidden = true;
    banner.innerHTML = `
      <div class="conexao-banner__inner">
        <p class="conexao-banner__texto" id="conexao-banner-texto"></p>
        <div class="conexao-banner__acoes">
          <button type="button" class="conexao-banner__btn" id="btn-testar-conexao">
            Testar conexão
          </button>
          <a class="conexao-banner__link" id="btn-novo-login" href="index.html">
            Novo login
          </a>
        </div>
      </div>
    `;
    document.body.prepend(banner);
    return banner;
  }

  function estaNoCofre() {
    return /cofre\.html$/i.test(window.location.pathname || "");
  }

  function renderStatus(status) {
    if (!window.HttpClient) return;

    const banner = garantirBanner();
    const texto = document.getElementById("conexao-banner-texto");
    if (!texto) return;

    const online = status.online === true;
    const pendente = status.online === null;
    const quedaGravacao =
      status.duranteGravacao === true || HttpClient.houveQuedaDuranteGravacao();

    banner.hidden = false;
    banner.classList.toggle("conexao-banner--ok", online);
    banner.classList.toggle("conexao-banner--erro", status.online === false);
    banner.classList.toggle("conexao-banner--pendente", pendente);
    banner.setAttribute(
      "role",
      status.online === false ? "alert" : "status"
    );

    let msg = status.mensagem || "";

    if (status.online === false) {
      if (!/novo login/i.test(msg)) {
        msg +=
          (msg ? " " : "") +
          "Faça uma nova conexão (Testar conexão) e um novo login.";
      }
    }

    if (quedaGravacao) {
      if (estaNoCofre()) {
        msg +=
          (msg ? " " : "") +
          "Confira a lista de credenciais abaixo antes de repetir a gravação.";
      } else {
        msg +=
          (msg ? " " : "") +
          "Depois do login, confira a lista de credenciais no cofre antes de repetir a gravação.";
      }
    }

    texto.textContent = msg;

    const btnLogin = document.getElementById("btn-novo-login");
    if (btnLogin) {
      // Em queda: destaca novo login; online/pendente: ainda útil no cofre
      btnLogin.hidden = online && !quedaGravacao;
    }
  }

  async function testarAgora(botao) {
    if (!window.HttpClient) return null;

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Testando…";
    }

    try {
      const resultado = await HttpClient.testarConexoes();
      let status = HttpClient.getStatus();

      if (resultado.online && HttpClient.houveQuedaDuranteGravacao()) {
        status = {
          ...status,
          duranteGravacao: true,
          mensagem: estaNoCofre()
            ? "Conexão restabelecida. Confira a lista de credenciais abaixo antes de repetir qualquer gravação."
            : "Conexão restabelecida. Faça login e confira a lista de credenciais no cofre antes de repetir qualquer gravação.",
        };
      }

      renderStatus(status);
      return resultado;
    } catch (erro) {
      renderStatus({
        online: false,
        mensagem:
          (erro && erro.message) ||
          "Falha ao testar conexão. Tente de novo e faça um novo login.",
        duranteGravacao: HttpClient.houveQuedaDuranteGravacao(),
      });
      return { online: false, mensagem: erro && erro.message };
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Testar conexão";
      }
    }
  }

  function iniciar() {
    if (!window.HttpClient) return;

    garantirBanner();
    renderStatus(HttpClient.getStatus());
    HttpClient.onStatusChange(renderStatus);

    document.addEventListener("click", (event) => {
      const botao = event.target.closest("#btn-testar-conexao");
      if (!botao) return;
      event.preventDefault();
      testarAgora(botao);
    });

    // Teste automático ao abrir o Cliente (BE1 + BE2)
    testarAgora(document.getElementById("btn-testar-conexao"));

    // Monitor leve para detectar queda enquanto a página está aberta
    if (estaNoCofre()) {
      HttpClient.iniciarMonitor(20000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  window.ConexaoUI = { testarAgora, renderStatus, garantirBanner };
})();
