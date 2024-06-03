'use client';

import {useEffect, useState, useRef} from 'react';
import { Checkbox } from 'antd';
import type { CheckboxProps, GetProp } from 'antd';
import '@amap/amap-jsapi-types';
import AMapLoader from '@amap/amap-jsapi-loader';
import {logIcon, obj2str} from '@/lib/tool';
import {IJob, IJobsRes, PageType} from '@/components/job/const';
import './index.scss';

type CheckboxValueType = GetProp<typeof Checkbox.Group, 'value'>[number];
type IPos = [number, number];
const CheckboxGroup = Checkbox.Group;

export default function MapContainer() {
  const [checkedList, setCheckedList] = useState<CheckboxValueType[]>([]);
  const [source, setSource] = useState<Record<string, IJob[]>>({});
  const [plainOptions, setPlainOptions] = useState<string[]>([]);
  const mapRef = useRef<any>(null);
  const updateMapRef = useRef<any>(null);
  const [posCount, setPosCount] = useState<number>(0);

  const checkAll = plainOptions.length === checkedList.length;
  const indeterminate = checkedList.length > 0 && checkedList.length < plainOptions.length;
  const onChange = (list: CheckboxValueType[]) => {
    setCheckedList(list);
  };
  const onCheckAllChange: CheckboxProps['onChange'] = (e) => {
    setCheckedList(e.target.checked ? plainOptions : []);
  };

  useEffect(() => {
    const _source: Record<string, IJob[]> = Object.values(PageType).reduce((acc, k) => {
      const v: IJobsRes = JSON.parse(localStorage.getItem(k) ?? 'null');
      v && (acc[k] = v.jobList);
      return acc;
    }, {} as any);
    const keys = Object.keys(_source) ?? [];
    setSource(_source);
    setPlainOptions(keys);
    setCheckedList([keys[0]]);

    initMap().then(({map, update}) => {
      mapRef.current = map;
      updateMapRef.current = update;
      setPosCount(update(_source[keys[0]]));
    });
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      mapRef.current?.destroy();
    };
  }, []);


  return (
    <div className="wrap">
      <div>
        <Checkbox indeterminate={indeterminate} onChange={onCheckAllChange} checked={checkAll}>
          全选
        </Checkbox>
        <CheckboxGroup options={plainOptions} value={checkedList} onChange={onChange} />
        <span className="pos_count">坐标数: {posCount}</span>
      </div>
      <div id="map-container"></div>
    </div>
  );
}

async function initMap() {
  (window as any)._AMapSecurityConfig = {
    securityJsCode: 'efcfdce20a2896aeeb111e6c841e11b0',
  };
  const AMap = await AMapLoader.load({
    key: 'd50c23535f5c6b5efcac9ddb50e08b35', // 申请好的Web端开发者Key，首次调用 load 时必填
    version: '2.0', // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
    // plugins: ['AMap.Scale'], //需要使用的的插件列表，如比例尺'AMap.Scale'，支持添加多个如：['...','...']
  });
  const map = new AMap.Map('map-container', {
    zoom: 11,
    center: [104.065861, 30.657401],
    showIndoorMap: false,
    viewMode: '2D',
    mapStyle: 'amap://styles/normal', //设置地图的显示样式
  });

  const icon = {
    type: 'image',
    image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
    size: [6, 9],
    anchor: 'bottom-center',
  };
  // 普通点
  const normalMarker = new AMap.Marker({
    anchor: 'bottom-center',
    offset: [0, -15],
  });
  // 创建 AMap.LabelsLayer 图层
  const layer = new AMap.LabelsLayer({
    zooms: [3, 20],
    zIndex: 1000,
    collision: false, //该层内标注是否避让
    allowCollision: true, //不同标注层之间是否避让
  });
  map.on('complete', () => {
    // 将图层添加到地图
    map.add(layer);
  });
  let preMarkers: any = null;
  const update = (jobs: IJob[]) => {
    if (preMarkers) {
      layer.remove(preMarkers);
      preMarkers = null;
    }
    const markers2: any = [];
    let count = 0;
    jobs.forEach((job, jobIdx) => {
      if ((job.Info.location ?? []).length !== 2) {
        // console.log(`没有location: ${jobIdx}. ${job.brandName}`);
        return;
      }
      ++count;
      const labelMarker = new AMap.LabelMarker({
        position: job.Info.location,
        icon,
      });
      markers2.push(labelMarker);
      // 给marker绑定事件
      labelMarker.on('mouseover', (e: any) => {
        const position = e.data.data && e.data.data.position;
        if (position) {
          normalMarker.setContent(`<div class="amap-info-window">${jobIdx+1}. ${job.brandName}<div class="amap-info-sharp"></div></div>`);
          normalMarker.setPosition(position);
          map.add(normalMarker);
        }
      });
      labelMarker.on('mouseout', () => map.remove(normalMarker));
      labelMarker.on('click', () => {
        window.open(job.detailUrl, '_blank');
      });
    });
    // 一次性将海量点添加到图层
    preMarkers = markers2;
    layer.add(markers2);
    return count;
  };
  return {map, update};
}
