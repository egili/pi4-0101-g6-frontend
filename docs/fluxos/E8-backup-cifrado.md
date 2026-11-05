# Fluxo do E8: Backup cifrado do cofre (.vault)

**Feito quando (da Entrega 1):** O usuário exporta um arquivo de backup cifrado e portátil (`.vault`) contendo suas credenciais, conseguindo identificar o arquivo salvo em disco para uso posterior.

---

## Estrutura e Especificação do Arquivo `.vault`

Para viabilizar a portabilidade entre diferentes computadores sem depender de um banco de dados prévio, o arquivo de backup gerado possui uma **estrutura de duas camadas**:

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
|    Payload cifrado pelo Módulo de Criptografia utilizando a chave        |
|    derivada de (senhaMestra + salt do cabeçalho) e o IV do cabeçalho.    |
|    Conteúdo interno protegido: JSON contendo a coleção de credenciais.   |
+--------------------------------------------------------------------------+
```

### Por que o Cabeçalho é Aberto?
1. **Portabilidade Universal:** O `salt` e o `iv` da camada de envelope do backup precisam ser lidos por qualquer Cliente (Back-end 2) onde o arquivo seja restaurado no futuro, mesmo que o usuário esteja em uma máquina nova sem nenhum registro local pré-existente.
2. **Segurança Criptográfica (Zero-Trust):** Em conformidade com os padrões da criptografia moderna (como LUKS, OpenSSL e gerenciadores de senhas padrão de mercado), `salt` e `IV` não são segredos criptográficos; são valores públicos aleatórios destinados a prevenir ataques de dicionário (*rainbow tables*) e garantir não-repetição de blocos cifrados. Sem a **senha mestra** (que nunca sai da mente do usuário), o corpo cifrado permanece matematicamente inquebrável.

---

## Passos

1. O Usuário clica em exportar backup no navegador (Front-end web).
2. O navegador pede a exportação ao Cliente (Back-end 2), que envia a requisição ao Servidor via requisição HTTP (REST) `GET /backup` (CT7), com o header `Authorization: Bearer tokenSessao`.
3. O Servidor valida o `tokenSessao`, consulta a tabela `credencial` (`CT10`) e devolve a lista de credenciais ao Cliente.
4. O Cliente aciona o Módulo de Criptografia (local) para:
   - Gerar um `salt` criptográfico exclusivo para o backup (`gerarSalt()`);
   - Gerar um vetor de inicialização `iv` para o pacote (`gerarIV()`);
   - Derivar a chave de cifragem do backup a partir da senha mestra e do novo `salt`;
   - Cifrar o conjunto de dados das credenciais com a chave do backup.
5. O Cliente monta o arquivo final `.vault` contendo o cabeçalho aberto (com `versao`, `algoritmo`, `salt` e `iv`) seguido do corpo cifrado.
6. O Cliente entrega o arquivo `.vault` ao navegador, que salva o arquivo no disco da máquina do Usuário (download).
7. O navegador exibe o nome e a confirmação do arquivo exportado com sucesso ao Usuário.

---

## Diagrama de Sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant N as Navegador (Front-end web)
    participant C as Cliente (Back-end 2)
    participant CM as Módulo de Criptografia (Back-end 2)
    participant S as Servidor (Back-end 1)
    participant DB as Banco de Dados

    U->>N: exportar backup
    N->>C: pede exportação
    C->>S: CT7 GET /backup (Bearer tokenSessao)
    S->>DB: CT10 Tabela credencial (buscar registros do usuário)
    DB-->>S: lista de credenciais
    S-->>C: credenciais (blobs)

    Note over C,CM: Geração do Arquivo de Backup Portátil (.vault)
    C->>CM: gerarSalt() e gerarIV()
    CM-->>C: saltBackup, ivBackup
    C->>CM: derivarChaveCifragem(senhaMestra, saltBackup)
    CM-->>C: chaveBackup
    C->>CM: cifrar(colecaoCredenciais, chaveBackup, ivBackup)
    CM-->>C: payloadCifrado

    C->>C: monta arquivo .vault (Cabeçalho Aberto: salt, iv + Corpo Cifrado)
    C-->>N: arquivo .vault
    N->>N: salva arquivo no disco (download)
    N-->>U: exibe nome do arquivo .vault gerado
```
