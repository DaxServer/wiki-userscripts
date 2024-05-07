const puppeteer = require('puppeteer');
const { PendingXHR } = require('pending-xhr-puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    timeout: 0,
  });
  const page = await browser.newPage();
  const pendingXHR = new PendingXHR(page);

  page.on('response', res => {
    if (res.url() === 'https://www.ecinepramaan.gov.in/cbfc/cbfc/certificate/qrRedirect/client/QRRedirect') {
      res.text().then(text => {
        console.log(text.match('Cert No\\. *([\\w\\/-]*) *Dated'))

        page.close();
      })
    }
  })

  await page.goto('https://www.ecinepramaan.gov.in/cbfc/?a=Certificate_Detail&i=100070291800000666', {
    waitUntil: ['domcontentloaded', 'networkidle0'],
  });

  // await page.waitForSelector('qr-redirect-endorsment');
  // await page.screenshot({ path: 'example.png' });
  //
  // await browser.close();
})();
