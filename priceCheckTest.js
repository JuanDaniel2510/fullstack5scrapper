const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs');

const URLS = [
    "https://www.pccomponentes.com/msi-mpg-x570-gaming-pro-carbon-wifi",
    "https://www.pccomponentes.com/kingston-hyperx-fury-black-ddr4-3600-16gb-2x8gb-cl17",
    "https://www.pccomponentes.com/kingston-hyperx-fury-rgb-ddr4-3600mhz-pc4-28800-16gb-cl17",
    "https://www.pccomponentes.com/kingston-hyperx-fury-rgb-ddr4-3600mhz-pc4-28800-8gb-cl17",
    "https://www.pccomponentes.com/crucial-ballistix-ddr4-3600mhz-pc4-28800-16gb-2x8gb-cl16",
    "https://www.pccomponentes.com/amd-ryzen-9-5950x-34-ghz"
];

async function runTest(page, url) {
    console.log("Fetching page...");
    await page.goto(url);
    let test = 123;
    console.log("Getting item data...");
    let itemData = await page.evaluate((test) => {
        let data = {
            name: document.getElementsByClassName("articulo")[0].innerText,
            serial: document.querySelector(".ficha-producto__datos-de-compra > div:nth-child(2) > div:nth-child(2) > span:nth-child(2)").innerText,
            shop: document.getElementsByClassName("ficha-producto__encabezado")[0].children[1].lastChild.children[0].innerText.trim(),
            price: Number(Math.floor(document.getElementsByClassName("no-iva-base")[0].innerText.replaceAll(',', '.')*107)/100),
            avaliable: document.getElementById("notify-me") == undefined
        }
        data.purchasable = (data.avaliable && data.shop == 'PcComponentes');
        data.test = test;
        return data;
    },test);
    console.log("Done.");
    return itemData;
}

(async () => {
    console.log("Loadding browser...");
    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        headless: true,
    });
    const page = await browser.newPage();
    let data = [];
    for (url of URLS) {
        data.push(await runTest(page, url));
    }
    console.log("Closing browser...");
    browser.close();
    
    console.log("\nData:")
    console.log(data);
})();
