FROM node:12.16.2

WORKDIR /app

COPY progDoc/. /app
COPY script.sh /app

RUN npm install

#EXPOSE 3000
CMD ./script.sh
#CMD npm start

