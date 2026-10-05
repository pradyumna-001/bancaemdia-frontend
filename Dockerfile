# Multi-stage: build (node/pnpm) → serve (nginx não-root)

FROM node:24-alpine AS build
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM nginx:1.27-alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx oficial já roda workers como usuário nginx; sobe o master sem root
# escutando em porta não-privilegiada.
RUN sed -i '/^user  nginx;/d' /etc/nginx/nginx.conf \
  && mkdir -p /var/cache/nginx/client_temp /run \
  && chown -R nginx:nginx /var/cache/nginx /run /usr/share/nginx/html
USER nginx

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
