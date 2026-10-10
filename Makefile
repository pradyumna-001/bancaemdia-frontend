.DEFAULT_GOAL := install
PNPM ?= pnpm
TEST_ARGS ?=
API_DIR ?= ../bancaemdia-api
OPENAPI_SOURCE ?=

.PHONY: install dev lint typecheck test test\:coverage test\:e2e build check\:bundle measure\:lighthouse gen-types up

install:
	$(PNPM) install --frozen-lockfile

dev:
	$(PNPM) dev

lint:
	$(PNPM) lint

typecheck:
	$(PNPM) typecheck

test:
	$(PNPM) test $(TEST_ARGS)

test\:coverage:
	$(PNPM) test:coverage

test\:e2e:
	$(PNPM) test:e2e

build:
	$(PNPM) build

check\:bundle:
	$(PNPM) check:bundle

measure\:lighthouse:
	$(PNPM) measure:lighthouse

gen-types:
	$(PNPM) gen-types $(if $(OPENAPI_SOURCE),"$(OPENAPI_SOURCE)")

up:
	docker compose --project-directory "$(API_DIR)" --env-file "$(API_DIR)/.env" -f "$(API_DIR)/docker-compose.yml" up -d
	docker compose up -d --build
