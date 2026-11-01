FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm","run","dev","-w","server"]
