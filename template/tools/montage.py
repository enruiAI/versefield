# 把 shots/qa_<id>.png 拼成接触表：node tools/contact-sheet.mjs 的收尾步骤。
# 场景列表/歌词/取样时间全部读项目根目录 project.json（不再写死某一首歌）；
# 列数自适应：n > 9 用 4 列，否则 3 列；行数 = ceil(n / cols)。
# 字体/配色/格子样式保持原样。
import json
import math
import os
import sys
from math import ceil
from PIL import Image, ImageDraw, ImageFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
shots = os.path.join(root, "shots")
project_json = os.path.join(root, "project.json")


def load_items():
    """从 project.json 生成 [(scene_id, '时间s', lyric), ...]，时间取镜头 55% 处。"""
    try:
        with open(project_json, "r", encoding="utf-8") as f:
            project = json.load(f)
    except FileNotFoundError:
        sys.exit("[montage] 找不到 %s（项目根目录需要有 scaffold 生成的 project.json）" % project_json)
    except json.JSONDecodeError as e:
        sys.exit("[montage] %s 不是合法 JSON：%s" % (project_json, e))

    scenes = project.get("scenes") or []
    if not scenes:
        sys.exit("[montage] %s 里没有 scenes，无法生成接触表" % project_json)

    items = []
    for s in scenes:
        sid = s.get("id")
        start = float(s["start"])
        dur = float(s["dur"]) if s.get("dur") is not None else float(s["end"]) - start
        # 与 tools/project.mjs 的 sceneMid 保持一致（四舍五入到 2 位，half-up），
        # 保证接触表标签时间 == 截图取样时间。
        mid = math.floor((start + dur * 0.55) * 100 + 0.5) / 100.0
        items.append((sid, "%.1fs" % mid, s.get("lyric") or ""))
    return items


items = load_items()
n = len(items)
cols = 4 if n > 9 else 3
rows = ceil(n / cols)
cell_w, cell_h = 400, 225
pad = 8
label_h = 30
W = cols * cell_w + (cols + 1) * pad
H = rows * (cell_h + label_h) + (rows + 1) * pad
sheet = Image.new("RGB", (W, H), (6, 5, 12))
draw = ImageDraw.Draw(sheet)
FONT_CANDIDATES = [
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/msyhbd.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
]
font_path = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)
try:
    font = ImageFont.truetype(font_path, 14) if font_path else ImageFont.load_default()
    font_small = ImageFont.truetype(font_path, 12) if font_path else ImageFont.load_default()
except Exception:
    font = font_small = ImageFont.load_default()

for i, (sid, t, lyric) in enumerate(items):
    p = os.path.join(shots, "qa_%s.png" % sid)
    c = i % cols
    r = i // cols
    x = pad + c * (cell_w + pad)
    y = pad + r * (cell_h + label_h + pad)
    if os.path.exists(p):
        im = Image.open(p).convert("RGB").resize((cell_w, cell_h), Image.LANCZOS)
        sheet.paste(im, (x, y))
    draw.text((x + 4, y + cell_h + 4), "%s  %s" % (sid.upper(), t), fill=(120, 230, 255), font=font)
    draw.text((x + 74, y + cell_h + 4), lyric, fill=(210, 220, 235), font=font_small)
    draw.rectangle([x - 1, y - 1, x + cell_w, y + cell_h], outline=(40, 90, 110))

out = os.path.join(shots, "contact_sheet.png")
sheet.save(out)
print(out, sheet.size)
