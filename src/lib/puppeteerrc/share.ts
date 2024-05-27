export async function closeBrowser(browser: any) {
  const pages = await browser.pages() || [];
  await Promise.all(pages.map(async (item: any) => await item.close()));
  await browser.close();
}

export function parseSalary(salaryDesc: string): [number, number, number] {
  const [limit, bonus = '0'] = salaryDesc.split('.');
  return [...limit.split('-').map(parseFloat), parseInt(bonus, 10)] as [number, number, number];
}
