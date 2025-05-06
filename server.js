const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const fsp = require("fs").promises;
const https = require("https");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");

const app = express();
app.use(express.json());

// Helper function to download file to disk
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath); // from fs, not fs.promises
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", reject);
  });
}

// Trimming endpoint
app.post("/trim", async (req, res) => {
  const { inputUrl, trimSeconds } = req.body;
  if (!inputUrl || !trimSeconds) {
    return res.status(400).json({ error: "Missing inputUrl or trimSeconds" });
  }

  const inputPath = path.join(__dirname, "input.mp4");
  const outputPath = path.join(__dirname, "output.mp4");

  try {
    // Step 1: Download the video
    await downloadFile(inputUrl, inputPath);

    // Step 2: Run FFmpeg to trim the video
    const cmd = `${ffmpegPath} -y -i "${inputPath}" -t ${trimSeconds} -c copy "${outputPath}"`;
    exec(cmd, async (error, stdout, stderr) => {
      if (error) {
        console.error("FFmpeg error:", stderr);
        return res.status(500).json({ error: "FFmpeg failed", stderr });
      }

      // Step 3: Send trimmed video as a file response
      res.sendFile(outputPath, async () => {
        await fsp.unlink(inputPath);
        await fsp.unlink(outputPath);
      });
    });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Trimmer API running on port ${PORT}`));
