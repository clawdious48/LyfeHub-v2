# LyfeHub v2 — PostgreSQL Dockerfile
# Multi-stage build for Node 20 Alpine

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files first (better layer caching)
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /build/backend
RUN npm ci --only=production

# Copy source files
WORKDIR /build
COPY backend ./backend
COPY frontend ./frontend

# ============================================
# Stage 2: Runtime
# ============================================
FROM node:20-alpine AS runtime

# Security: run as non-root user
RUN addgroup -g 1001 lyfehub && \
    adduser -u 1001 -G lyfehub -s /bin/sh -D lyfehub

# Create app directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=lyfehub:lyfehub /build/backend ./backend
COPY --from=builder --chown=lyfehub:lyfehub /build/frontend ./frontend

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Create uploads directory with correct ownership
RUN mkdir -p /data/uploads/tmp && chown -R lyfehub:lyfehub /data

# Switch to non-root user
USER lyfehub

# Health check - hits the API health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the server
WORKDIR /app/backend
CMD ["node", "src/index.js"]
