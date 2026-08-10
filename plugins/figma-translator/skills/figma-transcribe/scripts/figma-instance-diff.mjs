#!/usr/bin/env node
/**
 * figma-instance-diff.mjs — インスタンス⇄元コンポーネントのディープ差分検出（使い回し用）
 *
 * 目的: Figma のあるコンポーネントが内部で別コンポーネントの「インスタンス」を使う場合、
 * そのインスタンスに掛かっている override（内容 / 幅 / 高さ / Hug・Fill / padding / radius / 色）を
 * 元コンポーネントと精密比較して洗い出す。get_design_context の出力（JSX+Tailwind）を入力にする。
 *
 * 使い方:
 *   1) MCP get_design_context(<インスタンスnode>) の出力を丸ごと instance.txt に保存
 *   2) MCP get_design_context(<元コンポーネントnode>) の出力を丸ごと main.txt に保存
 *   3) node scripts/figma-instance-diff.mjs main.txt instance.txt
 *      → ノード対応ごとに override（bucket 単位）を表示
 *   単体正規化の確認: node scripts/figma-instance-diff.mjs --normalize file.txt
 *
 * 注意: get_design_context は SUPER CRITICAL 等の注記や localhost 画像URLを含むので、
 *       コードブロック（先頭の function ～ 最後の `}`）だけ保存すると精度が上がる（このスクリプトも極力無視する）。
 */
import { readFileSync } from 'node:fs'

/** JSX からノード列（depth, tag, className文字列, text）を抽出 */
function parseNodes(src) {
  // コード領域だけに絞る（注記文を除去）
  const code = src
    .replace(/SUPER CRITICAL[\s\S]*$/m, '')
    .replace(/IMPORTANT: After[\s\S]*$/m, '')
  const nodes = []
  const stack = []
  // タグ / テキストを順に走査
  const re = /<\/([A-Za-z][\w.]*)\s*>|<([A-Za-z][\w.]*)((?:[^<>"'`]|"[^"]*"|'[^']*'|`[^`]*`|\{(?:[^{}]|\{[^{}]*\})*\})*?)(\/?)>|([^<]+)/g
  let m
  while ((m = re.exec(code)) !== null) {
    if (m[1]) {
      // 閉じタグ
      stack.pop()
    } else if (m[2]) {
      const tag = m[2]
      const attrs = m[3] || ''
      const selfClose = m[4] === '/'
      const depth = stack.length
      const className = extractClassName(attrs)
      const node = { depth, tag, className, text: '' }
      nodes.push(node)
      if (!selfClose) stack.push(node)
    } else if (m[5]) {
      const t = m[5].replace(/\s+/g, ' ').trim()
      // 直近の開いているノードにテキストを付与（JSX式 {..} は無視）
      if (t && !/^[{}]/.test(t) && stack.length) {
        const top = stack[stack.length - 1]
        top.text = (top.text ? top.text + ' ' : '') + t
      }
    }
  }
  return nodes
}

/** className="..." / className={`...`} / className={x || `...`} から class 群を粗く回収 */
function extractClassName(attrs) {
  const q = attrs.match(/className\s*=\s*"([^"]*)"/)
  if (q) return q[1]
  const brace = attrs.match(/className\s*=\s*\{([\s\S]*)\}\s*$/)
  const scope = brace ? brace[1] : attrs
  // テンプレートリテラル・String.raw・素の class を全部拾って連結
  let out = []
  const tmpl = scope.match(/`([^`]*)`/g)
  if (tmpl) out = out.concat(tmpl.map((s) => s.slice(1, -1)))
  return out.join(' ')
}

const CLASS_RE = /[A-Za-z0-9_:/\-[\].(),#%]+/g

/** class トークンを bucket（意味カテゴリ）へ分類 */
function bucketize(className) {
  const tokens = (className.match(CLASS_RE) || []).filter(
    (t) => !/^(isANew|isLv2|type|className|String|raw|true|false|undefined|relative|overflow|whitespace)/.test(t),
  )
  const b = {
    width: [], height: [], sizing: [], padding: [], gap: [],
    radius: [], bg: [], color: [], font: [], align: [],
  }
  for (const t of tokens) {
    if (/^(w-full|w-fit|w-min|w-max|grow|grow-0|shrink|shrink-0|flex-1|flex-none|basis-)/.test(t)) b.sizing.push(t)
    else if (/^(w-|min-w|max-w|size-)/.test(t)) b.width.push(t)
    else if (/^(h-|min-h|max-h)/.test(t)) b.height.push(t)
    else if (/^p[xytrbl]?-/.test(t)) b.padding.push(t)
    else if (/^gap-/.test(t)) b.gap.push(t)
    else if (/^rounded/.test(t)) b.radius.push(t)
    else if (/^bg-/.test(t)) b.bg.push(t)
    else if (/^text-\[color/.test(t)) b.color.push(t)
    else if (/^(font-|leading-|tracking-|text-\[?\d)/.test(t)) b.font.push(t)
    else if (/^(flex|inline-flex|items-|justify-|content-)/.test(t)) b.align.push(t)
  }
  for (const k of Object.keys(b)) b[k] = b[k].sort()
  return b
}

function norm(nodes) {
  return nodes.map((n) => ({ ...n, buckets: bucketize(n.className) }))
}

function fmt(arr) {
  return arr.length ? arr.join(' ') : '∅'
}

function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--normalize') {
    const nodes = norm(parseNodes(readFileSync(args[1], 'utf8')))
    for (const n of nodes) {
      console.log(`${'  '.repeat(n.depth)}<${n.tag}> ${n.text ? `"${n.text}" ` : ''}` +
        Object.entries(n.buckets).filter(([, v]) => v.length).map(([k, v]) => `${k}:${v.join(',')}`).join(' | '))
    }
    return
  }
  if (args.length < 2) {
    console.error('usage: figma-instance-diff.mjs <main.txt> <instance.txt>   |   --normalize <file>')
    process.exit(1)
  }
  const mainNodes = norm(parseNodes(readFileSync(args[0], 'utf8')))
  const instNodes = norm(parseNodes(readFileSync(args[1], 'utf8')))
  console.log(`# override 検出: main(${mainNodes.length} nodes) ⇄ instance(${instNodes.length} nodes)\n`)
  if (mainNodes.length !== instNodes.length) {
    console.log(`⚠ 構造ノード数が不一致（${mainNodes.length} vs ${instNodes.length}）＝ ネスト構造自体の override 疑い。以下は index 対応での比較。\n`)
  }
  const n = Math.max(mainNodes.length, instNodes.length)
  let found = 0
  for (let i = 0; i < n; i++) {
    const a = mainNodes[i]
    const b = instNodes[i]
    if (!a || !b) {
      console.log(`[${i}] 構造差: ${a ? `main<${a.tag}>` : '—'}  ⇄  ${b ? `inst<${b.tag}>` : '—'}`)
      found++
      continue
    }
    const diffs = []
    if (a.tag !== b.tag) diffs.push(`tag ${a.tag}→${b.tag}`)
    if (a.text !== b.text) diffs.push(`content "${a.text}"→"${b.text}"`)
    for (const k of Object.keys(a.buckets)) {
      const av = a.buckets[k].join(' ')
      const bv = b.buckets[k].join(' ')
      if (av !== bv) diffs.push(`${k}: ${fmt(a.buckets[k])} → ${fmt(b.buckets[k])}`)
    }
    if (diffs.length) {
      console.log(`[${i}] <${a.tag}>${a.text ? ` "${a.text}"` : ''}`)
      for (const d of diffs) console.log(`     Δ ${d}`)
      found++
    }
  }
  console.log(found ? `\n→ override ${found} 件` : '\n→ override 無し（インスタンスは元コンポーネントと一致）')
}

main()
