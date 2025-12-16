# syntax=docker/dockerfile:1

# Build stage
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install all dependencies (including dev)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Production stage
FROM oven/bun:1.2-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and install production dependencies only
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile -p

# Copy source code from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/drizzle.config.ts ./

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (actual port is set via PORT env var)
EXPOSE 9006

# Health check with longer start period for container initialization
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD sh -c 'wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-9006}/api/v1/health || exit 1'

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=9006

# Start the server
CMD ["bun", "src/index.ts"]
