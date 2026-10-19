#!/usr/bin/env bash
# 把本仓库（也就是 VerseField 技能包本体）安装到 DSH 技能目录：~/.dsh/skills/versefield
# 用法：./install.sh           （目标已存在时报错）
#       ./install.sh --force   （覆盖安装）
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
DEST="$DSH_HOME/skills/versefield"

if [ ! -f "$SRC/SKILL.md" ]; then
  echo "找不到 SKILL.md：$SRC" >&2
  echo "请在 versefield 仓库根目录运行本脚本。" >&2
  exit 1
fi

# 如果当前目录就是技能目录，不需要也不应该“覆盖自己”
mkdir -p "$(dirname "$DEST")"
SRC_REAL="$(cd "$SRC" && pwd -P)"
DEST_REAL="$(cd "$(dirname "$DEST")" && pwd -P)/$(basename "$DEST")"
if [ "$SRC_REAL" = "$DEST_REAL" ]; then
  echo "✔ 当前目录就是技能目录，无需重复安装：$DEST_REAL"
  exit 0
fi

if [ "${1:-}" != "--force" ] && [ -e "$DEST" ]; then
  echo "目标已存在：$DEST" >&2
  echo "如果确认覆盖，请运行：$0 --force" >&2
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"

# 只复制技能内容：排除版本库、CI 配置、开发产物与依赖
for item in "$SRC"/* "$SRC"/.[!.]* "$SRC"/..?*; do
  [ -e "$item" ] || continue
  case "$(basename "$item")" in
    .git|.github|research|node_modules|__pycache__) continue ;;
  esac
  cp -R "$item" "$DEST"/
done
find "$DEST" -name '*.pyc' -delete 2>/dev/null || true
find "$DEST" -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true

echo "✔ VerseField 技能已安装到 $DEST"
echo "  在 DSH 会话里说：用 versefield 做《歌名》从「第一句」到「最后一句」"
echo "  想更新：git -C \"$DEST\" pull（或重新运行本脚本）"
