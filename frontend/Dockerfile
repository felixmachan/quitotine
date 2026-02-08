FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ARG VITE_COMMIT_OVERLAY_MS=5000
ARG VITE_COMMIT_HOLD_MS=5000
ARG VITE_ENVIRONMENT=development
ARG environment=development

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_COMMIT_OVERLAY_MS=$VITE_COMMIT_OVERLAY_MS \
    VITE_COMMIT_HOLD_MS=$VITE_COMMIT_HOLD_MS \
    VITE_ENVIRONMENT=$VITE_ENVIRONMENT \
    environment=$environment

COPY package*.json /app/
RUN npm ci

COPY . /app
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
