# Front-end — Cliente Web do Cofre Digital

Interface web moderna (navegador) desenvolvida em HTML5, CSS3 e JavaScript para o gerenciamento e armazenamento seguro de credenciais pessoais. Toda a criptografia e derivação de chaves são realizadas localmente no navegador (Zero-Trust / Zero-Knowledge), conectando-se ao servidor **Back-end 1** via requisições HTTP REST utilizando a **API Fetch**.

## Sobre o projeto

O Cofre Digital é um sistema que armazena credenciais de forma segura. Toda a criptografia acontece no cliente web: o navegador realiza a cifragem antes de qualquer tráfego de rede; o servidor central recebe apenas dados já cifrados e nunca tem acesso à senha mestra nem ao conteúdo em texto claro.

## Comunicação com o Back-end

- **Tecnologia:** API Fetch (`window.fetch`) nativa do navegador
- **Protocolo:** HTTP / REST (JSON)
- **Autenticação:** Header `Authorization: Bearer <token_jwt>`
- **Foco de Execução:** Interface Web executada exclusivamente no navegador

## Documentação

- **Visão geral, módulos e convenção de nomes:** [docs/fluxos/VisaoGeral.md](docs/fluxos/VisaoGeral.md)
- **Fluxos por entregável (E1 a E9):** [docs/fluxos/](docs/fluxos/)
- **Contratos do sistema:** no repositório do [Back-end 1](https://github.com/egili/pi4-0101-g6-backend-1)

## Módulos relacionados

| Módulo | Repositório | Responsável |
|---|---|---|
| Front-end (Interface Web) | este repositório | Guilherme Heron |
| Back-end 1 (Servidor REST / Spring Boot) | [pi4-0101-g6-backend-1](https://github.com/egili/pi4-0101-g6-backend-1) | Eliseu Gili |
| Back-end 2 (Módulo de Criptografia + BD) | [pi4-0101-g6-backend-2](https://github.com/egili/pi4-0101-g6-backend-2) | Leonardo Maciel |
| Documentos | [pi4-2026-2-0101-grupo06](https://github.com/egili/pi4-2026-2-0101-grupo06) | Pietra Bortolato |

## Stack

- HTML5, CSS3 e JavaScript moderno (ES6+)
- Web Crypto API (`crypto.subtle`) para criptografia local no navegador
- API Fetch para integração HTTP REST com o Back-end 1
- Docker com Node.js/Express para servir os assets web

## Como rodar

Abra o arquivo `index.html` diretamente em seu navegador web moderno ou inicie o servidor de arquivos estáticos:

```bash
npm start
```

Acesse no navegador: `http://localhost:3000`

## Integrantes do Grupo
* Eliseu Pereira Gili — [@eliseugili](https://github.com/egili)
* Guilherme Heron da Silva — [@GuilhermeHeron](https://github.com/GuilhermeHeron)
* Leonardo Maciel Ferreira de Moraes — [@leomacifs](https://github.com/leomacifs)
* Pietra Façanha Bortolato — [@piborto](https://github.com/piborto)
