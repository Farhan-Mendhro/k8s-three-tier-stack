FROM alpine:3.20 AS builder
WORKDIR /app
COPY index.html config.js ./

FROM nginxinc/nginx-unprivileged:alpine
COPY --from=builder /app /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]