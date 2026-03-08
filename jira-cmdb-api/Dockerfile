FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY src ./src
COPY data.json ./data.json

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
