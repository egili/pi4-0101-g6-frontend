# Front-end — Cliente do Cofre Digital

Sistema cliente-servidor desenvolvido em Java para o gerenciamento, armazenamento seguro e cifragem de credenciais pessoais, garantindo que o servidor central não tenha acesso aos dados em texto claro.

Interface do sistema de cofre digital. Responsável por interagir com o usuário.

## Sobre o projeto

O Cofre Digital é um sistema cliente-servidor que armazena credenciais de forma segura. Toda a criptografia acontece no cliente: o servidor central recebe apenas dados já cifrados e nunca tem acesso à senha mestra nem ao conteúdo em texto claro.

## Documentação

- **Visão geral, módulos e convenção de nomes:** [docs/fluxos/visao-geral.md](docs/fluxos/visao-geral.md)
- **Fluxos por entregável (E1 a E9):** [docs/fluxos/](docs/fluxos/)
- **Contratos do sistema:** no repositório do [Back-end 1](https://github.com/egili/pi4-0101-g6-backend-1)

## Módulos relacionados

| Módulo | Repositório | Responsável |
|---|---|---|
| Front-end (Cliente CLI) | este repositório | Guilherme Heron |
| Back-end 1 (Servidor) | [pi4-0101-g6-backend-1](https://github.com/egili/pi4-0101-g6-backend-1) | Eliseu Gili |
| Back-end 2 (Módulo de Criptografia + BD) | [pi4-0101-g6-backend-2](https://github.com/egili/pi4-0101-g6-backend-2) | Leonardo Maciel |
| Documentos | [pi4-2026-2-0101-grupo06](https://github.com/egili/pi4-2026-2-0101-grupo06) | Pietra Bortolato |

## Stack

- Java (JDK 17+)
- Build com Maven ou Gradle
- Comunicação com o servidor via Socket TCP

## Como rodar

Em breve.

## Integrantes do Grupo
* Eliseu Pereira Gili — [@eliseugili](https://github.com/egili)
* Guilherme Heron da Silva — [@GuilhermeHeron](https://github.com/GuilhermeHeron)
* Leonardo Maciel Ferreira de Moraes — [@leomacifs](https://github.com/leomacifs)
* Pietra Façanha Bortolato — [@piborto](https://github.com/piborto)
