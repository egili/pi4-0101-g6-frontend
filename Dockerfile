FROM node:18-slim
WORKDIR /app
COPY config/package*.json ./
RUN npm install
COPY config/ .
COPY src/ ./public/
EXPOSE 3000
CMD ["npm", "start"]
