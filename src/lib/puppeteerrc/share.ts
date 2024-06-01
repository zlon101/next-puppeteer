import {IJob} from "@/components/job/const";

export async function closeBrowser(browser: any) {
  try {
    // const pages = await browser.pages() || [];
    // await Promise.all(pages.map(async (item: any) => await item.close()));
    // if (browser.isConnected()) {
    //   await browser.close();
    //   await browser.disconnect();
    // } else {
    //   await browser.close();
    // }
  } catch (error) {
  }
}

export function parseSalary(salaryDesc: string): [number, number, number] {
  const [limit, bonus = '0'] = salaryDesc.split('.');
  return [...limit.split('-').map(parseFloat), parseInt(bonus, 10)] as [number, number, number];
}

export function filterJobs(jobs: IJob[]) {
  return jobs.filter((job: IJob) => {
    let black = false;
    const _activeTime = job.Info?.activeTime ?? '';
    black = !!_activeTime && (_activeTime.includes('年') || /[345]月内/.test(_activeTime));
    black = black || job.brandName?.includes('外企德科');
    return !black;
  });
}
