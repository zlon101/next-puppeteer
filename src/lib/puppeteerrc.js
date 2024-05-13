/**
 * headerless Chromium
 * https://github.com/puppeteer/puppeteer
 */

import {join} from 'path';
import puppeteer from 'puppeteer';
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

export async function launch() {
  logIcon('===================================================');
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
        return await curPageDom?.evaluate(el => parseInt(el.textContent));
      })();
      // 下一页
      const nextPageSelector = '.options-pages a:last-child';
      const nextPageIcon = await page.waitForSelector(nextPageSelector);
      const nextPageDisable = await nextPageIcon?.evaluate(el => el.classList.contains('disabled'));
      // 最后一页
      if (nextPageDisable) {
        logIcon(`已经是最后一页, ${curPage}`);
        return curPage;
      }
      await page.click(nextPageSelector);
      return 0;
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

      page.on('response', async response => {
        if (!response.url().includes('joblist.json')) {
          return;
        }
        const filterData = {
          url: response.url(),
          ok: response.ok(),
          method: response.request().method(),
          status: response.status(),
          statusText: response.statusText(),
        };
        if (filterData.method === 'GET') {
          const resJson = await response.json();
          const jobs = (resJson.zpData?.jobList ?? []).map((item) => ({
            ...item,
            detailUrl: `https://www.zhipin.com/job_detail/${item.encryptJobId}.html?lid=${item.lid}&securityId=${item.securityId}&sessionId=`,
          }));
          ++pageCount;
          totalJobs = totalJobs.concat(jobs);
          logIcon(`第 ${pageCount} 页，jobs 数量: ${jobs.length}`);
          if (resJson.zpData.hasMore && pageCount < 1) {
            domLoadedCb();
          } else {
            // 列表搜集完成
            const tmp = new Set();
            totalJobs = totalJobs.filter(item => {
              if (!tmp.has([item.brandName])) {
                tmp.add(item.brandName);
                return true;
              }
              return false;
            });
            const _jobs = await handleDetailPage(totalJobs.slice(0, 5), browser);

            // await closeBrowser(browser);
            resolve({...resJson.zpData, jobList: _jobs});
          }
        } else {
          logIcon(`请求 joblist.json 方法:${filterData.method}`);
        }
      });

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
  }
}

async function handleDetailPage(jobList = [], browser) {
  if (jobList.length < 1) {
    return jobList;
  }
  const queueNum = 2;
  const jobNum = jobList.length;
  let jobIdx = 0, jobCount = 0;
  const queue = Array.from({length: queueNum});
  return new Promise(async (resolve, reject) => {
    await new Promise((resolve2, reject) => {
      queue.forEach(async (_, i) => {
        const _page = await browser.newPage();
        _page.once('console', msg => console.log('$PAGE LOG:', msg.text()));

        _page.on('load', async () => {
          const companyInfo = await parseDetailPage(_page);
          logIcon(`详情页 ${companyInfo.name} jobIdx:${jobIdx} ${companyInfo.itemIdx}/${jobNum-1}`);
          jobList[companyInfo.itemIdx].companyInfo = companyInfo;
          ++jobCount;
          if (jobIdx < jobNum) {
            _page.goto(`${jobList[jobIdx].detailUrl}&itemIdx=${jobIdx}`);
            jobIdx++;
          }
          // 详情页处理完成
          if (jobCount) {
            resolve(jobList);
          }
        });

        queue[i] = _page;
        if (i === queueNum - 1) {
          resolve2();
        }
      });
    })

    let queueIdx = 0;
    for(; jobIdx < queueNum; jobIdx++) {
      queue[queueIdx++].goto(`${jobList[jobIdx].detailUrl}&itemIdx=${jobIdx}`);
    }
  });
}

async function parseDetailPage(page) {
  const query = getParams(page.url());
  const mainDom = await page.waitForSelector('#main');
  const _ = await page.waitForSelector('#main .location-address');
  const companyInfo = await mainDom.evaluate(el => {
    return {
      name: el.querySelector('.job-sider .company-info > a:first-child').getAttribute('title'),
      // 招聘状态
      jobStatus: el.querySelector('.job-status').textContent.trim(),
      // 活跃程度
      activeTime: el.querySelector('.boss-active-time').textContent.trim(),
      // 公司介绍
      companyInfoHtml: el.querySelector('.company-info-box .job-sec-text').innerHTML,
      // 成立日期
      establishDate: el.querySelector('.res-time').lastChild.textContent,
      // 详细地址
      address: el.querySelector('.location-address').textContent.trim(),
    }
  });
  companyInfo.itemIdx = parseInt(query.itemIdx);
  return companyInfo;
}

async function closeBrowser(browser) {
  const pages = await browser.pages() || [];
  await Promise.all(pages.map(async item => await item.close()));
  await browser.close();
}
function getParams(url) {
  const params = {};
  url.replace(/([^?&=]+)=([^&]+)/g, (_, k, v) => (params[k] = v));
  return params;
}
