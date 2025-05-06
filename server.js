const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const https = require("https");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");

const app = express();
app.use(express.json());

app.post("/trim", async (req, res) => {
  const { inputUrl, trimSeconds } = req.body;

  if (!inputUrl || trimSeconds === undefined) {
    return res.status(400).json({ error: "Missing inputUrl or trimSeconds" });
  }

  if (isNaN(trimSeconds)) {
    return res.status(400).json({ error: "trimSeconds must be a number" });
  }

  const inputPath = path.join(__dirname, "input.mp4");
  const outputPath = path.join(__dirname, "output.mp4");

  const file = fs.createWriteStream(inputPath);

  https.get(inputUrl, (response) => {
    if (response.statusCode !== 200) {
      return res
        .status(400)
        .json({ error: `Failed to download video. Status: ${response.statusCode}` });
    }

    response.pipe(file);

    file.on("finish", () => {
      file.close(() => {
        const cmd = `"${ffmpegPath}" -y -i "${inputPath}" -t ${trimSeconds} -c copy "${outputPath}"`;

        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            console.error("FFmpeg error:", stderr);
            fs.unlinkSync(inputPath);
            return res.status(500).json({ error: "FFmpeg failed", stderr });
          }

          res.sendFile(outputPath, () => {
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
          });
        });
      });
    });
  }).on("error", (err) => {
    return res.status(500).json({ error: "Download error", details: err.message });
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Trimmer API running on port ${PORT}`));
