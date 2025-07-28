# Multi-stage build for optimized production image
FROM node:18-alpine AS build

ARG environment=prod

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci --omit=dev

# Build the application
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install SQLite for better platform support
RUN apk add --no-cache sqlite

# Create data directory with proper permissions
RUN mkdir -p /app/data

# Copy built application and dependencies from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Set environment to production
ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S seabot -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R seabot:nodejs /app
USER seabot

# Expose port
EXPOSE 8080


# Start the application
CMD ["node", "dist/server.js"]