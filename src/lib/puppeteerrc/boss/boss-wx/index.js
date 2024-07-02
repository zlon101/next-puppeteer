import fs from 'node:fs';
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const DirJson = './json';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// process.cwd()
const absPath = (name) => join(__dirname, DirJson, name);

export async function getBossWxJobsFromFile() {
  let files = fs.readdirSync(join(__dirname, DirJson)) || [];
  files = files.filter(name => !/^\./.test(name));
  let jobs = [];
  files.forEach(file => {
    const _path = absPath(file);
    const res = JSON.parse(fs.readFileSync(_path, 'utf8') || 'null');
    jobs = jobs.concat(res.zpData.jobList || []);
  });
  return jobs;
}
