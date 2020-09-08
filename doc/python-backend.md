# Instructions for using `"FlairNLP (Py)"` scoring option
For `FlairNLP (Py)` scoring option a local python inference server needs to be running.
This requires some technical proficiency running commands in the terminal, and either 
being able to use docker, or being able to use local python.

> Note: After starting up, it takes a few seconds for the server to be ready to serve requests.

## Option 1: 🐳 Docker (simplest if you have docker)
> Requires: docker.

### To run interactively once (e.g. to try it out):
- ▶️ To start: `docker run -p 8000:8000 -it --rm artdgn/web-positiviser`
- ⏹️ To stop: just Ctrl+C in the terminal where you're running it.

### To run in detached and persistent mode (e.g. for ongoing usage):
- ▶️ To start: `docker run -p 8000:8000 -dit --restart unless-stopped --name web-positiviser artdgn/web-positiviser`
- ⏹️ To stop: `docker rm -f web-positiviser`.


## Option 2: 🐍 Local python option (e.g. for development)
> Requires: git, make, python.

1. Clone repo.
2. `make install` to create local virtual environment and install dependencies in it. 
3. ▶️ `make server` to run the server. ⏹️ Ctrl+C to stop.
