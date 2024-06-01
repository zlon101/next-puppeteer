'use client';

import {useEffect} from 'react';
import '@amap/amap-jsapi-types';
import AMapLoader from '@amap/amap-jsapi-loader';
import {logIcon, obj2str} from '@/lib/tool';
import styles from './index.module.scss';

export default function MapContainer() {
  useEffect(() => {
    (window as any)._AMapSecurityConfig = {
      securityJsCode: 'efcfdce20a2896aeeb111e6c841e11b0',
    };
    let map: any;
    AMapLoader.load({
      key: 'd50c23535f5c6b5efcac9ddb50e08b35', // 申请好的Web端开发者Key，首次调用 load 时必填
      version: '2.0', // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
      // plugins: ['AMap.Scale'], //需要使用的的插件列表，如比例尺'AMap.Scale'，支持添加多个如：['...','...']
    }).then((AMap: any) => {
      map = new AMap.Map('container', {
        zoom: 4,
        center: [102.342785, 35.312316],
        showIndoorMap: false,
        viewMode: '2D',
        mapStyle: 'amap://styles/whitesmoke', //设置地图的显示样式
      });
      map.on('complete', () => initMap(AMap));
    });

    function initMap(AMap: any) {
      // 创建 AMap.LabelsLayer 图层
      const layer = new AMap.LabelsLayer({
        zooms: [3, 20],
        zIndex: 1000,
        collision: false,
      });
      // 将图层添加到地图
      map.add(layer);

      const markers = [];
      const positions = [
        ['116.441504', '40.031386'],
        ['116.466426', '39.971294'],
        ['116.443838', '39.723097'],
      ];

      const icon = {
        type: 'image',
        image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
        size: [6, 9],
        anchor: 'bottom-center',
      };
      // 普通点
      const normalMarker = new AMap.Marker({
        anchor: 'bottom-center',
        offset: [0, -15],
      });

      for (let i = 0; i < positions.length; i++) {
        const curPosition = positions[i];
        const curData = {
          position: curPosition,
          icon,
        };
        const labelMarker = new AMap.LabelMarker(curData);

        markers.push(labelMarker);
        // 给marker绑定事件
        labelMarker.on('mouseover', (e: any) => {
          const position = e.data.data && e.data.data.position;
          if (position) {
            normalMarker.setContent(
              '<div class="amap-info-window">' + position + '<div class="amap-info-sharp"></div>' + '</div>',
            );
            normalMarker.setPosition(position);
            map.add(normalMarker);
          }
        });
        labelMarker.on('mouseout', () => map.remove(normalMarker));
      }

      // 一次性将海量点添加到图层
      layer.add(markers);
    }

    return () => {
      map?.destroy();
    };
  }, []);

  return <div id="container" className={styles.container} style={{height: '800px'}}></div>;
}
