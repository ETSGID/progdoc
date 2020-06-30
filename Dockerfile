FROM node:12.16.2

WORKDIR /app

COPY progDoc/package*.json ./
RUN npm install

COPY progDoc/. .
COPY script.sh .

#EXPOSE 3000
CMD ./script.sh


