# 腾讯云微信小程序服务端 SDK - Node.js

[![NPM Version][npm-image]][npm-url]
[![Minimum Node.js Version][nodejs-image]][nodejs-url]
[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]
[![License][license-image]][license-url]

本 SDK 需要和 [微信小程序客户端腾讯云增强 SDK](https://github.com/tencentyun/weapp-client-sdk) 配合一起使用，提供的服务有：

+ 登录鉴权服务
+ 信道服务

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
    const tunnelService = new TunnelService(req, res);
    const handler = new TunnelHandler();

    tunnelService.handle(handler, { 'checkLogin': true });
});

app.listen(80);
```

### 详细示例

参见项目：[腾讯云微信小程序服务端 DEMO - Node.js](https://github.com/tencentyun/weapp-node-server-demo)

## LICENSE

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/qcloud-weapp-server-sdk.svg
[npm-url]: https://npmjs.org/package/qcloud-weapp-server-sdk
[nodejs-image]: https://img.shields.io/badge/Node.js-%3E%3D%204.0-669B64.svg
[nodejs-url]: https://nodejs.org/
[travis-image]: https://travis-ci.org/tencentyun/weapp-node-server-sdk.svg?branch=master
[travis-url]: https://travis-ci.org/tencentyun/weapp-node-server-sdk
[coveralls-image]: https://coveralls.io/repos/github/tencentyun/weapp-node-server-sdk/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/tencentyun/weapp-node-server-sdk?branch=master
[license-image]: http://img.shields.io/npm/l/qcloud-weapp-server-sdk.svg
[license-url]: LICENSE
