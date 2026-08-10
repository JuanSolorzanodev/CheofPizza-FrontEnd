FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


FROM caddy:2-alpine

WORKDIR /app

RUN npm install -g npm@11.8.0

COPY Caddyfile /etc/caddy/Caddyfile

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
