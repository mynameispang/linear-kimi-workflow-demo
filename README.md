# Markdown 笔记管理 CLI

一个简单的命令行工具，用于创建、列出和读取本地 Markdown 笔记。笔记保存在当前目录下的 `notes/` 目录中，每篇笔记对应一个 `.md` 文件。

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
# 创建笔记：保存为 notes/我的第一篇笔记.md
note add "我的第一篇笔记" "# 你好，Markdown！"

# 列出所有笔记
note list

# 读取指定笔记
note read "我的第一篇笔记"
```

## 行为说明

- 标题中的 `\/:*?"<>|` 等非法文件名字符会被替换为 `_`
- 同名笔记已存在时，`add` 会报错而不会覆盖
- `read` 的标题不存在时会提示先用 `note list` 查看
- `notes/` 目录已加入 `.gitignore`，笔记内容不会被提交
