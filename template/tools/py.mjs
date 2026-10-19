/**
 * 找到可用的 Python 解释器（供 contact-sheet.mjs 调 montage.py 用）。
 * 优先级：DSH_PYTHON / PYTHON 环境变量 → PATH 里的 python/python3/py → DSH 运行时默认路径。
 */
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

function works(cmd) {
  try {
    execFileSync(cmd, ['--version'], { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

export function findPython() {
  const envs = [process.env.DSH_PYTHON, process.env.PYTHON];
  for (const p of envs) {
    if (p && existsSync(p)) return p;
  }
  for (const c of ['python', 'python3', 'py']) {
    if (works(c)) return c;
  }
  const dshDefault = process.env.DSH_HOME
    ? `${process.env.DSH_HOME}\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe`
    : '';
  if (dshDefault && existsSync(dshDefault)) return dshDefault;
  throw new Error('找不到 Python；请设置环境变量 DSH_PYTHON 或 PYTHON 指向 python 可执行文件');
}

export const PYTHON = findPython();
