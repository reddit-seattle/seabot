FROM node:22-alpine AS build

ARG environment=development

WORKDIR /app

# Install build dependencies for canvas
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev

COPY package*.json ./
ENV PYTHON=python3
RUN npm ci

# Build
COPY . .
RUN npm run container:$environment

# Stage
FROM node:22-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S seabot -u 1001 -G nodejs

RUN mkdir -p /app/data && chown -R seabot:nodejs /app/data

# Install runtime libraries for canvas
RUN apk add --no-cache cairo jpeg pango giflib pixman

# copy build artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# we're lawyers
ENV NODE_ENV=production

# Expose my port
EXPOSE 8080

# lfg
CMD ["node", "dist/seabot.js"]