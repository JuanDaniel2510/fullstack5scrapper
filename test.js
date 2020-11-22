const os = require('os');
const { setTimeout } = require('timers');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function timeStamp(){
  for (let i = 0; i < 20; i++) {
    process.stdout.write(`\rTest ${i}`);
    await sleep(1000)
  }
}

(async ()=>timeStamp())();