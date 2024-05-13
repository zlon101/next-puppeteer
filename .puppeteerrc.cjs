const {join} = require('path');

/**
 * puppeteer 环境配置: https://pptr.dev/guides/configuration
 * 
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  skipChromeDownload: true,
};