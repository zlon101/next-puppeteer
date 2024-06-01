export function serveEvent<T>(url: string): Promise<T> {
  const evtSource: EventSource = new EventSource(url);

  evtSource.addEventListener('ping', event => {
    // console.log('EventSource ping!', event.data);
  });

  evtSource.onmessage = msg => {
    // console.log('EventSource onmessage!', msg);
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
