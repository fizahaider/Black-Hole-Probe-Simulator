FROM python:3.12-slim-bookworm

LABEL maintainer="bsef22m525@pucit.edu.pk, bsef22m508@pucit.edu.pk, bsef22m517@pucit.edu.pk"
ENV PYTHONUNBUFFERED=1

COPY ./requirements.txt /tmp/requirements.txt
COPY ./requirements.dev.txt /tmp/requirements.dev.txt
WORKDIR /app
EXPOSE 8000

ARG DEV=false
RUN python -m venv /py && \
    /py/bin/pip install --upgrade pip && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-client \
    libjpeg-dev \
    build-essential \
    libpq-dev \
    zlib1g-dev \
    libglib2.0-0 && \
    /py/bin/pip install torch --extra-index-url https://download.pytorch.org/whl/cpu && \
    /py/bin/pip install -r /tmp/requirements.txt && \
    if [ "$DEV" = "true" ]; then /py/bin/pip install -r /tmp/requirements.dev.txt; fi && \
    rm -rf /var/lib/apt/lists/* /tmp/* && \
    adduser --disabled-password --home /home/django-user django-user && \
    mkdir -p /vol/web/media && \
    mkdir -p /vol/web/static && \
    mkdir -p /vol/web/cache && \
    mkdir -p /ml_models && \
    chown -R django-user:django-user /vol && \
    chown -R django-user:django-user /home/django-user && \
    chown -R django-user:django-user /ml_models && \
    chmod -R 755 /vol && \
    chmod -R 755 /home/django-user && \
    chmod -R 755 /ml_models

ENV PATH="/py/bin:$PATH"
ENV HOME=/home/django-user
ENV HF_HOME=/ml_models/huggingface
ENV SENTENCE_TRANSFORMERS_HOME=/ml_models/sentence_transformers

# Pre-download models during build
COPY download_models.py /tmp/download_models.py
RUN /py/bin/python /tmp/download_models.py && \
    chown -R django-user:django-user /ml_models && \
    chmod -R 755 /ml_models

# Copy application code last to maximize caching
COPY ./app /app
RUN chown -R django-user:django-user /app

USER django-user

CMD ["sh", "-c", "python manage.py wait_for_db && python manage.py migrate && daphne -b 0.0.0.0 -p ${PORT:-8000} core.asgi:application"]
