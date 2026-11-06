# Márcia Atelier de Bolos & Macarons

# Sistema Inteligente de Gestão e Planejamento de Produção para Confeitarias Artesanais

Projeto desenvolvido por **José Marcos Zoz Marques** — Engenharia de Software, Centro Universitário Católica de Santa Catarina.

## Sobre o projeto

Confeitarias artesanais geralmente controlam pedidos por meio de anotações manuais ou planilhas, o q:
# Sistema Inteligente de Gestão e Planejamento de Produção para Confeitarias Artesanais

Projeto desenvolvido por **José Marcos Zoz Marques** — Engenharia de Software, Centro Universitário Católica de Santa Catarina.

## Sobre o projeto

Confeitarias artesanais geralmente controlam pedidos por meio de anotações manuais ou planilhas, o que dificulta o planejamento da produção e causa atrasos e desperdício de ingredientes.

Este projeto propõe um **sistema web** que gerencia pedidos e calcula automaticamente a produção diária necessária, com base nas datas de entrega, receitas cadastradas e volume de pedidos.
:

Sistema web de gestão de pedidos e planejamento de produção.

Stack: React (frontend), Node.js + Express (backend), MySQL, autenticação JWT.

## Estrutura

- `backend/` — API REST (porta 3001)
- `frontend/` — aplicação React (porta 3000)

## Pré-requisitos

- Node.js 18+
- MySQL rodando localmente na porta 3306

## Configuração do backend

```
cd backend
npm install
copy .env.example .env
```

Edite `.env` com as credenciais do seu MySQL local (usuário/senha).

Criar o banco de dados, tabelas e dados de exemplo (ingredientes, produtos e receitas):

```
npm run seed
```

Criar o primeiro usuário (login):

```
npm run create-admin -- "Márcia" marcia@atelier.com senha123
```

Subir a API:

```
npm start
```

## Configuração do frontend

```
cd frontend
npm install
npm start
```

Acesse http://localhost:3000 e entre com o usuário criado.

## Módulos

1. **Autenticação** — login com JWT, rotas protegidas.
2. **Clientes** — cadastro, busca e listagem.
3. **Pedidos** — cliente, itens (produto + quantidade), data de entrega e status.
4. **Produtos & Receitas** — cada produto tem preço, unidade, antecedência de produção e uma receita de ingredientes por unidade.
5. **Produção diária** — para uma data escolhida, agrupa os pedidos pela data de entrega (considerando a antecedência de cada produto) e calcula a quantidade de cada ingrediente necessária, comparando com o estoque.
6. **Dashboard** — produção do dia, próximos pedidos e estimativa de faturamento (pipeline futuro e mês atual).
