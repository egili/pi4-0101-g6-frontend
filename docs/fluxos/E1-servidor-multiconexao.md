# Fluxo do E1: Servidor multiconexão

**Feito quando (da Entrega 1):** Dois usuários abrem o sistema ao mesmo tempo, mandam comandos e o servidor responde aos dois de forma paralela sem travar.

## Passos

1. O Usuário A abre o Cliente e se autentica.
2. O Usuário B abre o Cliente em outra máquina e se autentica.
3. O Servidor aceita as duas conexões Socket simultaneamente.
4. O Usuário A envia um comando (ex: cadastrar credencial).
5. O Servidor processa em uma thread separada, sem bloquear a conexão do Usuário B.
6. O Usuário B envia um comando em paralelo.
7. O Servidor responde aos dois de forma independente.
8. Os dois Clientes exibem os resultados ao mesmo tempo.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor UA as Usuário A
    actor UB as Usuário B
    participant CA as Cliente (A)
    participant CB as Cliente (B)
    participant S as Servidor
    participant DB as Banco de Dados

    UA->>CA: abre o cliente
    UB->>CB: abre o cliente
    CA->>S: CT3 autenticarUsuario(usuarioA)
    S->>DB: CT9 Tabela usuario (buscar)
    DB-->>S: dados do usuário A
    S-->>CA: CT3 sessão iniciada
    CB->>S: CT3 autenticarUsuario(usuarioB)
    S->>DB: CT9 Tabela usuario (buscar)
    DB-->>S: dados do usuário B
    S-->>CB: CT3 sessão iniciada
    CA->>S: CT2 salvarCredencial(dadosCifradosA)
    CB->>S: CT2 salvarCredencial(dadosCifradosB)
    S->>DB: CT10 Tabela credencial (inserir A e B)
    DB-->>S: confirmações
    S-->>CA: credencialSalva
    S-->>CB: credencialSalva
    CA-->>UA: exibe confirmação
    CB-->>UB: exibe confirmação