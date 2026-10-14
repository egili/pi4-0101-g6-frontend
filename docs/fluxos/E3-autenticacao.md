
# Fluxo do E3: Autenticação

**Feito quando (da Entrega 1):** O usuário informa seu usuário e senha mestra corretos e vê o menu do cofre; se errar, vê a mensagem de erro.

## Passos

1. O Usuário informa usuário e senha mestra no Cliente.
2. O Cliente envia `username` e `senhaMestraHash` para o Servidor.
3. O Servidor busca o usuário na tabela `usuario`.
4. O Servidor compara o hash recebido com o armazenado.
5. Se bater, o Servidor devolve a confirmação com um `tokenSessao`.
6. Se não bater, o Servidor devolve erro `SENHA_INCORRETA`.
7. O Cliente exibe o menu do cofre ou a mensagem de erro.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant C as Cliente
    participant CM as Módulo de Criptografia
    participant S as Servidor
    participant DB as Banco de Dados

    U->>C: informa usuário e senha mestra
    C->>CM: deriva hash(senhaMestra, salt)
    CM-->>C: senhaMestraHash
    C->>S: CT3 autenticarUsuario
    S->>DB: CT9 Tabela usuario (buscar)
    DB-->>S: senhaMestraHash armazenado
    S-->>C: CT3 tokenSessao
    C-->>U: exibe menu do cofre