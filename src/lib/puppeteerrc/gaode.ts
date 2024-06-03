import {goto} from '@/lib/puppeteerrc/share';

type IPosition = [number, number];

export async function queryLocation(browser: any, addres: string[]): Promise<IPosition[]> {
  // console.log('查询经纬度2', addres);
  const page = await browser.newPage();
  await goto(page, 'https://lbs.amap.com/tools/picker');
  // await page.bringToFront();

  return new Promise(async (resolve, reject) => {
    const Num = addres.length;
    const positions: IPosition[] = new Array(Num).fill(null);
    const input = await page.waitForSelector('#txtSearch');
    const btnSelect = '.picker-btn.btn-search';
    // const searchBtn = await page.waitForSelector(btnSelect);
    let count = 0;

    const next = async () => {
      // console.log('count', count);
      let _addre = addres[count];
      if (!_addre) {
        ++count;
        count === Num ? resolve(positions) : next();
        return;
      }
      _addre = _addre.includes('成都市') ? _addre : `成都市${_addre}`;

      await input.evaluate((el: any, addre2: string) => {
        el.value = addre2;
      }, _addre);

      try {
        // console.log('点击');
        await page.click(btnSelect);
        // await searchBtn.click(); //无效
        // await searchBtn.evaluate((el: any) => {
        //   el.click();
        // });  // 无效
      } catch(e) {
        console.log('点击按钮错误');
        console.log(e);
      }
    };

    page.on('response', async (response: any) => {
      // https://lbs.amap.com/AMapService/v3/place/text?
      const _url = response.url();
      if (!_url.includes('/AMapService/v3/place/text')) {
        return;
      }
      try {
        const text = await response.text();
        // "location": "104.06,30.54",
        const location = /"location":\s*"([\d.,]+)"/.exec(text)![1];
        positions[count] = location.split(',').map(v => parseFloat(v)) as IPosition;
        ++count;
        if (count === Num) {
          resolve(positions);
        } else {
          next();
        }
      } catch(e) {
        console.log('response.text 错误:\n', e);
        reject('response.text 错误');
      }
    });
    next();
  });
}

