'use client';

import {useEffect, useState, useRef} from 'react';
import {Button, Table, Tag, Tooltip} from "antd";
import './index.scss';

interface IMac {
  userName: string;
  year: string;
  price: string;
  screenSize: string;
  cpu: string;
  oldOrNew: string;
  version: string;
  other: string;
}

export default function MacList() {
  const [source, setSource] = useState<IMac[]>([]);

  useEffect(() => {
    fetch('/api/mac-list').then(async res => {
      const json: any[] = await res.json();
      const _list: IMac[] = json.map((item: any) => {
        const [oldOrNew, year, _, screenSize, ...resLabel] = item.title.replace(/(苹果|电脑|MacBook Pro)/g, '').split(/\s+/);
        const cpu = item.labelPosition?.paramLabelsInfo?.filter((item2: any) => item2.leftText.labelText === 'CPU')?.[0]?.labelText;
        return {
          ...item,
          year,
          price: item.infoPrice / 100,
          screenSize,
          cpu,
          oldOrNew,
          version: item.title.includes('国行') ? '国行' : '其他版本',
          other: resLabel.slice(0, -2).join(' ').replace(new RegExp(cpu), '').replace(/(国行|其他版本)/, '').trim(),
        }
      });
      setSource(_list);
    });
  }, []);

  // 年份 屏幕尺寸 分辨率  价格  CPU  成色  原价 是否国行
  const columns = [
    {
      title: 'userName',
      dataIndex: 'userName',
      ellipsis: true,
    },
    {
      title: '年份',
      dataIndex: 'year',
      ellipsis: true,
    },
    {
      title: '价格',
      dataIndex: 'price',
    },
    {
      title: '屏幕尺寸',
      dataIndex: 'screenSize',
      ellipsis: true,
      // filters: activeTimeOpts.map(s => ({text: `${s}/ ${activeTimeCountMap[s] ?? 0}`, value: s})),
      // defaultFilteredValue: filterValue.activeTime,
      // filteredValue: filterValue.activeTime,
    },
    {
      title: 'CPU',
      dataIndex: 'cpu',
    },
    {
      title: '成色',
      dataIndex: 'oldOrNew',
    },
    {
      title: '版本',
      dataIndex: 'version',
    },
    {
      title: '其他',
      dataIndex: 'other',
    },
  ];

  return (
    <div className="wrap">
      <Table
        rootClassName={'tableWrap'}
        rowClassName={'row_cls'}
        rowKey={'infoId'}
        size="middle"
        dataSource={source}
        columns={columns}
        pagination={false}
        scroll={{x: true}}
        onChange={(pagination, filters, sorter, extra) => {
          // 分页、排序、筛选变化时触发
          // {activeTime: string[]}
          // onChangeFilter(filters);
        }}
      />
    </div>
  );
}
