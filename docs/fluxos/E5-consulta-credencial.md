# Fluxo do E5: Consulta de credencial

**Feito quando (da Entrega 1):** O usuário pede para ver a senha do Gmail, o sistema busca no servidor, decifra a senha e a mostra em texto claro na tela.

## Passos

1. O Usuário digita o comando para listar suas credenciais.
2. O Cliente envia a requisição de listagem ao Servidor.
3. O Servidor busca as credenciais do usuário na tabela `credencial`.
4. O Servidor devolve a lista com `dadosCifrados` e `iv`.
5. O Usuário escolhe uma credencial para consultar.
6. O Cliente chama o Módulo de Criptografia para decifrar a senha.
7. O Módulo de Criptografia devolve a senha em texto claro.
8. O Cliente exibe a senha para o Usuário.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant C as Cliente
    participant CM as Módulo de Criptografia
    participant S as Servidor
    participant DB as Banco de Dados

    U->>C: lista credenciais
    C->>S: CT4 listarCredenciais
    S->>DB: CT10 Tabela credencial (buscar por usuário)
    DB-->>S: lista de credenciais cifradas
    S-->>C: CT4 listaCredenciais
    C-->>U: exibe lista de serviços
    U->>C: escolhe uma credencial
    C->>CM: decifrar(dadosCifrados, iv, chaveMestra)
    CM-->>C: senha em texto claro
    C-->>U: exibe a senha