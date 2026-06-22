FROM node:18-alpine

# 创建应用目录
WORKDIR /usr/src/app

# 安装项目依赖
COPY package*.json ./
RUN npm install

# 复制源码并构建
COPY . .
RUN npm run build

# 微信云托管标准暴露端口 80
EXPOSE 80

CMD [ "npm", "start" ]
