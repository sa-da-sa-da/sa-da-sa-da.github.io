# .ide/Dockerfile
# 可根据需要指定基础镜像
FROM node:22

# 安装 ssh 服务，用于支持 VSCode 客户端通过 Remote-SSH 访问开发环境
RUN apt-get update && apt-get install -y openssh-server