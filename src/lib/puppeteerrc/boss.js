import {load} from 'cheerio';
import {logIcon} from '../log';
import {closeBrowser} from './share';

// 自定义搜索模式
const BossListPage = `https://www.zhipin.com
/web/geek/job
?city=101270100&experience=101,103,104,105&position=100901,100208&jobType=1901&salary=405`;

// 平台推荐
const BossListRecommonPage = `https://www.zhipin.com/web/geek/job-recommend?city=101270100&salary=405&experience=101,103,104,105&jobType=1901`;

const JobDetailPage = `https://www.zhipin.com/job_detail/encryptJobId.html?
lid=lid&
securityId=securityId&
sessionId=`;

const BossListApi = `https://www.zhipin.com/wapi/zpgeek/search/joblist.json
?scene=1&query=&city=101270100&experience=101,103,104,105&payType=&partTime=&degree=
&industry=&scale=&stage=&position=100901,100208&jobType=1901&salary=405&multiBusinessDistrict=&multiSubway=
&page=1&pageSize=50`;

const TargetPage = {
  user: BossListPage,
  recommLogined: BossListRecommonPage,
  normal: BossListPage,
};
const PageLimit = 9999;
const JobLimit = 9999;

export async function handleCustomSearch(browser, param) {
  const isRecommonPage = param.type === 'recommLogined';
  const isCustomSearch = param.type === 'user';
  let totalJobs = [];
  let pageCount = 0;
  const pageLimit = param.pageLimit ? parseInt(param.pageLimit) : PageLimit;

  const page = await (async () => {
    const pages = await browser.pages();
    if (pages?.length > 0) {
      return pages[0];
    }
    return await browser.newPage();
  })();

  // 下一页
  const goNextPage = async () => {
    if (isRecommonPage) {
      setTimeout(() => {
        page.waitForSelector('.job-list-container .rec-job-list .job-card-box:last-child').then(nextPageDom => {
          logIcon(`下一页`);
          nextPageDom?.evaluate(el => el.scrollIntoView(true));
        }).catch(e => {
          logIcon('goNextPage 错误', e, 'error');
        });
      }, 300);
      return;
    }

    try {
      const nextPageSelector = '.options-pages a:last-child';
      const nextPageIcon = await page.waitForSelector(nextPageSelector);
      const nextPageDisable = await nextPageIcon?.evaluate(el => el.classList.contains('disabled'));
      // 最后一页
      if (!nextPageDisable) {
        setTimeout(() => {
          logIcon(`下一页`);
          page.click(nextPageSelector);
        }, 300);
      }
    } catch (e) {
      logIcon('goNextPage 错误', e, 'error');
    }
  };

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
      const _m = response.request().method();
      const _url = response.url();
      // const filterData = {
      //   url: response.url(),
      //   ok: response.ok(),
      //   method: response.request().method(),
      //   status: response.status(),
      //   statusText: response.statusText(),
      // };
      if (_m !== 'GET') return;
      if (
        // 自定义搜索的列表接口
        _url.includes('search/joblist.json') ||
        // 推荐页的列表接口
        _url.includes('recommend/job/list.json')
      ) {
        const resJson = await response.json();
        let jobs = (resJson.zpData?.jobList ?? []).map(item => ({
          ...item,
          detailUrl: `https://www.zhipin.com/job_detail/${item.encryptJobId}.html?lid=${item.lid}&securityId=${item.securityId}&sessionId=`,
        }));
        if (isRecommonPage) {
          jobs = jobs.filter(_job => /(web|前端|react|vue|js|javascript)/i.test(_job.jobName));
        }
        ++pageCount;
        totalJobs = totalJobs.concat(jobs);
        logIcon(`第 ${pageCount} 页, jobs 数量: ${totalJobs.length} 总共:${resJson.zpData.totalCount} hasMore:${resJson.zpData.hasMore}`);

        if (resJson.zpData.hasMore && pageCount < pageLimit) {
          goNextPage();
        } else {
          logIcon(`========= 列表搜集完成! 总数:${totalJobs.length} ==========`, undefined, 'success');
          try {
            const _jobs = await handleDetailPage(totalJobs, browser, param);
            resolve({...resJson.zpData, jobList: _jobs});
            await closeBrowser(browser);
          } catch (err) {
            await closeBrowser(browser);
            reject(err);
          }
        }
      }
    };

    if (param.waitLogin !== 'true') {
      page.on('response', onResponse);
    }
    await page.goto(TargetPage[param.type]);
    // await page.setViewport({width: 1080, height: 1024});

    // #region Type into search box
    // await page.type('.devsite-search-field', 'automate beyond recorder');
    // Wait and click on first result
    // const searchResultSelector = '.devsite-result-item-link';
    // await page.waitForSelector(searchResultSelector);
    // await page.click(searchResultSelector);
    // #regionend
  });
}

async function handleDetailPage(jobList = [], browser, param) {
  const pageType = param.type;
  if (jobList.length < 1) {
    return jobList;
  }
  const hasLogin = pageType !== 'normal';
  const queueNum = hasLogin ? 1 : 8;
  const jobNum = Math.min(jobList.length, param.jobLimit ? parseInt(param.jobLimit) : JobLimit);
  let jobIdx = 0,
    jobCount = 0;
  const queue = Array.from({length: queueNum});
  return new Promise(async (resolve, reject) => {
    try {
      await Promise.all(
        queue.map(async (_, j) => {
          const _page = await browser.newPage();
          const onResponse = async response => {
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
                `详情页 ${companyInfo?.name} 名称不一致， ${companyInfo?.itemIdx}/${jobNum - 1}`,
                errMsg,
                'error',
              );
              reject(errMsg);
              return;
            }
            logIcon(`详情页 ${companyInfo?.itemIdx} - ${jobIdx}/ ${jobNum - 1}  ${companyInfo?.name}`);
            jobList[companyInfo.itemIdx].Info = companyInfo;
            if (jobIdx < jobNum) {
              const cb = () => {
                _page.goto(`${jobList[jobIdx].detailUrl}&itemIdx=${jobIdx}`);
                ++jobIdx;
              };
              hasLogin ? setTimeout(cb, 2000) : cb();
            }
            // 详情页处理完成
            if (jobCount === jobNum) {
              const filtedJobs = jobList.filter(job2 => {
                const t = job2.Info?.activeTime ?? '';
                return !(t.includes('年') || /[345]月内/.test(t));
              });
              logIcon(`======= 详情页处理完成，过滤后共 ${filtedJobs.length} 条 =======`, undefined, 'success');
              resolve(filtedJobs);
            }
          };
          _page.on('response', onResponse);
          // _page.on('load', onLoad);
          queue[j] = _page;
          return _page;
        }),
      );

      for (let queueIdx = 0; queueIdx < queueNum; queueIdx++) {
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
