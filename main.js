const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const xlsx = require('xlsx');
const got = require('got'); //https://philna.sh/blog/2020/08/06/how-to-stream-file-downloads-in-Node-js-with-got/
const fs = require('fs');


async function runTest(page,url) {
  let data = await fetchStreamData(page,url);

  console.log("Saving every chat...");
  for (let i = 0; i < data.chats.length; i++) {
    const chat = data.chats[i];
    await downloadChat(chat.url,`chat_${i}.json`)
  }

  console.log("Saving every video...");
  for (let i = 0; i < data.extStreams.length; i++) {
    const video = data.extStreams[i];
    await downloadVideo(video.streamUrl,`video_${i}.mp4`);
  }
}


async function fetchStreamData(page,url) {
  console.log("Fetching page...");
  await page.goto(url);

  console.log("Waitting for petition...");
  const finalresponse = await page.waitForResponse(response => response.url().match(/\/data$/) && response.status() === 200);
  const data = await finalresponse.json();

  console.log("Writting stream data into JSON file...")
  fs.writeFileSync('streamData.json', JSON.stringify(data, null, 2));
  return data;
}


async function downloadChat(chatURL,path) {
  console.log(`Fetching chat...`);
  const response = await fetch(chatURL);
  const chatJson = await response.json();
  await fs.writeFileSync(path, JSON.stringify(chatJson, null, 2));
  console.log(`File downloaded to ${path}...`);
}


let downloading = true;

async function waitUntilDone(ms) {
  await (()=>{return new Promise(resolve => setTimeout(resolve, ms))})();
  if (downloading) await waitUntilDone(ms);
}

async function downloadVideo(videoURL,path) {
  const downloadStream = got.stream(videoURL);
  const fileWriterStream = fs.createWriteStream(path);
  downloadStream
  .on("downloadProgress", ({ transferred, total, percent }) => {
    const percentage = Math.round(percent * 100);
    const transferredMB = Math.round(transferred/1048576);
    const totalMB = Math.round(total/1048576);
    process.stdout.write(`\r${transferredMB} MB / ${totalMB} MB (${percentage}%) `);
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
    console.log(`\nFile downloaded to ${path}`);
  });
  
  console.log('Starting video download stream...');
  downloadStream.pipe(fileWriterStream);

  await waitUntilDone(1000);
}

(async () => {
  //Get sheet array
  let sheet = xlsx.readFile('recordings.ods').Sheets.recordings;
  let sheetLength = Number(sheet['!ref'].split(':')[1].replace(/\D/g, ""));

  //Prepare browser
  console.log("Loadding browser...");
  const browser = await puppeteer.launch({args: ['--no-sandbox'],headless: true,});
  const page = await browser.newPage();

  //Loop trought every link (Column F)
  /*for (let i = 2; i <= sheetLength; i++) {
    const URL = sheet[`F${i}`].w.split(';');
    for (let j = 0; j < URL.length; j++) {
      console.log(`Recording ${i-1}-${j+1}: ${URL[j]}`);
    }
  }*/

  await runTest(page,'https://us.bbcollab.com/recording/d63e79ab8d5a4f65b625ffb7ab591833');
  
  //Once all work is done close the browser
  console.log("Closing browser...");
  browser.close();
})();
