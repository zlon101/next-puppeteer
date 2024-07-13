'use client'

import {useEffect, useState, useMemo} from 'react';
import {Table, Tag, Button, Tooltip, message} from 'antd';
import {useImmer} from 'use-immer';
import Link from 'next/link'
import {logIcon, obj2query, serveEvent} from '@/lib/tool';
import {filterJobs, parseSalary} from "@/lib/puppeteerrc/share";
import {IFilterValue, IPageType, RowKey, IJobsRes, IJob, PageType, ignoreNamesCtx, getAreaTreeFromJobs, Area} from './const';
import './index.scss';

export interface IProps {
  pageType: IPageType;
  filterValue: IFilterValue;
  onUpdateFilterOption: (type: string, value: any) => void;
  onChangeFilter: (val: Partial<Record<keyof IFilterValue, any>>) => void;
}

export default function JobTable(props: IProps) {
  const {pageType, filterValue, onUpdateFilterOption, onChangeFilter} = props;
  const [source, setSource] = useState<IJob[]>([]);
  const [fetchTime, setFetchTime] = useState<string>('');
  const [activeTimeOpts, setActiveTimeOpts] = useState<string[]>([]);
  const [areaTree, setAreaTree] = useState<Area[]>([]);
  const [ignoreNames, setIgnoreNames] = useState<string[]>(ignoreNamesCtx.get());
  const [messageApi, contextHolder] = message.useMessage();

  const [filtedList, areaCountMap, activeTimeCountMap] = useMemo(() => {
    // console.debug('\nfilterValue', JSON.stringify(filterValue, null, 2));
    const filterActiveTime = filterValue.activeTime || [];
    const areaCountMap: Record<string, number> = {};
    const activeTimeCountMap: Record<string, number> = {};
    const list = source.reduce((acc, _job) => {
      let ok = !filterActiveTime.length || filterActiveTime.includes(_job.aainfo.activeTime);
      ok = ok && (filterValue['猎头'] || !_job.proxyJob);
      ok = ok && (!filterValue['招聘状态'] || filterValue['招聘状态'].includes(_job.aainfo.jobStatus));
      ok = ok && (!filterValue.address || (!!_job.businessDistrict && filterValue.address.some(_addre => _addre.includes(_job.businessDistrict))));
      // 薪资
      const [min, max, bonus] = parseSalary(_job.salaryDesc);
      const filterMoney = filterValue.money ? parseInt(filterValue.money) : 0;
      ok = ok && (!filterMoney || max >= filterMoney);
      // 成立日期
      ok = ok && (!filterValue.establishDate || (!!_job.aainfo.establishDate && filterValue.establishDate >= _job.aainfo.establishDate));
      ok = ok && !ignoreNames.includes(_job.brandName);
      if (ok) {
        acc.push(_job);
        const activeTimeFlag = _job.aainfo.activeTime;
        if (activeTimeFlag) {
          activeTimeCountMap[activeTimeFlag] ? activeTimeCountMap[activeTimeFlag]++ : (activeTimeCountMap[activeTimeFlag] = 1);
        }
        const areaId = `${_job.areaDistrict}/${_job.businessDistrict}`;
        if (_job.businessDistrict) {
          areaCountMap[areaId] ? areaCountMap[areaId]++ : (areaCountMap[areaId] = 1);
        }
      }
      return acc;
    }, [] as any);

    return [list, areaCountMap, activeTimeCountMap];
  }, [source, filterValue, ignoreNames]);

  const areaFilterOpts = useMemo(() => {
    areaTree.forEach(areaNode => {
      areaNode.children.forEach(childNode => {
        childNode.count = areaCountMap[childNode.value] ?? 0;
        childNode.text = `${childNode.label}/ ${childNode.count}`;
      });
      areaNode.text = `${areaNode.label}/ ${areaNode.children.reduce((sum, child) => sum + child.count!, 0)}`;
    });
    return areaTree;
  }, [areaTree, areaCountMap]);

  const fetchData = async (cache?: IJobsRes) => {
    try {
      let data = cache;
      if (!data) {
        const query = obj2query({
          type: pageType,
          waitLogin: filterValue.waitLogin,
          ignores: ignoreNamesCtx.getStr(),
        });
        data = await serveEvent<IJobsRes>(`/api/job?${query}`);
      }
      // 从小程序中删除 web 中已有的数据
      if ([PageType.bossWx, PageType.zhiliangWx].includes(pageType as any)) {
        const webKey = pageType === PageType.bossWx ? PageType.bossLogin : PageType.zhilianLogin;
        const jobsFromWeb = JSON.parse(localStorage.getItem(webKey) ?? 'null');
        if (jobsFromWeb) {
          data!.jobList = data!.jobList.filter(jobItem => !jobsFromWeb.jobList.some((job2: IJob) => job2.uid === jobItem.uid));
          logIcon(`过滤web中已有的数据后剩余 ${data.jobList.length} 条`);
        }
      }

      const jobs = filterJobs(data?.jobList ?? []);
      const _jobStatusOpts: string[] = [];
      const _activeTimeOpts: string[] = [];
      jobs.forEach(job => {
        if (job.aainfo.jobStatus && !_jobStatusOpts.includes(job.aainfo.jobStatus)) {
          _jobStatusOpts.push(job.aainfo.jobStatus);
        }
        if (job.aainfo.activeTime && !_activeTimeOpts.includes(job.aainfo.activeTime)) {
          _activeTimeOpts.push(job.aainfo.activeTime);
        }
      });

      // setJobStatusOpts(_jobStatusOpts);
      onUpdateFilterOption('招聘状态', _jobStatusOpts);
      setActiveTimeOpts(_activeTimeOpts);
      setAreaTree(getAreaTreeFromJobs(jobs));

      setSource(jobs);
      data?.fetchTime && setFetchTime(data?.fetchTime);
      !cache && saveCache(data);
    } catch (e) {
      logIcon('error', e, 'error');
      console.debug(e);
    }
  };

  const saveCache = (val?: IJobsRes) => {
    localStorage.setItem(pageType, JSON.stringify(val ? val : {jobList: source, fetchTime}));
    messageApi.open({
      type: 'success',
      content: '保存成功',
      duration: 0.5,
    });
  };

  const clearCache = () => {
    localStorage.removeItem(pageType);
    messageApi.open({
      type: 'success',
      content: '清除成功',
      duration: 0.5,
    });
  };

  const onDel = (job: IJob, e: any) => {
    e.stopPropagation();
    ignoreNamesCtx.add(job.brandName);
    setIgnoreNames(pre => [job.brandName, ...pre]);
    messageApi.open({
      type: 'success',
      content: '删除成功',
      duration: 0.5,
    });
  };

  const columns = [
    {
      title: '公司',
      dataIndex: 'brandName',
      ellipsis: true,
      render: (s: string, record: IJob, index: number) => (
        <p>
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
      filters: activeTimeOpts.map(s => ({text: `${s}/ ${activeTimeCountMap[s] ?? 0}`, value: s})),
      defaultFilteredValue: filterValue.activeTime,
      filteredValue: filterValue.activeTime,
      render: (_: unknown, record: IJob, index: number) => (
        <div style={{width: '100px'}}>
          <NoWrap>{record.aainfo.activeTime}</NoWrap><br/>
          {/*<NoWrap>{record.aainfo.upDate}</NoWrap>*/}
          {/*<NoWrap>{record.aainfo.jobStatus} - {record.jobValidStatus}</NoWrap>*/}
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
      filters: areaFilterOpts,
      defaultFilteredValue: filterValue.address,
      filteredValue: filterValue.address,
      filterMode: 'tree' as any,
      filterSearch: false,
      render(v: unknown, record: IJob) {
        return (
          <Tooltip placement="top" title={record.aainfo.address}>
            <NoWrap>
              {record.businessDistrict}/{record.areaDistrict}
            </NoWrap>
          </Tooltip>
        );
      },
    },
    {
      hidden: pageType === PageType.zhilianLogin,
      title: '成立日期',
      key: 'establishDate',
      ellipsis: true,
      width: 100,
      sorter: (a: IJob, b: IJob) => parseInt(a.aainfo.establishDate.replace(/\D/g, '')) - parseInt(b.aainfo.establishDate.replace(/\D/g, '')),
      sortDirections: ['ascend', 'descend', 'ascend'] as any,
      render(v: unknown, record: IJob) {
        return (
          <>
            <NoWrap>{record.aainfo.establishDate}</NoWrap>
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
            title={<p className={'long_txt'} dangerouslySetInnerHTML={{__html: record.aainfo.jobRequire ?? ''}}></p>}>
            <p className={'long_txt es'} dangerouslySetInnerHTML={{__html: record.aainfo.jobRequire ?? '-'}}></p>
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
        const {companyInfoHtml} = record.aainfo;
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
      render: (v: string) => {
        return (<div className={'long_txt'}>{v}</div>);
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: IJob) => {
        return (
          <Button
            size="small"
            style={{fontSize: 12}}
            onClick={(e) => onDel(record, e)}
          >删除</Button>
        );
      },
    },
  ];

  useEffect(() => {
    const cache = JSON.parse(localStorage.getItem(pageType) ?? 'null');
    cache && fetchData(cache);
    if (pageType === PageType.zhilianLogin) {
      onChangeFilter({
        activeTime: [],
        establishDate: '',
      });
    }
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
        <Link href="/map-chart">地图</Link>
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

function NoWrap(props: any) {
  const {children, ...resProps} = props;
  return (
    <span style={{whiteSpace: 'nowrap'}} {...resProps}>
      {children || '-'}
    </span>
  );
}
