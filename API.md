## 目录

- [命名空间](#命名空间)
- [SDK 配置](#sdk-配置)
- [登录鉴权服务](#登录鉴权服务)
- [信道服务](#信道服务)

## 命名空间

```js
const qcloud = require('qcloud-weapp-server-sdk');
```

## SDK 配置

### qcloud.config(options)

该方法用于初始化 SDK 需要使用的各种配置项，需先于其他 API 调用。

##### 参数

- `options` 支持的配置选项如下：
    - `ServerHost` - 指定使用本 SDK 的业务服务器的主机名，如 `www.qcloud.la`，该主机需要外网可访问
    - `AuthServerUrl` - 指定鉴权服务器服务地址，如 `http://mina.auth.com`
    - `TunnelServerUrl` - 指定信道服务器服务地址，如 `https://ws.qcloud.com`
    - `TunnelSignatureKey` - 指定和信道服务通信的签名密钥，如 `9f338d1f0ecc37d25ac7b161c1d7bf72`，该密钥需要保密

##### 返回值

`undefined`

### qcloud.config.setNetworkTimeout(millseconds: int)

该方法用于设置网络请求超时时长（单位：毫秒），默认值为 30,000 毫秒，即 30 秒。

##### 参数

- `millseconds` - 网络请求超时时长

##### 返回值

`undefined`

## 登录鉴权服务

### Class: qcloud.LoginService

#### new LoginService(req, res)

登录鉴权服务构造函数，用于实例化处理登录鉴权服务的对象。

##### 参数

- `req` - `http.IncomingMessage` 实例化对象
- `res` - `http.ServerResponse` 实例化对象

##### 返回值

`LoginService` 实例化对象

#### LoginService#login([callback])

`LoginService` 实例方法，用于处理用户登录。

##### 参数

- `callback(err, result)` - 回调函数（可选）
    - `err` - 登录失败时，`err` 为 `Error` 实例（包含登录失败原因），否则为 `null`
    - `result` - 登录成功时，`result` 为普通对象（包含微信用户信息 `userInfo`），否则为 `undefined`

##### 返回值

当调用本方法时传递了 `callback` 回调函数，返回 `undefined`，否则返回 `Promise` 对象。

#### LoginService#check([callback])

`LoginService` 实例方法，用于处理用户登校验登录态。

##### 参数

- `callback(err, result)` - 回调函数（可选）
    - `err` - 登录失败时，`err` 为 `Error` 实例（包含登录失败原因），否则为 `null`
    - `result` - 登录成功时，`result` 为普通对象（包含微信用户信息 `userInfo`），否则为 `undefined`

##### 返回值

当调用本方法时传递了 `callback` 回调函数，返回 `undefined`，否则返回 `Promise` 对象。

## 信道服务

### Class: qcloud.TunnelService

#### new TunnelService(req, res)

信道服务构造函数，用于实例化处理信道请求的对象。

##### 参数

- `req` - `http.IncomingMessage` 实例化对象
- `res` - `http.ServerResponse` 实例化对象

##### 返回值

`TunnelService` 实例化对象

#### TunnelService#handle(tunnelHandler[, options])

`TunnelService` 实例方法，用于处理信道请求。该方法会同时处理 `GET` 和 `POST` 请求，当处理 `POST` 请求时，依赖外部将已解析好的 `application/json` 媒体类型的数据传入，默认直接从 `req.body` 取值。

##### 参数

- `tunnelHandler` - 该参数为信道请求事件处理对象（可以为普通对象，也可以是类实例化对象），该对象需至少包含 `onRequest`、`onConnect`、`onMessage`、`onClose` 4个事件方法

- `options` - 该参数支持的可选配置如下：
    - `checkLogin` - 是否校验登录态（默认为 `false`）
    - `getBody()` - 获取解析 `application/json` 后的 `data`（默认为 `req.body`）

##### 返回值

`undefined`

##### 示例

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

#### TunnelService.broadcast(tunnelIds: string[], messageType: string, messageContent: any)

`TunnelService` 静态方法，用于广播消息到多个信道。

##### 参数

- `tunnelIds` - 要广播消息的信道 ID 列表（必填）
- `messageType` - 要广播消息的消息类型（必填）
- `messageContent` - 要广播消息的消息内容（必填）

##### 返回值

`Promise` 对象

##### 示例

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

#### TunnelService.emit(tunnelId: string, messageType: string, messageContent: any)

`TunnelService` 静态方法，用于发送消息到指定信道。

##### 参数

- `tunnelId` - 要发送消息的信道 ID（必填）
- `messageType` - 要发送消息的消息类型（必填）
- `messageContent` - 要发送消息的消息内容（必填）

##### 返回值

`Promise` 对象

#### TunnelService.closeTunnel(tunnelId: string)

`TunnelService` 静态方法，用于关闭指定信道。

##### 参数

- `tunnelId` - 要关闭的信道 ID（必填）

##### 返回值

`Promise` 对象