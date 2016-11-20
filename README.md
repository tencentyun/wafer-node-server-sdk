# Wafer 服务端 SDK - Node.js

[![NPM Version][npm-image]][npm-url]
[![Minimum Node.js Version][nodejs-image]][nodejs-url]
[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]
[![License][license-image]][license-url]

本项目是 [Wafer](https://github.com/tencentyun/wafer) 组成部分，以 SDK 的形式为业务服务器提供以下服务：

+ [会话服务](https://github.com/tencentyun/wafer/wiki/会话服务)
+ [信道服务](https://github.com/tencentyun/wafer/wiki/信道服务)

## 安装

```sh
npm install qcloud-weapp-server-sdk --save
```

## API

参见 [API 文档](./API.md)

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

### 使用会话服务

#### 处理用户登录请求

业务服务器提供一个路由（如 `/login`）处理客户端的登录请求，直接使用 SDK 的 [LoginService::login()](https://github.com/tencentyun/wafer-node-server-sdk/blob/master/API.md#loginservicelogincallback) 方法即可完成登录处理。登录成功后，可以获取用户信息。


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

#### 检查请求登录态

客户端交给业务服务器的请求，业务服务器可以通过 SDK 的 [LoginService::check()](https://github.com/tencentyun/wafer-node-server-sdk/blob/master/API.md#loginservicecheckcallback) 方法来检查该请求是否包含合法的会话。如果包含，则会返回会话对应的用户信息。

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

阅读 Wafer Wiki 文档中的[会话服务](https://github.com/tencentyun/wafer/wiki/%E4%BC%9A%E8%AF%9D%E6%9C%8D%E5%8A%A1)了解更多关于会话服务的技术资料。

### 使用信道服务

业务在一个路由上（如 `/tunnel`）提供信道服务，只需把该路由上的请求都交给 SDK 的信道服务处理即可。

```js
const express = require('express');
const bodyParser = require('body-parser');
const TunnelService = require('qcloud-weapp-server-sdk').TunnelService;
const app = express();

class TunnelHandler {
    // TODO: 处理 onRequest 事件，
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
    const tunnelService = new TunnelService(req, res);
    const handler = new TunnelHandler();

    tunnelService.handle(handler, { 'checkLogin': true });
});

app.listen(80);
```

使用信道服务需要实现处理器，来获取处理信道的各种事件，具体可参考配套 Demo 中的 [ChatTunnelHandler](https://github.com/tencentyun/wafer-node-server-demo/blob/master/business/chat-tunnel-handler.js) 的实现。

阅读 Wafer Wiki 中的[信道服务](https://github.com/tencentyun/wafer/wiki/%E4%BF%A1%E9%81%93%E6%9C%8D%E5%8A%A1)了解更多解决方案中关于信道服务的技术资料。

### 详细示例

参见项目：[Wafer 服务端 DEMO - Node.js](https://github.com/tencentyun/wafer-node-server-demo)

## LICENSE

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/qcloud-weapp-server-sdk.svg
[npm-url]: https://npmjs.org/package/qcloud-weapp-server-sdk
[nodejs-image]: https://img.shields.io/badge/Node.js-%3E%3D%204.0-669B64.svg
[nodejs-url]: https://nodejs.org/
[travis-image]: https://travis-ci.org/tencentyun/wafer-node-server-sdk.svg?branch=master
[travis-url]: https://travis-ci.org/tencentyun/wafer-node-server-sdk
[coveralls-image]: https://coveralls.io/repos/github/tencentyun/wafer-node-server-sdk/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/tencentyun/wafer-node-server-sdk?branch=master
[license-image]: https://img.shields.io/github/license/tencentyun/wafer-node-server-sdk.svg
[license-url]: LICENSE
