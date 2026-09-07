#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const NOTES_DIR = path.join(process.cwd(), 'notes');
const NOTE_EXT = '.md';

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
  const trimmed = title.trim();
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
 * 创建一篇笔记：note add "标题" "内容"
 * @param {string} title 笔记标题
 * @param {string} content 笔记内容（Markdown）
 */
function addNote(title, content) {
  if (content === undefined) {
    throw new NoteError('缺少内容参数，用法: note add "标题" "内容"');
  }
  ensureNotesDir();
  const filePath = path.join(NOTES_DIR, titleToFileName(title));
  if (fs.existsSync(filePath)) {
    throw new NoteError(`笔记已存在: "${title}"`);
  }
  const body = `# ${title}\n\n${content}\n`;
  fs.writeFileSync(filePath, body, 'utf8');
  console.log(`已创建笔记: ${path.relative(process.cwd(), filePath)}`);
}

/**
 * 列出所有笔记：note list
 */
function listNotes() {
  ensureNotesDir();
  const files = fs
    .readdirSync(NOTES_DIR)
    .filter((name) => name.endsWith(NOTE_EXT))
    .sort();
  if (files.length === 0) {
    console.log('暂无笔记，使用 note add "标题" "内容" 创建');
    return;
  }
  console.log(`共 ${files.length} 篇笔记:`);
  for (const name of files) {
    console.log(`  - ${name.slice(0, -NOTE_EXT.length)}`);
  }
}

/**
 * 读取指定笔记：note read "标题"
 * @param {string} title 笔记标题
 */
function readNote(title) {
  const filePath = path.join(NOTES_DIR, titleToFileName(title));
  if (!fs.existsSync(filePath)) {
    throw new NoteError(`笔记不存在: "${title}"，可用 note list 查看所有笔记`);
  }
  process.stdout.write(fs.readFileSync(filePath, 'utf8'));
}

const USAGE = `用法:
  note add "标题" "内容"   创建笔记（保存到 notes/ 目录）
  note list                列出所有笔记
  note read "标题"         读取指定笔记`;

/**
 * CLI 入口。
 * @param {string[]} argv 命令行参数（process.argv.slice(2)）
 */
function main(argv) {
  const [command, ...args] = argv;
  switch (command) {
    case 'add':
      addNote(args[0], args[1]);
      break;
    case 'list':
      listNotes();
      break;
    case 'read':
      readNote(args[0]);
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
