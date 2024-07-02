import {load} from 'cheerio';
import {PageType, ReqParam, IJob, RowKey} from '@/components/job/const';
import {logIcon} from '@/lib/log';
import {filterJobs, goto, waitForContentLoaded} from '../share';
import {uniqueArray} from "@/lib/object";
import {getBossWxJobsFromFile} from './boss-wx';

const JobDetailPage = `https://www.zhipin.com/job_detail/encryptJobId.html?
lid=lid&
securityId=securityId&
sessionId=`;
const BossListApi = `https://www.zhipin.com/wapi/zpgeek/search/joblist.json
?scene=1&query=&city=101270100&experience=101,103,104,105&payType=&partTime=&degree=
&industry=&scale=&stage=&position=100901,100208&jobType=1901&salary=405&multiBusinessDistrict=&multiSubway=
&page=1&pageSize=50`;
const CustomSearchListApi = 'search/joblist.json';
const RecommListApi = 'recommend/job/list.json';
const ListPages = [
  // 自定义搜索模式
  `https://www.zhipin.com/web/geek/job?city=101270100&experience=101,103,104,105&position=100901,100208&jobType=1901&salary=405`,
  // 平台推荐
  `https://www.zhipin.com/web/geek/job-recommend?city=101270100&salary=405&experience=101,103,104,105&jobType=1901`,
];
const MaxDetailNum = 1;
const DetailTimeSpace = 2000;

export async function enterBoss(browser: any, param: ReqParam) {
  const isWx = param.type === PageType.bossWx;
  try {
    let dataArr: IJob[] = [];
    if (isWx) {
      dataArr = await getBossWxJobsFromFile() as any;
    } else {
      for (const pageUrl of ListPages) {
        dataArr = dataArr.concat(await handleListPage(browser, param, pageUrl));
      }
    }

    dataArr = addAttr(dataArr);
    dataArr = filterJobs(dataArr);
    dataArr =  uniqueArray<IJob>(dataArr, 'uid');
    logIcon(`========= 列表搜集完成! 总数:${dataArr.length} ==========`, undefined, 'success');
    // 处理详情页
    let jobs: IJob[] = await handleDetailPage(dataArr, browser, param);
    jobs = filterJobs(jobs);

    logIcon(`======= 详情页处理完成，去重后共 ${jobs.length} 条 =======`, undefined, 'success');
    return jobs;
  } catch(e) {
    logIcon('enterBoss catch');
    console.log(e);
    return [];
  }
}


export async function handleListPage(browser: any, param: ReqParam, pageUrl: string): Promise<IJob[]> {
  logIcon(`================= 搜索列表 ==================================\n%s`, pageUrl);

  const isRecommonPage = pageUrl.includes('job-recommend');
  let totalJobs: IJob[] = [];
  let pageCount = 0;
  const pageLimit = parseInt(param.pageLimit);

  const page = await (async () => {
    // const pages = await browser.pages();
    // (pages || []).forEach((page2: any) => page2.close());
    return await browser.newPage();
  })();
  // 下一页
  const goNextPage = async () => {
    try {
      if (isRecommonPage) {
        const nextPageDom = await page.waitForSelector('.job-list-container .rec-job-list .job-card-box:last-child');
        console.log(`下一页`);
        nextPageDom?.evaluate((el: any) => el.scrollIntoView(true));
        return;
      }

      const nextPageSelector = '.options-pages a:last-child';
      const nextPageIcon = await page.waitForSelector(nextPageSelector);
      const nextPageDisable = await nextPageIcon?.evaluate((el: any) => el.classList.contains('disabled'));
      // 最后一页
      if (!nextPageDisable) {
        console.log(`下一页`);
        page.click(nextPageSelector);
      }
    } catch (e) {
      logIcon('goNextPage 错误', e, 'error');
    }
  };

  return new Promise(async (resolve, reject) => {
    // await page.setRequestInterception(true);
    // page.on('request', request => {
    //   const reqUrl = request.url();
    //   if (reqUrl.includes('joblist.json')) {
    //     logIcon('请求拦截');
    //     // Override headers
    //     const headers = Object.assign({}, request.headers(), {
    //       foo: 'bar', // set "foo" header
    //       origin: undefined, // remove "origin" header
    //     });
    //     request.continue({url: `${reqUrl}&pageSize=50`});
    //   } else {
    //     request.continue();
    //   }
    // });

    const onResponse = async (response: any) => {
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
        _url.includes(CustomSearchListApi) ||
        // 推荐页的列表接口
        _url.includes(RecommListApi)
      ) {
        const resJson = await response.json();
        const jobs = resJson.zpData?.jobList ?? [];

        ++pageCount;
        totalJobs = totalJobs.concat(jobs);
        console.log(`第 ${pageCount} 页, jobs 数量: ${totalJobs.length} 总共:${resJson.zpData.totalCount} hasMore:${resJson.zpData.hasMore}`);

        if (resJson.zpData.hasMore && pageCount < pageLimit) {
          setTimeout(goNextPage, 300);
        } else {
          resolve(totalJobs);
        }
      }
    };

    if (param.waitLogin !== 'true') {
      page.on('response', onResponse);
    }
    await goto(page, pageUrl);
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


async function handleDetailPage(jobList: IJob[], browser: any, param: ReqParam): Promise<IJob[]> {
  const pageType = param.type;
  if (jobList.length < 1) {
    return jobList;
  }
  const hasLogin = pageType === PageType.bossLogin;
  const queueNum = hasLogin ? 1 : MaxDetailNum;
  const jobNum = Math.min(jobList.length, parseInt(param.jobLimit));
  let jobIdx = 0,
    jobCount = 0;
  const jobIdToIndex: Record<string, number> = jobList.slice(0, jobNum).reduce((acc, _job: IJob, idx) => {
    if (acc[_job[RowKey]] !== undefined) {
      console.log('one: %o\ntwo:%o', jobList[acc[_job[RowKey]]], _job);
      throw new Error(`RowKey 重复！`);
    }
    acc[_job[RowKey]] = idx;
    return acc;
  }, {} as any);
  const queue: any[] = Array.from({length: queueNum});

  return new Promise(async (resolve, reject) => {
    try {
      await Promise.all(
        queue.map(async (_, j) => {
          const _page = await browser.newPage();

          const onResponse = async (response: any) => {
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
            // const job = jobList[jobIdToIndex[companyInfo.uid]];
            // logIcon(`详情页 ${jobIdx}/ ${jobNum - 1}  ${job?.brandName}`);
            jobList[jobIdToIndex[companyInfo.uid]].aainfo = companyInfo;
            if (jobIdx < jobNum) {
              const _detailUrl = jobList[jobIdx].detailUrl;
              const cb = () => {
                goto(_page, _detailUrl);
                ++jobIdx;
              };
              DetailTimeSpace ? setTimeout(cb, DetailTimeSpace) : cb();
            }
            // 详情页处理完成
            if (jobCount === jobNum) {
              resolve(jobList);
            }
          };

          _page.on('response', onResponse);
          // _page.on('load', onLoad);
          queue[j] = _page;
          return _page;
        }),
      );

      for (let queueIdx = 0; queueIdx < queueNum; queueIdx++) {
        goto(queue[queueIdx], jobList[jobIdx].detailUrl);
        ++jobIdx;
      }
    } catch (e) {
      reject(e);
    }
  });
}


async function parseDetailPage(page: any, html: string): Promise<IJob['aainfo']> {
  const url = decodeURIComponent(page.url());
  const $ = load(html);
  await waitForContentLoaded(page);
  return {
    uid: url.split('job_detail/')[1].split('.html')[0].trim(),
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
}

function addAttr(jobs: IJob[]) {
  jobs.forEach(item => {
    item.aainfo = item.aainfo ?? {};
    item.uid = item.encryptJobId;
    item.areaDistrict = item.areaDistrict || item.districtName || '';
    item.businessDistrict = item.businessDistrict || item.businessName || '';
    item.detailUrl = `https://www.zhipin.com/job_detail/${item.encryptJobId}.html?lid=${item.lid}&securityId=${item.securityId}&sessionId=`;
  });
  return jobs;
}
