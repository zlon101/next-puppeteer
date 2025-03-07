import {type Browser, type Page} from 'puppeteer';
import {logIcon, setInterval2} from '@/lib/tool';
import {getFileNames, rename} from '@/lib/tool-serve';
import {launch, exitBrowser, getDownloadPath} from '../brower-tool';


export async function main(query: any) {
  const task = async (browser: Browser) => {
    // let musicNames: string[] = query.musicStr.split(/\n+/).map((s: string) => s.trim());
    // musicNames = [...new Set(musicNames)]
    // const filesExit = (await getFileNames(getDownloadPath())).map(item => item.replace(/\.\w+$/, ''));
    // const musicNamesFilted = musicNames.filter(item => !filesExit.includes(item));

    const shareUrl: string[] = query.musicStr.split(/\n+/).map((s: string) => s.trim());
    // 批量
    const resultMap = await batchHandle(browser, shareUrl);
    // 文件重命名
    const fileNameMap = Array.from(resultMap.values()).reduce(
      (acc, cur) => {
        acc[cur.fileName] = cur.name
        return acc
      },
      {} as Record<string, string>
    )
    await rename(
      getDownloadPath(),
      fileNameMap,
      (nameFromDisk: string, nameFromPage: string) => {
        const len = nameFromPage.length
        const segment = nameFromPage.slice(Math.round(len * 0.25), Math.round(len * 0.75))
        return nameFromDisk.includes(segment)
      },
    );
    await exitBrowser()
  }
  return launch(query, task)
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
const SearchPageUrl = 'https://yt1d.com/en305/';

async function batchHandle(browser: Browser, shareUrl: string[]): Promise<Map<string, IMapValue>> {
  const total = shareUrl.length
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

    for (const name of shareUrl) {
      await crawlPage(page, browser, name, okFn);
      await page.bringToFront()
    }
  });
}

// 打开搜索页面，输入歌曲名
async function crawlPage(page: Page, browser: Browser, shareUrl: string, okFn: IokFn) {
  // 搜索框输入
  await page.locator('form #txt-url').fill(shareUrl);
  await page.locator('form #btn-submit').click();

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
          await page.locator('#search-form input').fill(shareUrl);
          await page.locator('#search-form button').click();
        }
        return
      }
      time = 0
      clearTimer();

      const {fileName, musicId, downPageUrl} = await parseSearchResult(browser, page);
      okFn(fileName, {
        name: shareUrl,
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
  const {count, musicId} = await resultListDom?.evaluate((el): any => {
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

    const titleSelector = await downPage.locator('h2.title').waitHandle();
    const fileName = await titleSelector?.evaluate(el => el.textContent);
    // 下载页面A: await downPage.locator('#app .btn').click();
    await downPage.locator('table tbody tr button').click();
    logIcon(`点击下载按钮 - ${fileName}`)
    return {musicId, downPageUrl: iframeUrl, fileName: (fileName || '').trim()};
  } catch (e) {
    return await parseSearchResult(browser, page);
  }
}


// 定时遍历下载目录中的文件，判断某个文件是否已经开始下载
function traversalDiskFiles(): Promise<{processing: string[]; success: string[]}> {
  return new Promise(async (resolve, reject) => {
    const files = await getFileNames(getDownloadPath());
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
