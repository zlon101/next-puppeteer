import {type Browser, type Page} from 'puppeteer';
import {logIcon, setInterval2} from '@/lib/tool';
import {getFileNames, rename} from '@/lib/tool-serve';
import {launch, exitBrowser, getDownloadPath} from '../brower-tool';


export async function main(query: any) {
  const task = async (browser: Browser) => {
    const shareUrl: string[] = query.musicStr.split(/\n+/).map((s: string) => s.trim());
    // 批量
    const resultMap = await batchHandle(browser, shareUrl);
    // 文件重命名
    const fileNameMap = Array.from(resultMap.keys()).reduce(
      (acc, k) => {
        acc[k] = resultMap.get(k)!
        return acc
      },
      {} as Record<string, string>
    )
    logIcon('fileNameMap', fileNameMap)
    // await rename(
    //   getDownloadPath(),
    //   fileNameMap,
    //   (nameFromDisk: string, nameFromPage: string) => {
    //     const len = nameFromPage.length
    //     const segment = nameFromPage.slice(Math.round(len * 0.25), Math.round(len * 0.75))
    //     return nameFromDisk.includes(segment)
    //   },
    // );
    await exitBrowser()
  }
  return launch(query, task)
}


// 打开多个页面进行搜索
const SearchPageUrl = 'https://yt1d.com/en305/';

async function batchHandle(browser: Browser, shareUrls: string[]): Promise<Map<string, string>> {
  const total = shareUrls.length
  const fileNameMap = new Map<string, string>();
  const page: Page = await (async () => {
    let pageList = await browser.pages();
    if (pageList && pageList.length) {
      return pageList[0];
    }
    return await browser.newPage();
  })();
  await page.goto(SearchPageUrl);

  return new Promise(async (resolve, reject) => {
    const clearTimer = setInterval2(async () => {
      const {processing, success} = await traversalDiskFiles();
      logIcon(`${processing.length} 正在下载，${success.length}下载完成`);

      if (success.length >= total) {
        logIcon('所有文件下载完成', undefined, 'success');
        clearTimer();
        resolve(fileNameMap);
      }
    }, 5000);

    for (const name of shareUrls) {
      const fileName = await crawlPage(page, browser, name);
      fileNameMap.set(fileName, name)
      // await page.bringToFront()
    }
  });
}

// 打开搜索页面，输入歌曲名
async function crawlPage(page: Page, browser: Browser, shareUrl: string): Promise<string> {
  // 搜索框输入
  await page.locator('form #txt-url').fill(shareUrl);
  await page.locator('form #btn-submit').click();

  // 搜索结果
  let time = 0
  return new Promise(resolve => {
    const clearTimer = setInterval2(async () => {
      ++time
      const hasResult = await page.evaluate(() => {
        const searchResultDom = document.querySelector('#myTabContent');
        return !!searchResultDom;
      });
      if (!hasResult) {
        if (time > 5) {
          await page.reload()
          await page.locator('form #txt-url').fill(shareUrl);
          await page.locator('form #btn-submit').click();
        }
        return
      }
      time = 0
      clearTimer();

      const fileName = await page.evaluate(() => {
        const btnDom = document.querySelector('#myTabContent td button') as HTMLButtonElement
        const _url = btnDom?.getAttribute('onclick') || ''
        btnDom?.click()
        return _url.split(',')?.[1]?.replace(/['"]/g, '')
      })
      const downSelector = await page.locator('#A_downloadUrl').waitHandle()
      const downUrl = await downSelector?.evaluate(el => el.getAttribute('href')) as string
      logIcon('downInfo', {fileName, downUrl})
      // goDownPage(browser, downUrl, fileName)
      resolve(fileName);
    }, 1000);
  });
}


async function goDownPage(browser: Browser, downUrl: string, fileName: string) {
  const page = await browser.newPage()
  await page.goto(downUrl)

  const clearTimer = setInterval2(async () => {
    const selector = await page.locator('#A_downloadUrl')?.waitHandle()
    const href = await selector?.evaluate(el => el.getAttribute('href'))
    if (href) clearTimer();
    logIcon(`点击下载按钮 - ${fileName}`)
    // setTimeout(() => page.close(), 2000)
    selector?.click()
  }, 1000)
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

