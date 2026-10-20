# 贡献指南

欢迎补充价格、实际用量规则和配置问题。提交时写清：

1. 查询日期与官网来源。
2. 国家、IPv4/IPv6、共享/独享、数量、期限。
3. 总支付金额、最低充值、税费、附加选项及续费价。
4. FUP 阈值、重置周期、超额带宽/并发与退款条件。
5. 实测方法、时间与地区。标清样本数量；可用首页不等于可用整个产品。

禁止提交真实凭据、订阅 URL、Cookie 和用户信息。商家推广必须披露，不接受用推广文章替代完整价格证据。用户投诉和品牌答复分开记录，避免把未经验证的指控写成事实。

配置变更运行 `node tests/config.test.cjs`，使用 Mihomo 做语法校验；涉及真实线路只在自己的授权环境下测试。价格变更附原页面，更新 README 的日期和备注。

## 文档检查

在仓库根目录运行 `python scripts/check_docs.py`（Python 3.9+），检查相对链接、章节锚点和 SVG。新增内容同时从首页或相关文档加入入口；配置改动继续执行上面的 Node.js 与 Mihomo 校验。

可以直接使用 [价格与资料更正](https://github.com/OXWWXO/static-isp-guide/issues/new?template=correction.yml) 或 [配置问题](https://github.com/OXWWXO/static-isp-guide/issues/new?template=experience.yml) 模板，分开填写观察结果和推测。
