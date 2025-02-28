[puppeteer](https://pptr.dev/api/puppeteer.page.waitfornavigation)

[高德地图API](https://lbs.amap.com/api/javascript-api-v2/tutorails/add-marker) 

## puppeteer

1. 通过命令行运行 Chrome
2. 通过 puppeteer.connect 连接浏览器，实现对浏览器的控制

3. 设置下载路径

```js
const client = await page.createCDPSession();
await client.send('Page.setDownloadBehavior', {
  behavior: 'allow',
  downloadPath,
})
```

4. 拦截请求

```js
page.setRequestInterception(true);
page.on('request', (req: HTTPRequest) => {
  const [url, method, resourceType, headers] = [req.url(), req.method(), req.resourceType(), req.headers()];
  const contentType = headers['content-type'] || '';

  if (url.includes(pageUrl) && resourceType === 'document') {
    const key = [url, method].join('-');
    if (responseMap[key]) {
      req.respond({
        status: 200,
        headers,
        contentType,
        body: responseMap[key],
      });
    } else {
      req.continue();
    }
    return;
  }

  if (req.isInterceptResolutionHandled() || req.interceptResolutionState().action === 'already-handled') {
    logIcon('请求已经被处理过');
  }
  req.continue();
});
```

5. 无痕模式

In Chrome all non-default contexts are incognito

```js
const browserSelf = await puppeteer.connect(connectConf);
browser = await browserSelf.createBrowserContext() as any as Browser;
```

> 下载歌曲，执行自动化任务前先打开浏览器配置文件下载路径

Todo 从YouTube获取歌曲


## Getting Started

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
