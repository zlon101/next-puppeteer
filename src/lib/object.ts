export function getType(val: any, expectType?: string): string | boolean {
  const reaType = Object.prototype.toString.call(val).slice(8, -1).toLowerCase();
  if (expectType) {
    return expectType.toLowerCase() === reaType;
  }
  return reaType;
}

interface IParam {
  isAllMatch?: boolean;
  isCase?: boolean;
  global?: boolean;
}
const DefaultConf = {
  global: true,
};

export function createRegExp(searchText: string | RegExp, conf: IParam = DefaultConf): [RegExp, boolean] {
  let isRegMode = false;
  let reg = null;
  if (searchText instanceof RegExp) {
    return [searchText, true];
  }
  if (/^\//.test(searchText)) {
    isRegMode = true;
    const regModifier = /\/(\w*)$/;
    let modifier = regModifier.exec(searchText)![1];
    if (!modifier.includes('g') && conf.global) {
      modifier += 'g';
    }
    regModifier.lastIndex = 0;
    reg = new RegExp(searchText.slice(1).replace(regModifier, ''), modifier);
  } else {
    searchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (conf?.isAllMatch) {
      searchText = `\\b${searchText}\\b`;
    }
    reg = new RegExp(searchText, conf?.isCase ? 'gm' : 'gmi');
  }
  return [reg, isRegMode];
}


export function getUrlQuery(url: string) {
  const params: Record<string, string> = {};
  url.replace(/([^?&=]+)=([^&]+)/g, (_, k, v) => (params[k] = v));
  return params;
}

export function obj2str(query: Record<string, string>) {
  return Object.keys(query).reduce((acc: string, k: string) => `${acc}&${k}=${query[k]}`, '').slice(1);
}
