const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const xlsx = require('xlsx');
const got = require('got');
const fs = require('fs');

///////////////////////////////
//         DOWNLOADS         //
///////////////////////////////

async function downloadFromPage(page,url,path) {
  let data = await fetchStreamData(page,url,path);

  console.log("Saving every chat...");
  for (let i = 0; i < data.chats.length; i++) {
    const chat = data.chats[i];
    let counter = 0;
    while (fs.existsSync(`${path}/chat_${counter}.json`)) {counter++;}
    await downloadChat(chat.url,`${path}/chat_${counter}.json`)
  }

  console.log("Saving every video...");
  for (let i = 0; i < data.extStreams.length; i++) {
    const video = data.extStreams[i];
    let counter = 0;
    while (fs.existsSync(`${path}/video_${counter}.mp4`)) {counter++;}
    await downloadVideo(video.streamUrl,`${path}/video_${counter}.mp4`);
  }
}


///////////////////////////////
//    RESPONSE INTERCEPT     //
///////////////////////////////

async function fetchStreamData(page,url,path) {
  console.log("Fetching page...");
  await page.goto(url);

  console.log("Waitting for petition...");
  const finalresponse = await page.waitForResponse(response => response.url().match(/\/data$/) && response.status() === 200);
  const data = await finalresponse.json();

  console.log("Writting stream data into JSON file...")
  fs.writeFileSync(`${path}/streamData.json`, JSON.stringify(data, null, 2));
  return data;
}


///////////////////////////////
//            CHAT           //
///////////////////////////////

async function downloadChat(chatURL,path) {
  console.log(`Fetching chat...`);
  const response = await fetch(chatURL);
  const chatJson = await response.json();
  await fs.writeFileSync(path, JSON.stringify(chatJson, null, 2));
  console.log(`File downloaded to ${path}...`);
}


///////////////////////////////
//           VIDEO           //
///////////////////////////////

async function sleep(ms) {
  await (()=>{return new Promise(resolve => setTimeout(resolve, ms))})();
}

async function downloadVideo(videoURL,path) {
  let downloading = true;
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

  //No puedo usar await con la librería GOT asi que uso esto como parche
  while (downloading) {
    await sleep(100);
  }
}


///////////////////////////////
//          FS STUFF         //
///////////////////////////////

function capitalize(s){
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function folderName(sheet,index) {
  let month = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  let dayWeekName = capitalize(sheet[`B${index}`].w);
  let monthName = month[Number(sheet[`C${index}`].w.split('/')[1])-1];
  let monthDay = Number(sheet[`C${index}`].w.split('/')[0]);

  let teacherRaw = sheet[`A${index}`].w;
  let lessonRaw = sheet[`D${index}`].w;

  let teacher = teacherRaw.split(';');
  let lesson = lessonRaw.split(';');

  if (teacher.length > 1 && lesson.length > 1){
    return `${('0'+(index-1)).slice(-2)} - ${dayWeekName} ${monthDay} de ${monthName} - ${teacher[0]} [${lesson[0]}] & ${teacher[1]} [${lesson[1]}]`;
  } else {
    return `${('0'+(index-1)).slice(-2)} - ${dayWeekName} ${monthDay} de ${monthName} - ${teacherRaw.replace(';',' y ')} [${lessonRaw.replace(';',' y ')}]`;
  }
}

function addExtraInfo(path,sheet,index) {
  let streamData = JSON.parse(fs.readFileSync(`${path}/streamData.json`));
  let = infoJSON = {
    teacher: sheet[`A${index}`].w.split(';'),
    lesson: sheet[`D${index}`].w.split(';'),
    title: sheet[`E${index}`].w,
    date: sheet[`C${index}`].w,
    recording:{
      rawName: streamData.name,
      duration: streamData.duration,
      created: streamData.created
    }
  };
  fs.writeFileSync(`${path}/info.json`, JSON.stringify(infoJSON, null, 2));
  fs.unlinkSync(`${path}/streamData.json`);
}

///////////////////////////////
//         MAIN LOOP         //
///////////////////////////////

(async () => {
  //Get sheet array
  let sheet = xlsx.readFile('recordings.ods').Sheets.recordings;
  let sheetLength = Number(sheet['!ref'].split(':')[1].replace(/\D/g, ""));
  let mainFolder = "FullStack5";

  //Prepare browser
  console.log("Loadding browser...");
  const browser = await puppeteer.launch({args: ['--no-sandbox'],headless: true,});
  const page = await browser.newPage();

  //Create Main directory if it does not exist
  if (!fs.existsSync(mainFolder)){
    fs.mkdirSync(mainFolder);
  }

  //Loop trought every link (Column F)
  for (let i = 2; i <= sheetLength; i++) {
    if(sheet[`F${i}`] != undefined){
      const URL = sheet[`F${i}`].w.split(';');
      console.log(`Día: ${folderName(sheet,i)} de ${sheetLength-1}...`);
      let path = `${mainFolder}/${folderName(sheet,i)}`
      if (!fs.existsSync(path)){
        fs.mkdirSync(path);
        for (let j = 0; j < URL.length; j++) {
            await downloadFromPage(page,URL[j],path)
        }
        addExtraInfo(path,sheet,i);
      }
    } else {
      console.log(`Día: ${folderName(sheet,i)} of ${sheetLength-1} Skipped`);
    }
  }
  
  //Once all work is done close the browser
  console.log("Closing browser...");
  browser.close();
})();

