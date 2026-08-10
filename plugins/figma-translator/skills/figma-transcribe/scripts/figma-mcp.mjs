#!/usr/bin/env node
// Figma Dev Mode MCP を streamable HTTP (JSON-RPC) で直接叩くヘルパー。
// 使い方: node figma-mcp.mjs <toolName> '<argsJSON>'
//        node figma-mcp.mjs tools/list
const BASE = 'http://localhost:3845/mcp'

async function post(body, sessionId) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  }
  if (sessionId) headers['Mcp-Session-Id'] = sessionId
  const res = await fetch(BASE, { method: 'POST', headers, body: JSON.stringify(body) })
  const sid = res.headers.get('mcp-session-id') || sessionId
  const text = await res.text()
  return { sid, text, status: res.status }
}

function parseSSE(text) {
  // "event: message\ndata: {...}" 形式から最後の data JSON を取り出す
  const datas = []
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) datas.push(line.slice(6))
  }
  if (datas.length === 0) {
    try { return JSON.parse(text) } catch { return null }
  }
  return JSON.parse(datas[datas.length - 1])
}

const [, , toolName, argsJson] = process.argv
if (!toolName) {
  console.error('usage: figma-mcp.mjs <toolName|tools/list> [argsJSON]')
  process.exit(1)
}

// 1. initialize
const init = await post({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'cli', version: '1.0' } },
})
const sid = init.sid
if (!sid) { console.error('no session id', init.status, init.text.slice(0, 200)); process.exit(1) }

// 2. initialized notification
await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, sid)

// 3. call
let payload
if (toolName === 'tools/list') {
  payload = { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }
} else {
  payload = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: toolName, arguments: argsJson ? JSON.parse(argsJson) : {} } }
}
const res = await post(payload, sid)
const msg = parseSSE(res.text)
if (!msg) { console.error('unparsable response:', res.status, res.text.slice(0, 500)); process.exit(1) }
if (msg.error) { console.error('MCP error:', JSON.stringify(msg.error)); process.exit(1) }

if (toolName === 'tools/list') {
  for (const t of msg.result.tools) {
    console.log(`## ${t.name}`)
    console.log(t.description?.slice(0, 300) ?? '')
    console.log('params:', JSON.stringify(t.inputSchema?.properties ?? {}, null, 1).slice(0, 1200))
    console.log()
  }
} else {
  for (const c of msg.result.content ?? []) {
    if (c.type === 'text') console.log(c.text)
    else console.log(`[${c.type}]`, JSON.stringify(c).slice(0, 200))
  }
}
