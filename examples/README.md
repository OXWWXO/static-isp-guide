# 配置示例：改哪些字段，怎么检查

[返回首页](../README.md) · [新手路线](../docs/getting-started.md) · [客户端操作](../docs/clash-verge.md)

本目录提供两种配置方式，选择其中一种：

- [clash-verge-script.js](clash-verge-script.js)：由 Clash Verge 的扩展脚本环境调用 `main(config)`，对已有订阅添加节点与规则。不要把它当作 `node` 命令行代理程序运行。
- [mihomo-chain.example.yaml](mihomo-chain.example.yaml)：独立的 Mihomo 配置，需要导入客户端或由内核加载。仅下载或用文本编辑器打开不会启动代理。

保留仓库里的原始示例；在本地副本里填自己的订阅和凭据。例如 `config.yaml` 或 `isp.local.js` 已被本仓库忽略规则覆盖，仍应在提交前检查 `git status --short`，避免误提交秘密。

## 扩展脚本填写示例

只修改文件顶部的 `ISP_SETTINGS`，保留下方 `main(config)`：

```javascript
const ISP_SETTINGS = {
  server: "isp.example.invalid", // 改为商家给的连接主机，不是网站地址
  port: 1080,                    // 改为商家的 SOCKS5 端口
  username: "CHANGE_ME",         // 改为代理用户名
  password: "CHANGE_ME",         // 改为代理密码
  entryNodes: ["入口A"],         // 改为原订阅 proxies 中准确的节点 name
  entryProviders: [],
  extraDomains: []
};
```

上述仍是占位示例，不能直接连接。字符串保留引号，数组项之间用逗号；不要使用中文引号。用户名密码使用原始值，若含双引号或反斜杠，按 JavaScript 字符串语法转义，不做 URI 的百分号编码。

JS 与 YAML 示例均按 SOCKS5 配置，访问 HTTPS 网站不需要给 SOCKS5 节点添加 TLS。若商家提供 HTTP 代理，需按对应节点格式调整协议及端口；不能只换端口或凭目标网站协议猜测。实际入口兼容性与客服中继的验证边界见 [IPRoyal 案例](../docs/iproyal-relay-case-2026-10-16.md)。

| 字段 | 应填写的内容 | 不要填什么 |
| --- | --- | --- |
| `server` | 商家连接 IP 或主机名 | 完整 URI、商家首页、目标网站域名 |
| `port` | `1`～`65535` 的整数 | 带引号的字符串，或未经核对的 HTTP 端口 |
| `username` / `password` | 商家提供的代理认证信息 | 想当然地填商家网站的登录密码 |
| `entryNodes` | 原配置 `proxies` 中的准确 `name` | 策略组名、订阅 URL、只有显示含义但不存在的名称 |
| `entryProviders` | 原配置 `proxy-providers` 下的键名 | `rule-providers` 键名或 provider URL |
| `extraDomains` | 额外的域名，例如 `example.com` | URL、路径、规则文本或 `*.example.com` |

原订阅仅使用 provider 时，示例写法为 `entryNodes: [], entryProviders: ["cheap-entry"]`；其中 `cheap-entry` 必须替换为原配置真实键名。脚本支持两种入口来源，初次使用建议只选一种，方便检查。

保存并重新应用后，应该出现：

- `ISP-入口`：选择第一跳入口节点。
- `ISP-出口`：实际 SOCKS5 节点，`dialer-proxy` 指向 `ISP-入口`。
- `ISP-服务`：只包含 `ISP-出口`，目标域名规则指向该组。

脚本会管理以上三个名称，不要让自己的其他节点或策略组与它们重名。脚本不强制启用 DNS 或 TUN，也不切换客户端模式；应用后仍需在客户端选择规则模式，并按 [DNS 说明](../docs/clash-verge.md#dns)检查最终配置。

## 独立 YAML 替换表

把 `mihomo-chain.example.yaml` 复制为本地 `config.yaml`，编辑下面字段，再导入客户端：

| 路径 | 必须替换吗 | 说明 |
| --- | --- | --- |
| `proxy-providers.cheap-entry.url` | 是 | 能返回 Mihomo 代理节点 YAML 的订阅 URL，不是任意客户端订阅格式 |
| `proxies` 下 `ISP-出口.server` | 是 | 商家连接主机 |
| `proxies` 下 `ISP-出口.port` | 是，核对后填写 | 商家 SOCKS5 端口，示例的 1080 仅为占位 |
| `proxies` 下 `username` / `password` | 是 | 原始代理凭据，按 YAML 字符串语法加引号 |
| `mixed-port` | 按本地需要 | 示例为 7897，须避开占用端口；客户端可能接管该设置，以实际运行值为准 |
| `tun.enable` | 按需 | 默认 false；桌面程序不遵循系统代理时再按客户端文档配置 |

YAML 使用空格缩进，不使用 Tab。凭据可用单引号包裹；值中的单引号需要写成两个单引号，例如原值 `ab'cd` 写成 `'ab''cd'`。不要把凭据先做 URI 编码再填入字段。

默认 `MATCH,ISP-入口` 表示其他未命中域名规则的流量走入口；它不是完整的国内外分流配置。DNS bootstrap 也有独立路径，不能据此承诺全系统所有流量都经过 ISP。

有独立 Mihomo 可执行文件时，可先验证配置；在 Windows 当前目录运行：

```powershell
.\mihomo.exe -t -f .\config.yaml
```

macOS / Linux 对应 `mihomo -t -f ./config.yaml`。命令中的文件名按实际下载名称修改。校验可能需要读取或获取 provider；出错时区分配置语法、订阅格式和网络问题。校验成功不证明商家认证、实际连接或目标网站功能通过。

## 仓库自动检查覆盖到哪里

在仓库根目录使用 Node.js 运行：

```powershell
node tests/config.test.cjs
```

它检查脚本占位符、端口、入口/provider 引用、部分循环风险、固定出口、原规则/DNS 保留及重复应用行为。它不会替你连接真实代理，不验证商家流量规则，也不替代 Mihomo 的配置检查。最终以 [验收步骤](../docs/getting-started.md#完成后的验收)核对实际结果。
