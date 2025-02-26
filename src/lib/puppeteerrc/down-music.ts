import path, {join} from 'path';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import puppeteer, {type Browser, Page, HTTPResponse, HTTPRequest, ConnectOptions, BrowserContext} from 'puppeteer';
import {logIcon, getParams, setInterval2} from '@/lib/tool';
import {closeBrowser} from './share';

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
  pending?: boolean
  downloadPath: string
}


export async function launch<T extends IQurey, R>(query: T) {
  exec(ShellCmd);
  if (query.pending) {
    return
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


let browser: Browser
let downloadPath = ''
async function openBrowser<R>(query: any) {
  downloadPath = query.downloadPath
  const remoteDebuggingPort = 9231
  const resData = await fetch(`http://127.0.0.1:${remoteDebuggingPort}/json/version`);
  const chromeJson = await resData.json();

  if (!browser) {
    const connectConf: ConnectOptions = {
      browserWSEndpoint: chromeJson.webSocketDebuggerUrl,
      defaultViewport: LaunchParam.defaultViewport,
      protocolTimeout: 999999999,
      downloadBehavior: {
        policy: 'allow',
        downloadPath: downloadPath,
      },
    }
    browser = await puppeteer.connect(connectConf);
    // const browser = await puppeteer.launch(LaunchParam);

    /**
     * 无痕模式
     * In Chrome all non-default contexts are incognito
    const browserSelf = await puppeteer.connect(connectConf);
    browser = await browserSelf.createBrowserContext() as any as Browser;
     */
  }

  try {
    const musicNames = query.musicStr.split(/\n+/).map((s: string) => s.trim())
    // 磁盘文件名作为 key
    const resultMap = await batchHandle(browser, musicNames)
    // 文件重命名
    await rename(resultMap)
    await closeBrowser(browser);
    logIcon('任务完成，关闭浏览器')
    browser = null as any
  } catch (e) {
    logIcon('openBrowser Error', undefined, 'error');
    console.log(e);
    return e as any;
  }
}


// 打开多个页面进行搜索
interface IMapValue {
  id: string
  // 预期的文件名
  name: string
  // 下载后的文件名
  fileName: string
  downUrl: string
  // 文件的前缀，不同歌曲的前缀可能不同
  flag: string
}
async function batchHandle(browser: Browser, musicNames: string[]): Promise<Map<string, IMapValue>> {
  const stateMap = new Map<string, IMapValue>()
  const N = musicNames.length;
  const page: Page = await (async() => {
    let pageList = await browser.pages()
    if (pageList && pageList.length) {
      return pageList[0]
    }
    return await browser.newPage();
  })()

  return new Promise(async (resolve, reject) => {
    const okFn = (fileName: string, result: IMapValue) => {
      stateMap.set(fileName, result)
      // 已经获取全部歌曲的下载url
      if (stateMap.size === N) {
        const clearTimer = setInterval2(async () => {
          const count = await traversalDiskFiles()
          logIcon(`已经下载 ${count} 个文件`)
          // 下载完成
          if (count >= N) {
            clearTimer()
            resolve(stateMap)
          }
        }, 8000)
      }
    }
    for (const name of musicNames) {
      await crawlPage(browser, page, name, okFn)
    }
  })
}


// 打开页面，解析DOM
const SearchPageUrl = 'https://wavedancer.co.za/';
async function crawlPage(browser: Browser, page: Page, musicName: string, okFn: (s: string, v: IMapValue) => void) {
  await page.goto(SearchPageUrl);
  logIcon(`打开搜索页面 - ${musicName}`)
  // 搜索结果
  const ApiSearch = 'https://loftadditions.co.za/' // 搜索接口
  const ApiDown = 'https://ytdl.canehill.info/v/'
  page.on('response', async (res: HTTPResponse) => {
    const [url, status, ok, method] = [res.url(), res.status(), res.ok(), res.request().method()]
    // 接口返回搜索结果
    if (url === ApiSearch && method === 'POST' && ok) {
      const {downUrl, musicId} = await parseSearchResult(page);
      // https://dl5.canehill.info/dl/sHD_z90ZKV0/mp3/320?r=za&t=稻香&h=986498050db61dd2e2d0eb334a921885
      const urlQuery = getParams(decodeURIComponent(downUrl))
      const fileName = `${urlQuery.r} - ${urlQuery.t}`;
      okFn(fileName, {
        flag: urlQuery.t.trim(),
        name: musicName,
        id: musicId,
        downUrl,
        fileName,
      })
      logIcon(`开始下载 ${musicName}`)
      setTimeout(async () => {
        await page.close()
      }, 1500);
      return;
    }
  });

  // 搜索框
  await page.locator('#search-form input').fill(musicName)
  await page.locator('#search-form button').click();
  logIcon(`点击搜索按钮 ${musicName}`)
}


// 解析搜索结果
async function parseSearchResult(page: Page): Promise<{musicId: string, downUrl: string}> {
  await page.waitForSelector('#results .download-item')
  const resultListDom = await page.waitForSelector('#results')
  const {count, musicId} = await resultListDom?.evaluate((el): any => {
    const firstItem = el.querySelector('.download-item') as Element
    if (!firstItem) {
      logIcon(`.download-item 未找到`)
      return
    }
    const musicId = firstItem.getAttribute('data-id');
    const [count, btnDom] = [
      firstItem.querySelector('.text-sm.text-gray-500')?.textContent?.trim()?.split(' ')[0],
      firstItem.querySelector('.mt-auto button') as HTMLButtonElement
    ]
    btnDom?.click()
    return { count, musicId };
  })
  // await page.locator('#search-form button').click();
  const downUrl = await getDownUrl(page, musicId)
  return {musicId, downUrl}
}


// 在新页面打开下载table，点击下载按钮，获取下载url并且开始下载
interface IDownUrlRes {
  downloadUrl: string;
  progress: number
  status: 'completed' | 'other'
}
async function getDownUrl(page: Page, musicId: string): Promise<string> {
  /**
   * 设置下载路径
  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath,
  })
   * ******/

  // 获取下载url，域名可能不同， https://api5.canehill.info/convert/${musicId}/mp3/320
  const returnDownPath = `/convert/${musicId}/mp3`
  const pageUrl = `https://ytdl.canehill.info/v/${musicId}`

  page.setRequestInterception(true)
  page.on('request', (req: HTTPRequest) => {
    const [url, method, resourceType, headers] = [req.url(), req.method(), req.resourceType(), req.headers()]
    if (url.includes(pageUrl)) {
      logIcon(`拦截请求 method: ${method} resourceType: ${resourceType}`, headers)
      // req.respond({
      //   status: 200,
      //   contentType: 'text/plain',
      //   body: 'Not Found!',
      // })
    } else {

    }
    req.continue()
  });

  return new Promise(async (resolve, reject) => {
    page.on('response', async (res: HTTPResponse) => {
      const [url, status, ok, method] = [res.url(), res.status(), res.ok(), res.request().method()]
      if (method === 'POST' && ok && url.includes(returnDownPath)) {
        const resJson: IDownUrlRes = await res.json()
        if (resJson.progress > 99 || resJson.status === 'completed') {
          resolve(resJson.downloadUrl)
          // client.removeAllListeners()
        }
      }

      // 获取 html 插入 js ，覆盖 window document 上的事件监听器
      if (url.includes(pageUrl)) {
        const htmlText = await res.text()
        const newHtml = injectJS(htmlText)
        const req = res.request()
        req.respond({
          status,
          headers: {
            ...res.headers(),
            'X-Overwrite': 'true',
          },
          body: newHtml,
          contentType: req.resourceType(),
        });
      }
    })

    await page.goto(pageUrl)

    const mp3SU = await page.evaluateHandle(() => {
      (window as any).aUrl = '';
      return (window as any).mp3SU
    })
    logIcon('mp3SU', mp3SU)
    // 点击下载按钮
    // await page.locator('table.border-separate button[data-quality="320"]').click();

    // const downTableDom = await page.waitForSelector('.border-separate')
    // await downTableDom?.evaluate(el => {
    //   const downBtnDom = el.querySelector('tbody tr button') as HTMLButtonElement
    //   downBtnDom?.click()
    // })
  })
}


// 定时遍历下载目录中的文件，判断某个文件是否已经开始下载
function traversalDiskFiles (): Promise<number> {
  return new Promise((resolve, reject) => {
    fs.readdir(downloadPath, (err, files: string[]) => {
      if (err) {
        reject('无法扫描目录')
        return logIcon('无法扫描目录', err, 'error');
      }
      // 文件名中包含 crdownload 表示正在下载
      const complete = (files || []).filter((name: string) => {
        return !name.includes('crdownload') && !name.includes('DS_Store')
      })
      const count = complete.length
      resolve(count)
    });
  })
}


// 重命名文件
function rename (map: Map<string, IMapValue>): Promise<void> {
  logIcon('开始重命名 rename')
  let count = 0
  const N = map.size

  const renameFile = (files: string[], resolve: () => void) => {
    files.forEach((oldName: string) => {
      const oldFilePath = path.join(downloadPath, oldName);
      // oldName 带文件后缀
      const ext = path.extname(oldName)
      const newFileName = map.get(oldName.replace(ext, ''))?.name;
      if (!newFileName) {
        count++
        count >= N && resolve()
        logIcon(`未找到 ${oldName} 对应的 map value `, undefined, 'error');
        return
      }
      const newFilePath = path.join(downloadPath, `${newFileName}${ext}`);
      fs.rename(oldFilePath, newFilePath, (err) => {
        count++
        count >= N && resolve()
        if (err) {
          return logIcon(`重命名文件 ${oldName} 失败: `, err, 'error');
        }
      });
    })
  }

  return new Promise((resolve, reject) => {
    fs.readdir(downloadPath, (err, files: string[]) => {
      if (err) {
        reject('无法扫描目录')
        return logIcon('无法扫描目录', err, 'error');
      }
      renameFile(files.filter(name => !name.includes('DS_Store')), resolve)
    });
  })
}

/**
 * 人工校验？
 * 重复点击下载按钮？
 * ***************/

// 插入js代码
function injectJS(html: string): string {
  const script = `
<script type="text/javascript">
  console.debug('\n🔥🔥 执行注入的js')
  window.addEventListener = function windowListener() {
    console.debug('执行 window.addEventListener')
    debugger
  }
  document.addEventListener = function documentListener() {
    console.debug('执行 document.addEventListener')
    debugger
  }
  window.open = function customOpen() {
    console.debug('执行 customOpen')
    debugger
  }
</script>
`;
  html = html.trim()
  if (/^<!DOCTYPE/i.test(html)) {
    const head = '<head>'
    const startIdx = html.indexOf(head)
    const len = head.length
    return html.slice(0, startIdx + len) + script + html.slice(startIdx + len + 1)
  }
  return script + html
}
