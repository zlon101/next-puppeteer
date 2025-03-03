import path, {join} from 'path';
import {exec} from 'node:child_process';
import fs from 'node:fs';
import puppeteer, {type Browser, Page, ConnectOptions} from 'puppeteer';
import {logIcon, setInterval2} from '@/lib/tool';
import {getFileNames} from '@/lib/tool-serve';
import {closeBrowser} from '../share';

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

export interface IQurey {
  pending?: boolean;
  downloadPath: string;
}

export async function launch<T extends IQurey, R>(query: T) {
  exec(ShellCmd);
  if (query.pending) {
    return;
  }
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        resolve(await openBrowser(query));
      } catch (_) {
        resolve(await openBrowser(query));
      }
    }, 2000);
  });
}

let browser: Browser;
let downloadPath = '';
async function openBrowser<R>(query: any) {
  downloadPath = query.downloadPath;
  const remoteDebuggingPort = 9231;
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
    let musicNames: string[] = query.musicStr.split(/\n+/).map((s: string) => s.trim());
    musicNames = [...new Set(musicNames)]
    const filesExit = (await getFileNames(downloadPath)).map(item => item.replace(/\.\w+$/, ''));
    const musicNamesFilted = musicNames.filter(item => !filesExit.includes(item));

    // key: 磁盘文件名
    const resultMap = await batchHandle(browser, musicNamesFilted, musicNames.length);
    // 文件重命名
    await rename(resultMap);
    await closeBrowser(browser);
    logIcon('任务完成，关闭浏览器');
    browser = null as any;
  } catch (e) {
    logIcon('openBrowser Error', undefined, 'error');
    console.log(e);
    return e as any;
  }
}

// 打开多个页面进行搜索
interface IMapValue {
  id: string;
  // 预期的文件名
  name: string;
  // 下载后的文件名
  fileName: string;
  downPageUrl: string;
}
type IokFn = (s: string, v: IMapValue) => void;
const SearchPageUrl = 'https://wavedancer.co.za/';
async function batchHandle(browser: Browser, musicNames: string[], total: number): Promise<Map<string, IMapValue>> {
  const stateMap = new Map<string, IMapValue>();
  const page: Page = await (async () => {
    let pageList = await browser.pages();
    if (pageList && pageList.length) {
      return pageList[0];
    }
    return await browser.newPage();
  })();
  await page.goto(SearchPageUrl);

  const okFn = (fileName: string, result: IMapValue) => {
    stateMap.set(result.downPageUrl, result);
  };

  return new Promise(async (resolve, reject) => {
    const clearTimer = setInterval2(async () => {
      const {processing, success} = await traversalDiskFiles();
      logIcon(`${processing.length} 正在下载，${success.length}下载完成`);

      // 关闭已经开始下载的页面
      const diskFileNames = [...processing, ...success];
      const allPage = await browser.pages();
      allPage.forEach((page2: Page) => {
        const fileName = stateMap.get(page2.url())?.fileName || '';
        if (fileName && diskFileNames.some(item => item.includes(fileName))) {
          logIcon(`关闭下载页面`);
          page2.close();
        }
      });

      if (success.length >= total) {
        logIcon('所有文件下载完成', undefined, 'success');
        clearTimer();
        resolve(stateMap);
      }
    }, 5000);

    for (const name of musicNames) {
      await crawlPage(page, browser, name, okFn);
      await page.bringToFront()
    }
  });
}

// 打开搜索页面，输入歌曲名
async function crawlPage(page: Page, browser: Browser, musicName: string, okFn: IokFn) {
  // 搜索框输入
  await page.locator('#search-form input').fill(musicName);
  await page.locator('#search-form button').click();

  // 搜索结果
  let time = 0
  return new Promise(resolve => {
    const clearTimer = setInterval2(async () => {
      ++time
      const hasResult = await page.evaluate(() => {
        const searchResultDom = document.querySelector('#results');
        return searchResultDom && searchResultDom.textContent && !!searchResultDom.textContent.trim();
      });
      if (!hasResult) {
        if (time > 5) {
          await page.reload()
          await page.locator('#search-form input').fill(musicName);
          await page.locator('#search-form button').click();
        }
        return
      }
      time = 0
      clearTimer();

      const {fileName, musicId, downPageUrl} = await parseSearchResult(browser, page);
      okFn(fileName, {
        name: musicName,
        id: musicId,
        fileName,
        downPageUrl,
      });
      resolve(true);
    }, 1000);
  });
}

// 解析搜索结果
interface IMusicInfo {
  musicId: string;
  downPageUrl: string;
  fileName: string;
}
async function parseSearchResult(browser: Browser, page: Page): Promise<IMusicInfo> {
  await page.waitForSelector('#results .download-item');
  const resultListDom = await page.waitForSelector('#results');
  const {count, musicId, fileName} = await resultListDom?.evaluate((el): any => {
    const firstItem = el.querySelector('.download-item') as Element;
    if (!firstItem) {
      logIcon(`.download-item 未找到`);
      return;
    }
    const musicId = firstItem.getAttribute('data-id');
    const fileName = firstItem.querySelector('h2')?.textContent?.trim();
    const [count, btnDom] = [
      firstItem.querySelector('.text-sm.text-gray-500')?.textContent?.trim()?.split(' ')[0],
      firstItem.querySelector('.mt-auto button') as HTMLButtonElement,
    ];
    btnDom?.click();
    return {count, musicId, fileName};
  });

  try {
    const iframeDom = await page.waitForSelector('iframe.w-full');
    const iframeUrl = (await iframeDom?.evaluate(el => el.getAttribute('src'))) as string;
    // 在新页面打开下载table，点击下载按钮，获取下载url并且开始下载
    const downPage = await browser.newPage();
    await downPage.goto(iframeUrl);
    await downPage.locator('#app .btn').click();
    // await downPage.reload();
    // await downPage.locator('#app .btn').click();
    return {musicId, downPageUrl: iframeUrl, fileName};
  } catch (e) {
    return await parseSearchResult(browser, page);
  }
}


// 定时遍历下载目录中的文件，判断某个文件是否已经开始下载
function traversalDiskFiles(): Promise<{processing: string[]; success: string[]}> {
  return new Promise(async (resolve, reject) => {
    const files = await getFileNames(downloadPath);
    const success: string[] = [];
    const processing: string[] = [];
    // 文件名中包含 crdownload 表示正在下载
    (files || []).forEach((name: string) => {
      if (name.includes('crdownload')) {
        processing.push(name);
      } else {
        success.push(name);
      }
    });
    resolve({processing, success});
  });
}

// 重命名文件
function rename(map: Map<string, IMapValue>): Promise<void> {
  logIcon('开始重命名 rename');
  let count = 0;
  const N = map.size;
  const musicInfoArray = Array.from(map.values());

  const renameFile = (files: string[], resolve: () => void) => {
    files.forEach((oldName: string) => {
      // oldName 带文件后缀
      const ext = path.extname(oldName);
      const newFileName = musicInfoArray.find(item =>{
        // 页面上解析到的文件名
        const fileNameInPage = item.fileName
        const len = fileNameInPage.length
        const segment = fileNameInPage.slice(Math.round(len * 0.25), Math.round(len * 0.75))
        return oldName.includes(segment)
      })?.name;
      if (!newFileName) {
        count++;
        count >= N && resolve();
        logIcon(`未找到 ${oldName} 对应的 map value `, undefined, 'error');
        return;
      }
      const newFilePath = path.join(downloadPath, `${newFileName}${ext}`);
      const oldFilePath = path.join(downloadPath, oldName);
      fs.rename(oldFilePath, newFilePath, err => {
        count++;
        count >= N && resolve();
        if (err) {
          return logIcon(`重命名文件 ${oldName} 失败: `, err, 'error');
        }
      });
    });
  };

  return new Promise(async (resolve, reject) => {
    const fileNames = await getFileNames(downloadPath);
    renameFile(fileNames, resolve);
  });
}
