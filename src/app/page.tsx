'use client';

import {useEffect, useState, useMemo} from 'react';
import {Checkbox, Select, Tabs, TabsProps} from 'antd';
import cls from 'classnames';
import styles from './page.module.scss';
import Boss from '@/components/boss';
import {logIcon} from "@/lib/log";

export default function Home() {
  const [filterOpts, setFilterOpts] = useState<Record<string, any>>({});
  const [filterValue, setFilterValue] = useState<Record<string, any>>({});

  const onUpdateFilterOpt = (type: string, val: any) => {
    setFilterOpts(prev => ({...prev, [type]: val}));
  };

  const onSelectChange = (type: string, e: any) => {
    logIcon('onSelectChange', {type, e});
  };

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'czl',
      children: (
        <Boss
          pageType={'user'}
          filterValue={filterValue}
          onUpdateFilterOption={onUpdateFilterOpt}
        />
      ),
    },
    {
      key: '2',
      label: '未登录',
      children: (
        <Boss
          pageType={'normal'}
          filterValue={filterValue}
          onUpdateFilterOption={onUpdateFilterOpt}
        />
      ),
    },
  ];

  return (
    <div className={styles.wrap}>
      <label className={styles.label}>keyword1:
        <input
          className={styles.input}
          value={filterValue.keyword1}
          onInput={(e: any) => setFilterValue(pre => ({...pre, 'keyword1': e.target.value}))}
        />
      </label>
      <label className={styles.label}>keyword2:
        <input
          className={styles.input}
          value={filterValue.keyword2}
          onInput={(e: any) => setFilterValue(pre => ({...pre, 'keyword2': e.target.value}))}
        />
      </label>
      <Select
        style={{width: '100px'}}
        options={(filterOpts['招聘状态'] || []).map((s: string) => ({value: s, label: s}))}
      />
      <Tabs defaultActiveKey="2" items={items}/>
    </div>
  );
}
