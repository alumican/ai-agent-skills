#!/usr/bin/env node
// design context（scripts/figma-mcp.mjs get_design_context の保存ファイル）を
// 「全プロパティ展開ツリー」として表示する読解ツール。
//
// 目的: 生ファイルの grep / cut による斜め読みは className の切り捨てで bg / border 等の
// 見落としを生む（実例: 提案日時ボックスの separator/lv1 枠）。読解は必ず本ツールで全量を見る。
//
// 使い方:
//   node scripts/figma-context-tree.mjs <design-context.txt> [フィルタ文字列]
//   フィルタ指定時は「その data-name / node-id を含む要素」以降のサブツリー付近だけ表示する。
//
// 出力: 要素ごとに1ブロック。
//   <tag> data-name #node-id
//     └ classes: className 全文（無省略。var(--x/y,fallback) は読みやすく復元）
//   テキストノードは「」付きでそのまま出す。
import { readFileSync } from 'node:fs'

const [, , file, filter] = process.argv
if (!file) {
  console.error('usage: figma-context-tree.mjs <design-context.txt> [filter]')
  process.exit(1)
}

const lines = readFileSync(file, 'utf8').split('\n')

const unescape = (s) => s.replaceAll('\\/', '/')

let printing = !filter
let filterDepth = -1

for (const raw of lines) {
  const indent = raw.match(/^ */)[0].length
  const line = raw.trim()
  if (!line || line.startsWith('const img') || line.startsWith('import ') || line.startsWith('//')) continue

  // フィルタ制御: ヒットした要素のインデント以深を表示、浅くなったら停止
  if (filter) {
    if (!printing && line.includes(filter)) {
      printing = true
      filterDepth = indent
    } else if (printing && filterDepth >= 0 && indent < filterDepth && line.startsWith('<')) {
      printing = false
      filterDepth = -1
    }
  }
  if (!printing) continue

  const pad = ' '.repeat(indent)
  const tag = line.match(/^<(\w+)/)
  if (tag) {
    const name = line.match(/data-name="([^"]*)"/)?.[1] ?? ''
    const id = line.match(/data-node-id="([^"]*)"/)?.[1] ?? ''
    // className="..." / className={`...`} / className={className || "..."} を全部拾う
    const cls = line.match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{[^}]*\|\|\s*"([^"]*)"\s*\})/)
    const classes = unescape(cls?.[1] ?? cls?.[2] ?? cls?.[3] ?? '')
    console.log(`${pad}<${tag[1]}>${name ? ` ${name}` : ''}${id ? ` #${id}` : ''}`)
    if (classes) console.log(`${pad}  └ ${classes}`)
  } else if (/^[{<]/.test(line) === false && /[^\s]/.test(line)) {
    // JSXテキスト行 / 条件式など。テキストはそのまま可視化
    console.log(`${pad}「${line}」`)
  } else if (line.startsWith('{')) {
    console.log(`${pad}${line.slice(0, 120)}`)
  }
}
