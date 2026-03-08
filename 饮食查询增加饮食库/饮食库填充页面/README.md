# 饮食库填充页面

用于基于 Excel 食物库做一体化处理：查看与检索、手动/自动合并、单位补全、营养补全、写回 Excel、版本筛选导出 JSONL。

## 当前代码能力（与现状一致）

- 后端基于 FastAPI，前端为单页 `frontend/index.html`，由后端静态托管。
- 默认展示 3 张核心表：`食物库-单位映射系数`、`食物库-标准单位（100g）`、`中国营养学会参考数据`。
- 支持按 food 维度聚合分页（不是按原始行分页），适合做合并操作。
- 支持手动合并、自动合并（预演/执行）、候选对明细查看和阈值调节。
- 支持单位模型补全（`/api/units/suggest_model`）。
- 支持营养匹配/推断与批量写回（`/api/nutrition/match_or_infer`、`/api/nutrition/bulk_update`）。
- 支持 workbook 备份与恢复（`/api/workbook/backup`、`/api/workbook/restore`）。
- 支持整文件版本筛选导出 JSONL（前端导出，不限当前分页）。

---

## 目录结构

- `backend/app.py`: API、自动合并、模型调用、写回逻辑。
- `backend/xlsx_reader.py`: Excel 读取、缓存、检索/分页、food 聚合。
- `frontend/index.html`: 页面与交互逻辑。
- `backend/.merge_mapping.json`: 自动合并知识缓存（运行后生成）。

---

## 快速启动（本地）

### 1) 安装依赖

```bash
python -m pip install -r backend/requirements.txt
```

可选：启用本地向量模型（推荐）：

```bash
python -m pip install sentence-transformers
```

### 2) 配置环境变量

最少配置（建议）：

```bash
export WORKBOOK_PATH="/你的路径/标准食物库.xlsx"
export ARK_API_KEY="你的ARK_KEY"
export ARK_MODEL="doubao-seed-1-8-251228"
```

说明：

- `WORKBOOK_PATH` 不设置时，后端会尝试自动发现项目目录下的 `.xlsx`。
- 本地 embedding 默认模型：`BAAI/bge-small-zh-v1.5`，可用 `LOCAL_EMBEDDING_MODEL` 覆盖。
- 外部 embedding（可选）：
  - `EMBEDDING_API_KEY`
  - `EMBEDDING_API_URL`（默认 `https://api.openai.com/v1/embeddings`）
  - `EMBEDDING_MODEL`（默认 `text-embedding-3-small`）

### 3) 启动服务

```bash
uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

### 4) 打开页面

- `http://127.0.0.1:8000/`

---

## 使用流程（推荐）

### 1. 加载并确认工作簿

1. 打开页面后先看顶部 workbook 路径与 sheet 是否正确。
2. 若不是目标文件，先设置 `WORKBOOK_PATH` 后重启后端。
3. 建议先点击页面中的备份按钮，创建可回滚快照。

### 2. 先做合并（手动 + 自动）

1. 在结果表按 food 检索，先处理明显同义词（手动合并）。
2. 打开自动合并面板，先“预演”查看候选对与置信度分布。
3. 调整 `T_high/T_low` 后再执行自动合并，必要时只应用自动通过组。

### 3. 单位补全

1. 对合并后的组执行单位补全（模型建议）。
2. 优先补空值，人工复核明显不合理单位换算。
3. 保留来源标记（manual/model）便于后续追踪。

### 4. 营养补全并写回

1. 对目标食物执行营养匹配/推断。
2. 复核关键字段后批量写回 `食物库-标准单位（100g）`。
3. 写回后可抽样查询确认 `0` 值与空值处理符合预期。

### 5. 按版本导出 JSONL

1. 在导出弹窗中选择版本（可多选）。
2. 执行导出，得到全文件范围的 JSONL（非当前页子集）。
3. 导出后建议保留一份 workbook 备份与导出文件同批次存档。

---

## 实现细节

以下描述与当前 `backend/app.py`、`backend/xlsx_reader.py` 行为一致，便于排查与二次开发。

### 1. 工作簿加载与 Sheet 展示

- **路径解析**（`xlsx_reader.get_workbook_path`）：优先读环境变量 `WORKBOOK_PATH`；未设置时调用 `_discover_default_workbook()`：先找项目根目录下的 `标准食物库参考数据0206.xlsx`，若无则按修改时间取该目录下最新一个 `.xlsx`；都没有则抛错。
- **Sheet 过滤**（`_filter_sheet_names`）：可选 `SHEET_WHITELIST` / `SHEET_BLACKLIST`（逗号分隔）；默认只展示在 `DEFAULT_SHEETS` 中且 workbook 里存在的三张表：`食物库-单位映射系数`、`食物库-标准单位（100g）`、`中国营养学会参考数据`。
- **Excel 读取**：`_load_workbook(workbook_path)` 使用 `openpyxl.load_workbook(..., read_only=False, data_only=False)`，保证公式未缓存时仍可解析；`_normalize_cell()` 对“纯数字算术公式”（如 `=300/100`）做安全 `ast` 求值并返回数值。
- **缓存**：`_sheet_cache`、`_foods_cache`、`_load_workbook` 带 `lru_cache`；任何写回 Excel 后需调用 `clear_caches()`，否则接口会继续返回旧数据。

### 2. 按 food 聚合与检索

- **数据源**：`/api/foods` 固定使用 sheet `食物库-单位映射系数`，通过 `query_foods()` 拉取。
- **聚合逻辑**（`xlsx_reader._foods_cache` / `query_foods`）：按行遍历，以 `food_name` 为键聚合；每行贡献 `别名`（按 `_split_aliases` 拆分为列表）、`unit` + `单位别名` + `单位转换（100克）` 合并进该 food 的 `units` 列表；行号收集到 `_rows`。最终按 food 分页，`limit` 最大 200。
- **检索**：多词 AND/OR 匹配（`_tokenize_query` 按空白、逗号、顿号等分词），匹配范围包括 `food_name`、`aliases`、各单位名及单位别名、`版本`、`备注`。
- **隐藏列**：`食物库-单位映射系数` 下 `food_unit_count`、`该单位占该食物总条数`、`该食物总计数` 不展示、不导出（`HIDDEN_COLUMNS_BY_SHEET`）。

### 3. 自动合并（`POST /api/merge/suggest_or_apply`）内部流程

- **输入**：payload 可带 `foods` 列表；若不带或为空，后端从 `食物库-单位映射系数` 全量 `query_foods` 取 food 列表。参数：`t_high`（默认 0.86）、`t_low`（默认 0.70）、`max_candidates`（默认 500）、`merge_by_id_only`、`vector_low`/`vector_high`、`use_cache`、`use_embedding_api`、`use_local_embedding`。
- **名称归一化**：对每条 food 做 `_norm_text`（NFKC、去不可见字符）、`_basic_cleanup_food_name`（去“约/大约/左右/一个/一份/适量”等噪声词、去空格与·•）、`_canonical_reordered_name`（识别“炒/煮/蒸/烤…”等烹饪动词，对两侧较短片段做字典序重排，如“番茄炒蛋”与“蛋炒番茄”统一）、得到 `_name_merge_key`；别名经同样规则生成 `_tokens`；`_embed_text` 为 merge_key 化后的主名+别名拼接，供向量用；`_fingerprint` 含 core/process/salted，供 LLM 参考。
- **合并知识缓存**：从 `backend/.merge_mapping.json` 读 `alias_to_standard`、`pair_decisions`。若某对 (A,B) 的 canonical 已相同或 `pair_decisions` 有该对记录，则直接 prefill 决策（stage=cache），不再走向量/模型。
- **向量来源（三选一）**：  
  1）`use_embedding_api=True` 时调用 `_fetch_embedding_vectors`（OpenAI 兼容 API：`EMBEDDING_API_KEY`、`EMBEDDING_API_URL`、`EMBEDDING_MODEL`、`EMBEDDING_BATCH_SIZE`），为每条 `_embed_text` 取向量写入 `_vec_api`。  
  2）否则若 `use_local_embedding=True`，调用 `_fetch_local_embedding_vectors`（`sentence_transformers.SentenceTransformer`，默认 `BAAI/bge-small-zh-v1.5`，`LOCAL_EMBEDDING_MODEL` / `LOCAL_EMBEDDING_BATCH_SIZE`），结果写入 `_vec_api`。  
  3）若上述都未得到向量，则仅用内存中的 `_vec_local`：`_char_ngram_counter(..., n=2)` 得到字符 2-gram Counter，相似度用 `_cosine_sim`。最终候选对的 `vector_similarity` 优先取 API/local 向量余弦，缺失时用 local 2-gram 余弦。
- **Blocking 召回**：按 `_merge_key` 首 2 字、尾 2 字、以及步长 2 的片段建 key（如 `p:xx`、`s:xx`、`g:xx`），再按别名 token 前 4 字建 key；同一 key 下的行下标归入同一 block；仅在 block 内两两成对，且单 block 最多取 160 个下标，避免 O(n²)。去重后得到候选对列表。
- **候选对打分与预填**：每对计算 `_heuristic_pair_score`、`_cosine_sim(_vec_local)`、`_vector_cosine(_vec_api)`；若两者 canonical 已相同或 cache 命中或 `vector_similarity >= vector_high`，则直接 prefill（same_food/confidence/reason/stage）；否则 heuristic 过低或向量过低且 heuristic 也不高则丢弃该对。保留的候选按 heuristic 降序截断至 `max_candidates`。
- **LLM 判定**：对未 prefill 的候选对，调用 `_ark_request_json`（豆包 ARK：`ARK_API_KEY`、`ARK_MODEL`），few-shot 示例 + 规则（同义词/加工深度/宁可不合并等），要求返回每对 `same_food`、`confidence`、`reason`；解析失败或超时时用 heuristic 兜底。
- **决策与 kcal 修正**：根据 `same_food` 与 `confidence`：`confidence >= t_high` 为 auto，`t_low <= confidence < t_high` 为 pending，否则 reject。若该对在 CNS 表有热量且 `kcal_diff_pct > 0.35`，则 confidence 乘 0.85；若 `<= 0.05` 则略加 0.03（上限 1.0）。
- **Union-Find 成组**：仅对 decision 为 auto 或 pending 且 same_food 的边做 `_union_find_groups(edges_low, n)`，得到连通分量（每组至少 2 个节点）。
- **标准名（primary）**：每组内用 `_pick_primary_name(members, name_freq)`：优先剔除含空格/括号/数字的候选；评分 = 名称短 50%（1/(1+len(key))）+ 频次 50%（相对全局 name_freq）；并列时更短优先、再字典序。
- **写回缓存**：每组内成员写入 `alias_to_standard[merge_key] = primary 的 merge_key`；每对写入 `pair_decisions[_pair_key(a,b)]`（same_food、confidence、reason、updated_at）。最后将 `alias_to_standard`、`pair_decisions` 写回 `backend/.merge_mapping.json`。

### 4. 单位补全（`POST /api/units/suggest_model`）

- 入参：`food_name`、`all_names`、`units`（列表，每项含 `unit`、`unit_aliases`）。必填且非空。
- 调用豆包：`ARK_MODEL`（默认 doubao-seed-1-8-251228），prompt 要求按“每单位估计克数”输出 JSON；内置常见单位默认值（g/克=1，碗=200，份=225 等）与约束（修正明显 typo、无效单位标 is_valid_unit=false 等）。
- 返回：每单位对应 `unit`、`normalized_unit`、`is_valid_unit`、`unit_to_g`、`confidence`、`reason`、`source=model`。前端据此填空并标注来源。

### 5. 营养匹配与推断（`POST /api/nutrition/match_or_infer`）

- **CNS 表**：从 sheet `中国营养学会参考数据` 全量拉取（`_get_cns_rows_cached`），按 `食物名称` 建归一化名到行的索引。
- **匹配顺序**：先用 `food_name` + `all_names` 逐个在索引中精确匹配（归一化名）；若无，用 `SequenceMatcher` 对 names 与每行 `食物名称` 算 ratio，取最高分且 ≥0.86 的作为匹配；再若无，做包含匹配（A in B 或 B in A）。命中则返回 `source: cns` 及 `_extract_nutrition_from_cns_row` 得到的标准 nutrition 键值（与 `NUT_KEYS` 一致）。
- **模型推断**：CNS 未命中时调用 `_ark_request_json`，任务为“根据食物名推断每 100g 营养”，返回 `nutrition`（含 NUT_KEYS）、`confidence`、`reason`；无法判断的字段可为 null。

### 6. 营养批量写回（`POST /api/nutrition/bulk_update`）

- 目标 sheet：`食物库-标准单位（100g）`。根据 header 建立列名到列号的映射；遍历现有行建立 `food_name -> row_idx` 索引。
- Payload：单条 `target_food_name` + `row`，或 `rows: [{ target_food_name, row }, ...]`。只写入 payload 中且目标 sheet 存在的列；跳过 `_row`、`raw_len`、`detail_url`、`category_one`、`category_two`、`food_id` 及“食物名称”。若 `target_food_name` 不在索引中则在该 sheet 末尾新增一行并只写该目标名与 row 中已有列；否则更新对应行。写入后调用 `clear_caches()`。

### 7. 备份与恢复

- **备份**（`POST /api/workbook/backup`）：`shutil.copy2` 当前 `WORKBOOK_PATH` 到 `backend/.backups/{stem}.{YYYYmmdd_HHMMSS}.bak.xlsx`，返回 `backup_id`。
- **恢复**（`POST /api/workbook/restore`）：payload 传 `backup_id`，从 `.backups` 下找到对应文件复制回 `WORKBOOK_PATH`，然后 `clear_caches()`。

### 8. 导出 JSONL（前端）

- 前端按当前合并结果与所选版本筛选，通过 `/api/sheet` 或类似接口拉取需要行，组装成包含 id、all_names、units、nutrition、source、version 等字段的文档列表，生成并下载 JSONL 文件；导出范围为全文件版本筛选结果，非仅当前分页。

---

## 后端主要接口

- `GET /api/workbook`: 当前 workbook 路径和可见 sheet。
- `GET /api/sheet`: 按 sheet 查询行（支持关键词、分页）。
- `GET /api/foods`: food 聚合查询（合并结果主视图）。
- `POST /api/merge/suggest_or_apply`: 自动合并预演/执行。
- `POST /api/units/suggest_model`: 单位换算建议。
- `POST /api/nutrition/match_or_infer`: 营养匹配/推断。
- `POST /api/nutrition/bulk_update`: 营养批量写回。
- `POST /api/workbook/backup`: 备份 workbook。
- `POST /api/workbook/restore`: 从备份恢复 workbook。

---

## 缓存与状态

- 后端 Excel 读取有缓存；写回后会自动清缓存以避免读到旧数据。
- 合并知识缓存：`backend/.merge_mapping.json`。
- 前端状态使用 `localStorage`，并带快照瘦身与配额保护。

---

## 常见问题

### 1) `/api/units/suggest_model` 返回 400

通常是缺少 `ARK_API_KEY` 或模型调用参数不完整：

```bash
echo "$ARK_API_KEY"
echo "$ARK_MODEL"
```

### 2) 端口占用（`Address already in use`）

结束占用 8000 端口的旧进程后重启。

### 3) 明明填了公式，读取到空值

项目已在读取层处理“纯数字公式”（如 `=300/100`）的安全求值；若是复杂公式，建议先在 Excel 中转成数值再导入。

### 4) 写回后页面没刷新到最新数据

先刷新页面；后端写回会清缓存，若仍异常可重启服务后重试。


