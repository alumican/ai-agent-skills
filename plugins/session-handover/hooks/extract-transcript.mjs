#!/usr/bin/env node
// Build a text excerpt from a Claude Code transcript (JSONL) as source material for
// handover-note generation.
// Usage: node extract-transcript.mjs <transcript.jsonl> <output.md>
// Output: the session's opening user messages + the tail of the conversation (within a
// budget), laid out in chronological order.
import { readFileSync, writeFileSync } from "node:fs";

const [transcriptPath, outputPath] = process.argv.slice(2);
if (!transcriptPath || !outputPath) {
  console.error("usage: extract-transcript.mjs <transcript.jsonl> <output.md>");
  process.exit(2);
}

const TEXT_LIMIT = 4000; // per-message text cap
const TOOL_INPUT_LIMIT = 300; // tool_use input summary cap
const TOOL_RESULT_LIMIT = 500; // tool_result summary cap
const HEAD_USER_MESSAGES = 3; // number of opening user messages to always include
const TAIL_BUDGET = 100_000; // total character budget for the tail

const truncate = (s, n) =>
  s.length > n ? `${s.slice(0, n)} …[truncated ${s.length - n} chars]` : s;

const renderBlock = (block) => {
  if (typeof block === "string") return block;
  switch (block?.type) {
    case "text":
      return truncate(block.text ?? "", TEXT_LIMIT);
    case "tool_use":
      return `[tool: ${block.name}] ${truncate(JSON.stringify(block.input ?? {}), TOOL_INPUT_LIMIT)}`;
    case "tool_result": {
      const inner = Array.isArray(block.content)
        ? block.content.map((c) => (typeof c === "string" ? c : (c?.text ?? ""))).join("\n")
        : String(block.content ?? "");
      return `[tool_result] ${truncate(inner, TOOL_RESULT_LIMIT)}`;
    }
    default:
      return "";
  }
};

const entries = [];
let raw;
try {
  raw = readFileSync(transcriptPath, "utf8");
} catch (error) {
  console.error(`cannot read transcript: ${error.message}`);
  process.exit(1);
}

for (const line of raw.split("\n")) {
  if (!line.trim()) continue;
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    continue; // silently skip broken lines (this is excerpt material — robustness over completeness)
  }
  if (record.type === "summary" && record.summary) {
    entries.push({ role: "summary", text: truncate(String(record.summary), TEXT_LIMIT) });
    continue;
  }
  const message = record.message;
  if (!message?.role || !["user", "assistant"].includes(message.role)) continue;
  const content = Array.isArray(message.content) ? message.content : [message.content];
  const text = content.map(renderBlock).filter(Boolean).join("\n");
  if (text.trim()) entries.push({ role: message.role, text });
}

if (entries.length === 0) {
  console.error("no extractable messages in transcript");
  process.exit(1);
}

const format = (entry) => `### ${entry.role}\n${entry.text}\n`;

// Always include the opening user messages (the session's purpose)
const headEntries = [];
for (const entry of entries) {
  if (entry.role === "user" && !entry.text.startsWith("[tool_result]")) {
    headEntries.push(entry);
    if (headEntries.length >= HEAD_USER_MESSAGES) break;
  }
}

// Collect from the tail within budget
const tailEntries = [];
let spent = 0;
for (let i = entries.length - 1; i >= 0; i--) {
  const cost = entries[i].text.length + 20;
  if (spent + cost > TAIL_BUDGET) break;
  tailEntries.unshift(entries[i]);
  spent += cost;
}

const headOnly = headEntries.filter((e) => !tailEntries.includes(e));
const output = [
  "# Transcript excerpt (source material for HANDOVER generation)",
  `From ${entries.length} messages: first ${headOnly.length} + last ${tailEntries.length}.`,
  "",
  ...headOnly.map(format),
  headOnly.length > 0 ? "…(omitted)…\n" : "",
  ...tailEntries.map(format),
].join("\n");

writeFileSync(outputPath, output);
console.error(`wrote excerpt: ${outputPath} (${output.length} chars)`);
