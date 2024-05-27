/**
 * headerless Chromium
 * https://github.com/puppeteer/puppeteer
 */

import {join} from 'path';
import puppeteer from 'puppeteer';
import {logIcon} from '@/lib/tool';
import {closeBrowser} from './share';
import {handleCustomSearch} from './boss';

const LaunchParam = {
  //  devtools: false,
  executablePath: '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
  headless: false,
  userDataDir: join(process.cwd(), 'chrome-user'),
  defaultViewport: {
    width: 1440,
    height: 900,
  },
  args: [
    '--disable-features=site-per-process',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    // '--disable-accelerated-2d-canvas',
    // '--disable-gpu',
    // '--window-size=100,100',
    // `--user-agent=${UserAgent}`,
    // '--disable-infobars', // 禁用浏览器正在被自动化程序控制的提示
    // '--no-startup-window', // 启动时不建立窗口
    // '--start-fullscreen',
  ],
};

export async function launch(query) {
  logIcon(`================= ${query.type} ==================================`);
  const browser = await puppeteer.launch(LaunchParam);
  try {
    return await handleCustomSearch(browser, query);
  } catch (e) {
    logIcon('未知错误', e);
    await closeBrowser(browser);
    return e;
  }
}
