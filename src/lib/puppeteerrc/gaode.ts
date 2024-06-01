type IPosition = [number, number];
type IParse = (addre: string) => Promise<IPosition>;

export async function newGaodePage(browser: any): Promise<{page: any, parse: IParse}> {
  const page = await browser.newPage();

  const parse: IParse = async (addre) =>  {
    return new Promise<IPosition>(async (resolve, reject) => {
      page.on('response', async (response: any) => {
        // https://lbs.amap.com/AMapService/v3/place/text?
        const _url = response.url();
        if (_url.includes('/AMapService/v3/place/text')) {
          try {
            const text = await response.text();
            // "location": "104.06,30.54",
            const location = /"location":\s*"([\d.,]+)"/.exec(text)![1];
            resolve(location.split(',').map(v => parseFloat(v)) as IPosition);
          } catch(e) {
            console.log('response.text 错误:\n', e);
            resolve(null as any);
          }
        }
      });
      const input = await page.waitForSelector('#txtSearch');
      await input.evaluate((el: any, addre2: string) => {
        el.value = addre2;
      }, addre);
      try {
        const btnSelect = '.picker-btn.btn-search';
        const searchBtn = await page.waitForSelector(btnSelect);
        // page.click(btnSelect);
        // searchBtn.click();
        await searchBtn.evaluate((el: any) => {
          setTimeout(() => el.click(), 1000);
        });  // 无效
      } catch(e) {
        console.log('点击按钮错误');
        console.log(e);
        reject(e);
      }
      // setTimeout(async () => {
      //
      // }, 1000);
    });
  };

  page.goto('https://lbs.amap.com/tools/picker');
  return {page, parse};
}

