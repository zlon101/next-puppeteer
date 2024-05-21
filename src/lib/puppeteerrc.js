/**
 * headerless Chromium
 * https://github.com/puppeteer/puppeteer
 */

import {join} from 'path';
import puppeteer from 'puppeteer';
import {load} from 'cheerio';
import {logIcon} from '@/lib/tool';

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

const BossListPage = `https://www.zhipin.com
/web/geek/job
?city=101270100&experience=101,103,104,105&position=100901,100208&jobType=1901&salary=405`;

const JobDetailPage = `https://www.zhipin.com/job_detail/encryptJobId.html?
lid=lid&
securityId=securityId&
sessionId=`;

const BossListApi = `https://www.zhipin.com/wapi/zpgeek/search/joblist.json
?scene=1&query=&city=101270100&experience=101,103,104,105&payType=&partTime=&degree=
&industry=&scale=&stage=&position=100901,100208&jobType=1901&salary=405&multiBusinessDistrict=&multiSubway=
&page=1&pageSize=50`;

const JobInfo = 'https://www.zhipin.com/wapi/zpgeek/job/card.json';

const PageLimit = 100000000;
const JobLimit = 999999999999999;
const WaitLogin = false;

export async function launch(query) {
  logIcon(`================= ${query.type} ==================================`);
  const browser = await puppeteer.launch(LaunchParam);
  try {
    const page = await (async () => {
      const pages = await browser.pages();
      if (pages?.length > 0) {
        return pages[0];
      }
      return await browser.newPage();
    })();

    const domLoadedCb = async () => {
      const curPage = await (async () => {
        const curPageDom = await page.waitForSelector('.options-pages a.selected');
        return curPageDom?.evaluate(el => parseInt(el.textContent));
      })();
      // 下一页
      try {
        const nextPageSelector = '.options-pages a:last-child';
        const nextPageIcon = await page.waitForSelector(nextPageSelector);
        const nextPageDisable = await nextPageIcon?.evaluate(el => el.classList.contains('disabled'));
        // 最后一页
        if (nextPageDisable) {
          logIcon(`已经是最后一页, ${curPage}`);
          return curPage;
        }
        logIcon(`点击下一页`);
        setTimeout(() => page.click(nextPageSelector), 100);
        return 0;
      } catch (e) {
        logIcon('domLoadedCb 错误', e, 'error');
      }
    };

    let totalJobs = [];
    let pageCount = 0;
    return new Promise(async (resolve, reject) => {
      /****
      await page.setRequestInterception(true);
      page.on('request', request => {
        const reqUrl = request.url();
        if (reqUrl.includes('joblist.json')) {
          logIcon('请求拦截');
          // Override headers
          const headers = Object.assign({}, request.headers(), {
            foo: 'bar', // set "foo" header
            origin: undefined, // remove "origin" header
          });
          request.continue({url: `${reqUrl}&pageSize=50`});
        } else {
          request.continue();
        }
      });
      ***/

      const onResponse = async response => {
        console.log('onResponse');
        const _m = response.request().method();
        if (!response.url().includes('joblist.json') || _m !== 'GET') {
          return;
        }
        // const filterData = {
        //   url: response.url(),
        //   ok: response.ok(),
        //   method: response.request().method(),
        //   status: response.status(),
        //   statusText: response.statusText(),
        // };
        const resJson = await response.json();
        const jobs = (resJson.zpData?.jobList ?? []).map((item) => ({
          ...item,
          detailUrl: `https://www.zhipin.com/job_detail/${item.encryptJobId}.html?lid=${item.lid}&securityId=${item.securityId}&sessionId=`,
        }));
        ++pageCount;
        totalJobs = totalJobs.concat(jobs);
        logIcon(`第 ${pageCount} 页, jobs 数量: ${jobs.length} 总共:${resJson.zpData.totalCount}`);
        if (resJson.zpData.hasMore && pageCount < PageLimit) {
          domLoadedCb();
        } else {
          const tmp = new Set();
          totalJobs = totalJobs.filter(item => {
            if (!tmp.has([item.brandName])) {
              tmp.add(item.brandName);
              return true;
            }
            return false;
          });
          logIcon(`========= 列表搜集完成! 总数:${totalJobs.length} ==========`, undefined, 'success');
          try {
            const _jobs = await handleDetailPage(totalJobs, browser, query.type);
            await closeBrowser(browser);
            resolve({...resJson.zpData, jobList: _jobs});
          } catch (err) {
            await closeBrowser(browser);
            reject(err);
          }
        }
      };
      if (!WaitLogin) {
        page.on('response', onResponse);
      }
      await page.goto(BossListPage);
      // await page.setViewport({width: 1080, height: 1024});

      // #region Type into search box
      // await page.type('.devsite-search-field', 'automate beyond recorder');
      // Wait and click on first result
      // const searchResultSelector = '.devsite-result-item-link';
      // await page.waitForSelector(searchResultSelector);
      // await page.click(searchResultSelector);
      // #regionend
    });
  } catch (e) {
    logIcon('未知错误', e);
    await closeBrowser(browser);
    return e;
  }
}

async function handleDetailPage(jobList = [], browser, pageType) {
  if (jobList.length < 1) {
    return jobList;
  }
  const isUser = pageType === 'user';
  const queueNum = isUser ? 1 : 8;
  const jobNum = Math.min(jobList.length, JobLimit);
  let jobIdx = 0, jobCount = 0;
  const queue = Array.from({length: queueNum});
  return new Promise(async (resolve, reject) => {
    try {
      await Promise.all(queue.map(async (_, j) => {
        const _page = await browser.newPage();
        const onResponse = async (response) => {
          if (!/\/job_detail\/.*\.html/.test(response.url()) || response.status() !== 200) {
            return;
          }
          let htmlStr = '';
          try {
            htmlStr = await response.text();
          } catch (err) {
            logIcon(`handleDetailPage response.text 错误`, err, 'error');
            return;
          }
          const companyInfo = await parseDetailPage(_page, htmlStr);
          ++jobCount;
          const _brandName = jobList[companyInfo.itemIdx]?.brandName;
          const isProxyJob = jobList[companyInfo.itemIdx]?.proxyJob === 1;
          if (companyInfo.name !== _brandName && !isProxyJob) {
            const errMsg = {
              infoName: companyInfo?.name,
              itemName: _brandName,
              itemIdx: companyInfo?.itemIdx,
              url: jobList[companyInfo.itemIdx]?.detailUrl,
            };
            logIcon(
              `详情页 ${companyInfo?.name} 名称不一致， ${companyInfo?.itemIdx}/${jobNum-1}`,
              errMsg,
              'error'
            );
            reject(errMsg);
            return;
          }
          logIcon(`详情页 ${companyInfo?.itemIdx} - ${jobIdx}/ ${jobNum-1}  ${companyInfo?.name}`);
          jobList[companyInfo.itemIdx].Info = companyInfo;
          if (jobIdx < jobNum) {
            const cb = () => {
              _page.goto(`${jobList[jobIdx].detailUrl}&itemIdx=${jobIdx}`);
              ++jobIdx;
            }
            isUser ? setTimeout(cb, 2000) : cb();
          }
          // 详情页处理完成
          if (jobCount === jobNum) {
            logIcon('======= 详情页处理完成 =======', undefined, 'success');
            resolve(jobList);
          }
        };
        _page.on('response', onResponse);
        // _page.on('load', onLoad);
        queue[j] = _page;
        return _page;
      }));

      for(let queueIdx = 0; queueIdx < queueNum; queueIdx++) {
        queue[queueIdx].goto(`${jobList[jobIdx].detailUrl}&itemIdx=${jobIdx}`);
        ++jobIdx;
      }
    } catch (e) {
      reject(e);
    }
  });
}

async function parseDetailPage(page, html) {
  const url = decodeURIComponent(page.url());
  let _itemIdx = url.split('&itemIdx=')[1];
  _itemIdx = parseInt(_itemIdx);
  if (Number.isNaN(_itemIdx)) {
    logIcon(`query.itemIdx 无法被解析为 number`, url, 'error');
    return {};
  }

  const $ = load(html);
  const companyInfo = {
    // 猎头没有name
    name: $('.job-sider .company-info > a:first-child', '#main')?.attr('title'),
    // 招聘状态
    jobStatus: $('.job-status', '#main')?.text().trim() ?? '无',
    // 活跃程度
    activeTime: $('.job-boss-info .name :last-child', '#main')?.text().trim() || '无',
    upDate: (/"upDate":\s*"([\d\-T:]+)"/.exec(html)?.[1] ?? '').replace('T', ' '),
    // 岗位职责、任职要求
    jobRequire: $('.job-detail-section .job-sec-text', '#main')?.html()?.trim(),
    // 公司介绍
    companyInfoHtml: $('.company-info-box .job-sec-text', '#main')?.html()?.trim(),
    // 成立日期
    establishDate: $('.res-time', '#main')?.text()?.trim().replace('成立日期', ''),
    // 详细地址
    address: $('.location-address', '#main')?.text().trim(),
  };
  companyInfo.itemIdx = _itemIdx;
  return companyInfo;
}

async function closeBrowser(browser) {
  const pages = await browser.pages() || [];
  await Promise.all(pages.map(async item => await item.close()));
  await browser.close();
}
