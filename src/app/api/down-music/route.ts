import {launch, IQurey} from '@/lib/puppeteerrc/down-music';
import {getUrlQuery, formatEvent, setInterval2} from '@/lib/tool';

interface IReqBody extends IQurey {
  musicStr: string
}
export async function POST(req: Request) {
  const query: IReqBody = await req.json()
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();

  const clearTimer = setInterval2(() => {
    writer.write(formatEvent({event: 'ping'}));
  }, 5000);

  launch<IReqBody, any>(query).then(() => {
    clearTimer();
    const data = { msg: 'ok', status: '完成' };
    writer.write(formatEvent({event: 'done', data: JSON.stringify(data)}));
    writer.close();
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
