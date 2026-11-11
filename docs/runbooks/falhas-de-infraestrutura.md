# Falhas de infraestrutura nas jornadas reais (#125)

As jornadas reais (`tests/identity/` e os workflows `*-contract.yml`) sobem navegadores, a API pinada, o emissor de identidade e o banco descartáveis. Uma falha nessa preparação não diz nada sobre o produto e não pode ser confundida com um defeito, nem o contrário.

## Como distinguir

| Sinal                                                                                                                 | Classe                                        | O que fazer                                                                                           |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Aviso `Instalação de navegadores (#125)` e erro "Três tentativas de instalação falharam. Nenhum teste foi executado." | Infraestrutura do runner (apt ou download)    | Reexecutar só o job, sem mudar nada.                                                                  |
| Job cancelado por `timeout-minutes` ainda no passo de instalação de navegadores ou de dependências                    | Infraestrutura do runner                      | Reexecutar só o job.                                                                                  |
| `Actual API subprocess did not start` (`journey.py`, `restart`)                                                       | Harness da API (repositório `bancaemdia-api`) | Reexecutar só o job e registrar na issue da API; a correção é lá.                                     |
| `Hosted account entry did not complete`, espera por `/signed-in` esgotada, ou `required-action` no emissor            | Emissor de identidade do harness              | Reexecutar só o job e registrar na issue da API.                                                      |
| Asserção de produto (`expect`, `assert`, texto, contagem, valor, URL) depois que a jornada começou                    | **Produto ou teste**: investigar              | Nunca reexecutar para obter verde. Ler o JUnit, o screenshot e o trace sanitizado e corrigir a causa. |
| Medição de desempenho fora do limite                                                                                  | **Medição**: investigar                       | Nunca reexecutar para escolher amostra (#37).                                                         |

Uma mesma falha de infraestrutura que se repete na reexecução deixa de ser intermitência: investigar a causa.

## O que o CI já faz

- `.github/actions/navegadores` guarda os binários dos navegadores em cache por versão do Playwright e repete **apenas** a instalação, até três vezes, com prazo por tentativa e aviso registrado com tempo e motivo. Testes, asserções e medições nunca são repetidos.
- O backend pinado é instalado com `tests/identity/api-constraints.txt` (`kombu<5.7`), para que uma versão nova de dependência não quebre o `mypy` da API antes das jornadas.

## Pendências fora deste repositório

O reinício da API e o cadastro no emissor vivem no harness do `bancaemdia-api` (`tests/identity/journey.py` e o compose do emissor). A correção deles — esperar a porta e a prontidão reais, registrar a saída do processo sanitizada e criar o usuário sem ações obrigatórias — pertence ao backend; ao integrar, atualizar o pin em `config/api-contract.json`.
