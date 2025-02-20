'use client';

import {useEffect, useState} from 'react';
import {Input, Button, Checkbox} from 'antd';
import styles from '../page.module.scss';
import {serveEvent, getParams, logIcon, setUrlQuery} from '@/lib/tool';
import {IJobsRes} from '@/components/job/const';

const {TextArea} = Input;

export default function DownMusic() {
  const [form, setForm] = useState({
    musicStr: '稻香',
    pending: false,
    downloadPath: '/Users/admins/Downloads/down-music/aa',
  });
  const onChange = (k: string, val: any) => setForm({...form, [k]: val});

  const onStart = async () => {
    // const res = await serveEvent<IJobsRes>(`/api/down-music?${qureyStr}`);
    const res = await fetch('/api/down-music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    logIcon('响应', res)
  };

  const onClose = () => {
    serveEvent<IJobsRes>(`/api/down-music/close`);
  };

  useEffect(() => {
  }, []);

  return (
    <div className={styles.wrap}>
      <div style={{maxWidth: 500}}>
        <div>
          <Checkbox checked={form.pending} onClick={() => onChange('pending', !form.pending)}>
            仅打开不执行
          </Checkbox>
        </div>
        <div>
          <TextArea
            placeholder="下载路径"
            value={form.downloadPath}
            onChange={e => onChange('downloadPath', e.target.value)}
          />
        </div>
        <TextArea
          placeholder="歌单"
          value={form.musicStr}
          onChange={e => onChange('musicStr', e.target.value)}
        />
        <Button onClick={onStart}>开始</Button>
        <Button onClick={onClose}>关闭</Button>
      </div>
    </div>
  );
}
