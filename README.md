# 腾讯云微信小程序服务端 SDK - Node.js

本 SDK 需要和 [微信小程序客户端腾讯云增强 SDK](https://github.com/CFETeam/weapp-client-sdk) 配合一起使用，提供的服务有：

+ 登录鉴权服务
+ 信道服务

## 安装

```sh
npm install qcloud-weapp-server-sdk --save
```

> 本 SDK 支持 Node.js v4.0.0 以上的版本

## 使用

### 初始化 SDK 配置项

```js
const qcloud = require('qcloud-weapp-server-sdk');

qcloud.config({
    ServerHost: '业务服务器的主机名',
    AuthServerUrl: '鉴权服务器地址',
    TunnelServerUrl: '信道服务器地址',
    TunnelSignatureKey: '和信道服务器通信的签名密钥',
});
```

### 样例 1：使用 `LoginService.login()` 处理用户登录

处理用户登录需要指定单独的路由，如 `https://www.qcloud.la/login`

```js
const express = require('express');
const LoginService = require('qcloud-weapp-server-sdk').LoginService;
const app = express();

app.get('/login', (req, res) => {
    const loginService = new LoginService(req, res);

    loginService.login().then(result => {
        console.log('微信用户信息', result.userInfo);
    });
});

app.listen(80);
```

### 样例 2：使用 `LoginService.check()` 处理业务 cgi 请求时校验登录态

```js
const express = require('express');
const LoginService = require('qcloud-weapp-server-sdk').LoginService;
const app = express();

// 获取用户信息
app.get('/user', (req, res) => {
    const loginService = new LoginService(req, res);

    loginService.check().then(result => {
        res.json({
            'code': 0,
            'message': 'ok',
            'data': {
                'userInfo': result.userInfo,
            },
        });
    });
});

app.listen(80);
```

### 样例 3：使用 `TunnelService.handle()` 处理信道请求

处理信道请求需要指定单独的路由，如 `https://www.qcloud.la/tunnel`

```js
const express = require('express');
const bodyParser = require('body-parser');
const TunnelService = require('qcloud-weapp-server-sdk').TunnelService;
const app = express();

class TunnelHandler {
    // TODO: 处理 onRequest 事件
    onRequest(tunnelId, userInfo) {}

    // TODO: 处理 onConnect 事件
    onConnect(tunnelId) {}

    // TODO: 处理 onMessage 事件
    onMessage(tunnelId, type, content) {}

    // TODO: 处理 onClose 事件
    onClose(tunnelId) {}
}

// parse `application/json`
app.use(bodyParser.json());

// 处理信道请求
// 信道需同时处理 `GET` 和 `POST` 请求，为了方便这里使用 `all` 方法
app.all('/tunnel', (req, res) => {
    const loginService = new LoginService(req, res);
    const handler = new TunnelHandler();

    loginService.handle(handler, { 'checkLogin': true });
});

app.listen(80);
```

### 详细示例

参见项目：[腾讯云微信小程序服务端 DEMO - Node.js](https://github.com/CFETeam/qcloud-weapp-server-demo-node)

## API

参见文档 [API.md](./API.md)

## 附：信道服务交互流程图

![信道服务流程图](http://easyimage-10028115.file.myqcloud.com/internal/ozy5zc4q.njb.jpg)

## LICENSE

[MIT](LICENSE)