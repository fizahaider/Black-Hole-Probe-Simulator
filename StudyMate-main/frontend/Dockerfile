FROM node:22-alpine
LABEL maintainer="bsef22m525@pucit.edu.pk, bsef22m508@pucit.edu.pk, bsef22m517@pucit.edu.pk"


WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN adduser --disabled-password --no-create-home node-user && \
    chown -R node-user:node-user /app && \
    chmod -R 755 /app

USER node-user
EXPOSE 5173