FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build Vite frontend
RUN npm run build

# Expose port
EXPOSE 7860
ENV PORT=7860
ENV NODE_ENV=production

# Start server
CMD ["node", "./node_modules/tsx/dist/cli.mjs", "api/index.ts"]
