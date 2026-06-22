const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log('Navigating to http://180.97.221.225:8080/ ...');
  await page.goto('http://180.97.221.225:8080/', { waitUntil: 'networkidle0' });
  console.log('Navigation complete.');
  
  await browser.close();
})();
