// 客户端
import {logIcon} from "@/lib/log";

export enum EventEnum {
  ping = 'ping',
  log = 'log',
  done = 'done',
  message = 'message',
}

interface IOptions {
  logCb?: (v: any) => void
}

export function serveEvent<T>(url: string, options: IOptions = {}): Promise<T> {
  const evtSource: EventSource = new EventSource(url);

  evtSource.addEventListener(EventEnum.message, function(event) {
    console.debug('Received message:', event);
  });

  evtSource.addEventListener(EventEnum.ping, event => {
  });

  // 记录日志
  evtSource.addEventListener(EventEnum.log, event => {
    if (options.logCb) {
      options.logCb(event.data)
    }
  });

  return new Promise((resolve, reject) => {
    // 完成
    evtSource.addEventListener(EventEnum.done, event => {
      evtSource.close();
      resolve(JSON.parse(event.data) as T);
    });

    evtSource.onerror = err => {
      evtSource.close();
      reject(err);
    };
  });
}


// 服务端
//    格式化发送给客户端的数据
interface IEvent {
  event: EventEnum
  retry?: number
  data?: string | Object
}
export function formatEvent(obj: IEvent): Uint8Array {
  const encoder = new TextEncoder();
  let merge = Object.assign({} as any, {retry: 5000}, obj);
  if (!Object.hasOwn(merge, 'data')) {
    merge.data = ''
  }
  let str = Object.keys(merge)
    .map(k => {
      let v = merge[k]
      v = typeof v === 'string' ? v : toJsonStr(v)
      return `${k}: ${v}`
    })
    .join('\n');
  str = `${str}\n\n`;
  return encoder.encode(str);
}

function toJsonStr(v: any): string {
  try {
    return JSON.stringify(v)
  } catch (_) {
    return `${v}`
  }
}
