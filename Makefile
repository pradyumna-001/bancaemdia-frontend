.DEFAULT_GOAL := install
PNPM ?= pnpm
API_DIR ?= ../bancaemdia-api
OPENAPI_SOURCE ?=

.PHONY: install dev lint typecheck test test\:e2e build gen-types up

install:
	$(PNPM) install --frozen-lockfile

dev:
	$(PNPM) dev

lint:
	$(PNPM) lint

typecheck:
	$(PNPM) typecheck

test:
	$(PNPM) test

test\:e2e:
	$(PNPM) test:e2e

build:
	$(PNPM) build

gen-types:
	$(PNPM) gen-types $(if $(OPENAPI_SOURCE),"$(OPENAPI_SOURCE)")

up:
	docker compose --project-directory "$(API_DIR)" --env-file "$(API_DIR)/.env" -f "$(API_DIR)/docker-compose.yml" up -d
	docker compose up -d --build
