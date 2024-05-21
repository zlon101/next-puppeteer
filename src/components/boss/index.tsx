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

interface Area {
  text: string;
  value: string;
  children: {
    text: string;
    value: string;
  }[];
}
export interface IProps {
  pageType: 'normal' | 'user';
  filterValue: {
    '招聘状态': string[];
    '猎头': boolean;
    keyword: string;
    activeTime: string[];
    address: string[];
    money: string;
    establishDate: string;
  };
  onUpdateFilterOption: (type: string, value: any) => void;
  onChangeFilter: (val: Record<string, any>) => void;
}

export default function Boss(props: IProps) {
  const {pageType, filterValue, onUpdateFilterOption, onChangeFilter} = props;
  const [source, setSource] = useState<IJob[]>([]);
  const [jobStatusOpts, setJobStatusOpts] = useState<string[]>([]);
  const [activeTimeOpts, setActiveTimeOpts] = useState<string[]>([]);
  const [areaOptions, setAreaOption] = useState<Area[]>([]);

  const filtedList = useMemo(() => {
    const filterActiveTime = filterValue.activeTime || [];
    return source.reduce((acc, _job) => {
      let ok = !filterActiveTime.length || filterActiveTime.includes(_job.Info.activeTime);
      ok = ok && (filterValue['猎头'] || !_job.proxyJob);
      ok = ok && (!filterValue['招聘状态'] || filterValue['招聘状态'].includes(_job.Info.jobStatus));
      ok = ok && (!filterValue.address || (!!_job.businessDistrict && filterValue.address.some(_addre => _addre.includes(_job.businessDistrict))));
      const [min, max, bonus] = (() => {
        const [limit, bonus = '0'] = _job.salaryDesc.split('.');
        return [...limit.split('-').map(parseFloat), parseInt(bonus, 10)];
      })();
      const filterMoney = filterValue.money ? parseInt(filterValue.money) : 0;
      ok = ok && (!filterMoney || max >= filterMoney);
      // 成立日期
      ok = ok && (!filterValue.establishDate || (!!_job.Info.establishDate && filterValue.establishDate >= _job.Info.establishDate));

      ok && acc.push(_job);
      return acc;
    }, [] as any);
  }, [source, filterValue]);

  const columns = [
    {
      title: '公司',
      dataIndex: 'brandName',
      ellipsis: true,
      width: 100,
      render: (s: string, record: IJob, index: number) => (
        <>
          <span className={'larger'}>
            {index + 1}. {s}
          </span>
          <br />
          {record.proxyJob ? '猎头' : null}
        </>
      ),
    },
    {
      title: '岗位',
      dataIndex: 'jobName',
      ellipsis: true,
      width: 100,
      // render: (s: string, record: IJob, index: number) => <NoWrap>{s}</NoWrap>,
    },
    {
      title: '活跃程度',
      key: 'activeTime',
      ellipsis: true,
      width: 150,
      filters: activeTimeOpts.map(s => ({text: s, value: s})),
      defaultFilteredValue: filterValue.activeTime,
      filteredValue: filterValue.activeTime,
      // onFilter: (value: any, record: IJob) => {
      //   return record.Info.activeTime === value;
      // },
      render: (_: unknown, record: IJob, index: number) => (
        <div>
          <NoWrap>{record.Info.activeTime}</NoWrap><br/>
          {/*<NoWrap>{record.Info.upDate}</NoWrap>*/}
          {/*<NoWrap>{record.Info.jobStatus} - {record.jobValidStatus}</NoWrap>*/}
        </div>
      ),
    },
    {
      title: '工资',
      dataIndex: 'salaryDesc',
      ellipsis: true,
      width: 100,
      render(v: string, record: IJob) {
        return <NoWrap>{v}</NoWrap>;
      },
    },
    {
      title: '地点',
      key: 'address',
      ellipsis: true,
      width: 120,
      filters: areaOptions,
      defaultFilteredValue: filterValue.address,
      filteredValue: filterValue.address,
      filterMode: 'tree' as any,
      filterSearch: true,
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
      ellipsis: true,
      width: 100,
      sorter: (a: IJob, b: IJob) => parseInt(a.Info.establishDate.replace(/\D/g, '')) - parseInt(b.Info.establishDate.replace(/\D/g, '')),
      sortDirections: ['ascend', 'descend', 'ascend'] as any,
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
      title: '要求',
      hidden: true,
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
    // ============================================
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
      const areaTree: Area[] = [];
      jobs.forEach(job => {
        if (job.brandName !== job.Info.name && !job.proxyJob) {
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
        // 地点
        const areaIdx = areaTree.findIndex((a: Area) => a.value === job.areaDistrict);
        if (job.businessDistrict) {
          if (areaIdx !== -1) {
            if (areaTree[areaIdx].children.findIndex(bb => bb.text === job.businessDistrict) === -1) {
              areaTree[areaIdx].children.push({
                value: `${job.areaDistrict}/${job.businessDistrict}`,
                text: job.businessDistrict,
              });
            }
          } else {
            areaTree.push({
              value: job.areaDistrict,
              text: job.areaDistrict,
              children: [],
            })
          }
        }
      });
      console.debug('areaTree', areaTree);
      setAreaOption(areaTree);
      setJobStatusOpts(_jobStatusOpts);
      onUpdateFilterOption('招聘状态', _jobStatusOpts);
      setActiveTimeOpts(_activeTimeOpts);
      setSource(jobs);
    } catch (e) {
      logIcon('error', e, 'error');
      console.debug(e);
      debugger;
    }
  };

  useEffect(() => {
    const cache = JSON.parse(localStorage.getItem(pageType) ?? 'null');
    cache && fetchData(cache);
  }, []);

  logIcon('filterValue', filterValue);

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
        onChange={(pagination, filters, sorter, extra) => {
          // 分页、排序、筛选变化时触发
          // {activeTime: string[]}
          onChangeFilter(filters);
        }}
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
