import fs from 'node:fs';
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const DirJson = './json';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// process.cwd()
const absPath = (name: string) => join(__dirname, DirJson, name);

// https://app.zhuanzhuan.com/zz/v2/zzinfoshow/getfeedflowinfo
export async function getMacListFromFile() {
  let files = fs.readdirSync(join(__dirname, DirJson)) || [];
  files = files.filter(name => !/^\./.test(name));
  let macList: any[] = [];
  files.forEach(file => {
    const _path = absPath(file);
    const res = JSON.parse(fs.readFileSync(_path, 'utf8') || 'null');
    const items = (res.respData.infoData || []).map((item: any) => ({type: item.type, ...item.commonGoods}));
    macList = macList.concat(items);
  });
  return macList;
}

export async function GET(req: Request) {
  const list = await getMacListFromFile();
  return Response.json(list);
}
