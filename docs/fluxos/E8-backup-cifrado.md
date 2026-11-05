# Fluxo do E8: Backup cifrado do cofre (.vault)

**Feito quando (da Entrega 1):** O usuário exporta um arquivo de backup cifrado e portátil (`.vault`) contendo suas credenciais, conseguindo baixá-lo pelo navegador para uso posterior.

---

## Estrutura e Especificação do Arquivo `.vault`

Para viabilizar a portabilidade entre diferentes dispositivos sem depender de um banco de dados prévio, o arquivo de backup gerado possui uma **estrutura de duas camadas**:

```
+--------------------------------------------------------------------------+
| 1. CABEÇALHO ABERTO (Plaintext Header - Metadados de Inicialização)      |
|    {                                                                     |
|      "versao": "1.0",                                                    |
|      "algoritmo": "AES-256-GCM",                                         |
|      "salt": "a7f3b89c01de52...",                                        |
|      "iv": "99e1c4a03b128f...",                                          |
|      "criadoEm": "2026-10-28T11:00:00Z"                                  |
|    }                                                                     |
+--------------------------------------------------------------------------+
| 2. CORPO CIFRADO (Ciphertext Payload)                                    |
|    Payload cifrado localmente no navegador utilizando a chave            |
|    derivada de (senhaMestra + salt do cabeçalho) e o IV do cabeçalho.    |
|    Conteúdo interno protegido: JSON contendo a coleção de credenciais.   |
+--------------------------------------------------------------------------+
```

### Por que o Cabeçalho é Aberto?
1. **Portabilidade Universal:** O `salt` e o `iv` da camada de envelope do backup precisam ser lidos por qualquer Cliente Web onde o arquivo seja restaurado no futuro, mesmo que o usuário esteja em uma máquina nova sem nenhum registro local pré-existente.
2. **Segurança Criptográfica (Zero-Trust):** Em conformidade com os padrões da criptografia moderna (como LUKS, OpenSSL e gerenciadores de senhas padrão de mercado), `salt` e `IV` não são segredos criptográficos; são valores públicos aleatórios destinados a prevenir ataques de dicionário (*rainbow tables*) e garantir não-repetição de blocos cifrados. Sem a **senha mestra** (que nunca sai da mente do usuário), o corpo cifrado permanece matematicamente inquebrável.

---

## Passos

1. O Usuário clica no botão para exportar o backup na interface Web.
2. O Cliente Web envia a requisição de exportação ao Servidor via API Fetch (`CT7 exportarBackup`) com o token JWT no cabeçalho `Authorization`.
3. O Servidor valida o token JWT, consulta a tabela `credencial` (`CT10`) e devolve a lista de credenciais ao Cliente Web.
4. O Cliente Web aciona a criptografia local no navegador para:
   - Gerar um `salt` criptográfico exclusivo para o backup;
   - Gerar um vetor de inicialização `iv` para o pacote;
   - Derivar a chave de cifragem do backup a partir da senha mestra e do novo `salt`;
   - Cifrar o conjunto de dados das credenciais com a chave do backup.
5. O Cliente Web monta o arquivo final `.vault` contendo o cabeçalho aberto (com `versao`, `algoritmo`, `salt` e `iv`) seguido do corpo cifrado.
6. O Cliente Web inicia o download automático do arquivo `.vault` no navegador do usuário.
7. O Cliente Web exibe a confirmação de backup exportado com sucesso na interface.

---

## Diagrama de Sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant C as Cliente Web
    participant CM as Criptografia Local (Navegador)
    participant S as Servidor Back-end 1
    participant DB as Banco de Dados

    U->>C: clica em "Exportar Backup" na interface Web
    C->>S: fetch GET /backup/export (Authorization: Bearer JWT)
    S->>DB: CT10 Tabela credencial (busca credenciais do usuário)
    DB-->>S: lista de credenciais cifradas
    S-->>C: CT7 lista de credenciais
    C->>CM: gera salt e iv para o envelope do backup
    CM-->>C: saltBackup + ivBackup
    C->>CM: deriva chave do backup e cifra lista
    CM-->>C: payloadCifradoBackup
    C->>C: monta arquivo .vault (cabeçalho aberto + payload)
    C-->>U: dispara download do arquivo .vault e exibe mensagem de sucesso
```
