const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const got = require('got');
const fs = require('fs');

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
  await fs.writeFileSync('streamData.json', JSON.stringify(data, null, 2));


  console.log("Saving every chat...");
  for (let i = 0; i < data.chats.length; i++) {
    const chat = data.chats[i];
    console.log(`Fetching chat ${i}...`);
    const response = await fetch(chat.url);
    const chatJson = await response.json();
    console.log(`Saving chat ${i}...`);
    await fs.writeFileSync(`chat_${i}.json`, JSON.stringify(chatJson, null, 2));
  }


  console.log("Saving every video...");
  for (let i = 0; i < data.extStreams.length; i++) {
    const video = data.extStreams[i];
    console.log(`Fetching video ${i}...`);
    const response = await fetch(video.streamUrl);
    console.log(`Saving video ${i}...`);
    const buffer = await response.buffer();
    await fs.writeFileSync(`video_${i}.mp4`, buffer);
  }

  console.log("Closing browser...");
  browser.close();
}

(async () => {
  await runTest('headless');
  //await runTest('graphical');
})();

//process.stdout.write("Downloading " + data.length + " bytes\r");
