FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# vite.config.ts sets server.host: true, so this binds 0.0.0.0 and is
# reachable from outside the container.
CMD ["npm", "run", "dev"]
