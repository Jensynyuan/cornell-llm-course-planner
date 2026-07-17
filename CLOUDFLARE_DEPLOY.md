# Cloudflare Pages 部署与数据隔离

## 结论

本项目的课表、已选课程、手动地点、推荐偏好、用户导入课程及新建课程均写入访问者**自己浏览器、自己域名下**的本地存储。Cloudflare Pages 与本项目的 Pages Functions 不写入 KV、D1、R2、Durable Objects 或任何服务端数据库，因此不会发生“所有用户共用一张课表”。

同一设备的不同浏览器配置文件、无痕窗口和不同域名（例如预览地址与正式自定义域名）也各自独立。多人若共用同一个浏览器用户资料，会看到同一份本地数据。清除站点数据或更换浏览器会丢失该浏览器中的本地计划；这不是服务器覆盖用户数据。用户可在“我的课表”下载 JSON 备份并在另一浏览器或域名恢复。

## GitHub → Cloudflare Pages

1. 将本文件夹作为 GitHub 仓库根目录提交；不要把 `node_modules`、API Key 或个人导入的课程数据提交到仓库。
2. 在 Cloudflare Pages 连接该 GitHub 仓库。Framework preset 选 `None`，Build command 留空，Build output directory 填 `.`。
3. 保留仓库根目录的 `functions/`、`_routes.json`、`_headers` 和 `wrangler.toml`。Pages 会将 `functions/api/fetch-source.js` 和 `functions/api/inspect-import-zip.js` 分别路由到现有前端调用的 `/api/fetch-source` 与 `/api/inspect-import-zip`。
4. 先在 Preview deployment 测试：课程检索、任选课程、刷新页面后课表仍在、JSON/CSV 导入、ZIP 导入、官方 JSON API 预览。确认后再绑定正式域名。

静态页面不会执行 Functions；`_routes.json` 只让 `/api/*` 调用边缘函数，避免把每个课程页面请求都计入函数调用。

## 无共享状态设计

| 数据 | 保存位置 | 是否会与其他用户共享 |
| --- | --- | --- |
| 课表、课程选择、偏好、手动修改 | 访问者浏览器 `localStorage` | 否 |
| 外校课程导入与自建课程 | 访问者浏览器 `localStorage` | 否 |
| 默认 Cornell 课程库与 CU Reviews 快照 | GitHub 静态文件，只读 | 所有人读取同一公开版本，但不能互相修改 |
| API 读取与 ZIP 解包 | 无状态 Pages Function | 否；请求完成后不保存 |

绝不要为了“保存用户课表”把 `state.selected`、`state.manualPlacements`、`customSchoolStore` 或导入课程整体写入公共 KV/D1。若将来要跨设备同步，应先增加账户体系，并以用户 ID 作为数据库强制分区键；在此之前，保持本地优先才是安全默认值。

## API 边界

两个 Pages Functions 都是无状态的：

- 远程数据源仅接受 HTTP/HTTPS，阻止本机、内网与保留地址；只转发 `Authorization`、`X-API-Key` 与 `Accept` 三种受控请求头，限制 25 秒与 15 MB，并防止凭据随跨域重定向泄露。
- ZIP 只读取 JSON/CSV，拒绝加密、ZIP64、多磁盘、路径穿越和超限解压内容；压缩包上限 15 MB、解压后上限 30 MB、最多 200 个条目。

用户在导入页面临时填写的 API Key 不会被写进项目代码、GitHub、KV 或 D1；仍应只使用有权访问且允许该用途的学校 API。

## 本地校验与部署命令

本地开发可继续使用 `start.bat`。如已安装 Wrangler，也可运行：

```powershell
npx wrangler pages dev .
```

直接上传（先登录 Wrangler）可运行：

```powershell
npx wrangler pages deploy . --project-name llm-course-planner
```

Git 集成部署时无需在 Cloudflare 控制台填写 API Key。若日后用 `wrangler pages download config`，它会覆盖 `wrangler.toml`，须先确认不要引入 KV/D1 等共享数据绑定。
