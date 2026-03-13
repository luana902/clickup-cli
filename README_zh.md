# @discountry/clickup-cli

[English](./README.md)

一个可通过 `npm install -g` 全局安装的 ClickUp CLI。它基于当前仓库里的 skill 能力重新实现，但改成了真正的 npm CLI 包结构：

- 直接从全局环境变量读取配置
- 保持 task、comment、doc 相关命令能力完整
- 模块化拆分，便于继续维护和扩展
- 自带 `node:test` 自动化测试

## 安装

```bash
npm install -g @discountry/clickup-cli
```

安装后可以在系统里直接调用：

```bash
clickup --help
```

## 搭配 Skill 使用

安装完 CLI 后，可以继续安装配套的 Codex skill：

```bash
npx skills add discountry/clickup-cli --skill clickup
# 或
npx skills add https://github.com/discountry/clickup-cli --skill clickup
```

这个 skill 会直接调用全局 `clickup` 命令，所以保留 CLI 安装并继续使用同一套环境变量即可。具体说明见 `skills/clickup/README.md`。

如果你只是本地联调当前仓库，仍然可以在仓库根目录执行：

```bash
npm install -g .
```

## 配置

不依赖本地 `.env` 文件，直接读取 shell 环境变量：

```bash
export CLICKUP_API_TOKEN=pk_your_token_here
export CLICKUP_WORKSPACE_ID=123456
export CLICKUP_USER_ID=7890
export CLICKUP_DEFAULT_LIST_ID=901111220963
```

说明：

- `CLICKUP_API_TOKEN`：必填，ClickUp Personal API Token
- `CLICKUP_WORKSPACE_ID`：可选，建议显式设置；未设置时会通过 API 自动获取第一个 workspace
- `CLICKUP_TEAM_ID`：兼容旧 skill 的别名，可替代 `CLICKUP_WORKSPACE_ID`
- `CLICKUP_USER_ID`：可选，未设置时会通过 API 自动获取当前用户
- `CLICKUP_DEFAULT_LIST_ID`：可选，用于 `clickup create "Task title"` 这种简写

## 常用命令

```bash
clickup me
clickup get 86a1b2c3d --subtasks
clickup comments 86a1b2c3d
clickup comment 86a1b2c3d "Starting work"
clickup status 86a1b2c3d "in progress"
clickup create "Quick task"
clickup create 901111220963 "New feature" --assignee me --due tomorrow --description "## Scope"
clickup my-tasks
clickup search "authentication"
clickup assign 86a1b2c3d jane
clickup due 86a1b2c3d "+3d"
clickup priority 86a1b2c3d high
clickup subtask 86a1b2c3d "Write tests"
clickup move 86a1b2c3d 901111220964
clickup link 86a1b2c3d "https://github.com/org/repo/pull/123" "PR #123"
clickup checklist 86a1b2c3d "Review code"
clickup delete-comment 90110200841741
clickup watch 86a1b2c3d alex
clickup tag 86a1b2c3d "DevOps"
clickup description 86a1b2c3d "# Summary"
clickup docs
clickup docs "API"
clickup doc abc123
clickup create-doc "Project Notes" --content "# Notes"
clickup page abc123 page456
clickup create-page abc123 "New Section" --content "Hello"
clickup edit-page abc123 page456 --name "Renamed" --content "# Updated"
```

支持 `--json` 原样输出 API 返回值，便于脚本集成。

## 开发

```bash
pnpm install
pnpm test
npm run pack:check
```

入口文件：

- `bin/clickup.js`：全局命令入口
- `src/cli/`：参数解析、命令注册、帮助信息
- `src/services/`：任务、评论、文档、用户相关业务逻辑
- `src/http/`：ClickUp HTTP 客户端
- `src/utils/`：ID 解析、日期解析、Markdown 转换、输出格式化
- `tests/`：自动化测试
