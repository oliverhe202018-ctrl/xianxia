const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('error', event => {
      console.log('UNHANDLED ERROR:', event.error ? event.error.stack : event.message);
    });
    window.addEventListener('unhandledrejection', event => {
      console.log('UNHANDLED REJECTION:', event.reason ? event.reason.stack : event.reason);
    });
  });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 10000 });
  } catch (err) {
    console.log('PUPPETEER ERROR:', err);
  } finally {
    await browser.close();
  }
})();
