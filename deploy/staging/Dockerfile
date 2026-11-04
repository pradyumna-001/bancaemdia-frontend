# Package the approved CI artifact; never rebuild source during promotion.
FROM nginxinc/nginx-unprivileged:1.28.2-alpine
ARG FRONTEND_SHA
LABEL org.opencontainers.image.revision=$FRONTEND_SHA
COPY dist-security/default.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
