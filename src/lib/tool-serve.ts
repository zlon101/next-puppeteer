import fs from 'node:fs'
import path, {join} from 'path';
import {logIcon} from './log'

// 获取某个目录下的文件名（包含文件后缀、目录名）
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


// 重命名某个目录下的文件 {oldNamesFromPage: newName}
type IMatchFn = (nameFromDisk: string, nameFromPage: string) => boolean
export async function rename(dirPath: string, map: Record<string, string>, matchFn?: IMatchFn): Promise<void> {
  logIcon('开始重命名 rename');
  // 页面上解析到的文件名
  const oldNamesFromPage: string[] = Object.keys(map)

  const renameFile = (files: string[], resolve: () => void) => {
    const N = files.length;

    files.forEach((oldName: string, idx) => {
      // oldName 带文件后缀
      const ext = path.extname(oldName);
      oldName = oldName.toLowerCase()
      const newFileName = oldNamesFromPage.find(fileNameInPage =>{
        fileNameInPage = fileNameInPage.toLowerCase()
        if (matchFn) {
          return matchFn(oldName, fileNameInPage)
        }
        const len = fileNameInPage.length
        const segment = fileNameInPage.slice(Math.round(len * 0.25), Math.round(len * 0.75))
        return oldName.includes(segment)
      })

      if (!newFileName) {
        logIcon(`未找到 ${oldName} 对应的 map value `, undefined, 'error');
        idx >= N - 1 && resolve();
        return;
      }
      const newFilePath = path.join(dirPath, `${newFileName}${ext}`);
      const oldFilePath = path.join(dirPath, oldName);
      fs.rename(oldFilePath, newFilePath, err => {
        idx >= N - 1 && resolve();
        if (err) {
          return logIcon(`重命名文件 ${oldName} 失败: `, err, 'error');
        }
      });
    });
  };

  return new Promise(async (resolve, reject) => {
    const fileNames = await getFileNames(dirPath);
    renameFile(fileNames, resolve);
  });
}
