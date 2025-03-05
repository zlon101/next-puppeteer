import fs from 'node:fs'
import {logIcon} from './log'

export function getFileNames(dir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(dir.trim(), (err, files: string[]) => {
      if (err) {
        reject('无法扫描目录');
        return logIcon('无法扫描目录', err, 'error');
      }
      const result = (files || []).filter(name => !name.includes('DS_Store'))
      resolve(result)
    });
  });
}
