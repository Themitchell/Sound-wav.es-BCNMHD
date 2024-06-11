.PHONY: test

REVISION=$(shell git rev-parse --verify --short HEAD)

ifndef VERSION
VERSION=$(REVISION)
endif

ifndef ENV
ENV=development
endif

UID=$(shell id -u)

COMPANY_NAME=soundwaves
APP_NAME=bcnmhd
CONTAINER_NAME=${COMPANY_NAME}-${APP_NAME}-${ENV}
DOCKER_COMPOSE_CMD=env ENV=${ENV} UID=$(UID) docker compose -p ${CONTAINER_NAME}

run:
	$(DOCKER_COMPOSE_CMD) up

# test: export ENV=test
# test:
# 	$(DOCKER_COMPOSE_CMD) run --rm app npm test

# test-unit: export ENV=test
# test-unit:
# 	$(DOCKER_COMPOSE_CMD) run --rm app npm run test:unit

# lint: export ENV=test
# lint:
# 	$(DOCKER_COMPOSE_CMD) run --rm app npm run lint

# lint-fix: export ENV=test
# lint-fix:
# 	$(DOCKER_COMPOSE_CMD) run --rm app npm run lint:fix

shell:
	$(DOCKER_COMPOSE_CMD) run --rm app bash

stop:
	$(DOCKER_COMPOSE_CMD) stop app

build:
	$(DOCKER_COMPOSE_CMD) build

# build-assets:
# 	$(DOCKER_COMPOSE_CMD) run --rm app npm run compile

# create-network:
# 	docker network create core_api_default

implode:
	$(DOCKER_COMPOSE_CMD) rm

version:
	@echo ${VERSION}

name:
	@echo ${CONTAINER_NAME}
