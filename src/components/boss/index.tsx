'use client';

import {useEffect, useState, useMemo} from 'react';
import {Table, Tag, Button, Tooltip, message} from 'antd';
import {logIcon, createRegExp, traverse, isHideElement} from '@/lib/tool';
import {IJobsRes, IJob} from '@/app/api/boss/route';
import {parseSalary} from "@/lib/puppeteerrc/share";
import './index.scss';

function NoWrap(props: any) {
  const {children, ...resProps} = props;
  return (
    <span style={{whiteSpace: 'nowrap'}} {...resProps}>
      {children || '-'}
    </span>
  );
}

interface Area {
  text: string;
  value: string;
  children: {
    text: string;
    value: string;
    count: number;
  }[];
}
export interface IProps {
  pageType: 'normal' | 'user' | 'recommLogined';
  filterValue: {
    '招聘状态': string[];
    '猎头': boolean;
    keyword: string;
    activeTime: string[];
    address: string[];
    money: string;
    establishDate: string;
    waitLogin: boolean;
  };
  onUpdateFilterOption: (type: string, value: any) => void;
  onChangeFilter: (val: Record<string, any>) => void;
}

const PairPage: Record<string, string> = {
  user: 'recommLogined',
  recommLogined: 'user',
  // normal: 'xxx',
};
const RowKey = 'encryptJobId';
export default function Boss(props: IProps) {
  const {pageType, filterValue, onUpdateFilterOption, onChangeFilter} = props;
  const [source, setSource] = useState<IJob[]>([]);
  const [fetchTime, setFetchTime] = useState<string>('');
  const [jobStatusOpts, setJobStatusOpts] = useState<string[]>([]);
  const [activeTimeOpts, setActiveTimeOpts] = useState<string[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  const [filtedList, areaOptions] = useMemo(() => {
    const filterActiveTime = filterValue.activeTime || [];
    const areaCountMap: Record<string, number> = {};
    const list = source.reduce((acc, _job) => {
      let ok = !filterActiveTime.length || filterActiveTime.includes(_job.Info.activeTime);
      ok = ok && (filterValue['猎头'] || !_job.proxyJob);
      ok = ok && (!filterValue['招聘状态'] || filterValue['招聘状态'].includes(_job.Info.jobStatus));
      ok = ok && (!filterValue.address || (!!_job.businessDistrict && filterValue.address.some(_addre => _addre.includes(_job.businessDistrict))));
      const [min, max, bonus] = parseSalary(_job.salaryDesc);
      const filterMoney = filterValue.money ? parseInt(filterValue.money) : 0;
      ok = ok && (!filterMoney || max >= filterMoney);
      // 成立日期
      ok = ok && (!filterValue.establishDate || (!!_job.Info.establishDate && filterValue.establishDate >= _job.Info.establishDate));
      if (ok) {
        if (_job.businessDistrict) {
          areaCountMap[_job.businessDistrict] ? areaCountMap[_job.businessDistrict]++ : (areaCountMap[_job.businessDistrict] = 1);
        }
        acc.push(_job);
      }
      return acc;
    }, [] as any);

    // 地点
    const areaTree: Area[] = [];
    list.forEach((job: IJob) => {
      if (!job.businessDistrict) {
        return;
      }
      const areaIdx = areaTree.findIndex((a: Area) => a.value === job.areaDistrict);
      if (areaIdx !== -1) {
        if (areaTree[areaIdx].children.findIndex(bb => bb.text === job.businessDistrict) === -1) {
          areaTree[areaIdx].children.push({
            value: `${job.areaDistrict}/${job.businessDistrict}`,
            text: job.businessDistrict,
            count: areaCountMap[job.businessDistrict],
          });
        }
      } else {
        areaTree.push({
          value: job.areaDistrict,
          text: job.areaDistrict,
          children: [{
            value: `${job.areaDistrict}/${job.businessDistrict}`,
            text: job.businessDistrict,
            count: areaCountMap[job.businessDistrict],
          }],
        })
      }
    });
    areaTree.forEach(areaNode => {
      areaNode.text = `${areaNode.text} - ${areaNode.children.length}`;
      areaNode.children.forEach(childNode => (childNode.text = `${childNode.text} - ${childNode.count}`));
    })
    return [list, areaTree];
  }, [source, filterValue]);

  const columns = [
    {
      title: '公司',
      dataIndex: 'brandName',
      ellipsis: true,
      render: (s: string, record: IJob, index: number) => (
        <p style={{width: '100px'}}>
          <span className={'larger'}>
            {index + 1}. {s}
          </span>
          <br />
          {record.proxyJob ? '猎头' : null}
        </p>
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
        <div style={{width: '100px'}}>
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
        return <span style={{width: '100px'}}>{v}</span>;
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
      filterSearch: false,
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
      ellipsis: true,
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
        const res = await fetch(`/api/boss?type=${pageType}&waitLogin=${filterValue.waitLogin}`);
        data = await res.json();
      }
      const jobs = data?.jobList ?? [];
      const _jobStatusOpts: string[] = [];
      const _activeTimeOpts: string[] = [];
      jobs.forEach(job => {
        if (job.brandName !== job.Info.name && !job.proxyJob) {
          logIcon('job.brandName !== job.Info.name', undefined, 'error');
          console.debug(job);
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
      setFetchTime(data?.fetchTime ?? '');
      !cache && saveCache(jobs);
    } catch (e) {
      logIcon('error', e, 'error');
      console.debug(e);
    }
  };

  const saveCache = (val?: IJob[]) => {
    localStorage.setItem(pageType, JSON.stringify({jobList: val || source, fetchTime}));
    messageApi.open({
      type: 'success',
      content: '保存成功',
    });
  };

  const clearCache = () => {
    localStorage.removeItem(pageType);
    messageApi.open({
      type: 'success',
      content: '清除成功',
    });
  };

  const onMerge = () => {
    const other = JSON.parse(localStorage.getItem(PairPage[pageType]) ?? 'null');
    if (!other) {
      messageApi.open({
        type: 'warning',
        content: `${PairPage[pageType]} 缓存数据为空`,
      });
      return;
    }
    const tmp = new Set();
    const newJobs = source.concat(other).filter((item2: IJob) => {
      if (tmp.has(item2[RowKey])) {
        return false;
      }
      tmp.add(item2[RowKey]);
      return true;
    });
    setSource(newJobs);
    messageApi.open({
      type: 'success',
      content: '合并成功',
    });
  };

  useEffect(() => {
    const cache = JSON.parse(localStorage.getItem(pageType) ?? 'null');
    cache && fetchData(cache);
  }, []);

  return (
    <div className={'wrap'}>
      {contextHolder}
      <div className={'flex-r'}>
        <NoWrap>总共 {filtedList.length} 条</NoWrap>
        <NoWrap>时间 {fetchTime || '-'}</NoWrap>
        <Button onClick={() => fetchData()} style={{margin: '0 10px'}}>
          刷新
        </Button>
        <Button onClick={() => saveCache()} style={{margin: '0 10px'}}>
          Save
        </Button>
        <Button onClick={clearCache} style={{margin: '0 10px'}}>
          清除storage
        </Button>
        <Button onClick={onMerge} style={{margin: '0 10px'}}>
          merge
        </Button>
      </div>
      <Table
        rootClassName={'tableWrap'}
        rowClassName={'row_cls'}
        rowKey={RowKey}
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
