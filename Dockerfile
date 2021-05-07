FROM node:16

USER node
RUN mkdir /home/node/app
WORKDIR /home/node/app

COPY package*json ./
RUN npm ci --production

CMD ["node", "handler-standalone.js"]
