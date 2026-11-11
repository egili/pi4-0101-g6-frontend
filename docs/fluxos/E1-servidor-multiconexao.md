# Fluxo do E1: Servidor multiconexão

**Feito quando (da Entrega 1):** Dois usuários fazem requisições de socket ao mesmo tempo e o servidor responde aos dois de forma paralela sem travar.

## Passos

1. O Usuário A abre o sistema no navegador (Front-end web) e se autentica pelo Cliente (Back-end 2).
2. O Usuário B abre o sistema no seu navegador e se autentica pelo seu Cliente.
3. O Servidor (Back-end 1) aceita as duas conexões de socket simultaneamente.
4. O Usuário A envia uma requisição pelo navegador (ex: cadastrar credencial), e o Cliente a repassa ao Servidor via socket TCP.
5. O Servidor processa em uma thread separada, sem bloquear a conexão do Usuário B.
6. O Usuário B envia uma requisição em paralelo.
7. O Servidor responde aos dois de forma independente.
8. Os dois navegadores exibem os resultados ao mesmo tempo.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor UA as Usuário A
    actor UB as Usuário B
    participant NA as Navegador A (Front-end web)
    participant NB as Navegador B (Front-end web)
    participant CA as Cliente A (Back-end 2)
    participant CB as Cliente B (Back-end 2)
    participant S as Servidor (Back-end 1)
    participant DB as Banco de Dados

    UA->>NA: abre o sistema
    UB->>NB: abre o sistema
    NA->>CA: informa usuário e senha mestra
    CA->>S: PedidoDeSalt e PedidoDeLogin (usuário A)
    S->>DB: CT9 Tabela usuario (buscar)
    DB-->>S: dados do usuário A
    S-->>CA: tokenSessao A
    NB->>CB: informa usuário e senha mestra
    CB->>S: PedidoDeSalt e PedidoDeLogin (usuário B)
    S->>DB: CT9 Tabela usuario (buscar)
    DB-->>S: dados do usuário B
    S-->>CB: tokenSessao B
    CA->>S: CT2 PedidoDeCriacao (dadosCifradosA, tokenSessao A)
    CB->>S: CT2 PedidoDeCriacao (dadosCifradosB, tokenSessao B)
    S->>DB: CT10 Tabela credencial (inserir A e B)
    DB-->>S: confirmações
    S-->>CA: credencialSalva
    S-->>CB: credencialSalva
    CA-->>NA: credencialSalva
    CB-->>NB: credencialSalva
    NA-->>UA: exibe confirmação
    NB-->>UB: exibe confirmação
```