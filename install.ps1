param(
  [switch]$Force
)

# 把本仓库（也就是 VerseField 技能包本体）安装到 DSH 技能目录：
#   C:\Users\<你>\.dsh\skills\versefield
# 用法：powershell -ExecutionPolicy Bypass -File .\install.ps1
#       powershell -ExecutionPolicy Bypass -File .\install.ps1 -Force   # 覆盖安装

$ErrorActionPreference = 'Stop'
$src = (Resolve-Path -LiteralPath $PSScriptRoot).Path.TrimEnd('\', '/')
$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$dest = Join-Path $dshHome 'skills\versefield'
$destFull = [System.IO.Path]::GetFullPath($dest).TrimEnd('\', '/')

if (-not (Test-Path -LiteralPath (Join-Path $src 'SKILL.md'))) {
  throw "找不到 SKILL.md：$src`n请在 versefield 仓库根目录运行本脚本。"
}

# 如果当前目录就是技能目录，不需要也不应该“覆盖自己”
if ($src -ieq $destFull) {
  Write-Host "✔ 当前目录就是技能目录，无需重复安装：$destFull"
  exit 0
}

if ((Test-Path -LiteralPath $dest) -and -not $Force) {
  Write-Error "目标已存在：$dest`n如果确认覆盖，请加 -Force 重新运行。"
}

New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dest | Out-Null

# 只复制技能内容：排除版本库、CI 配置、开发产物与依赖
$exclude = @('.git', '.github', 'research', 'node_modules', '__pycache__')
Get-ChildItem -LiteralPath $src -Force |
  Where-Object { $exclude -notcontains $_.Name } |
  ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
  }

Write-Host "✔ VerseField 技能已安装到 $dest"
Write-Host "  在 DSH 会话里说：用 versefield 做《歌名》从「第一句」到「最后一句」"
Write-Host "  想更新：git -C `"$dest`" pull（或重新运行本脚本 -Force）"
