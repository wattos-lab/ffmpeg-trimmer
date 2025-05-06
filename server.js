const express = require("express");
const { exec } = require("child_process");
const fs = require("fs").promises;
const https = require("https");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");

const app = express();
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("🚀 FFmpeg Trimmer API is live. Use POST /trim");
});

// POST /trim for trimming the video
app.post("/trim", async (req, res) => {
  try {
    const { inputUrl, trimSeconds } = req.body;

    if (!inputUrl || !trimSeconds) {
      return res.status(400).json({ error: "Missing inputUrl or trimSeconds" });
    }

    const inputPath = path.join(__dirname, "input.mp4");
    const outputPath = path.join(__dirname, "output.mp4");

    // Download the file
    await downloadFile(inputUrl, inputPath);

    // Run FFmpeg to trim
    const cmd = `${ffmpegPath} -y -i "${inputPath}" -t ${trimSeconds} -c copy "${outputPath}"`;
    console.log("Running:", cmd);

    await execPromise(cmd);

    // Send output file
    res.sendFile(outputPath, async () => {
      await fs.unlink(inputPath);
      await fs.unlink(outputPath);
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Trimming failed", details: err.message || err });
  }
});

// Helper: download video file
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: Status ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", reject);
  });
}

// Helper: exec wrapper
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("FFmpeg stderr:", stderr);
        reject(err);
      } else {
        console.log("FFmpeg stdout:", stdout);
        resolve();
      }
    });
  });
}

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Trimmer API running on port ${PORT}`));
