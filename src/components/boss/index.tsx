'use client';

import {useEffect, useState, useMemo} from 'react';
import {Table, Tag, Checkbox, Select, Button, Tooltip} from 'antd';
import {logIcon, createRegExp, traverse, isHideElement} from '@/lib/tool';
import {IJobsRes, IJob} from '@/app/api/boss/route';
import './index.scss';

function NoWrap(props: any) {
  const {children, ...resProps} = props;
  return (
    <span style={{whiteSpace: 'nowrap'}} {...resProps}>
      {children || '-'}
    </span>
  );
}

const KeywordReg = /(反流|狭窄|主动脉瓣|二尖瓣|三尖瓣|房颤|心房纤颤|过速)/;

interface IProps {
  pageType: 'normal' | 'user';
  filterValue: Record<string, any>;
  onUpdateFilterOption: (type: string, value: any) => void;
}

export default function Boss(props: IProps) {
  const {pageType, filterValue, onUpdateFilterOption} = props;
  const [source, setSource] = useState<IJob[]>([]);
  const [jobStatusOpts, setJobStatusOpts] = useState<string[]>([]);
  const [activeTimeOpts, setActiveTimeOpts] = useState<string[]>([]);

  const filtedList = useMemo(() => {
    let ls = source;
    return ls;
  }, [source, filterValue]);

  const columns = [
    {
      title: '公司',
      dataIndex: 'brandName',
      render: (s: string, record: IJob, index: number) => (
        <>
          <span className={'larger'}>
            {index + 1}. {s}
          </span>
          <br />
          {!record.proxyJob && '猎头'}
        </>
      ),
    },
    {
      title: '岗位',
      dataIndex: 'jobName',
      render: (s: string, record: IJob, index: number) => <NoWrap>{s}</NoWrap>,
    },
    {
      title: '活跃程度',
      key: 'activeTime',
      filters: activeTimeOpts.map(s => ({text: s, value: s})),
      onFilter: (value: any, record: IJob) => {
        return record.Info.activeTime === value;
      },
      // sorter: (a: IJob, b: IJob) => a.name.length - b.name.length,
      // sortDirections: ['ascend', 'descend', 'ascend'],
      render: (_: unknown, record: IJob, index: number) => (
        <div>
          <NoWrap>{record.Info.activeTime}</NoWrap>
          {/*<NoWrap>{record.Info.jobStatus} - {record.jobValidStatus}</NoWrap>*/}
        </div>
      ),
    },
    {
      title: '要求',
      dataIndex: 'jobLabels',
      render: (v: string, record: IJob, index: number) => {
        const keyTexts = record.jobLabels || [];
        if (record.jobExperience && !keyTexts.includes(record.jobExperience)) {
          keyTexts.push(record.jobExperience);
        }
        if (record.jobDegree && !keyTexts.includes(record.jobDegree)) {
          keyTexts.includes(record.jobDegree);
        }
        return (
          <div>
            {keyTexts.map((s: string) => (
              <Tag key={s}>{s}</Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: '职责',
      ellipsis: true,
      dataIndex: 'jobRequire',
      render: (v: unknown, record: IJob, index: number) => {
        return (
          <Tooltip
            placement="top"
            title={<p className={'long_txt'} dangerouslySetInnerHTML={{__html: record.Info.jobRequire}}></p>}>
            <p className={'long_txt es'} dangerouslySetInnerHTML={{__html: record.Info.jobRequire ?? '-'}}></p>
          </Tooltip>
        );
      },
    },
    {
      title: '专业技能',
      dataIndex: 'skills',
      render: (v: string[], record: IJob, index: number) => {
        return (
          <Tooltip
            placement="top"
            title={(v || []).map((s: string) => (
              <Tag key={s}>{s}</Tag>
            ))}>
            <span className={'long_txt es'}>{(v || []).join(', ')}</span>
          </Tooltip>
        );
      },
    },
    // ============================================
    {
      title: '工资',
      dataIndex: 'salaryDesc',
      render(v: string, record: IJob) {
        return <NoWrap>{v}</NoWrap>;
      },
    },
    {
      title: '地点',
      key: 'address',
      render(v: unknown, record: IJob) {
        return (
          <Tooltip placement="top" title={record.Info.address}>
            <NoWrap>
              {record.businessDistrict}/{record.areaDistrict}
            </NoWrap>
          </Tooltip>
        );
      },
    },
    {
      title: '成立日期',
      key: 'establishDate',
      render(v: unknown, record: IJob) {
        return (
          <>
            <NoWrap>{record.Info.establishDate}</NoWrap>
            <br />
            {/*
            <NoWrap>{record.brandIndustry}</NoWrap><br/>
            <NoWrap>{record.brandScaleName}</NoWrap><br/>
            <NoWrap>{record.brandStageName}</NoWrap>
            */}
          </>
        );
      },
    },
    {
      title: '福利',
      dataIndex: 'welfareList',
      hidden: true,
      ellipsis: true,
      render(v: string[], record: IJob) {
        return (
          <Tooltip
            placement="top"
            title={(v || []).map((s: string) => (
              <Tag key={s}>{s}</Tag>
            ))}>
            <p>{record.daysPerWeekDesc}</p>
            <span style={{wordBreak: 'break-all', whiteSpace: 'wrap'}}>{(v || []).join(', ')}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '公司介绍',
      key: 'companyInfoHtml',
      ellipsis: true,
      render(_: unknown, record: IJob) {
        const {companyInfoHtml} = record.Info;
        if (!companyInfoHtml) {
          return '-';
        }
        return (
          <Tooltip
            placement="top"
            title={<p className={'long_txt'} dangerouslySetInnerHTML={{__html: companyInfoHtml}}></p>}>
            <p className={'long_txt es'} dangerouslySetInnerHTML={{__html: companyInfoHtml}}></p>
          </Tooltip>
        );
        // const result = traverse(v, '', {
        //   mode: 'html',
        //   style: 'color:red; font-size: larger; font-weight: bold;',
        // });
        // return <p className={'long_txt'} dangerouslySetInnerHTML={{__html: result?.container as 'string' ?? v}}></p>;
      },
    },
    {
      title: '其他',
      key: 'other',
      hidden: true,
      render: (v: unknown, record: IJob, index: number) => {
        const keys = ['jobType', 'proxyJob', 'proxyType'];
        return (
          <div>
            {keys.map((k: any) => (
              <p key={k}>
                <NoWrap>
                  {k}：{(record as any)[k]}
                </NoWrap>
              </p>
            ))}
          </div>
        );
      },
    },
  ];

  const fetchData = async (cache?: IJobsRes) => {
    try {
      let data = cache;
      if (!cache) {
        const res = await fetch(`/api/boss?type=${pageType}`);
        data = await res.json();
        localStorage.setItem(pageType, JSON.stringify(data));
      }
      const jobs = data?.jobList ?? [];
      const _jobStatusOpts: string[] = [];
      const _activeTimeOpts: string[] = [];
      jobs.forEach(job => {
        if (job.brandName !== job.Info.name) {
          logIcon('job.brandName !== job.Info.name', undefined, 'error');
          console.debug(job);
          debugger;
        }
        if (job.Info.jobStatus && !_jobStatusOpts.includes(job.Info.jobStatus)) {
          _jobStatusOpts.push(job.Info.jobStatus);
        }
        if (job.Info.activeTime && !_activeTimeOpts.includes(job.Info.activeTime)) {
          _activeTimeOpts.push(job.Info.activeTime);
        }
      });
      setJobStatusOpts(_jobStatusOpts);
      onUpdateFilterOption('招聘状态', _jobStatusOpts);
      setActiveTimeOpts(_activeTimeOpts);
      setSource(jobs);
    } catch (e) {
      debugger;
      logIcon('error', e, 'error');
    }
  };

  useEffect(() => {
    const cache = JSON.parse(localStorage.getItem(pageType) ?? 'null');
    cache && fetchData(cache);
  }, []);

  return (
    <div className={'wrap'}>
      <div className={'flex-r'}>
        <NoWrap>总共 {filtedList.length} 条</NoWrap>
        <Button onClick={() => fetchData()} style={{marginLeft: '10px'}}>
          刷新
        </Button>
      </div>
      <Table
        rootClassName={'tableWrap'}
        rowClassName={'row_cls'}
        rowKey={'detailUrl'}
        size="middle"
        dataSource={filtedList}
        columns={columns}
        pagination={false}
        scroll={{x: true}}
        onRow={(record: IJob) => {
          return {
            onClick: () => {
              window.open(record.detailUrl, '_blank');
            },
          };
        }}
      />
    </div>
  );
}

/**

 // Example POST method implementation:
 async function postData(url = "", data = {}) {
 // Default options are marked with *
 const response = await fetch(url, {
 method: "POST", // *GET, POST, PUT, DELETE, etc.
 mode: "cors", // no-cors, *cors, same-origin
 cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
 credentials: "same-origin", // include, *same-origin, omit
 headers: {
 "Content-Type": "application/json",
 // 'Content-Type': 'application/x-www-form-urlencoded',
 },
 redirect: "follow", // manual, *follow, error
 referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
 body: JSON.stringify(data), // body data type must match "Content-Type" header
 });
 return response.json(); // parses JSON response into native JavaScript objects
 }

 postData("https://example.com/answer", { answer: 42 }).then((data) => {
 console.log(data); // JSON data parsed by `data.json()` call
 });

 * **/
