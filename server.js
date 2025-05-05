const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());

app.post('/trim', (req, res) => {
  const { inputUrl, trimSeconds } = req.body;

  if (!inputUrl || !trimSeconds) {
    return res.status(400).json({ error: 'Missing inputUrl or trimSeconds' });
  }

  const inputPath = path.join('/tmp', 'input.mp4');
  const outputPath = path.join('/tmp', 'output.mp4');

  // Download the video file from Backblaze URL
  const file = fs.createWriteStream(inputPath);
  https.get(inputUrl, response => {
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        // Run FFmpeg to trim video
        const cmd = `ffmpeg -y -i ${inputPath} -t ${trimSeconds} -c copy ${outputPath}`;

        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            return res.status(500).json({ error: 'FFmpeg failed', stderr });
          }

          res.sendFile(outputPath, err => {
            if (err) {
              res.status(500).json({ error: 'Failed to send trimmed file' });
            }

            // Clean up temporary files
            fs.unlink(inputPath, () => {});
            fs.unlink(outputPath, () => {});
          });
        });
      });
    });
  }).on('error', err => {
    res.status(500).json({ error: 'Failed to download video', details: err.message });
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Trimmer API running on port ${PORT}`));
