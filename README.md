# Server-Backend-Interface

## 同步配置说明

配置示例

```json5
{
  // 包名,与启动器内的整合包名称一定要一样
  "Create: Above and Beyond": {
    // 整合包存储根目录
    "basePath": "source/CAB",
    // 每个代表一个要同步的目录
    // 名字代表客户端的目录,比如config就是客户端的配置文件夹 
    "config": {
      // 模式可选push或者mirror,mirror为强制同步,删除不在列表内的文件
      "mode": "push",
      // 服务端的文件存放目录(会自动加上根目录,source/CAB/config)
      "serverPath": "config",
      // (可选)要忽略的文件或目录
      "ignore": [],
      // (可选)要在客户端删除的文件
      "delete": []
    },
    // (可选)单独同步的文件(客户端和服务端路径相同)
    "files": {
      "servers.dat": null
    }
  },
  // 忽略的key,一般不需要动
  "ignoredKey": [
    "init",
    "data",
    "files",
    "basePath",
    "md5",
    "publicKey"
  ]
}
```
