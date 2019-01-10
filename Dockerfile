FROM node:8.11

ENV APP_PATH /opt/outline
RUN mkdir -p $APP_PATH

WORKDIR $APP_PATH

COPY package.json $APP_PATH
COPY yarn.lock $APP_PATH
RUN yarn install

COPY . $APP_PATH
RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]
