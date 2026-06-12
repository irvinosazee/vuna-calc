# Stage 1: build the static calculator (runs lint + tests + build)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run lint && npm test && npm run test:unit && npm run typecheck && npm run build

# Stage 2: serve the built site with nginx
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
