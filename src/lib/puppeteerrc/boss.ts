import {load} from 'cheerio';
import {PageType, ReqParam, IJob, RowKey} from '@/components/job/const';
import {logIcon} from '../log';
import {closeBrowser, goto} from './share';
import {uniqueArray} from "@/lib/object";

const JobDetailPage = `https://www.zhipin.com/job_detail/encryptJobId.html?
lid=lid&
securityId=securityId&
sessionId=`;
const BossListApi = `https://www.zhipin.com/wapi/zpgeek/search/joblist.json
?scene=1&query=&city=101270100&experience=101,103,104,105&payType=&partTime=&degree=
&industry=&scale=&stage=&position=100901,100208&jobType=1901&salary=405&multiBusinessDistrict=&multiSubway=
&page=1&pageSize=50`;
const ListPages = [
  // 自定义搜索模式
  `https://www.zhipin.com/web/geek/job?city=101270100&experience=101,103,104,105&position=100901,100208&jobType=1901&salary=405`,
  // 平台推荐
  `https://www.zhipin.com/web/geek/job-recommend?city=101270100&salary=405&experience=101,103,104,105&jobType=1901`,
];
const MaxDetailNum = 4;
const DetailTimeSpace = 1000;

export async function enterBoss(browser: any, param: ReqParam) {
  try {
    let dataArr: IJob[] = [];
    for (const pageUrl of ListPages) {
      dataArr = dataArr.concat(await handleListPage(browser, param, pageUrl));
    }
    const listPageRes =  uniqueArray<IJob>(dataArr, 'uid');

    const jobs: IJob[] = await handleDetailPage(listPageRes, browser, param);
    return jobs;
  } catch(e) {
    logIcon('enter catch');
    console.log(e);
    await closeBrowser(browser);
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
        logIcon(`下一页`);
        nextPageDom?.evaluate((el: any) => el.scrollIntoView(true));
        return;
      }

      const nextPageSelector = '.options-pages a:last-child';
      const nextPageIcon = await page.waitForSelector(nextPageSelector);
      const nextPageDisable = await nextPageIcon?.evaluate((el: any) => el.classList.contains('disabled'));
      // 最后一页
      if (!nextPageDisable) {
        logIcon(`下一页`);
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
        _url.includes('search/joblist.json') ||
        // 推荐页的列表接口
        _url.includes('recommend/job/list.json')
      ) {
        const resJson = await response.json();
        let jobs = (resJson.zpData?.jobList ?? []).map((item: IJob) => ({
          ...item,
          uid: item.encryptJobId,
          detailUrl: `https://www.zhipin.com/job_detail/${item.encryptJobId}.html?lid=${item.lid}&securityId=${item.securityId}&sessionId=`,
        }));
        if (isRecommonPage) {
          jobs = jobs.filter((_job: IJob) => /(web|前端|react|vue|js|javascript)/i.test(_job.jobName));
        }
        ++pageCount;
        totalJobs = totalJobs.concat(jobs);
        logIcon(
          `第 ${pageCount} 页, jobs 数量: ${totalJobs.length} 总共:${resJson.zpData.totalCount} hasMore:${resJson.zpData.hasMore}`,
        );

        if (resJson.zpData.hasMore && pageCount < pageLimit) {
          setTimeout(goNextPage, 300);
        } else {
          logIcon(`========= 列表搜集完成! 总数:${totalJobs.length} ==========`, undefined, 'success');
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
            await _page.waitForNavigation({waitUntil: 'domcontentloaded'});
            try {
              htmlStr = await response.text();
            } catch (err) {
              logIcon(`handleDetailPage response.text 错误`, err, 'error');
              return;
            }

            const companyInfo = await parseDetailPage(_page, htmlStr);
            ++jobCount;
            const job = jobList[jobIdToIndex[companyInfo.uid]];
            logIcon(`详情页 ${jobIdx}/ ${jobNum - 1}  ${job?.brandName}`);
            jobList[jobIdToIndex[companyInfo.uid]].Info = companyInfo;
            if (jobIdx < jobNum) {
              const _detailUrl = jobList[jobIdx].detailUrl;
              const cb = () => {
                goto(_page, _detailUrl);
                ++jobIdx;
              };
              hasLogin ? setTimeout(cb, DetailTimeSpace) : cb();
            }
            // 详情页处理完成
            if (jobCount === jobNum) {
              logIcon(`======= 详情页处理完成，共 ${jobList.length} 条 =======`, undefined, 'success');
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


async function parseDetailPage(page: any, html: string): Promise<IJob['Info']> {
  const url = decodeURIComponent(page.url());
  const $ = load(html);
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


export const Mock = {
  resCount: 450,
  filterString: '',
  lid: '1ZfACtue94L',
  hasMore: true,
  jobList: [
    {
      securityId:
        '5jvTgNEGCgeT2--1bBnEAQzpphe2qexUTkFzEAadmzp5QrT9c-av0_WKY4vX5rjn6p4br_vuDPCyEqyCi60-OQKgkADDMLY1irRJCOwjxRAhqMQ~',
      bossAvatar:
        'https://img.bosszhipin.com/beijin/mcs/useravatar/20171012/efbba29de56342967763d90191fbb654cfcd208495d565ef66e7dff9f98764da_s.jpg',
      bossCert: 3,
      encryptBossId: 'ba0ca2517ab82c240HZy3Nm4Fw~~',
      bossName: '宋先生',
      bossTitle: 'HRo',
      goldHunter: 0,
      bossOnline: false,
      encryptJobId: '3f68137b4077c0741nB92Ny1FFdQ',
      expectId: 0,
      jobName: 'Ruby Web开发工程师',
      lid: '1ZfACtue94L.search.1',
      salaryDesc: '10-15K·13薪',
      jobLabels: ['3-5年', '本科'],
      jobValidStatus: 1,
      iconWord: '',
      skills: ['GIT', '全栈开发'],
      jobExperience: '3-5年',
      daysPerWeekDesc: '',
      leastMonthDesc: '',
      jobDegree: '本科',
      cityName: '成都',
      areaDistrict: '成华区',
      businessDistrict: '建设路',
      jobType: 0,
      proxyJob: 0,
      proxyType: 0,
      anonymous: 0,
      outland: 0,
      optimal: 0,
      iconFlagList: [],
      itemId: 1,
      city: 101270100,
      isShield: 0,
      atsDirectPost: false,
      gps: null,
      encryptBrandId: '91192214419f1a1c1Xx72NW4',
      brandName: '探码科技',
      brandLogo:
        'https://img.bosszhipin.com/beijin/mcs/chatphoto/20170122/89e46e61a680d1dc5418bf0346431920a86dd33be156a26c1b379cee49c25b44.jpg',
      brandStageName: '未融资',
      brandIndustry: '移动互联网',
      brandScaleName: '20-99人',
      welfareList: [
        '交通补助',
        '零食下午茶',
        '节日福利',
        '年终奖',
        '员工旅游',
        '带薪年假',
        '五险一金',
        '全勤奖',
        '餐补',
        '定期体检',
      ],
      industry: 100019,
      contact: false,
      detailUrl:
        'https://www.zhipin.com/job_detail/3f68137b4077c0741nB92Ny1FFdQ.html?lid=1ZfACtue94L.search.1&securityId=5jvTgNEGCgeT2--1bBnEAQzpphe2qexUTkFzEAadmzp5QrT9c-av0_WKY4vX5rjn6p4br_vuDPCyEqyCi60-OQKgkADDMLY1irRJCOwjxRAhqMQ~&sessionId=',
      Info: {
        name: '探码科技',
        jobStatus: '招聘中',
        activeTime: '2月内活跃',
        companyInfoHtml:
          '"Baklib是新⼀代企业数字内容体验云平台，包括数字资产及知识库管理、数字应用构建和客户体验，助力企业数字化体验从 IA 扩展到 AI。"<br>品牌名： Baklib<br>Slogan: Enterprise digital experience scales from IA to AI<br>关键词：内容中台、知识库、CMS网站、客户体验、在线社区<br>业务模式：B2B<br>预计上线：2023年10月',
        establishDate: '2015-09-28',
        address: '成都成华区招商东城国际A座1603',
        itemIdx: 0,
      },
    },
    {
      securityId:
        'TlM5r70FOJuGq-u1EJKPHfuHUGuuGlj6CYsEAJX4GXIy2jAEsQ2Q3155PUOSF7NZ9EjoCZIzGxLYH5212XBK5syX3vUrkxs7P59nRwuEoAKSiw~~',
      bossAvatar: 'https://img.bosszhipin.com/boss/avatar/avatar_5.png',
      bossCert: 3,
      encryptBossId: '445631a3acc60c830nV42Ny8F1I~',
      bossName: '向先生',
      bossTitle: '部门经理',
      goldHunter: 0,
      bossOnline: false,
      encryptJobId: 'a24ab74b690abe7c1HBz3dW1FVU~',
      expectId: 0,
      jobName: 'web前端',
      lid: '1ZfACtue94L.search.2',
      salaryDesc: '8-13K',
      jobLabels: ['3-5年', '本科'],
      jobValidStatus: 1,
      iconWord: '',
      skills: ['vue.js', 'typescript', 'Less'],
      jobExperience: '3-5年',
      daysPerWeekDesc: '',
      leastMonthDesc: '',
      jobDegree: '本科',
      cityName: '成都',
      areaDistrict: '郫都区',
      businessDistrict: '高新西',
      jobType: 0,
      proxyJob: 0,
      proxyType: 0,
      anonymous: 0,
      outland: 0,
      optimal: 0,
      iconFlagList: [],
      itemId: 2,
      city: 101270100,
      isShield: 0,
      atsDirectPost: false,
      gps: null,
      encryptBrandId: '0a53736100c984221H1y3d0~',
      brandName: '直真科技',
      brandLogo:
        'https://img.bosszhipin.com/beijin/mcs/chatphoto/20181106/c2ebd3e24f5392d1c27466c6eef86b1ecfcd208495d565ef66e7dff9f98764da.jpg',
      brandStageName: '已上市',
      brandIndustry: '计算机软件',
      brandScaleName: '1000-9999人',
      welfareList: [
        '定期体检',
        '带薪年假',
        '员工旅游',
        '加班补助',
        '节日福利',
        '年终奖',
        '通讯补贴',
        '五险一金',
        '补充医疗保险',
      ],
      industry: 100021,
      contact: false,
      detailUrl:
        'https://www.zhipin.com/job_detail/a24ab74b690abe7c1HBz3dW1FVU~.html?lid=1ZfACtue94L.search.2&securityId=TlM5r70FOJuGq-u1EJKPHfuHUGuuGlj6CYsEAJX4GXIy2jAEsQ2Q3155PUOSF7NZ9EjoCZIzGxLYH5212XBK5syX3vUrkxs7P59nRwuEoAKSiw~~&sessionId=',
      Info: {
        name: '直真科技',
        jobStatus: '招聘中',
        activeTime: '半年前活跃',
        companyInfoHtml:
          '直真科技成立于2008年11月，公司主营业务为信息通信技术（ICT）运营管理领域的软件开发、技术服务、系统集成以及第三方软硬件销售业务。公司专注于为国内电信运营商和大型企业客户的信息网络和IT基础设施提供统一、融合、智慧、赋能的运营支撑系统（OSS）全面解决方案，主要包括网络管理支撑及服务运营支撑两大系列产品，涵盖咨询、规划、设计、开发、测试、维护、运营等全周期专业技术服务，协助用户对其设备、网络、业务、客户以及相关的IT基础设施等进行综合管理与服务。多年来，公司采取技术能力平台化、组件化和产品化的策略，围绕用户需求进行技术创新，运用包括云计算、大数据和人工智能等技术手段，帮助用户应对市场变化，提高运营效率，提升服务质量，增强核心竞争力。公司积极拓展业务领域，在以运营支撑系统为核心业务的基础上，以具有自主知识产权的企业经营管理支撑系列产品为抓手，逐步延伸至管理支撑系统（MSS）业务领域。<br>        自成立以来，公司立足自主创新，形成了拥有自主知识产权的系列化软件产品，并在此基础上持续提供专业技术服务，形成整体解决方案，能够较为完备地覆盖中国移动、中国电信、中国联通三大电信运营商的集团总部、省级公司、专业公司及其他行业客户的网络和信息技术方面的运营管理及支撑需求。',
        establishDate: '2012-01-16',
        address: '成都郫都区纵横科技园(东南门)3楼306室',
        itemIdx: 1,
      },
    },
    {
      securityId:
        'NjtfAfcIFPehP-819s3IcJadIQkZPb9_crvqm02W79ZxHyzq4T945aFwHnnshHg3mfSIb-TCrHExhbLmylEjslYW0lTVW2sviiBs7h3tgmpzD9c759o~',
      bossAvatar:
        'https://img.bosszhipin.com/beijin/upload/avatar/20230106/607f1f3d68754fd0783f64d2bba6892d1846a050faf91bb3c0802d055e32f3e47b1b56c53a1de251_s.jpg',
      bossCert: 3,
      encryptBossId: 'cd420652a3f616c903x63tq7GFA~',
      bossName: '李女士',
      bossTitle: 'HR人力资源',
      goldHunter: 0,
      bossOnline: false,
      encryptJobId: 'cf4248998ffea32c1Xx63Ni7FFFT',
      expectId: 0,
      jobName: '前端开发工程师',
      lid: '1ZfACtue94L.search.3',
      salaryDesc: '10-15K·13薪',
      jobLabels: ['3-5年', '本科'],
      jobValidStatus: 1,
      iconWord: '',
      skills: ['HTML5', 'Vue', 'CSS', '前端开发经验', '计算机/软件工程相关专业'],
      jobExperience: '3-5年',
      daysPerWeekDesc: '',
      leastMonthDesc: '',
      jobDegree: '本科',
      cityName: '成都',
      areaDistrict: '武侯区',
      businessDistrict: '新会展中心',
      jobType: 0,
      proxyJob: 0,
      proxyType: 0,
      anonymous: 0,
      outland: 0,
      optimal: 0,
      iconFlagList: [],
      itemId: 3,
      city: 101270100,
      isShield: 0,
      atsDirectPost: false,
      gps: null,
      encryptBrandId: '35832f839aea59841Xd70tS_GFQ~',
      brandName: '九洲软件',
      brandLogo:
        'https://img.bosszhipin.com/beijin/upload/com/workfeel/20230112/7bf6f160950405e94f62f52f786c05fa85c25856a71b4d27c0802d055e32f3e47b1b56c53a1de251.jpg',
      brandStageName: '不需要融资',
      brandIndustry: '计算机软件',
      brandScaleName: '100-499人',
      welfareList: [
        '节日福利',
        '五险一金',
        '免费班车',
        '零食下午茶',
        '意外险',
        '免费工装',
        '团建聚餐',
        '底薪加提成',
        '带薪年假',
        '绩效奖金',
        '有无线网',
        '补充医疗保险',
        '生日福利',
      ],
      industry: 100021,
      contact: false,
      detailUrl:
        'https://www.zhipin.com/job_detail/cf4248998ffea32c1Xx63Ni7FFFT.html?lid=1ZfACtue94L.search.3&securityId=NjtfAfcIFPehP-819s3IcJadIQkZPb9_crvqm02W79ZxHyzq4T945aFwHnnshHg3mfSIb-TCrHExhbLmylEjslYW0lTVW2sviiBs7h3tgmpzD9c759o~&sessionId=',
      Info: {
        name: '九洲软件',
        jobStatus: '招聘中',
        activeTime: '半年前活跃',
        companyInfoHtml:
          '四川九洲软件有限公司<br>软件与智能应用业务<br>官方网址：www.scjz.cc<br><br>四川九洲软件有限公司是四川九洲投资控股集团打造数字经济产业领域的重点企业。公司聚焦数字实战，以“云计算技术及自研大数据平台”为核心打造自主软件行业应用，为国防军工、政府和企业提供“数据治理、数据可视化分析、SaaS技术应用”等面向场景的数智化技术产品和服务。',
        establishDate: '2022-09-21',
        address: '成都武侯区天府软件园A区天府软件园A2（2楼）',
        itemIdx: 2,
      },
    },
    {
      securityId:
        'CjEmbcKcL2lUB-319Udioti4TYzGS9ks8isoburbrlgDodseBj08t4--GjddpENCv-5nCk6ctZqi_p8poEO1EfYqooIFWXOm5PnNuUidl9yz01K86A~~',
      bossAvatar: 'https://img.bosszhipin.com/boss/avatar/avatar_1.png',
      bossCert: 3,
      encryptBossId: '46121b5eb81b18ea33B53N-8EFQ~',
      bossName: '董女士',
      bossTitle: '人事',
      goldHunter: 0,
      bossOnline: false,
      encryptJobId: 'b059d8c4585bfaf21nR_0tu0GVtY',
      expectId: 0,
      jobName: '高级前端开发工程师',
      lid: '1ZfACtue94L.search.4',
      salaryDesc: '12-18K·13薪',
      jobLabels: ['3-5年', '本科'],
      jobValidStatus: 1,
      iconWord: '',
      skills: ['前端开发', '后端开发'],
      jobExperience: '3-5年',
      daysPerWeekDesc: '',
      leastMonthDesc: '',
      jobDegree: '本科',
      cityName: '成都',
      areaDistrict: '武侯区',
      businessDistrict: '铁像寺',
      jobType: 0,
      proxyJob: 0,
      proxyType: 0,
      anonymous: 0,
      outland: 0,
      optimal: 0,
      iconFlagList: [],
      itemId: 4,
      city: 101270100,
      isShield: 0,
      atsDirectPost: false,
      gps: null,
      encryptBrandId: '8fb2cbbb71b386210X143dW-FA~~',
      brandName: '四川天正',
      brandLogo:
        'https://img.bosszhipin.com/beijin/mcs/chatphoto/20200610/9ce62496b235f6323f12846f8b9764b423e8247ecb225b395e985e0d55213812_s.jpg',
      brandStageName: '未融资',
      brandIndustry: '计算机软件',
      brandScaleName: '20-99人',
      welfareList: [
        '节日福利',
        '通讯补贴',
        '交通补助',
        '零食下午茶',
        '五险一金',
        '带薪年假',
        '餐补',
        '年终奖',
        '加班补助',
        '补充医疗保险',
        '定期体检',
        '员工旅游',
        '全勤奖',
      ],
      industry: 100021,
      contact: false,
      detailUrl:
        'https://www.zhipin.com/job_detail/b059d8c4585bfaf21nR_0tu0GVtY.html?lid=1ZfACtue94L.search.4&securityId=CjEmbcKcL2lUB-319Udioti4TYzGS9ks8isoburbrlgDodseBj08t4--GjddpENCv-5nCk6ctZqi_p8poEO1EfYqooIFWXOm5PnNuUidl9yz01K86A~~&sessionId=',
      Info: {
        name: '四川天正',
        jobStatus: '招聘中',
        activeTime: '3日内活跃',
        companyInfoHtml:
          '四川天正信息科技有限公司是一家专业从事房地产评估和税收管理信息化系统开发与数据服务的公司。主要业务涉及房地产开发、销售、保有、租赁及存量房销售环节的房地产评估和税收管理系统开发、实施，以及相关数据的采集、加工与分析工作。公司团队自2010年开始在四川、青海等省份试点相关业务，获得客户的一致好评，并逐步实现推广。<br>公司始终坚持“为客户创造价值，为员工创造机会”的理念，提供高效、优质的技术与服务，经过十多年的发展，公司业务涵盖税务、金融、房产企业、房地产评估企业、司法等多个领域。通过项目的推广，也培养了一批艰苦奋斗，努力拼搏的专业化技术队伍。<br>当前，公司业务快速发展，“以IT技术推动社会发展，成为有价值的一流IT公司”作为公司的发展目标，继续发扬艰苦创业的传统，开创美好未来。',
        establishDate: '2016-11-08',
        address: '成都武侯区孵化园9号楼F座816号',
        itemIdx: 3,
      },
    },
    {
      securityId:
        '1KNgxmR83fORa-a1pbB012PJVrv-oazui7c8j5ubH5_Njga37ECtjfJhZMfpB6GOPqLCUQX8fQwO29sxfCc3Lu8cdh8aFCXmtvePL_pC-CKKuDphWlI~',
      bossAvatar:
        'https://img.bosszhipin.com/beijin/upload/avatar/20240227/607f1f3d68754fd0f33c21fcfb4b8ba946591d893404cd100aa70a48cd240e1bce7a01aa5f3b32d0_s.jpg.webp',
      bossCert: 3,
      encryptBossId: '23dd7d4db070d6bc1HV42t-4EVY~',
      bossName: '杜女士',
      bossTitle: '招聘者',
      goldHunter: 0,
      bossOnline: false,
      encryptJobId: 'c88865da54ff1ea81Xdz0tS7FVRR',
      expectId: 0,
      jobName: 'react前端开发工程师',
      lid: '1ZfACtue94L.search.5',
      salaryDesc: '10-13K',
      jobLabels: ['3-5年', '本科'],
      jobValidStatus: 1,
      iconWord: '',
      skills: ['JavaScript', 'HTML5', 'React'],
      jobExperience: '3-5年',
      daysPerWeekDesc: '',
      leastMonthDesc: '',
      jobDegree: '本科',
      cityName: '成都',
      areaDistrict: '武侯区',
      businessDistrict: '银泰城',
      jobType: 0,
      proxyJob: 0,
      proxyType: 0,
      anonymous: 0,
      outland: 0,
      optimal: 0,
      iconFlagList: [],
      itemId: 5,
      city: 101270100,
      isShield: 0,
      atsDirectPost: false,
      gps: null,
      encryptBrandId: 'e0dcfff1e929c8da1XV939-7F1U~',
      brandName: '成都咕咕知识管家科技',
      brandLogo:
        'https://img.bosszhipin.com/beijin/upload/com/workfeel/20220704/7bf6f160950405e9653f3b1893e81de5c1348dd8615cd47032057dc82e29d8f33e08ac52908e6f7a.jpg',
      brandStageName: '天使轮',
      brandIndustry: '互联网',
      brandScaleName: '20-99人',
      welfareList: [
        '团建聚餐',
        '年终奖',
        '补充医疗保险',
        '加班补助',
        '夜班补助',
        '餐补',
        '工龄奖',
        '全勤奖',
        '零食下午茶',
        '生日福利',
        '员工旅游',
        '五险一金',
      ],
      industry: 100020,
      contact: false,
      detailUrl:
        'https://www.zhipin.com/job_detail/c88865da54ff1ea81Xdz0tS7FVRR.html?lid=1ZfACtue94L.search.5&securityId=1KNgxmR83fORa-a1pbB012PJVrv-oazui7c8j5ubH5_Njga37ECtjfJhZMfpB6GOPqLCUQX8fQwO29sxfCc3Lu8cdh8aFCXmtvePL_pC-CKKuDphWlI~&sessionId=',
      Info: {
        name: '成都咕咕知识管家科技',
        jobStatus: '招聘中',
        activeTime: '半年前活跃',
        companyInfoHtml:
          'Goo.team（成都咕咕知识管家科技有限公司）成立于2021年，咕咕知识管家是一款利用新一代信息技术，开发企业知识资源，调动企业人力资源学习潜能，并建立与之相适应的组织模式，推进企业现代化进程，解决企业组织绩效，提高企业核心竞争力和经济效益的知识管理平台。<br>作为国内发展最快的KAAS（知识管理）厂商之一，2019年，先后获得IDG资本、双湖资本、险峰长青、猫头鹰基金等多个资本青睐。独角兽公司“三节课”决定内部孵化一款企业知识管理产品，经数千万研发科技投入孵化成功，“咕咕知识管家”于2021年3月从三节课剥离并独立运营<br>截止目前Goo.team累计服务小鹅通、美术宝、51个税、欧科集团、百度、中金等多家客户，业务涵盖互联网行业、金融行业、企服行业、制造行业、零售行业、医疗行业、游戏行业等多个领域。<br>愿景：让所有人用知识来轻松工作。<br>企业使命：引领企业知识管理创新，驱动组织绩效高速增长。',
        establishDate: '2021-03-31',
        address: '成都武侯区菁蓉汇5a1楼',
        itemIdx: 4,
      },
    },
  ],
  totalCount: 300,
  brandCard: null,
};
