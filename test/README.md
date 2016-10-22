# 测试须知

## 运行测试服务器

测试用例的执行依赖测试服务器，执行测试用例前需运行测试服务器，测试服务器位于目录 `support/test-server` 下。 在 Windows 环境（依赖 `.NET Framework v4.5.2 或更高版本`）下双击（必要时可使用管理员身份运行）可执行文件 `QCloud.Weapp.TestServer.exe` 即可启动测试服务器，服务默认监听的端口号为 `9993`。

如遇端口冲突，可修改配置文件 `support/test-server/QCloud.Weapp.TestServer.exe.config`，将端口号 `9993` 修改为其他的端口号。修改端口号后，供测试使用的 SDK 配置文件 `support/sdk_config.json` 中指定的服务器 URL 的相应端口号也需同步修改。

## 执行测试用例

```sh
npm test
```