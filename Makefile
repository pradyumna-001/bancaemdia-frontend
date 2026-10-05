# Makefile — bancaemdia-frontend (espelho do Makefile do backend)

.DEFAULT_GOAL := help

.PHONY: help install dev lint format typecheck test test:e2e build gen-types up down

help:
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependências (pnpm)
	pnpm install

dev: ## Sobe o dev server (Vite)
	pnpm run dev

lint: ## ESLint + lint de paleta (cor só em tokens.css)
	pnpm run lint

format: ## Formata com Prettier
	pnpm run format

typecheck: ## TypeScript sem emitir
	pnpm run typecheck

test: ## Testes unitários (vitest)
	pnpm run test

test:e2e: ## Testes e2e (playwright)
	pnpm run test:e2e

build: ## Build de produção
	pnpm run build

gen-types: ## Gera src/api/schema.d.ts a partir do OpenAPI da API (ADR 003)
	pnpm run gen-types

up: ## Sobe frontend + API via docker compose
	docker compose up -d

down: ## Derruba os serviços do compose
	docker compose down
