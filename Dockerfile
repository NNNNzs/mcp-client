# 使用Node.js官方镜像作为基础镜像
FROM node:20-slim

# 设置工作目录
WORKDIR /app

# 安装Python和pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# 复制package.json和package-lock.json（如果存在）
COPY package*.json ./

# 安装Node.js依赖
RUN npm install

# 复制TypeScript配置
COPY tsconfig.json ./

# 复制源代码
COPY src ./src

# 构建TypeScript
RUN npm run build

# 复制Python requirements.txt（如果存在）
COPY requirements.txt ./
RUN pip3 install -r requirements.txt

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"] 