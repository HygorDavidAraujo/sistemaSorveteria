FROM node:18-alpine

# Install OpenSSL and bash
RUN apk add --no-cache openssl bash

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
