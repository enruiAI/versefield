import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * 浏览器路径：CHROME_PATH 环境变量优先；否则按平台探测常见 Chrome/Edge/Chromium 安装位置。
 * 找不到时 puppeteer 会给出明确报错，提示用户设置 CHROME_PATH。
 */
function detectChrome() {
  const env = process.env.CHROME_PATH;
  if (env) return env;
  const candidates = [];
  if (process.platform === 'win32') {
    const bases = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA].filter(Boolean);
    for (const b of bases) {
      candidates.push(
        `${b}\\Google\\Chrome\\Application\\chrome.exe`,
        `${b}\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${b}\\Chromium\\Application\\chrome.exe`
      );
    }
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    );
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }
  return candidates.find(p => existsSync(p)) || '';
}

export const CHROME = detectChrome();

export async function launch(opts = {}) {
  return puppeteer.launch({
    executablePath: CHROME || undefined,
    headless: 'new',
    args: [
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--autoplay-policy=no-user-gesture-required',
      '--allow-file-access-from-files'
    ],
    defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
    ...opts
  });
}

export function fileUrl(rel) {
  const abs = resolve(process.cwd(), rel).replace(/\\/g, '/');
  return 'file:///' + abs;
}
