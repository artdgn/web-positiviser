FROM python:3.6-slim

COPY requirements.txt .

RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

ENV APP_DIR=/app

ADD . ${APP_DIR}

WORKDIR ${APP_DIR}

CMD python server.py
# CMD gunicorn backend.api:app -b 0.0.0.0:8000 -k uvicorn.workers.UvicornWorker