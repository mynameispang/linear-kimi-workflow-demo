# Markdown 笔记管理 CLI

一个简单的命令行工具，用于创建、列出、搜索和读取本地 Markdown 笔记。笔记保存在当前目录下的 `notes/` 目录中，每篇笔记对应一个 `.md` 文件，元数据（标题、创建时间、标签）以 YAML frontmatter 存储在文件头部。

## 环境要求

- Node.js 18+（无需安装任何依赖）

## 安装

```bash
# 全局链接后即可直接使用 note 命令
npm link
```

也可以不安装，直接用 `node note.js` 代替下面的 `note` 命令。

## 使用方法

```bash
# 创建笔记（可选 --tags，支持中英文逗号分隔多个标签）
note add "周报模板" "本周完成了..." --tags "工作,模板"
note add "灵感记录" "一个关于 CLI 的想法"

# 列出所有笔记，或按标签过滤
note list
note list --tag "工作"

# 读取指定笔记（frontmatter 不显示，标签单独展示）
note read "周报模板"

# 全文搜索笔记标题与内容（不区分大小写）
note search "CLI"

# 列出所有标签及对应笔记数量
note tags
```

## 笔记文件格式

```markdown
---
title: 周报模板
created: 2026-09-07T15:52:43.490Z
tags:
  - 工作
  - 模板
---

# 周报模板

本周完成了...
```

## 行为说明

- 标题中的 `\/:*?"<>|` 等非法文件名字符会被替换为 `_`
- 同名笔记已存在时，`add` 会报错而不会覆盖
- `--tags` 的值按中英文逗号分隔，自动去空格、去重
- 没有 frontmatter 的旧版笔记仍可正常列出、读取和搜索（视为无标签）
- `notes/` 目录已加入 `.gitignore`，笔记内容不会被提交
