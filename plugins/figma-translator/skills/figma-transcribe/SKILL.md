---
name: figma-transcribe
description: Reproduce a Figma design exactly in code. Use when implementing a screen or component from Figma, when checking an implementation against its Figma master, or when a design's dimensions, colours or tokens need to be read. Reads structured data from the Figma Dev Mode MCP — never from screenshots.
---

# Figma を写し取る

スクリーンショットを見て似せるのではなく、**Figma が持っている構造化データから写し取る**ための手順。
寸法・色・余白・書体は、目で測るものではなく**取得するもの**である。

## 0. 大原則

1. **スクリーンショットを仕様の根拠にしない。** `get_screenshot` は人間の目視確認用であって、
   寸法・色・構造の取得には使わない。「だいたい合っている」実装は、あとで必ず1つずつ直すことになる。
2. **推測しない。** 値が取れないときは、取れなかったと言う。埋めない。
3. **投機で先回りしない。** 齟齬や未定義に当たったら、その場で報告して判断を仰ぐ。

---

## 1. 通信経路（MCP 登録なしで叩く）

Figma **デスクトップアプリ**が `http://localhost:3845/mcp` に Dev Mode MCP サーバーを立てる。
Claude Code に MCP として登録していなくても、JSON-RPC を直接叩けば使える。

```
node <skill>/scripts/figma-mcp.mjs <toolName> '<argsJSON>'
node <skill>/scripts/figma-mcp.mjs tools/list
```

同梱の `scripts/figma-mcp.mjs` が、呼び出しごとに `initialize` → `initialized` → `tools/call` の
3往復を行い、SSE（`event: message` / `data: {...}`）の最後の data を取り出す。

**プロジェクトに置いて使うなら `scripts/` へコピーし、docs から参照する**（セッション限りにしない）。

### 前提と、詰まったときの見分け方

| 症状 | 意味 |
|---|---|
| `The MCP server is only available if your active tab is a design or FigJam file.` | Figma デスクトップアプリで**対象ファイルをアクティブタブにする**。ノード id は指定できるが、ファイルはアクティブタブのものが対象 |
| 接続できない | デスクトップアプリが起動していない／Dev Mode MCP サーバーが有効になっていない |
| トークン超過で失敗 | ページ全体に `get_design_context` を当てている。**単一ノードに絞る**（下記 2-1） |

### 使うツール

| ツール | 何が取れるか | 使いどころ |
|---|---|---|
| `get_metadata` | ノードの**骨格**（id / name / 型 / 座標 / サイズ）。スタイルの実値は持たない | 探索。バリアントの一覧、実測寸法、入れ子の構造 |
| `get_design_context` | **単一ノードの構造化コード**（正確な寸法・色・階層・当たっている Figma 変数） | 実装の根拠。これが唯一の正 |
| `get_variable_defs` | デザイントークンの**実値** | トークンを台帳へ足すとき |

アセット（SVG / 画像）は `http://localhost:3845/assets/<hash>.svg` で配信される。`curl` で直接取れる。

---

## 2. 手順

### 2-1. 探索 — metadata で単一バリアントに絞る

ページ全体に `get_design_context` を当てるとトークン超過で落ちる。**必ず単一ノードに絞る。**

```
node scripts/figma-mcp.mjs get_metadata '{"nodeId":"14-257","disableCodeConnect":true}'
```

返る XML の読み方:

- `<symbol id name="State=…/Type=…/Size=…">` … **個々のバリアントの実体**。この id を次に渡す
- `<frame name="…">` … バリアントの状態マトリクス、または入れ物
- `<instance name="…">` … **その名前が、使うべき既存コンポーネント**。素の Frame や別の似た部品で代替しない
- `_Parts/*` … 最下層のアトム。上位の部品はこれを合成している

**metadata から実装すべきバリアント表を作り、docs に記録する**（部品名 / node-id / 状態軸 / サイズ）。
これで「ページ内に定義された全バリアント」を機械的に列挙でき、取りこぼさずに木を伸ばせる。

### 2-2. 取得 — design context をファイルに落とす

```
node scripts/figma-mcp.mjs get_design_context '{"nodeId":"315-21532","disableCodeConnect":true}' > /tmp/ctx.txt
```

### 2-3. 読解 — 全プロパティ展開ツリーで読む（斜め読み禁止）

**生の design context を grep / cut で斜め読みしない。** className が途中で切れて `bg` や `border` を
見落とす。**枠線 1 本の見落としは、実装が終わってから気づく**（画面はそれらしく描かれるので、レビューでも通る）。

```
node <skill>/scripts/figma-context-tree.mjs /tmp/ctx.txt [ノードid|data-name]
```

要素ごとに1ブロックで、**省略なし**に展開される。

### 2-4. 転記 — 8項目チェック

要素ごとに、次の8つを「**無いことを確認した**」まで含めて転記する。

```
bg / border / radius / padding / gap / 寸法（w・h・Hug/Fill）/ フォント / 色
```

「書いていない＝無い」ではなく、「**見て、無かった**」まで確かめる。不確かな要素は、
**その要素単体**を `get_design_context` + `get_variable_defs` で再取得して裏取りする。

### 2-5. トークンへ翻訳

design context の `var(--…)` は Figma の変数名。**プロジェクトの CSS 変数へ翻訳する。**

```
bg-[var(--status/attention_base_lv2,#ffe8cf)]   →   var(--color-status-attention-base-lv2)
（左が Figma の変数名、右がプロジェクトの CSS 変数。命名の対応規則をプロジェクトで1つ決めておく）
```

- **既存トークンで表せるなら流用**する。新しいトークンは、既存に該当が無いときだけ足す
- 値は `get_variable_defs` の実値を使う（design context のフォールバック hex は最後の手段）
- **変数が当たらない数値**は、リテラルで書いたうえで**なぜ変数が当たらないか**を行コメントに残す

### 2-6. Variant プロパティは prop にする

Figma で `Size` / `Status` / `State` が **Variant プロパティ**なら、実装でも**値を prop で受ける**。
バリアントごとに部品ファイルを分けない。分けると、面が名前で選んだ値と、変数の段とが別々に育つ。

```tsx
// Figma: <ページ> › <コンポーネント>（NNN:NNNNN）— Variant プロパティ `Size`
<Thumbnail size="m" />        // ○ 値で受ける
<Thumbnail_M />               // ✗ バリアントごとに部品を分ける
```

**既定値を持たせない**（省略できない prop にする）。既定があると、書き忘れた面が黙って片方の姿で描かれる。

---

## 3. 変数のモード（見落としやすい）

Figma の Variables は **Desktop / Mobile などのモード**を持ち、**同じトークンでもモードで値が変わる**。

**モバイルのモックからデスクトップを実装するとき、測った数値をそのまま持ち込んではいけない。**

```
① モックで当たっている「トークン名」を読む（design context の var(--…)）
② そのトークンの Desktop モードの値を、プロジェクトの台帳で引く
```

モードで値が変わらないトークンは実測どおり使える。**新しく数値を足すときも、モードを持つ性質のものは
`-desktop` / `-mobile` の対で台帳に置く**（片方だけ足さない）。

---

## 4. インスタンスの override を検出する

Figma のコンポーネントが内部で別コンポーネントの**インスタンス**を使うとき、そのインスタンスに
override（内容 / 幅 / 高さ / Hug・Fill / padding / radius / 色）が掛かっていることがある。
目で比べると必ず落とすので、スクリプトで差分を取る。

```
node <skill>/scripts/figma-instance-diff.mjs <元コンポーネントの ctx> <インスタンスの ctx>
```

**インスタンス名が改変されている場合は、マスターコンポーネントまで遡る**（同じものを2つ作らない）。

---

## 5. Figma と違えるときは、必ず印を残す

写し取れないもの・意図的に変えるものは必ずある。**黙って変えない。**

コード内に決まった目印を置き、**「Figma がこうだが、この理由でこうした」**を書く。目印の綴りは
プロジェクトで1つに決めて、grep で全数を出せるようにする。

```ts
// FIGMA-DIFF(adjust): Figma のステータス列は 100px だが、現行の最長ラベルが溢れるため 120px に拡幅（node 106:3595）
// FIGMA-DIFF(component): Figma にこの画面は無い（社内の設定画面）。既存部品の組み合わせで作る
// FIGMA-DIFF(token): Figma 未定義のためプロトタイプで新設。正式パレットが定義されたらここだけ差し替える
```

**理由が読めない差分は入れない。** 印だけあって理由が無いと、次に読む人は「直すべきか、そういうものか」を
判断できない。

## 6. node-id をコードに残す（必須）

部品ファイルの先頭コメントに、出どころの node-id を書く。

```ts
// Figma: <ページ> › <コンポーネント>（NNN:NNNNN）— Variant プロパティ `Status`
```

これがあると、**あとから Figma と突き合わせられる**し、部品の一覧を機械で作れる（先頭コメントから
名前・分類・node-id を読む）。**一覧を人が書き写して持たない** —— 写した一覧は、台帳を直した日から
古くなり、しかもそれは見た目に出ない。

## 7. 実装後の突き合わせ

1. **実機で見る**（ブラウザの computed style で寸法・色を実測する。目視だけで済ませない）
2. 取得した値と実測値を突き合わせる
3. 合わないところは、**転記の落ちか、翻訳の誤りか、意図的な差分か**を判定する。
   意図的なら §5 の印を残す

---

## つまずきどころ

| 症状 | 原因 |
|---|---|
| 枠線が描画されない | 色だけ渡して border-style が none。CSS 完全形（`1px solid var(--…)`）で渡す |
| 大きさが一回り違う | Figma は「中身 + padding」で外形を出すが、実装が `border-box` だと枠線ぶんずれる。**実測の外形を持たせる** |
| 同じ絵なのに大きさが合わない | Figma が box ごとに別々に描き起こしていることがある（同じ絵でも box に対する占有率が違う）。拡縮では入れ替わらない |
| 色が変わらない | SVG に色が焼き込まれている（`<img>` で描画）。トークンを変えても追従しない。mask + `currentColor` にするか、焼き込みだと明記する |
