# v5.20 阶段发布测试报告

测试日期：2026-07-18

## 数据与核心功能

- Cornell Fall 2026 LL.M. 规划库保留 134 门官方实际开课候选课程；课程数据仍以内置静态文件只读发布。
- 课表、班次选择、地点修改、推荐偏好、自建课程和外校导入均保存于访问者浏览器的 `localStorage`。
- 正常刷新或重新打开同一域名会保留课表；不同设备、浏览器配置文件和域名不共享。多人共用同一浏览器用户资料时会看到同一份本地数据。
- “我的课表”提供 JSON 备份与恢复；恢复前要求确认，写入失败会回滚到恢复前数据。

## Cloudflare Pages

- `wrangler.toml` 未配置 KV、D1、R2、Durable Objects 或其他共享数据绑定。
- `_routes.json` 仅将 `/api/*` 交给 Pages Functions，静态课程页面不进入函数调用。
- `/api/fetch-source` 为无状态读取代理，限制协议、内网地址、请求头、跨域凭据重定向、超时和 15 MB 响应。
- `/api/inspect-import-zip` 为无状态 ZIP 检查器，仅返回 JSON/CSV 文本，限制加密、ZIP64、路径穿越、条目数和解压体积。
- `_headers` 配置 CSP、禁止嵌入、禁止 MIME 嗅探并禁止 API 缓存。

## 已执行检查

- `node --check app.js`：通过。
- `node --check server.mjs`：通过。
- 两个 Pages Functions 以 ES module 语法检查：通过。
- `/api/fetch-source` 私有地址拦截测试：通过。
- 使用现有真实项目 ZIP 测试边缘 ZIP 解析器：成功读取 41 个 JSON/CSV 条目。
- HTML 入口、备份控件 ID、CSS 大括号平衡和部署路由 JSON 静态断言：通过。
- Microsoft Defender 对完整阶段项目文件夹执行不自动处置的定向扫描：未发现威胁，退出码 0。

## 发布边界

- 未配置账户系统，因此当前版本不提供跨设备自动同步；跨设备迁移使用下载备份与恢复备份。
- 不应把个人课表写入公共 KV/D1。未来若增加登录同步，数据库必须以经过认证的用户 ID 强制分区。
