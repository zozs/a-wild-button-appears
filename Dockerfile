FROM node:18-slim

USER node
RUN mkdir /home/node/app
WORKDIR /home/node/app

COPY package*json ./
RUN npm ci --omit=dev

COPY . .

CMD ["node", "handler-standalone.js"]
