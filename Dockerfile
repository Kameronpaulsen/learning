FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install
COPY server.js ./
EXPOSE 8080

CMD npm start