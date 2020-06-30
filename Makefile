REPO_NAME=bad-news-fader
VENV_ACTIVATE=. .venv/bin/activate
PYTHON=.venv/bin/python
DOCKER_TAG=artdgn/$(REPO_NAME)
DOCKER_DATA_ARG=-v $(realpath ./data):/app/data
PORT=8000

.venv:
	python3 -m venv .venv

requirements: .venv
	$(VENV_ACTIVATE); \
	pip install -U pip;\
	pip install -U pip-tools; \
	pip-compile requirements.in

install: .venv
	$(VENV_ACTIVATE); \
	pip install -r requirements.txt

kill-server:
	pkill -f $(REPO_NAME)

server:
	$(VENV_ACTIVATE); \
	gunicorn backend.api:app --reload -k uvicorn.workers.UvicornWorker

build-docker:
	docker build -t $(DOCKER_TAG) .

push-docker: build-docker
	docker push $(DOCKER_TAG)

docker-bash: build-docker
	docker run --rm -it \
	$(DOCKER_DATA_ARG) \
	$(DOCKER_TIME_ARG) \
	-p $(PORT):$(PORT) \
	--name $(REPO_NAME) \
	$(DOCKER_TAG) bash

docker-server: build-docker
	docker run -dit \
	$(DOCKER_DATA_ARG) \
	$(DOCKER_TIME_ARG) \
	--name $(REPO_NAME) \
	-p $(PORT):$(PORT) \
	--restart unless-stopped \
	$(DOCKER_TAG) python server.py

docker-server-logs:
	docker logs $(REPO_NAME) -f