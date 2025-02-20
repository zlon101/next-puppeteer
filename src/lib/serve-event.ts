// 客户端
export function serveEvent<T>(url: string): Promise<T> {
  const evtSource: EventSource = new EventSource(url);

  evtSource.addEventListener('ping', event => {
    console.log('EventSource ping!', event.data);
  });

  evtSource.onmessage = msg => {
    console.log('EventSource onmessage!', msg);
  };

  return new Promise((resolve, reject) => {
    // 完成
    evtSource.addEventListener('done', event => {
      evtSource.close();
      resolve(JSON.parse(event.data));
    });

    evtSource.onerror = err => {
      console.log('EventSource Error!', err);
      evtSource.close();
      reject(err);
    };
  });
}


// 服务端
//    格式化发送给客户端的数据
export function formatEvent(obj: Partial<Record<'data' | 'event', string>>): Uint8Array {
  const encoder = new TextEncoder();
  const merge = Object.assign({} as any, {retry: 5000}, obj);
  let v = Object.keys(merge)
    .map(k => `${k}: ${merge[k]}`)
    .join('\n');
  v = `${v}\n\n`;
  return encoder.encode(v);
}
