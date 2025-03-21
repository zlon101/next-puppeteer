'use client';

import {useEffect, useState} from 'react';
import {Checkbox, Select, Tabs, TabsProps, Form, Input, Button} from 'antd';
import styles from './page.module.scss';
import JobTable from '../components/job';
import {DefalutFilterVal, PageType, IFilterValue} from '@/components/job/const';
import {logIcon} from "@/lib/log";

export default function Home() {
  const [filterOpts, setFilterOpts] = useState<Record<string, any>>({});
  const [filterValue, setFilterValue] = useState<IFilterValue>({} as any); // DefalutFilterVal
  const [form] = Form.useForm();

  const onUpdateFilterOpt = (type: string, val: any) => {
    setFilterOpts(prev => ({...prev, [type]: val}));
  };

  const onChangeFilter = (val: Partial<Record<keyof IFilterValue, any>>) => {
    setFilterValue(prev => ({...prev, ...val}));
    form.setFieldsValue({...filterValue, ...val});
  };

  const items: TabsProps['items'] = [
    {
      key: '0',
      label: 'boss网页',
      children: (
        <JobTable
          pageType={PageType.bossLogin}
          filterValue={filterValue}
          onUpdateFilterOption={onUpdateFilterOpt}
          onChangeFilter={onChangeFilter}
        />
      ),
    },
    {
      key: '2',
      label: 'boss小程序',
      children: (
        <JobTable
          pageType={PageType.bossWx}
          filterValue={filterValue}
          onUpdateFilterOption={onUpdateFilterOpt}
          onChangeFilter={onChangeFilter}
        />
      ),
    },
    {
      key: '3',
      label: '智联网页',
      children: (
        <JobTable
          pageType={PageType.zhilianLogin}
          filterValue={filterValue}
          onUpdateFilterOption={onUpdateFilterOpt}
          onChangeFilter={onChangeFilter}
        />
      ),
    },
    {
      key: '4',
      label: '智联小程序',
      children: (
        <JobTable
          pageType={PageType.zhiliangWx}
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
        onValuesChange={(changedValues) => {
          if (['waitLogin', '猎头'].some(k => changedValues.hasOwnProperty(k))) {
            setFilterValue(prev => ({...prev, ...changedValues}));
          }
        }}
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
