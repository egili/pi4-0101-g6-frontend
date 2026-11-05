# Fluxo do E1: Servidor multiconexão

**Feito quando (da Entrega 1):** Dois usuários abrem a aplicação web ao mesmo tempo em abas ou navegadores distintos, enviam requisições e o servidor responde aos dois de forma paralela sem travar.

## Passos

1. O Usuário A acessa a interface Web e se autentica.
2. O Usuário B acessa a interface Web em outro navegador/máquina e se autentica.
3. O Servidor Back-end 1 processa as requisições HTTP simultaneamente.
4. O Usuário A envia uma requisição via API Fetch (ex: cadastrar credencial).
5. O Servidor processa de forma concorrente sem bloquear a conexão do Usuário B.
6. O Usuário B envia uma requisição via API Fetch em paralelo.
7. O Servidor responde a ambas as requisições de forma independente.
8. Os dois Clientes Web recebem e exibem os resultados em tempo real na interface.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor UA as Usuário A
    actor UB as Usuário B
    participant CA as Cliente Web (A)
    participant CB as Cliente Web (B)
    participant S as Servidor Back-end 1
    participant DB as Banco de Dados

    UA->>CA: abre o cofre no navegador
    UB->>CB: abre o cofre no navegador
    CA->>S: fetch POST /usuarios/login (usuarioA)
    S->>DB: CT9 Tabela usuario (buscar)
    DB-->>S: dados do usuário A
    S-->>CA: CT3 tokenSessao JWT
    CB->>S: fetch POST /usuarios/login (usuarioB)
    S->>DB: CT9 Tabela usuario (buscar)
    DB-->>S: dados do usuário B
    S-->>CB: CT3 tokenSessao JWT
    CA->>S: fetch POST /credentials (dadosCifradosA)
    CB->>S: fetch POST /credentials (dadosCifradosB)
    S->>DB: CT10 Tabela credencial (inserir A e B)
    DB-->>S: confirmações
    S-->>CA: credencialSalva
    S-->>CB: credencialSalva
    CA-->>UA: exibe confirmação na tela
    CB-->>UB: exibe confirmação na tela
```
