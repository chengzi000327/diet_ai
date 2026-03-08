from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Optional

from .xlsx_reader import iter_sheet_dict_rows


def export_sheet_jsonl(workbook_path: str, sheet_name: str, out_path: str, *, max_rows: Optional[int] = None) -> None:
    p = Path(out_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8") as f:
        for r in iter_sheet_dict_rows(workbook_path, sheet_name, max_rows=max_rows):
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser(description="导出 xlsx 的某个 sheet 为 jsonl（原始表）")
    ap.add_argument("--workbook", required=True, help="xlsx 路径")
    ap.add_argument("--sheet", required=True, help="sheet 名称")
    ap.add_argument("--out", required=True, help="输出 jsonl 路径")
    ap.add_argument("--max-rows", type=int, default=None, help="最多导出多少行（调试用）")
    args = ap.parse_args()

    export_sheet_jsonl(args.workbook, args.sheet, args.out, max_rows=args.max_rows)
    print(f"ok: {args.sheet} -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


