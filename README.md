# 腾讯云微信小程序服务端 SDK - Node.js

本 SDK 需要和 [微信小程序客户端腾讯云增强 SDK](https://github.com/CFETeam/weapp-client-sdk) 配合一起使用，提供的服务有：

+ 登录鉴权服务
+ 信道服务

## 安装

```sh
npm install qcloud-weapp-server-sdk
```

> 本 SDK 支持 Node.js v4.0.0 以上的版本

## 使用示例

### 初始化 SDK 配置项

```js
const qcloud = require('qcloud-weapp-server-sdk');

qcloud.config({
    ServerHost: '业务服务器的主机名',
    AuthServerUrl: '鉴权服务器地址',
    TunnelServerUrl: '信道服务器地址',
    TunnelSignatureKey: '通信签名密钥',
});
```

### 样例 1：使用 `LoginService.login()` 处理用户登录

需要指定单独的路由处理用户登录，如 `https://www.qcloud.la/login`

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
```

### 样例 3：使用 `TunnelService.handle()` 处理信道请求

需要指定单独的路由处理信道请求，如 `https://www.qcloud.la/tunnel`

```js
const express = require('express');
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

// 处理信道请求
// 信道需同时处理 `GET` 和 `POST` 请求，为了方便这里使用 `all` 方法
app.all('/tunnel', (req, res) => {
    const loginService = new LoginService(req, res);
    const handler = new TunnelHandler();

    loginService.handle(handler, { 'checkLogin': true });
});
```

## API

### 命名空间

```js
const qcloud = require('qcloud-weapp-server-sdk');
```

### SDK 配置

#### qcloud.config(options)

该方法用于初始化 SDK 需要使用的各种配置项，需先于其他 API 调用。

###### 参数

- `options` 支持的配置选项如下：
    - `ServerHost` - 指定使用本 SDK 的业务服务器的主机名，如 `www.qcloud.la`，该主机需要外网可访问
    - `AuthServerUrl` - 指定鉴权服务器服务地址，如 `http://mina.auth.com`
    - `TunnelServerUrl` - 指定信道服务器服务地址，如 `https://ws.qcloud.com`
    - `TunnelSignatureKey` - 指定和信道服务通信的签名密钥，如 `27fb7d1c161b7ca52d73cce0f1d833f9f5b5ec89`，该密钥需要保密

###### 返回值

`undefined`

### 登录鉴权服务

#### Class: qcloud.LoginService

##### new LoginService(req, res)

登录鉴权服务构造函数，用于实例化处理登录鉴权服务的对象。

###### 参数

- `req` - `http.IncomingMessage` 实例化对象
- `res` - `http.ServerResponse` 实例化对象

###### 返回值

`LoginService` 实例化对象

##### LoginService#login([callback])

`LoginService` 实例方法，用于处理用户登录。

###### 参数

- `callback(err, result)` - 回调函数（可选）
    - `err` - 登录失败时，`err` 为 `Error` 实例（包含登录失败原因），否则为 `null`
    - `result` - 登录成功时，`result` 为普通对象（包含微信用户信息 `userInfo`），否则为 `undefined`

###### 返回值

当调用本方法时传递了 `callback` 回调函数，返回 `undefined`，否则返回 `Promise` 对象。

##### LoginService#check([callback])

`LoginService` 实例方法，用于处理用户登校验登录态。

###### 参数

- `callback(err, result)` - 回调函数（可选）
    - `err` - 登录失败时，`err` 为 `Error` 实例（包含登录失败原因），否则为 `null`
    - `result` - 登录成功时，`result` 为普通对象（包含微信用户信息 `userInfo`），否则为 `undefined`

###### 返回值

当调用本方法时传递了 `callback` 回调函数，返回 `undefined`，否则返回 `Promise` 对象。

### 信道服务

#### Class: qcloud.TunnelService

##### new TunnelService(req, res)

信道服务构造函数，用于实例化处理信道请求的对象。

###### 参数

- `req` - `http.IncomingMessage` 实例化对象
- `res` - `http.ServerResponse` 实例化对象

###### 返回值

`TunnelService` 实例化对象

##### TunnelService#handle(tunnelHandler[, options])

`TunnelService` 实例方法，用于处理信道请求。

###### 参数

- `tunnelHandler` - 该参数为信道请求事件处理对象（可以为普通对象，也可以是类实例化对象），该对象需至少包含 `onRequest`、`onConnect`、`onMessage`、`onClose` 4个事件方法

- `options` - 该参数支持的可选配置如下：
    - `checkLogin` - 是否校验登录态（默认为 `false`）

###### 返回值

`undefined`

###### 示例

假设 `tunnelHandler` 为类 `TunnelHandler` 的实例化对象，一种可能的实现方式大致如下：

```js
class TunnelHandler {
    /*----------------------------------------------------------------
     * 在客户端请求 WebSocket 信道连接之后会调用该方法
     * 此时可以把信道 ID 和用户信息关联起来
     *----------------------------------------------------------------
     * @param String tunnelId  信道 ID
     * @param Array  userInfo  微信用户信息
     *----------------------------------------------------------------
     */
    onRequest(tunnelId, userInfo) {
        // TODO: add logic here
    }

    /*----------------------------------------------------------------
     * 在客户端成功连接 WebSocket 信道服务之后会调用该方法
     * 此时可以通知所有其它在线的用户当前总人数以及刚加入的用户是谁
     *----------------------------------------------------------------
     * @param String tunnelId  信道 ID
     *----------------------------------------------------------------
     */
    onConnect(tunnelId) {
        // TODO: add logic here
    }

    /*----------------------------------------------------------------
     * 客户端推送消息到 WebSocket 信道服务器上后会调用该方法
     * 此时可以处理信道的消息
     *----------------------------------------------------------------
     * @param String tunnelId  信道 ID
     * @param String type      消息类型
     * @param Any    content   消息内容
     *----------------------------------------------------------------
     */
    onMessage(tunnelId, type, content) {
        // TODO: add logic here
    }

    /*----------------------------------------------------------------
     * 客户端关闭 WebSocket 信道或者被信道服务器判断为已断开后会调用该方法
     * 此时可以进行清理及通知操作
     *----------------------------------------------------------------
     * @param String tunnelId  信道 ID
     *----------------------------------------------------------------
     */
    onClose(tunnelId) {
        // TODO: add logic here
    }
}
```

> 当 `checkLogin` 为 `false` 时，传递给 `TunnelHandler#onRequest` 的参数 `userInfo` 值为 `null`。

##### TunnelService.broadcast(tunnelIds: string[], messageType: string, messageContent: any)

`TunnelService` 静态方法，用于广播消息到多个信道。

###### 参数

- `tunnelIds` - 要广播消息的信道 ID 列表（必填）
- `messageType` - 要广播消息的消息类型（必填）
- `messageContent` - 要广播消息的消息内容（必填）

###### 返回值

`Promise` 对象

###### 示例

```js
const tunnelIds = ['tunnelId-1', 'tunnelId-2'];
const messageType = 'speak';
const messageContent = { 'who': 'john', 'word': 'hello' };

TunnelService.broadcast(tunnelIds, messageType, messageContent)
    .then(result => {
        // 消息广播成功

        // 广播消息时无效的信道 IDs
        const invalidTunnelIds = result.data.invalidTunnelIds;

        // `tunnelIds`中 存在无效的信道 IDs
        const hasInvalidTunnelIds = !!invalidTunnelIds.length;
    })
    .catch(err => {
        // 消息广播失败

        // 失败错误码
        console.log('code', err.code);

        // 失败错误消息
        console.log('message', err.message);
    });
```

##### TunnelService.emit(tunnelId: string, messageType: string, messageContent: any)

`TunnelService` 静态方法，用于发送消息到指定信道。

###### 参数

- `tunnelId` - 要发送消息的信道 ID（必填）
- `messageType` - 要发送消息的消息类型（必填）
- `messageContent` - 要发送消息的消息内容（必填）

###### 返回值

`Promise` 对象

##### TunnelService.closeTunnel(tunnelId: string)

`TunnelService` 静态方法，用于关闭指定信道。

###### 参数

- `tunnelId` - 要关闭的信道 ID（必填）

###### 返回值

`Promise` 对象

## 附：信道服务交互流程图

![信道服务流程图](http://easyimage-10028115.file.myqcloud.com/internal/ozy5zc4q.njb.jpg)

## LICENSE

[MIT](LICENSE)