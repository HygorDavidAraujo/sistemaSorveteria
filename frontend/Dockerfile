# Development stage
FROM node:20-alpine

WORKDIR /app

# Install git (para desenvolvimento)
RUN apk add --no-cache git curl wget

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY eslint.config.js ./
COPY index.html ./

# Copy source code
COPY src ./src
COPY public ./public

# Install dependencies
RUN npm install

# Expose port
EXPOSE 5173

# Start the development server
CMD ["npm", "run", "dev"]
