import {launch} from '@/lib/puppeteerrc';
import {getUrlQuery, parseDate} from '@/lib/tool';
import {ReqParam, IJob, IJobsRes} from '@/components/job/const';

// export const dynamic = 'force-dynamic'; // defaults to auto

export async function GET(req: Request) {
  const query: ReqParam = getUrlQuery(req.url) as any;
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const timeId = setInterval(() => {
    writer.write(formatEvent({event: 'ping'}));
  }, 3000);

  launch(query).then((jobList: IJob[]) => {
    clearInterval(timeId);
    const data: IJobsRes = {jobList: jobList, fetchTime: parseDate(new Date())};
    writer.write(formatEvent({event: 'done', data: JSON.stringify(data)}));
    writer.close();
  });

  function formatEvent(obj: Partial<Record<'data' | 'event', string>>): Uint8Array {
    const merge = Object.assign({} as any, {retry: 5000}, obj);
    let v = Object.keys(merge).map(k => `${k}: ${merge[k]}`).join('\n');
    v = `${v}\n\n`;
    return encoder.encode(v);
  }

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
  // return Response.json({
  //   jobList,
  //   fetchTime: new Date().toLocaleString(),
  // });
}


export async function POST() {
  const res = await fetch('https://data.mongodb-api.com/...', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Key': process.env.DATA_API_KEY!,
    },
    body: JSON.stringify({time: new Date().toISOString()}),
  });

  const data = await res.json();
  return Response.json(data);
}
