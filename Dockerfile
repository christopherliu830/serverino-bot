FROM node:18 as builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install --immutable

COPY . .

RUN yarn build 

ENV NODE_ENV="production"
EXPOSE 8080

CMD yarn start
