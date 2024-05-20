export function isHideElement(element: HTMLElement | null) {
  if (!element || element.offsetHeight < 2 || element.offsetWidth < 2) {
    return true;
  }
  if (typeof element.checkVisibility === 'function') {
    return !element.checkVisibility({
      checkOpacity: true,      // Check CSS opacity property too
      checkVisibilityCSS: true, // Check CSS visibility property too
    });
  }
  const styleAttr = window.getComputedStyle(element);
  return styleAttr.display === 'none' || styleAttr.visibility === 'hidden' || styleAttr.opacity === '0';
}

export function isHideNode(node: HTMLElement) {
  // Element
  if (node.nodeType === 1) {
    return isHideElement(node);
  }
  // Text
  if (node.nodeType === 3) {
    return isHideElement(node.parentElement);
  }
  return false;
}