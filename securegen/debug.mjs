import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));
  page.on('requestfailed', req => console.error('FAILED REQUEST:', req.url()));

  console.log('Navigating to http://localhost:5174...');
  try {
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  } catch (e) {
    console.error('GOTO ERROR:', e.toString());
  }
  
  console.log('Page loaded. Wait a moment...');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  console.log('Done.');
})();
