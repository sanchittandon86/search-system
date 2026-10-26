FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Compiles src/ to dist/ for the main app (npm start). The mock black-box
# services and migration/seed scripts run directly via ts-node (same as
# local dev - see package.json), so devDependencies are kept in this image
# rather than pruned.
RUN npm run build

EXPOSE 3100 4001 4002

CMD ["npm", "start"]
