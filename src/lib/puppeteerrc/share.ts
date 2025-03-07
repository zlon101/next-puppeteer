import {IJob} from "@/components/job/const";

export function parseSalary(salaryDesc: string): [number, number, number] {
  const [limit, bonus = '0'] = salaryDesc.split('.');
  return [...limit.split('-').map(parseFloat), parseInt(bonus, 10)] as [number, number, number];
}

const Blacklist = ['外企德科', '兴业数金', '软通动力', '中软国际', '博才世杰', '赛意信息', '上海舟恩信息', '君鑫科技', '桌软科技', '诚迈科技'];
export function filterJobs(jobs: IJob[]) {
  return jobs.filter((job: IJob) => {
    let black = false;
    const _activeTime = job.aainfo?.activeTime ?? '';
    black = !!_activeTime && (_activeTime.includes('年') || /[345]月内/.test(_activeTime));
    black = black || Blacklist.some(item => job.brandName?.includes(item));
    black = black || !/(web|前端|react|vue|js|javascript|html|node)/i.test(job.jobName);
    return !black;
  });
}

export async function goto(page: any, url: string) {
  // await page.waitForNavigation({waitUntil: 'domcontentloaded'});
  await page.goto(url);
}

export async function waitForContentLoaded(page: any) {
  await page.waitForFunction(async () => {
    return new Promise((resolve, reject) => {
      if (document.readyState !== 'loading') {
        resolve(true);
      }
      document.addEventListener('DOMContentLoaded', () => {
        resolve(true);
      });
    });
  });
  return true;
}
