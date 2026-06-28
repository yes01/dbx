# TestTeam DBX

TestTeam DBX 是 TestTeam 内部使用的数据库管理工具。它用 Tauri、Vue 和 Rust 构建，重点放在连接管理、SQL 查询、数据查看、结构工具、导入导出和 AI 辅助这些日常工作上。

这不是一个只用来看表的轻量客户端。DBX 更适合工程师、分析师和运维同学在一个桌面窗口里完成数据库排查、数据核对、结构对比和跨环境同步前的检查。

## 主要功能

- 连接管理：支持 MySQL、PostgreSQL、SQLite、DuckDB、Redis、MongoDB、ClickHouse、SQL Server、Oracle 等常见数据库，也支持通过 JDBC Agent 扩展更多数据库类型。
- 查询编辑器：基于 CodeMirror 6，支持 SQL 高亮、元数据补全、格式化、选中执行、查询取消和查询历史。
- 数据表格：支持虚拟滚动、排序、筛选、行内编辑、SQL 预览、转置视图、单元格详情、图片预览、二进制查看和多格式复制。
- 数据修改保护：表格里的新增、修改和删除会先暂存在本地，保存前展示将要执行的 SQL，减少误操作。
- 结构工具：可以浏览数据库、Schema、表、字段、索引、外键和触发器，并提供表结构编辑、Schema 对比、ER 图、字段血缘和对象源码查看。
- 数据导入导出：支持表数据导入、数据库导出、SQL 文件执行、结果集导出，以及 CSV、JSON、Markdown、XLSX、INSERT、UPDATE 等复制格式。
- 专项浏览：Redis 键值、MongoDB 文档、Elasticsearch 查询、Nacos、MQ、etcd、ZooKeeper 等场景有对应的浏览和操作界面。
- AI 辅助：配置模型后，可以生成 SQL、解释查询、优化语句、修复错误；Ask 模式只给建议，Agent 模式会先经过 DBX 的执行策略。
- MCP 集成：通过 MCP Server 把 DBX 的连接能力开放给编程助手，适合在开发流程里查询结构或辅助生成 SQL。
- 配置迁移：连接配置可导入导出，敏感字段和普通连接信息分开存储；导出时可使用 AES-GCM 加密。

## 常用操作

### 创建连接

1. 打开应用后，在侧边栏点击新建连接。
2. 选择数据库类型。文件型数据库选择本地文件，网络数据库填写主机、端口、账号、密码和默认数据库。
3. 如果已经有连接 URL，可以直接粘贴，保存前检查解析出的字段。
4. 内网数据库可以配置 SSH 隧道；需要代理时，在连接的代理设置里填写 SOCKS5 或 HTTP 代理。
5. 点击测试，确认账号、网络和权限正常后保存。

建议给生产、预发、测试、本地环境设置不同的连接名称和颜色。看到颜色就知道自己在哪个环境里，能少犯很多低级错。

### 执行 SQL

- macOS 使用 `Cmd+Enter` 执行。
- Windows 和 Linux 使用 `Ctrl+Enter` 执行。
- 编辑器里有选中文本时，只执行选中的 SQL；没有选中内容时，执行当前编辑器内容。
- 多语句脚本建议先选中要执行的片段。大型 `.sql` 文件更适合走 SQL 文件执行流程，因为它有进度和取消状态。

查询完成后，结果会显示在下方表格中。结果区会展示返回行数、耗时、影响行数或错误信息。执行失败时，可以把当前 SQL 和错误信息交给 AI 辅助分析。

### 浏览和修改数据

- 点击列头可以排序，使用 WHERE 和 ORDER BY 在数据库侧过滤和排序。
- 双击单元格可编辑，长文本、JSON、SQL 片段和图片 URL 可以在单元格详情里查看。
- 修改数据后不会立刻写库。点击保存前，DBX 会展示对应的 `UPDATE`、`INSERT` 或 `DELETE`。
- Join、聚合、计算列或缺少主键的结果通常只读。直接打开表数据时，编辑体验最完整。
- 选中多行后可以批量复制为 TSV、CSV、JSON、Markdown、INSERT 或 UPDATE。

### 使用 AI

1. 在设置里选择 Anthropic、OpenAI 或兼容 OpenAI API 的自定义端点。
2. 填写 API Key、Endpoint 和模型名称。
3. 在查询编辑器里描述需求，比如"查最近 30 天订单金额最高的客户"。
4. 执行前检查生成的表名、字段名、筛选条件和影响范围。

AI 请求可能包含当前 SQL、错误信息、结果预览和必要的表结构上下文。涉及敏感库或敏感字段时，先确认团队是否允许把这些信息发给对应模型服务。

## 本地开发

### 环境要求

- Node.js `>= 22.13.0`
- pnpm `10.27.0`，仓库已在 `package.json` 里声明 package manager
- Rust 稳定版
- Tauri 2 所需系统依赖

macOS 通常需要：

```bash
brew install unixodbc
```

Ubuntu / Debian 通常需要：

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev \
  unixodbc-dev
```

Windows 一般不需要额外的系统包，但要准备好 Rust、Node.js 和 WebView2。

### 安装依赖

```bash
pnpm install
```

### 启动桌面开发环境

推荐使用：

```bash
pnpm dev:desktop
```

这个脚本会先释放本地常用开发端口，再启动 Tauri 开发模式。它内部会调用 `pnpm tauri dev`，而 Tauri 会按 `src-tauri/tauri.conf.json` 的配置启动前端开发服务。

也可以直接运行：

```bash
pnpm dev:tauri
```

### 只启动前端

```bash
pnpm dev
```

如果要用 Web 模式调试前端：

```bash
pnpm dev:web
```

需要同时调试 Web 后端时，再开一个终端：

```bash
pnpm dev:backend
```

`dev:backend` 会使用 `cargo watch` 启动 `dbx-web`，默认设置 `DBX_PASSWORD=test`。

## 检查和测试

```bash
pnpm typecheck      # Vue / TypeScript 类型检查
pnpm lint           # oxlint 检查
pnpm fmt            # 格式化 apps/desktop/src 下的 TS 和 Vue 文件
pnpm test           # 运行应用层 node:test 测试
pnpm check          # 格式、lint、类型和测试的组合检查
```

包相关命令：

```bash
pnpm build:packages
pnpm test:packages
pnpm publish:dry-run
```

## 构建

### 构建前端产物

```bash
pnpm build
```

需要先做类型检查时：

```bash
pnpm build:checked
```

### 构建桌面安装包

```bash
pnpm tauri build
```

Tauri 构建会先执行 `pnpm build`，再打包桌面应用。安装包输出在：

```text
src-tauri/target/release/bundle/
```

当前 Tauri 配置会为目标平台生成对应包，并启用更新产物。macOS 配置使用本地签名标识 `-`，正式分发前请按内部发布流程替换签名、证书和更新地址。

## 目录说明

```text
apps/desktop/        Vue 桌面前端
src-tauri/           Tauri 桌面壳和 Rust 入口
crates/              Rust 核心能力
agents/              JDBC / Agent 驱动与测试支持
packages/            Node 包、CLI 和 MCP Server
plugins/             插件相关代码
scripts/             本地开发、检查和打包辅助脚本
```

## 使用时的安全习惯

- 生产连接用清楚的名字和醒目的颜色。
- 写入、删除、导入、结构同步和 SQL 文件执行前，先看 SQL 预览。
- 不确定影响范围时，先加 WHERE、LIMIT 或在测试库验证。
- 配置导出时使用加密文件，不要把明文连接信息发到聊天工具或工单里。
- AI 生成的 SQL 只当草稿看。真正执行前，仍然按人工写的 SQL 来审。
