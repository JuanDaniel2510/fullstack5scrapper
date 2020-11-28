const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const xlsx = require('xlsx');
const got = require('got'); //https://philna.sh/blog/2020/08/06/how-to-stream-file-downloads-in-Node-js-with-got/
const fs = require('fs');

let downloading = true;

async function waitUntilDone(ms) {
  await (()=>{return new Promise(resolve => setTimeout(resolve, ms))})();
  if (downloading) await waitUntilDone(ms);
}

async function runTest(mode) {
  console.log("Loadding browser...");
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    headless: mode === 'headless',
  });
  const page = await browser.newPage();
  console.log("Fetching page...");
  await page.goto('https://us.bbcollab.com/recording/d63e79ab8d5a4f65b625ffb7ab591833');

  console.log("Waitting for petition...");
  const finalresponse = await page.waitForResponse(response => response.url().match(/\/data$/) && response.status() === 200);
  const data = await finalresponse.json();

  console.log("Writting stream data into JSON file...")
  fs.writeFileSync('streamData.json', JSON.stringify(data, null, 2));

  console.log("Saving every chat...");
  for (let i = 0; i < data.chats.length; i++) {
    const chat = data.chats[i];
    console.log(`Fetching chat ${i}...`);
    const response = await fetch(chat.url);
    const chatJson = await response.json();
    await fs.writeFileSync(`chat_${i}.json`, JSON.stringify(chatJson, null, 2));
    console.log(`File downloaded to chat_${i}.json...`);
  }


  console.log("Saving every video...");
  for (let i = 0; i < data.extStreams.length; i++) {
    const video = data.extStreams[i];
    const downloadStream = got.stream(video.streamUrl);
    const fileWriterStream = fs.createWriteStream(`video_${i}.mp4`);
    downloadStream
    .on('message',(a,b)=>{
      console.log(a,b);
    })
    .on("downloadProgress", ({ transferred, total, percent }) => {
      const percentage = Math.round(percent * 100);
      const transferredMB = Math.round(transferred/1048576);
      const totalMB = Math.round(total/1048576);
      process.stdout.write(`\r${transferredMB} MB / ${totalMB} MB (${percentage}%) `);
      //console.error(`progress: ${transferred}/${total} (${percentage}%)`);
    })
    .on("error", (error) => {
      downloading = false;
      console.error(`Download failed: ${error.message}`);
    });

    fileWriterStream
    .on("error", (error) => {
      downloading = false;
      console.error(`Could not write file to system: ${error.message}`);
    })
    .on("finish", () => {
      downloading = false;
      console.log(`\nFile downloaded to video_${i}.mp4`);
    });
    
    console.log('Starting video download stream...');
    downloadStream.pipe(fileWriterStream);

    await waitUntilDone(1000);

    console.log("Closing browser...");
    browser.close();
  }
}

(async () => {
  /*//Test xlsx
  let sheet = xlsx.readFile('recordings.ods').Sheets.recordings;
  let sheetLength = Number(sheet['!ref'].split(':')[1].replace(/\D/g, ""));
  for (let i = 2; i <= sheetLength; i++) {
    const URL = sheet[`F${i}`].w.split(';');
    for (let j = 0; j < URL.length; j++) {
      console.log(`Recording ${i-1}-${j+1}: ${URL[j]}`);
    }
  }*/
  await runTest('headless');
  //await runTest('graphical');
  //
})();

//process.stdout.write("Downloading " + data.length + " bytes\r");
