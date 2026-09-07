#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const NOTES_DIR = path.join(process.cwd(), 'notes');
const NOTE_EXT = '.md';
const FRONTMATTER_DELIMITER = '---';

class NoteError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoteError';
  }
}

/**
 * 将笔记标题转换为安全的文件名（不含扩展名）。
 * @param {string} title 笔记标题
 * @returns {string} 文件名
 */
function titleToFileName(title) {
  const trimmed = (title || '').trim();
  if (!trimmed) {
    throw new NoteError('标题不能为空');
  }
  const safe = trimmed.replace(/[\\/:*?"<>|]/g, '_');
  return `${safe}${NOTE_EXT}`;
}

/**
 * 确保 notes/ 目录存在。
 */
function ensureNotesDir() {
  fs.mkdirSync(NOTES_DIR, { recursive: true });
}

/**
 * 解析带 YAML frontmatter 的笔记文本。无 frontmatter 的旧格式笔记按正文处理。
 * @param {string} raw 文件原始内容
 * @returns {{ meta: { tags: string[], created: string | null }, body: string }}
 */
function parseNoteContent(raw) {
  const meta = { tags: [], created: null };
  const start = `${FRONTMATTER_DELIMITER}\n`;
  const endMark = `\n${FRONTMATTER_DELIMITER}\n`;
  if (!raw.startsWith(start)) {
    return { meta, body: raw };
  }
  const endIndex = raw.indexOf(endMark, start.length);
  if (endIndex === -1) {
    return { meta, body: raw };
  }
  const frontmatter = raw.slice(start.length, endIndex);
  const body = raw.slice(endIndex + endMark.length);
  let currentKey = null;
  for (const line of frontmatter.split('\n')) {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && currentKey === 'tags') {
      meta.tags.push(listItem[1].trim());
      continue;
    }
    const pair = line.match(/^(\w+):\s*(.*)$/);
    if (pair) {
      currentKey = pair[1];
      if (currentKey === 'created') {
        meta.created = pair[2].trim() || null;
      }
    }
  }
  return { meta, body };
}

/**
 * 生成带 YAML frontmatter 的笔记文件内容。
 * @param {string} title 笔记标题
 * @param {string} content 笔记内容（Markdown）
 * @param {string[]} tags 标签列表
 * @returns {string} 文件内容
 */
function buildNoteContent(title, content, tags) {
  const lines = [
    FRONTMATTER_DELIMITER,
    `title: ${title}`,
    `created: ${new Date().toISOString()}`,
  ];
  if (tags.length > 0) {
    lines.push('tags:');
    for (const tag of tags) {
      lines.push(`  - ${tag}`);
    }
  }
  lines.push(FRONTMATTER_DELIMITER, '', `# ${title}`, '', content, '');
  return lines.join('\n');
}

/**
 * 解析 --tags 参数值，支持中英文逗号分隔，去空去重。
 * @param {string | undefined} value 参数值，如 "工作,灵感"
 * @returns {string[]} 标签列表
 */
function parseTagsArg(value) {
  if (!value) {
    return [];
  }
  const tags = value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return [...new Set(tags)];
}

/**
 * 将命令行参数拆分为位置参数与 --flag 选项。
 * @param {string[]} args 命令参数
 * @returns {{ positional: string[], flags: Record<string, string | undefined> }}
 */
function parseArgs(args) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      flags[arg.slice(2)] = args[i + 1];
      i += 1;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

/**
 * 读取 notes/ 下全部笔记并解析 frontmatter。
 * @returns {{ title: string, filePath: string, meta: { tags: string[], created: string | null }, body: string }[]}
 */
function readAllNotes() {
  ensureNotesDir();
  return fs
    .readdirSync(NOTES_DIR)
    .filter((name) => name.endsWith(NOTE_EXT))
    .sort()
    .map((name) => {
      const filePath = path.join(NOTES_DIR, name);
      const { meta, body } = parseNoteContent(fs.readFileSync(filePath, 'utf8'));
      return { title: name.slice(0, -NOTE_EXT.length), filePath, meta, body };
    });
}

/**
 * 格式化笔记的标签后缀，如 [标签: 工作, 灵感]。
 * @param {{ tags: string[] }} meta 笔记元数据
 * @returns {string} 标签后缀（无标签时为空字符串）
 */
function formatTags(meta) {
  return meta.tags.length > 0 ? ` [标签: ${meta.tags.join(', ')}]` : '';
}

/**
 * 创建一篇笔记：note add "标题" "内容" [--tags "工作,灵感"]
 * @param {string} title 笔记标题
 * @param {string} content 笔记内容（Markdown）
 * @param {string[]} tags 标签列表
 */
function addNote(title, content, tags) {
  if (content === undefined) {
    throw new NoteError('缺少内容参数，用法: note add "标题" "内容" [--tags "工作,灵感"]');
  }
  ensureNotesDir();
  const filePath = path.join(NOTES_DIR, titleToFileName(title));
  if (fs.existsSync(filePath)) {
    throw new NoteError(`笔记已存在: "${title}"`);
  }
  fs.writeFileSync(filePath, buildNoteContent(title, content, tags), 'utf8');
  const suffix = tags.length > 0 ? `（标签: ${tags.join(', ')}）` : '';
  console.log(`已创建笔记: ${path.relative(process.cwd(), filePath)}${suffix}`);
}

/**
 * 列出笔记：note list [--tag "工作"]
 * @param {string | undefined} tagFilter 按标签过滤
 */
function listNotes(tagFilter) {
  const notes = tagFilter
    ? readAllNotes().filter((note) => note.meta.tags.includes(tagFilter))
    : readAllNotes();
  if (notes.length === 0) {
    console.log(
      tagFilter
        ? `没有标签为 "${tagFilter}" 的笔记`
        : '暂无笔记，使用 note add "标题" "内容" 创建'
    );
    return;
  }
  const scope = tagFilter ? `标签 "${tagFilter}" 下共` : '共';
  console.log(`${scope} ${notes.length} 篇笔记:`);
  for (const note of notes) {
    console.log(`  - ${note.title}${formatTags(note.meta)}`);
  }
}

/**
 * 读取指定笔记：note read "标题"（输出时隐藏 frontmatter，单独展示标签）
 * @param {string} title 笔记标题
 */
function readNote(title) {
  const filePath = path.join(NOTES_DIR, titleToFileName(title));
  if (!fs.existsSync(filePath)) {
    throw new NoteError(`笔记不存在: "${title}"，可用 note list 查看所有笔记`);
  }
  const { meta, body } = parseNoteContent(fs.readFileSync(filePath, 'utf8'));
  if (meta.tags.length > 0) {
    console.log(`标签: ${meta.tags.join(', ')}`);
  }
  process.stdout.write(body);
}

/**
 * 全文搜索笔记标题与正文：note search "关键词"（不区分大小写）
 * @param {string} keyword 搜索关键词
 */
function searchNotes(keyword) {
  if (!keyword) {
    throw new NoteError('缺少关键词参数，用法: note search "关键词"');
  }
  const needle = keyword.toLowerCase();
  const matches = readAllNotes().filter(
    (note) =>
      note.title.toLowerCase().includes(needle) ||
      note.body.toLowerCase().includes(needle)
  );
  if (matches.length === 0) {
    console.log(`未找到包含 "${keyword}" 的笔记`);
    return;
  }
  console.log(`找到 ${matches.length} 篇包含 "${keyword}" 的笔记:`);
  for (const note of matches) {
    const hitLine = note.body
      .split('\n')
      .find((line) => line.toLowerCase().includes(needle));
    console.log(`  - ${note.title}${formatTags(note.meta)}`);
    if (hitLine) {
      console.log(`      ${hitLine.trim()}`);
    }
  }
}

/**
 * 汇总列出所有标签及笔记数量：note tags
 */
function listTags() {
  const counts = new Map();
  for (const note of readAllNotes()) {
    for (const tag of note.meta.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  if (counts.size === 0) {
    console.log('暂无标签，使用 note add "标题" "内容" --tags "标签" 创建');
    return;
  }
  const sorted = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  console.log(`共 ${sorted.length} 个标签:`);
  for (const [tag, count] of sorted) {
    console.log(`  - ${tag} (${count})`);
  }
}

const USAGE = `用法:
  note add "标题" "内容" [--tags "工作,灵感"]   创建笔记（保存到 notes/ 目录）
  note list [--tag "工作"]                      列出笔记，可按标签过滤
  note read "标题"                              读取指定笔记
  note search "关键词"                          全文搜索笔记标题与内容
  note tags                                     列出所有标签`;

/**
 * CLI 入口。
 * @param {string[]} argv 命令行参数（process.argv.slice(2)）
 */
function main(argv) {
  const [command, ...rest] = argv;
  const { positional, flags } = parseArgs(rest);
  switch (command) {
    case 'add':
      addNote(positional[0], positional[1], parseTagsArg(flags.tags));
      break;
    case 'list':
      listNotes(flags.tag);
      break;
    case 'read':
      readNote(positional[0]);
      break;
    case 'search':
      searchNotes(positional[0]);
      break;
    case 'tags':
      listTags();
      break;
    default:
      console.log(USAGE);
      process.exitCode = command ? 1 : 0;
  }
}

try {
  main(process.argv.slice(2));
} catch (error) {
  if (error instanceof NoteError) {
    console.error(`错误: ${error.message}`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
