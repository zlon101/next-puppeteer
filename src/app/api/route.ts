import {launch} from '@/lib/puppeteerrc';

// export const dynamic = 'force-dynamic'; // defaults to auto

interface IJob {
  jobName: string; // 岗位
  jobDegree: string; // 本科
  jobExperience: string; // 经验要求
  jobLabels: string[];
  skills?: string[]; // 技能

  salaryDesc: string; // 工资
  welfareList: string[]; // 福利
  daysPerWeekDesc: string;

  jobValidStatus: number;
  brandName: string;
  brandIndustry: string; // 行业
  brandScaleName: string; // 规模
  brandStageName: string; // 融资状态
  areaDistrict: string; // 双流
  businessDistrict: string; // 华阳
  jobType: number;
  proxyJob: number;
  proxyType: number;

  bossName: string;
  bossTitle: string;
  bossOnline: boolean;
}

interface IJobCard {
  jobName: string;
  postDescription: string;
  address: string;
  activeTimeDesc: string; // 活跃度
  brandName: string;
}
interface IJobsRes {
  resCount: number;
  hasMore: boolean;
  jobList: IJob[];
  totalCount: number;
}
export async function GET(req: Request) {
  const filterData = await launch();
  return Response.json(filterData);
}

export async function POST() {
  const res = await fetch('https://data.mongodb-api.com/...', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Key': process.env.DATA_API_KEY!,
    },
    body: JSON.stringify({time: new Date().toISOString()}),
  });

  const data = await res.json();
  return Response.json(data);
}
