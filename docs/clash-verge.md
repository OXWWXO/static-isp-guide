# Clash Verge Rev：入口线路 + 静态 ISP

首次使用先看 [准备清单与操作顺序](getting-started.md)，填参数时对照 [示例字段说明](../examples/README.md)。本页分别介绍三种配置方式，选择一种完成后再验收。

![两跳接力：设备、入口、ISP 出口、网站](../assets/isp-chain.png)


配套入口参考：[VPN-suggestions](https://github.com/OXWWXO/VPN-suggestions)。先选最低成本但能稳定接入的月付线路，再买一个独享 ISP。先备份当前配置，保留可以恢复的原订阅。

## 图形界面配置

适用于官方文档所述 **Clash Verge Rev v2.4.5+**。使用原版旧 Clash Verge 的读者应先确认客户端和 Mihomo 支持这些功能。

1. 在“订阅”导入入口线路的订阅，先验证一个入口节点正常。
2. 右键该订阅 → **编辑节点**。填 ISP 商家提供的 SOCKS5 URI，例如 `socks5://USER:PASSWORD@isp.example.invalid:1080`。这个地址只是占位示例；不能直接使用。商家提供的 HTTP 端口和 SOCKS5 端口可能不同。
3. 用户名或密码含 `@`、`:`、`#`、`%` 等字符时，对 URI 中的凭据分别 URL 编码。不要把密码交给在线转换工具。下文 JS/YAML 中的字符串字段则使用原始凭据，不做 URL 编码。
4. 在支持链式编辑的代理页面，按顺序加入 **订阅入口节点 → ISP 出口节点**。入口在最上方，ISP 在最下方。界面布局以当前版本为准。
5. 将目标服务的策略组选择到这条链。确认域名规则实际命中了链；“添加节点”本身不会自动让所有网站走它。
6. 测试时可临时将全局组选择该链，但日常建议恢复规则模式，仅让指定服务走 ISP。全局组不能含自动回退到 DIRECT 或普通入口的选项。

最终顺序：`设备 → 加密入口 → ISP → 网站`。反过来配置，网站通常会看到普通入口的出口，达不到固定 ISP 落地目的。

若订阅没有目标服务策略组或对应规则，建议使用下方的全局扩展脚本添加域名分流；图形界面中建好代理链本身不会创建这些规则。

官方说明“编辑节点”中的自定义配置不会随订阅更新失效。不要直接修改下载的原始订阅 YAML 后假设下次更新仍保留。[官方教程](https://www.clashverge.dev/guide/proxy_chain.html)

## 全局扩展脚本

使用 [clash-verge-script.js](../examples/clash-verge-script.js)，不需要改写整个订阅。

1. 在文件顶部填写 ISP 的主机、SOCKS5 端口、用户名、密码。
2. `entryNodes` 填原订阅中一个或多个入口节点的**准确名称**；这是最容易理解的方式。
3. 如果原订阅仅使用 `proxy-providers`，把原配置中的 provider 键名填入 `entryProviders`，将 `entryNodes` 置为空数组。它必须是代理节点 provider，不是 rule-provider。不要填一个会反过来引用 ISP 的策略组。
4. 将修改后的全文放入“全局扩展脚本”，保存并重新应用订阅。也可以使用单订阅扩展脚本；不同版本菜单名称略有区别。
5. 在“代理”选择 `ISP-入口` 中的入口。`ISP-服务` 只含 `ISP-出口`，没有自动切换到其他出口。
6. 在规则模式下测试域名命中。默认示例覆盖部分 ChatGPT / Claude 网页域名；服务可能增加新域名，需要查看连接面板补齐。

脚本保留其他原订阅规则、DNS、TUN 设置；仅为列出的服务域名添加到 ISP 的 DNS policy，并把相关 UDP/443 拒绝规则放在域名规则前，促使浏览器对这些域名使用 TCP HTTPS。它不等于所有应用、所有 IPv6、所有 DNS 路径的泄漏防护。

如果脚本被用于多个订阅，全局脚本会对每个订阅执行：节点名称不一致会报错。这时给每份订阅分别配置，或使用一致的 provider 键名。

全局脚本之后还可能执行订阅扩展，覆盖它添加的字段。检查最终配置；若有冲突，把本脚本放在订阅扩展脚本中。客户端设置接管的 `mode`、端口和部分 TUN 字段以设置页为准。[扩展顺序和优先级](https://www.clashverge.dev/guide/extend.html)

## 独立 YAML 模板

[mihomo-chain.example.yaml](../examples/mihomo-chain.example.yaml)是独立配置。替换订阅 URL、ISP 主机和凭据后导入。它没有现成的国内直连规则集：最终 `MATCH` 走入口，因此一般网页也会经过入口。

模板的 provider 需要返回 Mihomo 代理节点 YAML，而不是商家网页或任意编码格式。客户端能自动转换的订阅，不代表 Mihomo provider 可以直接读取。

保留启用证书校验，不要为了连通随意添加 `skip-cert-verify: true`。SOCKS5 模板 `udp: false`，不假设商家支持 UDP。只有实际购买的产品支持 TLS / UDP 时才按官方参数开启。

### DNS

模板将目标服务 DNS 经 `https://1.1.1.1/dns-query#ISP-出口` 解析；代理节点主机名则使用独立 bootstrap 解析，避免“解析代理需要先连代理”的循环。bootstrap 使用公共 DNS，可能直接访问，它不代表全系统 DNS 不泄露。

扩展脚本在原订阅 DNS 基础上添加目标域名 policy，并在缺少 bootstrap 字段时补上基础值。原订阅有 fake-ip、复杂规则或 IPv6 时，请按 [Mihomo DNS 文档](https://wiki.metacubex.one/config/dns/)检查最终结果。原订阅禁用 DNS 时先配置并启用 DNS；脚本不会强制启用它。

### 浏览器、桌面端与命令行

- 浏览器：系统代理通常能接管 HTTP(S)，但要确认浏览器确实遵循系统代理，扩展没有覆盖它。
- 桌面端：有的客户端不遵循系统代理，必要时在 Clash Verge 启用服务模式和 TUN；TUN 需要系统权限，注意与其他 VPN 的路由冲突。
- 命令行：明确设置当前终端的代理变量。变量指向**本地 Mihomo 混合端口**，不是直接填 ISP，才能继续由规则和入口链转发。例如 Windows PowerShell：

```powershell
# 端口以 Clash Verge 实际设置为准；只作用于当前终端进程及其子进程。
$env:HTTP_PROXY = 'http://127.0.0.1:7897'
$env:HTTPS_PROXY = 'http://127.0.0.1:7897'
```

不是所有命令行工具都遵循这些变量。运行后在连接面板验证，不能仅因设置了变量就认定已接管。取消当前终端变量：`Remove-Item Env:HTTP_PROXY, Env:HTTPS_PROXY -ErrorAction SilentlyContinue`。

## 验证是否配置成功

1. 在“连接”查看目标请求：应命中 `ISP-服务`，链中使用 `ISP-出口` 和预期入口。
2. 临时用全局链或把 IP 检测域名加入 `extraDomains`，访问可信 IP 检测服务，确认它看到的出口与商家给出的**出口 IP**一致，然后撤销临时测试设置。
3. 连续刷新几次、重新连接，确认出口固定。普通入口切换时出口通常应不变；商家维护等事件另算。
4. 分别测试登录、普通消息、文件上传和实际客户端，记录失败的主机名和日志。不要发布账号、Cookie 或请求内容。
5. 更新一次入口订阅，重新验证 ISP 节点和规则仍在。

截图里的延迟测试仅说明测试 URL 响应情况，不证明吞吐量、完整网站可用性或账号安全。不要用 IP 评分替代实际服务测试。
