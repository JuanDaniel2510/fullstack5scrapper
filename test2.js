const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs');

const URLS = [
    "https://www.pccomponentes.com/msi-mpg-x570-gaming-pro-carbon-wifi",
    "https://www.pccomponentes.com/kingston-hyperx-fury-black-ddr4-3600-16gb-2x8gb-cl17",
    "https://www.pccomponentes.com/amd-ryzen-9-5950x-34-ghz"
];

async function runTest(mode, url) {
    console.log("Loadding browser...");
    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        headless: mode === 'headless',
    });
    const page = await browser.newPage();
    console.log("Fetching page...");
    await page.goto(url);

    console.log("Getting item data...");
    console.log("ITEM DATA:", await page.evaluate(() => {
        return {
            name: document.getElementsByClassName("articulo")[0].innerText,
            shop: document.getElementsByClassName("ficha-producto__encabezado")[0].children[1].lastChild.children[0].innerText.trim(),
            price: Number(document.getElementsByClassName("no-iva-base")[0].innerText.replaceAll(',', '.')),
            avaliable: document.getElementById("notify-me") == undefined
        }
    }));


    console.log("Closing browser...");
    browser.close();
}

(async () => {
    for (url of URLS) {
        await runTest('headless', url);
    }
})();
