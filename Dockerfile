FROM node:lts
LABEL authors="Half_nothing"

WORKDIR /opt/sbi

RUN npm config set registry https://mirrors.huaweicloud.com/repository/npm/

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 80

CMD ["npm", "run", "start:build"]