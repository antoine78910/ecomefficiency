FROM node:20-alpine
WORKDIR /app
COPY package.json server.js config.js ./
COPY lib ./lib
RUN mkdir -p data
COPY public ./public
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
