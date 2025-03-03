import {launch, IQurey} from '@/lib/puppeteerrc/down-music/wavedancer';
import {getUrlQuery, formatEvent, setInterval2, EventEnum, registryWrite, logIcon} from '@/lib/tool';


let eventFinally: (res:  any) => void

interface IReqBody extends IQurey {
  musicStr: string
}
export async function POST(req: Request) {
  const query: IReqBody = await req.json()
  launch<IReqBody, any>(query).then(() => {
    eventFinally({ msg: '完成!' })
  })

  return Response.json({ok: true});
}


// EventSource 服务端推送
export async function GET(req: Request) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();

  const clearTimer = setInterval2(() => {
    writer.write(formatEvent({
      event: EventEnum.ping,
    }));
  }, 4000)

  registryWrite((v) => {
    writer.write(formatEvent({
      event: EventEnum.log,
      data: v,
    }));
  })

  eventFinally= (res: any) => {
    clearTimer();
    const text = formatEvent({
      event: EventEnum.done,
      data: res
    })
    writer.write(text);
    logIcon('关闭 ServeEvent')
    writer.close();
  }

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
