# Server-Backend-Interface

![GitHub top language](https://img.shields.io/github/languages/top/Pigeon-Server/Server-Backend-Interface)&nbsp;
![GitHub License](https://img.shields.io/github/license/Pigeon-Server/Server-Backend-Interface)&nbsp;

集成式服务后端，用来处理各种操作请求   
Express + Typescript + Sequelize + Mysql

## 如何使用 Usage

```shell
# 首先克隆本仓库到本地
git clone https://github.com/Pigeon-Server/Server-Backend-Interface.git
# 进入仓库目录
cd erver-Backend-Interface
```

### 通过Nodejs运行

```shell
# 请确保已经安装了nodejs解释器
# 安装依赖
npm install
# 构建js文件并启动服务器
npm run start:build
```

### 通过docker-compose运行

1.请确保已经安装了docker  
2.将文件夹中的 `.env-example` 文件 重命名为 `.env` 文件  
3.修改 `.env` 里一些关键内容, 比如***Mysql***密码  
4.如果你想自行编译镜像并运行, 请注释 `docker-compose.yml` 中如下内容

```yaml
image: halfnothing/pigeon-server-sbi:${SBI_VERSION}
```

并取消如下内容的注释

```yaml
build:
  dockerfile: Dockerfile
```

5.运行命令构建docker容器

``` shell
docker compose up -d
```

### 通过docker运行
1.请确保已经安装了docker
2.构建容器镜像
```shell
# sbi:latest 中冒号前面的内容，可以任意更换
docker build -t sbi:latest .
```
3.运行容器
```shell
# 目录挂载请自行解决，如若不能解决，请使用docker-compose运行
# mysql服务请自行搭建，如若不能解决，请使用docker-compose运行
docker run --name server-backend-interface -d -p 80:80 sbi:latest
```

## API 文档

详见[API文档](https://qtr3d8wlp7.apifox.cn)
