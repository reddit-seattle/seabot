FROM node:22-alpine AS build

ARG environment=development

WORKDIR /app

# Deps
COPY package*.json ./
RUN npm ci

# Build
COPY . .
RUN npm run container:$environment

# Stage
FROM node:22-alpine AS production
WORKDIR /app

# Create data dir
RUN mkdir -p /app/data

# copy build artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# we're lawyers
ENV NODE_ENV=production

# try to be safe
RUN addgroup -g 1001 -S nodejs && \
    adduser -S seabot -u 1001 -G nodejs
RUN chown -R seabot:nodejs /app
USER seabot

# Expose my port
EXPOSE 8080


# lfg
CMD ["node", "dist/seabot.js"]