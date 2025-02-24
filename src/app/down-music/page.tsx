'use client';

import {useEffect, useState} from 'react';
import {Input, Button, Checkbox} from 'antd';
import styles from '../page.module.scss';
import {serveEvent, logIcon} from '@/lib/tool';

const { TextArea } = Input;

export default function DownMusic() {
  const [form, setForm] = useState({
    musicStr: '稻香',
    pending: false,
    downloadPath: '/Users/admins/Downloads/down-music/aa',
  });
  const [logArr, setLogArr] = useState<string[]>([])

  const onChange = (k: string, val: any) => setForm({...form, [k]: val});

  const onStart = async () => {
    serveEvent('/api/down-music', {
      logCb(text) {
        setLogArr(preVal => [...preVal, text])
      }
    }).then(res => {
      logIcon('结果', res)
    })

    fetch('/api/down-music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
  };

  const onClear = () => {
    setLogArr([])
  };

  const onClose = () => {
    // serveEvent<IJobsRes>(`/api/down-music/close`);
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
        <Button onClick={onClear}>清空日志</Button>
      </div>
      <div>
        <p>日志：</p>
        {logArr.map((str, idx) => (<pre key={idx}>{str}</pre>))}
      </div>
    </div>
  );
}
