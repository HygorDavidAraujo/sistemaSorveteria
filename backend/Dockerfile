FROM node:22-alpine

# Install OpenSSL and bash
RUN apk add --no-cache openssl bash

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod +x ./entrypoint.sh

# Build TypeScript for production runtime (dist/)
RUN npm run build

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
