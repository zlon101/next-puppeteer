import {load} from 'cheerio';
import {logIcon} from '@/lib/log';
import {parseDate} from '@/lib/tool';
import {filterJobs, goto, waitForContentLoaded} from '../share';
import {ReqParam, IJob, PageType} from '@/components/job/const';
import {uniqueArray} from '@/lib/object';
import {getWxJobsFromFile} from './zhilian-wx';

export interface IZhiLianJob {
  uid: string;
  // 岗位
  name: string;
  jobId: string;
  number: string; // 详情页id
  // 岗位职责、任职要求
  jobSummary: string;
  // 招聘人数
  recruitNumber: number;
  // 薪资
  salary60: string;
  // 年终
  salaryCount: string;
  // 更新时间
  publishTime: string;
  // 技能
  skillLabel: string[];
  // 工资经验
  workingExp: string;
  // 详情页
  positionUrl: string;
  detailUrl: string;
  companyName: string;
  cardCustomJson: string;
  // 详细地址
  address: string;
  education: string;
  jobKnowledgeWelfareFeatures: string;
  cityDistrict: string;
  streetName: string;
  featureServer: {
    // 上次回复时间
    lastReplyTime: number;
    // 今日回复
    reply24h: number;
  };
  aainfo: any;
  // hrStateInfo
}

interface IListRes {
  data: {
    count: number;
    list: IZhiLianJob[];
  };
}

const ListApi = `https://fe-api.zhaopin.com/c/i/search/positions`;
const ListPages = [
  `https://sou.zhaopin.com/?jl=801&kw=%E5%89%8D%E7%AB%AF&sl=15001%2C25000&et=2&p=1`,
  `https://sou.zhaopin.com/?jl=801&kw=web%E5%89%8D%E7%AB%AF&sl=15001%2C25000&et=2&p=1`
];
const Tabs = ['.listsort__uls .listsort__item:first-child a', '.listsort__uls .listsort__item:last-child a'].slice();
const MaxDetailPageNum = 1;
const DetailTimeSpace = 500;

export async function enterZhiLian(browser: any, param: ReqParam) {
  try {
    let dataArr: IZhiLianJob[] = [];

    if (param.type === PageType.zhiliangWx) {
      dataArr = await getWxJobsFromFile() as any;
    } else {
      for (const pageUrl of ListPages) {
        for (const tabSelect of Tabs) {
          const cb = async (page2: any) => {
            const tabDom = await page2.waitForSelector(tabSelect);
            // page.click(tabDom);
            await tabDom.click();
          };
          const jobs: IZhiLianJob[] = await handleListPage(browser, param, pageUrl, cb);
          dataArr = dataArr.concat(jobs);
        }
      }
    }
    // 过滤已删除的公司名
    const ignoreJobs = JSON.parse(param.ignores);
    dataArr = dataArr.filter(item => !ignoreJobs.includes(item.companyName));
    dataArr = addAttr(dataArr);
    const listPageRes = uniqueArray<IZhiLianJob>(dataArr, 'uid');
    const jobs: IZhiLianJob[] = await handleDetailPage(listPageRes, browser, param);
    let jobs2: IJob[] = transformDetail(jobs);
    jobs2 = filterJobs(jobs2);
    logIcon(`======= 详情页处理完成，去重后共 ${jobs2.length} 条 =======`, undefined, 'success');
    return jobs2;
  } catch (e) {
    logIcon('enterZhiLian catch');
    console.log(e);
    return [];
  }
}

export async function handleListPage(
  browser: any,
  param: ReqParam,
  pageUrl: string,
  onPageLoaded: any,
): Promise<IZhiLianJob[]> {
  logIcon(`========= 搜索列表 ==========`, pageUrl);

  const page = await (async () => {
    // const pages = await browser.pages();
    // if (pages?.length > 0) {
    //   return pages[0];
    // }
    return await browser.newPage();
  })();
  // await page.setUserAgent(UserAgent);
  // await page.setRequestInterception(true);
  // 下一页
  const goNextPage = async () => {
    try {
      const nextPageSelector = '.soupager .soupager__index + .btn';
      const nextPageIcon = await page.waitForSelector(nextPageSelector);
      const nextPageDisable = await nextPageIcon?.evaluate((el: any) => !!el.disabled);
      // 最后一页
      if (!nextPageDisable) {
        console.log(`下一页`);
        page.click(nextPageSelector);
      }
    } catch (e) {
      logIcon('goNextPage 错误', e, 'error');
    }
  };

  const pageLimit = parseInt(param.pageLimit);
  let totalJobs: IZhiLianJob[] = [];
  let pageCount = 0;
  return new Promise<IZhiLianJob[]>(async (resolve, reject) => {
    // page.on('request', (request: any) => {
    //   const reqUrl = request.url();
    //   const _m = request.method();
    //   if (_m === 'OPTIONS') {
    //     logIcon('请求 OPTIONS 拦截');
    //     // Override headers
    //     const headers = Object.assign({}, request.headers(), {
    //       foo: 'bar', // set "foo" header
    //       origin: undefined, // remove "origin" header
    //     });
    //     request.respond({
    //       status: 204,
    //       contentType: 'text/plain',
    //       headers: '',
    //     });
    //   } else {
    //     request.continue();
    //   }
    // });

    const onResponse = async (response: any) => {
      const _m = response.request().method();
      const _url = response.url();
      if (_m !== 'POST' || !_url.includes(ListApi)) return;

      const resVa: IListRes = await response.json();
      const resJson = resVa.data;
      let jobs = (resJson.list ?? []);
      ++pageCount;
      totalJobs = totalJobs.concat(jobs);
      console.log(`第 ${pageCount} 页, jobs 数量: ${totalJobs.length} 总共:${resJson.count}`);

      if (totalJobs.length < resJson.count && pageCount < pageLimit) {
        setTimeout(goNextPage, 400);
      } else {
        logIcon(`========= 列表搜集完成! 总数:${totalJobs.length} ==========`, undefined, 'success');
        resolve(totalJobs);
        // totalJobs = [];
        // pageCount = 0;
      }
    };

    if (param.waitLogin !== 'true') {
      page.on('response', onResponse);
    }

    try {
      await goto(page, pageUrl);
      setTimeout(() => onPageLoaded(page), 3000);
      // await onPageLoaded(page);
    } catch (e) {
      logIcon('导航到列表页错误', undefined, 'error');
      console.log(e);
      reject(e);
    }
  });
}

async function handleDetailPage(jobList: IZhiLianJob[], browser: any, param: ReqParam): Promise<IZhiLianJob[]> {
  if (jobList.length < 1) {
    return jobList;
  }
  const _jobLimit = parseInt(param.jobLimit);
  const jobNum = Math.min(jobList.length, _jobLimit);
  const queueNum = Math.min(MaxDetailPageNum, jobNum);
  let jobIdx = 0,
    jobCount = 0;
  const queue: any[] = Array.from({length: queueNum});
  const jobIdToIndex: Record<string, number> = jobList.slice(0, jobNum).reduce((acc, _job: IZhiLianJob, idx) => {
    if (acc[_job.uid] !== undefined) {
      console.log('one: %o\ntwo:%o', jobList[acc[_job.uid]], _job);
      throw new Error(`RowKey 重复！`);
    }
    acc[_job.uid] = idx;
    return acc;
  }, {} as any);

  return new Promise(async (resolve, reject) => {
    try {
      await Promise.all(
        queue.map(async (_, j) => {
          // const {parse: getLocation} = await newGaodePage(browser);
          const _page = await browser.newPage();

          const onResponse = async (response: any) => {
            if (!/\/\/jobs\.zhaopin\.com\/.*\.htm/.test(response.url()) || response.status() !== 200) {
              return;
            }

            let htmlStr = '';
            try {
              htmlStr = await response.text();
            } catch (err) {
              logIcon(`handleDetailPage response.text 错误`, err, 'error');
              console.log(err);
              return;
            }
            const companyInfo = await parseDetailPage(_page, htmlStr);
            ++jobCount;
            // logIcon(`详情页 ${jobIdx}/ ${jobNum - 1}  ${jobList[jobIdToIndex[companyInfo.uid]].name}`);
            // 获取经纬度
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

async function parseDetailPage(page: any, html: string) {
  await waitForContentLoaded(page);
  const url = decodeURIComponent(page.url());
  const $ = load(html);
  return {
    uid: url.split('.htm')[0].split('.com/')[1].trim(),
    // 岗位职责、任职要求
    jobRequire: $('.describtion__detail-content', '#root')?.html()?.trim() ?? '',
    // 公司介绍
    companyInfoHtml: $('.company__description', '#root')?.html()?.trim() ?? '',
    // 成立日期
    establishDate: '',
    // 详细地址
    address: $('.job-address__content-text', '#root')?.text().trim(),
  };
}

type IJobKeys = keyof IJob;
function transformDetail(srcArr: IZhiLianJob[]): IJob[] {
  const KeyMap: Partial<Record<IJobKeys, keyof IZhiLianJob | ((va: IZhiLianJob) => any)>> = {
    jobName: 'name',
    jobDegree: 'education',
    jobExperience: 'workingExp',
    jobLabels: (_job: IZhiLianJob) => [],
    skills: (_job: IZhiLianJob) => (_job.skillLabel || []).map((item: any) => item.value),
    salaryDesc: (_job: IZhiLianJob) => {
      if (!_job.salary60.includes('-')) {
        return _job.salary60;
      }
      // 9千-2.2万.14薪
      const [min, max] = _job.salary60.split('-').map(v => {
        const num = parseFloat(v);
        return v.includes('千') ? (num/10).toFixed(1) : num * 10;
      });
      return _job.salaryCount ? `${min}-${max}.${_job.salaryCount}` : `${min}-${max}`;
    },
    welfareList: 'jobKnowledgeWelfareFeatures',
    areaDistrict: 'cityDistrict',
    businessDistrict: 'streetName',
    brandName: 'companyName',
    aainfo: (_job: IZhiLianJob) => {
      return {
        ...(_job.aainfo ?? {}),
        // ...JSON.parse(_job.cardCustomJson).salary60,
        activeTime: (_job.featureServer.lastReplyTime ? parseDate(new Date(+_job.featureServer.lastReplyTime)) : '无/') + `  ${_job.featureServer.reply24h ?? '无'}`,
      }
    },
  } as const;

  return srcArr.map((job: IZhiLianJob) => {
    const obj: IJob = (Object.keys(KeyMap) as IJobKeys[]).reduce((acc: any, k: IJobKeys) => {
      const v2 = KeyMap[k]
      acc[k] = typeof v2 === 'function' ? v2(job) : job[v2!];
      return acc;
    }, {} as IJob);
    return Object.assign({} as any, job, obj);
  });
}

function addAttr(jobs: IZhiLianJob[]) {
  jobs.forEach((item: IZhiLianJob) => {
    item.uid = item.number;
    item.detailUrl = item.positionUrl;
  });
  return jobs;
}
