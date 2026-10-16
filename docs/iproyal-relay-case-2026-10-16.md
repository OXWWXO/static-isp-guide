# IPRoyal 美国 ISP：客服中继接通案例

记录日期：2026-10-16（北京时间）。单个用户、单个美国 ISP 出口的一次排查记录，不能推广为所有 IPRoyal 产品或机场的普遍表现。已移除真实 IP、账号密码、订阅 URL、订单与客服中继凭据。

## 最终结果

通过客服提供的 Shadowsocks 中继连接已购买的 SOCKS5 ISP 后，IP 查询确认最终出口与购买的 ISP 一致，Google 测试端点返回 HTTP 204。用户随后在浏览器中反馈可以访问此前无法打开的网站。

ChatGPT 命令行测试已能建立 HTTPS 连接，但返回 HTTP 403，响应正文为“Enable JavaScript and cookies to continue”。这与此前连接失败不同，也不等于已验证登录、发送消息、上传文件或长期稳定使用。不能把所有 403 都解释成人机验证，应检查每次实际响应。

## 对照测试

| 路径或测试 | 观察结果 | 能说明什么 |
| --- | --- | --- |
| 电脑直接连接 ISP | 曾成功查询出口，后续又出现连接超时；部分目标始终未成功 | 一次 IP 查询成功不足以保证这条线路稳定或目标网站可用 |
| 良心云节点单独连接 | 本次选取的香港、新加坡、日本节点均能访问 Google 测试端点，返回 204 | 这些入口在对应测试时本身可用；不是对所有节点的验证 |
| 良心云 → IPRoyal | 测试的 HTTP / SOCKS5 链路失败，出现连接关闭、重置或超时 | 入口能访问网页，不代表入口到 ISP 的连接一定可用 |
| 经一个已验证的良心云入口测试 HTTP 备选端口 | 12323、10323、11323、12325、12326、13323、14323、15323、22323 均未收到完整 ISP HTTP 代理响应 | 改用截图中的备选端口未解决本次连接问题；不代表端口对所有来源均失效 |
| 客服 Shadowsocks 中继单独连接 | IP 查询成功，Google 返回 204 | 客服入口可用，但此时不是购买的 ISP 出口 |
| 客服中继 → IPRoyal SOCKS5 | 出口核对成功，Google 返回 204，ChatGPT 返回上述 JavaScript / Cookie 提示 | 这条链路已连通，网站层与账号层仍需分别验证 |

测试使用 Windows curl、Clash/Mihomo 实际本地代理端口，并明确指定代理、取消该请求的 no-proxy 绕过。部分诊断另通过本地 HTTP CONNECT 建立到 ISP 端口的隧道，再检查 ISP 的响应。测试仅覆盖短时连接，没有吞吐量、晚高峰、UDP 或持续可用性测量。

## 为什么换客服中继后成功

已验证的差异是“前置入口变了，ISP 出口及其账号密码未变”。这支持优先检查入口到 ISP 之间的可达性、端口、来源访问限制、路由和链式兼容性。

**具体根因未确定。** 没有证据认定机场故意封锁其他代理，也没有证据认定 IPRoyal 封锁了某个机场来源，更不能根据底层连接错误认定 ChatGPT 封了 ISP IP。不能把本案例写成某个机场普遍不支持链式代理。

另一个排查教训：curl 的 TLS/SSL 报错可能由代理连接提前关闭引起。应结合 Mihomo 的内层错误区分“连不上入口 / ISP”“ISP 认证失败”和“目标网站返回 HTTP 错误”，不要只凭最外层错误判断。

## 配置中真正起作用的部分

以下仅是脱敏结构示例，域名和凭据均为占位符，不能直接使用。中继参数必须向服务商取得，不能从本案例推断其免费、永久有效或可公开共享。

```yaml
mixed-port: 7897
allow-lan: false
mode: rule
log-level: info

proxies:
  - name: support-relay
    type: ss
    server: relay.example.invalid
    port: 8443
    cipher: chacha20-ietf-poly1305
    password: "REPLACE_RELAY_PASSWORD"
    udp: false

  - name: isp-exit
    type: socks5
    server: isp.example.invalid
    port: 12324
    username: "REPLACE_ISP_USERNAME"
    password: "REPLACE_ISP_PASSWORD"
    udp: false
    dialer-proxy: support-relay

proxy-groups:
  - name: ISP-SERVICE
    type: select
    proxies:
      - isp-exit

rules:
  - IP-CIDR,127.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,10.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,172.16.0.0/12,DIRECT,no-resolve
  - IP-CIDR,192.168.0.0/16,DIRECT,no-resolve
  - MATCH,ISP-SERVICE
```

- `support-relay`：客服给的加密入口。地址、端口、密码、cipher 需要成套匹配。
- `isp-exit`：购买的 ISP 出口，HTTP 与 SOCKS5 的端口须按后台对应。
- **`dialer-proxy: support-relay`**：写在 ISP 节点内部，使 ISP 连接经过中继。只列出两个节点不会自动串联。
- 选择 `isp-exit` 后路径是：设备 → support-relay → ISP → 网站。没有必要在界面里同时“选中两个节点”。
- 仅选择中继会从中继出口访问，达不到使用购买的 ISP 出口的目的。示例策略组只提供 ISP，避免误选。
- 如果 ISP 节点的 `dialer-proxy` 指向一个选中 DIRECT 的入口组，表示直接连接 ISP，最终仍经过 ISP；如果网站规则本身选中 DIRECT，则绕过代理。两者不要混淆。
- 本地 `mixed-port` 与商家远程端口不同；客户端设置可能覆盖本地端口。本示例的最终 MATCH 让其他未匹配流量也经过 ISP；日常按需求加入分流规则。
- UDP 未经验证，因此示例关闭 UDP。客服原文件中的单节点 fallback 组未被主路径引用，没有产生主链自动回退效果。

Clash 界面中的 95、341 等数字是测速延迟，通常以毫秒计，不是 IP 地址、评分或速度。两跳延迟也不应简单按两项相加或相减计算。

## 后续遇到类似问题的顺序

1. 保存当前配置和策略组选择，先确认原入口本身可用。
2. 检查最终生成配置和连接面板，确认 ISP 的 dialer-proxy 指向预期入口，且没有形成循环。
3. 对照“入口单独访问”和“入口 → ISP”，同时核对最终出口。测试 DNS、模式和分流应保持可比。
4. 换入口、换端口一次只改变一个因素；失败时记录发生在哪一跳及具体错误。
5. 请 ISP 客服检查服务状态、认证方式、来源限制，必要时索取官方中继配置。
6. 拿到客服文件先检查字段与凭据，用自己的 Mihomo 校验后再测试；浏览器访问与账号功能另验。
7. 无需为了普通配置排查升级、重装 Clash 或重装系统服务。优先热加载，测试结束恢复原配置；不要把临时测试端口成功当成实际客户端已可用。
8. 复用入口组名时检查客户端是否恢复了旧的节点选择；本案例曾存在美国和日本配置使用相同组名的情况，但未证明这就是全部失败的原因。

## 官方参考

- [IPRoyal ISP 快速上手：协议、端口和认证](https://iproyal.com/quick-start-guides/static-residential-proxies/)
- [Mihomo dialer-proxy：出口通过指定入口连接](https://wiki.metacubex.one/config/proxies/dialer-proxy/)
- [通用故障排查](troubleshooting.md)
- [Clash Verge 配置指南](clash-verge.md)
