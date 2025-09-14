FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for development)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY .env.example ./.env

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cinema -u 1001

# Change ownership of the app directory
RUN chown -R cinema:nodejs /app

# Switch to non-root user
USER cinema

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { \
    if (res.statusCode === 200) process.exit(0); else process.exit(1); \
  }).on('error', () => process.exit(1));"

# Start the application
CMD ["npm", "start"]