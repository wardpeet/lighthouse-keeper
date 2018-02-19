const puppeteer = require('puppeteer');

const lighthouseExtensionPath = 'c:/Users/WardPeeters/Projects/os/lighthouse/lighthouse-extension/app';
(async() => {
  const browser = await puppeteer.launch({
    headless: false,
    //slowMo: 1000,
    args: [
      `--disable-extensions-except=${lighthouseExtensionPath}`,
      `--load-extension=${lighthouseExtensionPath}`,
    ],
  });

  try {

    const page = await browser.newPage();
    await page.goto('https://www.paulirish.com', {waitUntil: 'networkidle2'});

    const extensionTarget = browser.targets().find(target => {
      return target._targetInfo.title === 'Lighthouse';
    });

    if (extensionTarget) {
      const client = await extensionTarget.createCDPSession();
      await client.send('Runtime.enable');
      
      const result = await client.send(
        'Runtime.evaluate',
        {
          expression: `runLighthouseInExtension({
            restoreCleanState: true,
          }, ['performance'])`,
          awaitPromise: true,
          returnByValue: true,
        }
      );
      const value = result.object || result.result;

      console.log(JSON.stringify(value.value));
    }


  } catch(err) {
    console.log(err);
  }

  await browser.close();
})();
