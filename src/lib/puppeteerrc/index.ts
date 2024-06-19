/**
 * headerless Chromium
 * https://github.com/puppeteer/puppeteer
 */

import {join} from 'path';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import puppeteer from 'puppeteer';
import {logIcon} from '@/lib/tool';
import {ReqParam, PageType, IJob} from '@/components/job/const';
import {closeBrowser, filterJobs} from './share';
import {enterBoss} from './boss';
import {enterZhiLian} from './zhilian';
import {queryLocation} from "@/lib/puppeteerrc/gaode";

const CachePath = './cache.json';
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
const DefaultQuery = {
  pageLimit: 999,
  jobLimit: 999,
}

export async function launch(query: ReqParam): Promise<IJob[]> {
  async function openBrowser(): Promise<IJob[]> {
    const nQuery = Object.assign({}, DefaultQuery, query);
    const resData = await fetch('http://127.0.0.1:9231/json/version');
    const chromeJson = await resData.json();
    const browser = await puppeteer.connect({
      browserWSEndpoint: chromeJson.webSocketDebuggerUrl,
      defaultViewport: LaunchParam.defaultViewport,
      protocolTimeout: 999999999,
    });
    // const browser = await puppeteer.launch(LaunchParam);
    // const pages = await browser.pages();
    // pages?.forEach((page2: any) => page2.close());

    let jobs: IJob[] = [];
    try {
      const cacheObject = JSON.parse(fs.readFileSync(CachePath, 'utf8') || 'null');
      if (cacheObject && query.waitLogin !== 'true') {
        jobs = cacheObject;
      } else {
        if (nQuery.type === PageType.zhilianLogin) {
          jobs = await enterZhiLian(browser, nQuery);
        } else {
          jobs = await enterBoss(browser, nQuery);
        }
      }
      if (!cacheObject) {
        fs.writeFileSync(CachePath, JSON.stringify(jobs));
        logIcon(`写入缓存成功`);
      }
      // 查询坐标
      const addres = jobs.map((job: IJob) => job.aainfo?.address);
      const locations = await queryLocation(browser, addres);
      jobs.forEach((job, idx) => {
        if (!locations[idx]) {
          console.log(`没有location: ${idx+1}: ${job.brandName}`);
        }
        job.aainfo.location = locations[idx];
      });
      logIcon(`End! 共${jobs.length} 条`);
      fs.writeFileSync(CachePath, '');
      closeBrowser(browser);
      return jobs;
    } catch (e) {
      logIcon('openBrowser Error', undefined, 'error');
      console.log(e);
      // await closeBrowser(browser);
      return e as any;
    }
  }

  exec(ShellCmd);
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        resolve(await openBrowser());
      } catch (_) {
        resolve(await openBrowser());
      }
    }, 2000);
  });
}
