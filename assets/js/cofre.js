document.addEventListener("DOMContentLoaded", () => {
  const vault = document.getElementById("vault");
  const viewPasta = document.getElementById("view-pasta");
  const viewConta = document.getElementById("view-conta");
  const toolsPanel = document.getElementById("vault-tools");
  const btnCloseTools = document.getElementById("btn-close-tools");
  const btnOpenTools = document.querySelectorAll(".btn-open-tools");
  const toolTabs = document.querySelectorAll(".tools-nav__btn");
  const treeItems = document.querySelectorAll(".tree-item");
  const btnFavoritar = document.getElementById("btn-favoritar");
  const btnMostrarSenha = document.getElementById("btn-mostrar-senha");
  const contaSenha = document.getElementById("conta-senha");
  const lengthInput = document.getElementById("senha-length");
  const lengthValue = document.getElementById("senha-length-value");
  const btnGerar = document.getElementById("btn-gerar-senha");
  const senhaGerada = document.getElementById("senha-gerada");
  const formMestra = document.getElementById("form-senha-mestra");
  const btnExportar = document.getElementById("btn-exportar");
  const btnImportar = document.getElementById("btn-importar");
  const backupFile = document.getElementById("backup-file");
  const filePick = document.querySelector(".file-pick span");
  const btnPasta = document.getElementById("btn-pasta");
  const btnConta = document.getElementById("btn-conta");

  const data = {
    "pasta-1": {
      type: "pasta",
      nome: "PASTA 1",
      descricao: "Pasta geral para acessos do trabalho.",
    },
    "pasta-2": {
      type: "pasta",
      nome: "PASTA 2",
      descricao: "Pasta com contas financeiras e bancos.",
    },
    "pasta-3": {
      type: "pasta",
      nome: "PASTA 3",
      descricao: "Pasta de contas pessoais e acessos frequentes.",
    },
    "conta-exemplo": {
      type: "conta",
      nome: "Conta exemplo",
      login: "usuario.exemplo",
      email: "exemplo@email.com",
      senha: "S3nhaF0rte!",
      notas: "Conta de exemplo usada para demonstração do cofre.",
    },
  };

  function openTools() {
    vault.classList.add("is-tools-open");
    toolsPanel.setAttribute("aria-hidden", "false");
  }

  function closeTools() {
    vault.classList.remove("is-tools-open");
    toolsPanel.setAttribute("aria-hidden", "true");
  }

  function switchTool(name) {
    toolTabs.forEach((tab) => {
      const active = tab.dataset.tool === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    document.querySelectorAll(".tool-panel").forEach((panel) => {
      const active = panel.id === `tool-${name}`;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  function showView(type) {
    const isPasta = type === "pasta";

    viewPasta.classList.toggle("is-visible", isPasta);
    viewConta.classList.toggle("is-visible", !isPasta);
    viewPasta.hidden = !isPasta;
    viewConta.hidden = isPasta;
  }

  function selectItem(item) {
    const id = item.dataset.id;
    const entry = data[id];
    if (!entry) return;

    treeItems.forEach((el) => {
      el.classList.remove("is-active");
      el.removeAttribute("aria-current");
    });

    item.classList.add("is-active");
    item.setAttribute("aria-current", "true");

    showView(entry.type);

    if (entry.type === "pasta") {
      document.getElementById("pasta-nome").value = entry.nome;
      document.getElementById("pasta-descricao").value = entry.descricao;
    } else {
      document.getElementById("conta-nome").value = entry.nome;
      document.getElementById("conta-login").value = entry.login;
      document.getElementById("conta-email").value = entry.email;
      contaSenha.value = entry.senha;
      contaSenha.type = "password";
      btnMostrarSenha.textContent = "MOSTRAR";
      document.getElementById("conta-notas").value = entry.notas;
      btnFavoritar.classList.remove("is-active");
      btnFavoritar.setAttribute("aria-pressed", "false");
    }
  }

  async function copyFrom(button) {
    const targetId = button.getAttribute("data-copy-target");
    const input = document.getElementById(targetId);
    if (!input || !input.value) return;

    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      input.select();
      document.execCommand("copy");
    }

    const original = button.textContent;
    button.classList.add("is-copied");
    button.textContent = "COPIADO";

    setTimeout(() => {
      button.classList.remove("is-copied");
      button.textContent = original;
    }, 1200);
  }

  function generatePassword() {
    const length = Number(lengthInput.value);
    const sets = [];

    if (document.getElementById("opt-upper").checked) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    if (document.getElementById("opt-lower").checked) sets.push("abcdefghijklmnopqrstuvwxyz");
    if (document.getElementById("opt-number").checked) sets.push("0123456789");
    if (document.getElementById("opt-symbol").checked) sets.push("!@#$%^&*()-_=+[]{};:,.?");

    if (!sets.length) {
      alert("Selecione ao menos uma opção.");
      return;
    }

    const all = sets.join("");
    let result = sets.map((set) => set[Math.floor(Math.random() * set.length)]).join("");

    for (let i = result.length; i < length; i += 1) {
      result += all[Math.floor(Math.random() * all.length)];
    }

    senhaGerada.value = result
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  btnOpenTools.forEach((btn) => btn.addEventListener("click", openTools));
  if (btnCloseTools) btnCloseTools.addEventListener("click", closeTools);

  toolTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTool(tab.dataset.tool));
  });

  treeItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (item.dataset.type === "pasta") {
        const group = item.closest(".tree-group");
        if (group) group.classList.toggle("is-open");
      }
      selectItem(item);
    });
  });

  document.querySelectorAll(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", () => copyFrom(btn));
  });

  if (btnFavoritar) {
    btnFavoritar.addEventListener("click", () => {
      const active = btnFavoritar.classList.toggle("is-active");
      btnFavoritar.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  if (btnMostrarSenha && contaSenha) {
    btnMostrarSenha.addEventListener("click", () => {
      const showing = contaSenha.type === "text";
      contaSenha.type = showing ? "password" : "text";
      btnMostrarSenha.textContent = showing ? "MOSTRAR" : "OCULTAR";
    });
  }

  if (lengthInput && lengthValue) {
    lengthInput.addEventListener("input", () => {
      lengthValue.textContent = lengthInput.value;
    });
  }

  if (btnGerar) btnGerar.addEventListener("click", generatePassword);

  if (formMestra) {
    formMestra.addEventListener("submit", (event) => {
      event.preventDefault();
      alert("Senha mestra atualizada (hard coded).");
      formMestra.reset();
    });
  }

  if (btnExportar) {
    btnExportar.addEventListener("click", () => {
      alert("Backup criptografado exportado (hard coded).");
    });
  }

  if (btnImportar) {
    btnImportar.addEventListener("click", () => {
      alert("Backup importado (hard coded).");
    });
  }

  if (backupFile && filePick) {
    backupFile.addEventListener("change", () => {
      filePick.textContent = backupFile.files[0]
        ? backupFile.files[0].name
        : "Escolher arquivo";
    });
  }

  if (btnPasta) {
    btnPasta.addEventListener("click", () => {
      alert("Nova pasta — hard coded por enquanto.");
    });
  }

  if (btnConta) {
    btnConta.addEventListener("click", () => {
      alert("Nova conta — hard coded por enquanto.");
    });
  }

  // Gera uma senha inicial no painel
  generatePassword();
});
