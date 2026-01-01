# Build stage
FROM node:22-alpine3.20 AS build

ARG environment=development
WORKDIR /app

# Install build dependencies and fonts
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    freetype-dev \
    fontconfig \
    font-noto \
    font-noto-cjk \
    font-noto-emoji \
    font-dejavu

COPY package*.json ./
RUN npm ci

# Copy source files and build
COPY . .
RUN npm run container:$environment

# Production stage
FROM node:22-alpine3.20 AS production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S seabot -u 1001 -G nodejs

RUN mkdir -p /app/data && chown -R seabot:nodejs /app/data

# Install runtime libraries and fonts
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    freetype \
    fontconfig \
    font-noto \
    font-noto-cjk \
    font-noto-emoji \
    font-dejavu

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/assets/ /app/assets/

# we're lawyers
ENV NODE_ENV=production

# Expose my port
EXPOSE 8080

# lfg
CMD ["node", "dist/seabot.js"]