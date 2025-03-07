import path, {join} from 'path';
import {exec} from 'node:child_process';
import fs from 'node:fs';
import puppeteer, {type Browser, Page, ConnectOptions} from 'puppeteer';
import {logIcon, setInterval2} from '@/lib/tool';
import {getFileNames} from '@/lib/tool-serve';


const ShellCmd = join(process.cwd(), 'script', 'chrome.sh');
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
    '--disable-infobars', // 禁用浏览器正在被自动化程序控制的提示
    // '--disable-web-security', // 忽略跨域
    // `--user-data-dir="${join(process.cwd(), 'chrome-user')}"`,
    // '--disable-accelerated-2d-canvas',
    // '--disable-gpu',
    // '--window-size=100,100',
    // `--user-agent=${UserAgent}`,
    // '--no-startup-window', // 启动时不建立窗口
    // '--start-fullscreen',
  ],
};
const remoteDebuggingPort = 9231;
let browser: Browser;
let downloadPath = '';

export interface IQurey {
  pending?: boolean;
  downloadPath: string;
}
type ITask = (b: Browser, ...rest: any[]) => Promise<any>


export async function launch<T extends IQurey, R>(query: T, task: ITask): Promise<R | undefined> {
  exec(ShellCmd);
  if (query.pending) {
    return;
  }
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        resolve(await openBrowser(query, task));
      } catch (_) {
        resolve(await openBrowser(query, task));
      }
    }, 2000);
  });
}


async function openBrowser<T extends IQurey>(query: T, task: ITask) {
  downloadPath = query.downloadPath.trim();

  const resData = await fetch(`http://127.0.0.1:${remoteDebuggingPort}/json/version`);
  const chromeJson = await resData.json();
  if (!browser) {
    const connectConf: ConnectOptions = {
      browserWSEndpoint: chromeJson.webSocketDebuggerUrl,
      defaultViewport: LaunchParam.defaultViewport,
      protocolTimeout: 999999999,
      downloadBehavior: {
        policy: 'allow', // allowAndName
        downloadPath: downloadPath,
      },
    };
    browser = await puppeteer.connect(connectConf);
    // const browser = await puppeteer.launch(LaunchParam);
  }

  try {
    // 执行任务
    await task(browser)
    logIcon('任务完成，关闭浏览器', undefined, 'success');
    await exitBrowser()
  } catch (e: any) {
    logIcon('openBrowser Error', undefined, 'error');
    console.log(e);
    return e;
  }
}

export function getDownloadPath(): string {
  return downloadPath
}

export async function closeBrowser(browser: Browser) {
  try {
    const pages = await browser.pages() || [];
    await Promise.all(pages.map(async (item: any) => await item.close()));
    if (browser.connected || browser.isConnected()) {
      await browser.close();
      await browser.disconnect();
    } else {
      await browser.close();
    }
  } catch (error) {
  }
}

export async function exitBrowser() {
  if (browser) {
    await closeBrowser(browser);
    browser = null as any;
  }
}


// 插入js代码
function injectJS(html: string): string {
  const script = `
<script type="text/javascript">
  console.debug('🔥🔥 执行注入的js')
  window.addEventListener = function windowListener() {
    console.debug('执行 window.addEventListener')
    debugger
  }
  // document.addEventListener = function documentListener() {
  //   console.debug('执行 document.addEventListener')
  //   debugger
  // }
  window.open = function customOpen() {
    console.debug('执行 customOpen')
    debugger
  }
</script>
`;
  html = html.trim();
  if (/^<!DOCTYPE/i.test(html)) {
    const head = '<head>';
    const startIdx = html.indexOf(head);
    const len = head.length;
    return html.slice(0, startIdx + len) + script + html.slice(startIdx + len + 1);
  }
  return script + html;
}
