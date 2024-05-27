'use client';

import {useEffect, useState, useMemo} from 'react';
import {Checkbox, Select, Tabs, TabsProps, Form, Input, Button} from 'antd';
import cls from 'classnames';
import styles from './page.module.scss';
import Boss, {IProps} from '@/components/boss';
import {logIcon} from "@/lib/log";

const DefalutFilterVal = {
  '猎头': false,
  // 今日活跃, 3日内活跃, 本周活跃, 2周内活跃, 本月活跃, 2|3|4|5月内活跃, 近半年活跃, 半年前活跃
  activeTime: ['刚刚活跃', '在线', '今日活跃', '3日内活跃', '本周活跃', '2周活跃'],
  money: 15,
  establishDate: '2020-12-12',
};

export default function Home() {
  const [filterOpts, setFilterOpts] = useState<Record<string, any>>({});
  const [filterValue, setFilterValue] = useState<IProps['filterValue']>(DefalutFilterVal as any);
  const [form] = Form.useForm();

  const onUpdateFilterOpt = (type: string, val: any) => {
    setFilterOpts(prev => ({...prev, [type]: val}));
  };

  const onChangeFilter = (val: Record<string, any>) => {
    setFilterValue(prev => ({...prev, ...val}));
  };

  const onSelectChange = (type: string, e: any) => {
    logIcon('onSelectChange', {type, e});
  };

  const items: TabsProps['items'] = [
    {
      key: '0',
      label: '自定义搜索(登录后)',
      children: (
        <Boss
          pageType={'user'}
          filterValue={filterValue}
          onUpdateFilterOption={onUpdateFilterOpt}
          onChangeFilter={onChangeFilter}
        />
      ),
    },
    {
      key: '1',
      label: '平台推荐(登录后)',
      children: (
        <Boss
          pageType={'recommLogined'}
          filterValue={filterValue}
          onUpdateFilterOption={onUpdateFilterOpt}
          onChangeFilter={onChangeFilter}
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
          onChangeFilter={onChangeFilter}
        />
      ),
    },
  ];

  return (
    <div className={styles.wrap}>
      <Form
        layout={'inline'}
        form={form}
        initialValues={filterValue}
        onFinish={(allVal) => {
          logIcon('onFinish', allVal);
          setFilterValue(prev => ({...prev, ...allVal}));
        }}
      >
        <Form.Item label="关键字" name="keyword">
          <Input />
        </Form.Item>
        <Form.Item label="薪资" name="money">
          <Input />
        </Form.Item>
        <Form.Item label="成立日期" name="establishDate">
          <Input />
        </Form.Item>
        <Form.Item label="招聘状态" name="招聘状态">
          <Select
            style={{width: '100px'}}
            options={(filterOpts['招聘状态'] || []).map((s: string) => ({value: s, label: s}))}
          />
        </Form.Item>
        <Form.Item name="猎头" valuePropName="checked">
          <Checkbox>猎头</Checkbox>
        </Form.Item>
        <Form.Item name="waitLogin" valuePropName="checked">
          <Checkbox>WaitLogin</Checkbox>
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form>

      <Tabs defaultActiveKey="0" items={items}/>
    </div>
  );
}
