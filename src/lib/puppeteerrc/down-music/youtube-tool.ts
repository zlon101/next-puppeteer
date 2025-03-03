import puppeteer, {type Browser, Page, ConnectOptions} from 'puppeteer';
import {logIcon, setInterval2} from '@/lib/tool';

const YoutubeMusic = 'https://music.youtube.com/'

export async function getBatchShareUrl(browser: Browser, musicNames: string[]): Promise<Record<string, string>> {
  const stateMap: Record<string, string> = {};
  const page: Page = await browser.newPage();
  return new Promise(async (resolve, reject) => {
    for (const name of musicNames) {
      stateMap[name] = await getYoutubeShareUrl(page, name);
    }
    resolve(stateMap)
    page.close()
  });
}


// 根据歌曲名称获取对应歌曲在youtube 上的分享链接
async function getYoutubeShareUrl(page: Page, musicName: string): Promise<string> {
  await page.goto(encodeURIComponent(`${YoutubeMusic}search?q=${musicName}`)) // 稻香+周杰伦
  return new Promise(resolve => {
    setTimeout(async () => {
      const shareUrl = await page.evaluate(() => {
        const appSelect = 'body #layout #content.ytmusic-app'
        document.querySelector<HTMLButtonElement>(`${appSelect} #search-page .ytmusic-search-page .ytmusic-tabbed-search-results-renderer .style-scope #contents ytmusic-shelf-renderer #contents .ytmusic-shelf-renderer .menu button`)?.click()
        document.querySelector<HTMLButtonElement>(`${appSelect} #items .ytmusic-menu-popup-renderer:last-child a#navigation-endpoint`)?.click()
        return document.querySelector<HTMLInputElement>('.ytmusic-popup-container #share-url')?.value
      });
      if (!shareUrl) {
        logIcon(`${musicName} 对应的分享链接获取失败`, undefined, 'error')
      }
      resolve(shareUrl!);
    }, 1000);
  });
}
