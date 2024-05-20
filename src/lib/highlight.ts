import {createRegExp} from './object';
import {isHideElement} from './dom';

// ========= 遍历搜索 ===========================
export const HighLightElementClass = 'zlgp_highlight_span';
export const MatchEleCls = 'zlgp_search_ele';

const getInnerText = (str: string) => (str || '').trim();

export type ISearchConf = {
  isCase?: boolean;
  isAllMatch?: boolean;
  mode: 'string' | 'html' | 'dom';
  color?: string;
  style?: string;
};

const DefaultCfg: ISearchConf = {
  isCase: true,
  isAllMatch: false,
  mode: 'string',
  color: 'yellow',
};

/**
 * 遍历搜索高亮
 * @return 高亮后的html片段
 * ********/
interface ITraverseReturn {
  fragment: string[];
  container: HTMLElement | string;
}
export function traverse(srcData: string | HTMLElement, searchText?: string | RegExp, searchParam = DefaultCfg): ITraverseReturn | null {
  // 清除上次搜索结果
  clearLastMark();
  if (!searchText) return null;
  const [reg] = createRegExp(searchText, {...searchParam, global: true});
  const containerDom: HTMLElement = (() => {
    if (searchParam.mode === 'dom') {
      return srcData as HTMLElement;
    }
    const wrapDom = document.createElement('div');
    wrapDom.innerHTML = srcData as string;
    return wrapDom;
  })();
  const srcTxt: string = searchParam.mode === 'string' ? (srcData as string) : containerDom.innerText;

  if (!reg.test(srcTxt)) {
    return null;
  }

  const isMatch = (_txt: string) => {
    reg.lastIndex = 0;
    return reg.test(_txt);
  };

  // 遍历所有 Text 节点  🔥
  // @ts-ignore
  const IgnoreDiv = [...containerDom.querySelectorAll('p'), ...containerDom.querySelectorAll('div')].filter(dom => !isMatch(dom.innerText));
  // IgnoreDiv = IgnoreDiv.filter(el => window.getComputedStyle(el).display === 'block');
  IgnoreDiv.push(...(containerDom.querySelectorAll('#zl_search_warp') || []) as any);

  const inIgnoreDiv = (_node: Node) => IgnoreDiv.some(_parent => _parent.contains(_node));

  const treeWalker = document.createNodeIterator(containerDom, NodeFilter.SHOW_TEXT); // createTreeWalker
  const getStacksText = (nodes: Text[]) => getInnerText(nodes.reduce((acc, cur) => acc + cur.wholeText, ''));

  let curNode: Text,
    stackNodes: Text[] = [],
    stackText = '',
    curNodeText = '';
  const allRanges = [];
  reg.lastIndex = 0;

  // eslint-disable-next-line no-cond-assign
  while (curNode = treeWalker.nextNode() as Text) {
    curNodeText = curNode.wholeText;
    // 跳过
    if (!/\S/.test(curNodeText) || inIgnoreDiv(curNode) || (searchParam.mode === 'dom' && isHideElement(curNode.parentElement))) {
      continue;
    }
    // 拼接字符串
    stackNodes.push(curNode);
    stackText = getStacksText(stackNodes);
    if (isMatch(stackText)) {
      let startNode = null;
      do {
        startNode = stackNodes.shift();
      } while ( isMatch( getStacksText(stackNodes) ) );
      stackNodes.unshift(startNode as Text);
      // 确定Text节点和偏移
      const ranges = findOffset(stackNodes, reg);
      allRanges.push(...ranges);
      if (stackNodes.length === 1) {
        stackNodes = [];
      } else {
        stackNodes = [stackNodes.pop() as Text];
      }
    }
  }

  const matchHtmls = new Array(allRanges.length);
  let count = 0;
  for (const range of allRanges.reverse()) {
    matchHtmls[count++] = surroundContents(range, searchParam);
  }
  let container: HTMLElement | string = containerDom;
  if (typeof srcData === 'string') {
    container = container.outerHTML;
    containerDom.remove();
  }
  return {
    fragment: matchHtmls.filter(Boolean).reverse(),
    container,
  };
}

interface IRange {
  startNode: Node;
  endNode: Node;
  startOffset: number;
  endOffset: number;
}
function findOffset(stackNodes: Text[], reg: RegExp): IRange[] {
  const N = stackNodes.length;
  if (N === 0) {
    throw new Error('调用findOffset时，参数stackNodes数组长度为0');
  }
  // 匹配的文本在一个Text中
  const startNode =stackNodes[0],
    endNode = stackNodes[N - 1];
  let startText = startNode.wholeText,
    // eslint-disable-next-line prefer-const
    endText = endNode.wholeText,
    startOffset = 0,
    endOffset = endText.length;
  if (N === 1) {
    const ranges = [];
    const regGlobal = new RegExp(reg, `${reg.flags}g`);
    for (const _matchItem of [...startText.matchAll(regGlobal)]) {
      startOffset = _matchItem.index;
      endOffset = _matchItem.index + _matchItem[0].length - 1;
      ranges.push({ startNode, endNode, startOffset, endOffset });
    }
    return ranges;
  }

  // 跨节点
  const midNodeText = stackNodes.slice(1, -1).reduce((acc, cur) => acc + cur.wholeText, '');
  const isMatch = (_txt: string) => {
    reg.lastIndex = 0;
    return reg.test(_txt);
  };

  // 二分法搜索优化
  startOffset = dichotomy(startText.length, false, 0, (_offset: number) => {
    return isMatch(getInnerText(startText.slice(_offset)  + midNodeText + endText));
  });

  startText = startText.slice(startOffset);
  endOffset = dichotomy(endText.length, true, endText.length - 1, (_offset: number) => {
    return isMatch(getInnerText(startText + midNodeText + endText.slice(0, _offset+1)));
  });
  return [{ startNode, endNode, startOffset, endOffset }];
}

// 二分法
function dichotomy(N: number, toLeft: boolean, offsetInd: number, matchFn: (a: number) => boolean): number {
  if (N < 2) {
    return offsetInd;
  }
  let nextInd = toLeft ? offsetInd - 1 : offsetInd + 1;
  nextInd = Math.max( Math.min(nextInd, N - 1), 0);
  let lastInd = toLeft ? offsetInd + 1 : offsetInd - 1;
  lastInd = Math.max( Math.min(lastInd, N - 1), 0);

  const isNextMatch = matchFn(nextInd);
  // 指针位于起始位置
  if (offsetInd === lastInd && !isNextMatch) {
    return offsetInd;
  }
  // 指针到达终点
  if (offsetInd === nextInd) {
    return offsetInd;
  }

  const isCurrentMatch = matchFn(offsetInd);
  if (isCurrentMatch && !isNextMatch) {
    return offsetInd;
  }

  let midIndex = 0;
  if (isCurrentMatch) {
    midIndex = toLeft ? Math.floor(offsetInd * 0.5) : Math.floor(offsetInd + 0.5 * (N - offsetInd));
  } else {
    midIndex = !toLeft ? Math.floor(offsetInd * 0.5) : Math.floor(offsetInd + 0.5 * (N - offsetInd));
  }
  return dichotomy(N, toLeft, midIndex, matchFn);
}

let uid = 1;
function surroundContents(rangeCfg: IRange, searchParam: ISearchConf) {
  const { startNode, startOffset, endNode, endOffset } = rangeCfg;
  if (startNode && endNode) {
    // 必须是text类型的节点
    if ([startNode, endNode].some(_node => _node.nodeType !== 3)) {
      throw new Error('rangeStart 或 rangeEnd 节点不是 text 类型');
    }
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset + 1);

    const span = document.createElement('span');
    span.classList.add(HighLightElementClass);
    span.style.cssText = searchParam.style || `background-color:${searchParam.color};`;

    span.appendChild(range.extractContents());
    range.insertNode(span);
    const parentEle = range.commonAncestorContainer as HTMLElement;
    const splits = parentEle.innerHTML.split(new RegExp(`<span\\s+class="${HighLightElementClass}".*<\\/span>`)).map(item => item.trim());
    const firstLength = splits[0].length;
    const innerHtml = splits[0].slice(Math.max(0, firstLength-30)) + span.outerHTML + splits[1].slice(0, 30);
    const cls = `${MatchEleCls}_${uid++}`;
    parentEle.classList.add(cls);
    return { innerHtml, cls };
  }
  console.debug('开始节点或结束节点为null');
  return null;
}

export function clearLastMark() {
  for (const highEle of document.querySelectorAll(`.${HighLightElementClass}`)) {
    const parent = highEle.parentElement;
    highEle.outerHTML = (highEle as any).innerText;
    parent!.normalize();
  }
}
