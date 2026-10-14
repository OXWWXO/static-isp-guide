// 仅在本地填写凭据。不要将填好的文件提交到公开仓库。
const ISP_SETTINGS = {
  server: "isp.example.invalid",
  port: 1080,
  username: "CHANGE_ME",
  password: "CHANGE_ME",
  entryNodes: ["CHANGE_ME"], // 原订阅真实节点名；不填策略组。
  entryProviders: [], // 或填 proxy-providers 键名，并清空 entryNodes。
  extraDomains: [] // 例如你实际使用的额外服务域名。
};

function main(config) {
  const s = ISP_SETTINGS;
  if (!config || typeof config !== "object") throw new Error("没有有效的订阅配置");
  if (!s.server || s.server.endsWith(".invalid") || !s.username || !s.password ||
      s.username === "CHANGE_ME" || s.password === "CHANGE_ME") {
    throw new Error("先填写真实 ISP 主机和凭据");
  }
  if (!Number.isInteger(s.port) || s.port < 1 || s.port > 65535) throw new Error("端口必须为 1–65535");
  const names = { entry: "ISP-入口", exit: "ISP-出口", service: "ISP-服务" };
  const managed = Object.values(names);
  const original = (config.proxies || []).filter(p => !managed.includes(p.name));
  const providers = config["proxy-providers"] || {};
  const nodes = [...new Set(s.entryNodes)];
  const uses = [...new Set(s.entryProviders)];
  if (!nodes.length && !uses.length) throw new Error("至少选择一个入口节点或 proxy-provider");
  nodes.forEach(name => {
    const p = original.find(p => p.name === name);
    if (!p || ["direct", "reject"].includes(p.type) || managed.includes(name)) {
      throw new Error("未知或不合适的入口节点：" + name);
    }
    if (p["dialer-proxy"]) throw new Error("入口已配置 dialer-proxy，请先检查是否形成循环：" + name);
  });
  uses.forEach(key => {
    if (!providers[key]) throw new Error("未知 proxy-provider：" + key);
    if (providers[key].override && providers[key].override["dialer-proxy"]) {
      throw new Error("provider 已带 dialer-proxy，请先核对链路：" + key);
    }
  });
  const domains = [...new Set([
    "chatgpt.com", "openai.com", "oaistatic.com", "oaiusercontent.com",
    "claude.ai", "claude.com", "anthropic.com", "claudeusercontent.com",
    ...s.extraDomains
  ])];
  domains.forEach(d => {
    if (typeof d !== "string" || !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(d)) {
      throw new Error("填写域名，不要填写 URL 或规则：" + d);
    }
  });
  config.proxies = [...original, {
    name: names.exit, type: "socks5", server: s.server, port: s.port,
    username: s.username, password: s.password, udp: false,
    "dialer-proxy": names.entry
  }];
  const entry = { name: names.entry, type: "select" };
  if (nodes.length) entry.proxies = nodes;
  if (uses.length) entry.use = uses;
  config["proxy-groups"] = [entry, {
    name: names.service, type: "select", proxies: [names.exit]
  }, ...(config["proxy-groups"] || []).filter(g => !managed.includes(g.name))];
  const addedRules = [];
  domains.forEach(d => {
    addedRules.push("AND,((NETWORK,UDP),(DST-PORT,443),(DOMAIN-SUFFIX," + d + ")),REJECT");
    addedRules.push("DOMAIN-SUFFIX," + d + "," + names.service);
  });
  config.rules = [...addedRules, ...(config.rules || []).filter(r => !addedRules.includes(r))];
  config.dns = config.dns || {};
  config.dns["default-nameserver"] = config.dns["default-nameserver"] || ["223.5.5.5"];
  config.dns["proxy-server-nameserver"] = config.dns["proxy-server-nameserver"] || ["https://dns.alidns.com/dns-query"];
  const policy = config.dns["nameserver-policy"] || {};
  domains.forEach(d => { policy["+." + d] = "https://1.1.1.1/dns-query#" + names.exit; });
  config.dns["nameserver-policy"] = policy;
  // 原订阅的 mode/DNS enable/TUN 均保留；在客户端选择规则模式并按需开启。
  return config;
}
