# Front-end — Interface web do Cofre Digital

Sistema cliente-servidor desenvolvido em Java para o gerenciamento, armazenamento seguro e cifragem de credenciais pessoais, garantindo que o servidor central não tenha acesso aos dados em texto claro.

Interface do sistema de cofre digital, acessada pelo navegador. Interage com o usuário e envia cada ação ao Cliente (Back-end 2). **Não cifra nada e não fala diretamente com o Servidor.**

## Sobre o projeto

O Cofre Digital é um sistema cliente-servidor que armazena credenciais de forma segura. Toda a criptografia acontece no Cliente (Back-end 2): o servidor central recebe apenas dados já cifrados e nunca tem acesso à senha mestra nem ao conteúdo em texto claro.

## Documentação

- **Visão geral, módulos e convenção de nomes:** [docs/fluxos/VisaoGeral.md](docs/fluxos/VisaoGeral.md)
- **Fluxos por entregável (E1 a E9):** [docs/fluxos/](docs/fluxos/)
- **Contratos do sistema:** no repositório do [Back-end 1](https://github.com/egili/pi4-0101-g6-backend-1/tree/main/docs/contratos)
- **Como subir o sistema inteiro:** README do [repositório principal](https://github.com/egili/pi4-2026-2-0101-grupo06)

## Módulos relacionados

| Módulo | Repositório | Responsável |
|---|---|---|
| Front-end (interface web) | este repositório | Guilherme Heron |
| Back-end 1 (Servidor, socket TCP) | [pi4-0101-g6-backend-1](https://github.com/egili/pi4-0101-g6-backend-1) | Eliseu Gili |
| Back-end 2 (Cliente, API REST e criptografia) | [pi4-0101-g6-backend-2](https://github.com/egili/pi4-0101-g6-backend-2) | Leonardo Maciel |
| Documentos | [pi4-2026-2-0101-grupo06](https://github.com/egili/pi4-2026-2-0101-grupo06) | Pietra Bortolato |

## Telas

- **Login** (`src/index.html`): usuário e senha mestra.
- **Cadastro** (`src/registro.html`): cria a conta.
- **Cofre** (`src/cofre.html`): lista de serviços, revelar senha, adicionar, editar e excluir credencial, gerador de senhas e exportar ou importar backup.

## Como o front fala com o Cliente

Todas as chamadas vão para o Cliente, na porta 8081, pela API REST (JSON). A lista completa de rotas está no README do [Cliente](https://github.com/egili/pi4-0101-g6-backend-2).

Um detalhe importante: o front **não guarda token nem chave de cifragem**. Guarda só o nome de usuário e o id, para mostrar na tela. A sessão de verdade fica no Cliente.

## Stack

- HTML, CSS e JavaScript puro (sem framework)
- Node.js 18 (Express), só para servir os arquivos estáticos na porta 3000
- Jest e Supertest para os testes do servidor de arquivos

## Estrutura

```
src/            páginas e scripts do navegador (copiados para public/ na imagem)
  assets/js/    api.js (chamadas ao Cliente), http.js (rede e tratamento de erro),
                cofre.js (tela principal), login.js, registro.js
config/         servidor Node que serve src/ e a rota de saúde /api/health
  tests/        testes do servidor (Jest)
```

## Como rodar

Pela raiz do repositório principal, com Docker (recomendado). O front sobe junto com o restante do sistema:

```bash
cd pi4-2026-2-0101-grupo06
cp .env.example .env   # preencha DB_PASSWORD e JWT_SECRET
docker compose up --build -d
```

Depois, abra http://localhost:3000 no navegador.

Para rodar só o servidor de arquivos, sem Docker:

```bash
cd config
npm install
npm start
```

Nesse caso, a tela de login só funciona com o Cliente e o Servidor no ar.

## Testes

```bash
cd config
npm test
```

Os testes cobrem o servidor de arquivos e a rota de saúde. Ainda não há testes automáticos das telas no navegador. Essa verificação é manual.

## Integrantes do Grupo
* Eliseu Pereira Gili — [@eliseugili](https://github.com/egili)
* Guilherme Heron da Silva — [@GuilhermeHeron](https://github.com/GuilhermeHeron)
* Leonardo Maciel Ferreira de Moraes — [@leomacifs](https://github.com/leomacifs)
* Pietra Façanha Bortolato — [@piborto](https://github.com/piborto)
