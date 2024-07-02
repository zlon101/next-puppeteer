import {ValueOf} from '@/lib/types';

export const PageType = {
  bossLogin: 'bossLogin',
  bossWx: 'bossWx',
  bossNotLogin: 'bossNotLogin',
  zhilianLogin: 'zhilianLogin',
  zhiliangWx: 'zhiliangWx',
} as const;

export type IPageType = ValueOf<typeof PageType>;

export const ignoreNamesCtx = {
  key: 'IgnoreNameSym',
  get(): string[] {
    return JSON.parse(localStorage.getItem(this.key) ?? '[]');
  },
  set(v: any) {
    localStorage.setItem(this.key, JSON.stringify(v));
  },
  add(name: string) {
    const newNames = [...new Set([...this.get(), name])];
    this.set(newNames);
  }
}

export interface IFilterValue {
  '招聘状态': string[];
  '猎头': boolean;
  keyword: string;
  activeTime: string[];
  address: string[];
  money: string;
  establishDate: string;
  waitLogin: boolean;
}

export const DefalutFilterVal: Partial<IFilterValue> = {
  '猎头': false,
  // 今日活跃, 3日内活跃, 本周活跃, 2周内活跃, 本月活跃, 2|3|4|5月内活跃, 近半年活跃, 半年前活跃
  activeTime: ['刚刚活跃', '在线', '今日活跃', '3日内活跃', '本周活跃', '2周活跃'],
  money: '15',
  establishDate: '2020-12-12',
};

export const RowKey = 'uid';

export interface ReqParam {
  waitLogin: string;
  type: IPageType;
  pageLimit: string;
  jobLimit: string;
  location: string;
}

export interface IJob {
  uid: string;
  jobName: string; // 岗位
  jobDegree?: string; // 本科
  jobExperience?: string; // 经验要求
  jobLabels?: string[]; // 学历、经验
  skills?: string[]; // 技能

  salaryDesc: string; // 工资
  welfareList: string[]; // 福利
  daysPerWeekDesc?: string;

  brandName: string;
  // brandIndustry: string; // 行业
  // brandScaleName: string; // 规模
  // brandStageName: string; // 融资状态
  areaDistrict: string; // 双流
  businessDistrict: string; // 华阳
  businessName?: string;
  districtName?: string;

  other?: string;

  jobType: number;
  proxyJob?: number; // 1: 猎头
  proxyType: number;

  // bossName: string;
  // bossTitle: string;
  bossOnline: boolean;

  detailUrl: string;
  encryptJobId: string;
  securityId: string;
  lid: string;

  aainfo: {
    uid: string;
    // 招聘状态
    jobStatus: string;
    // 活跃程度
    activeTime: string;
    upDate: string;
    // 公司介绍
    companyInfoHtml?: string;
    // 成立日期
    establishDate: string;
    // 详细地址
    address: string;
    // 岗位职责、任职要求
    jobRequire?: string;
    location?: [number, number];
  };
}

export interface IJobsRes {
  jobList: IJob[];
  fetchTime: string;
}
