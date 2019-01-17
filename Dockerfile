FROM node:11-alpine

ADD ./ /opt/app

WORKDIR /opt/app

RUN npm install

ENTRYPOINT ["node", "index.js"]
