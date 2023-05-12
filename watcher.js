const fs = require("fs");
const cp = require("child_process");
const config = require("./config.json");

fs.watch(config.recording_path, (eventType, filename) => {
  if(eventType === "rename" && filename.endsWith(".nfo")) {
    encode(filename);
  }
});

const encode = filename => {
  const path = `${config.recording_path}/${filename}`;
  if(!fs.existsSync(path)) return;

  const data = nfoToObj(path);
  transcode(data);
};

const nfoToObj = path => {
  const text = fs.readFileSync(path, {encoding: "utf8", flag: "r"});
  const data = {};
  text.split("\r\n").forEach(line => {
    if(line.indexOf(" = ")) {
      const key = line.split(" = ")[0];
      const value = line.split(" = ")[1];
      if(key && value) {
        data[key] = value;
      }
    }
  });
  return data;
};

const transcode = async data => {
  const mjrVideo = `${config.recording_path}/${data.video}`;
  const mjrAudio = `${config.recording_path}/${data.audio}`;
  const processedVideo = `${config.recording_path}/${data.name}.webm`;
  const processedAudio = `${config.recording_path}/${data.name}.opus`;
  const output = `${config.recording_path}/${data.name}.mp4`;
  const videoCodec = "libx264"; //h264
  const audioCodec = "mp3";
  try{
    await exec(`janus-pp-rec ${mjrAudio} ${processedAudio}`);
    await exec(`janus-pp-rec ${mjrVideo} ${processedVideo}`);
    await exec(`ffmpeg -i ${processedAudio} -i ${processedVideo} -c:a ${audioCodec} -c:v ${videoCodec} -strict experimental ${output}`);
    console.log(`${data.name} transcoding completed`);
  }catch(e) {
    console.error(e);
  }
};

const exec = command => {
  console.log(command);
  return new Promise((resolve, reject) => {
    cp.exec(command, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    })
  })
};