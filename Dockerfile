FROM node:lts-alpine3.12

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY app.js .
COPY ./data_setup/data.csv ./data_setup/data.csv

EXPOSE 8080
CMD [ "node", "app.js" ]
