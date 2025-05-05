const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.post('/trim', (req, res) => {
  const { inputUrl, start = 0, duration = 59, outputName = 'output.mp4' } = req.body;

  const outputPath = `/tmp/${outputName}`;
  const command = `ffmpeg -ss ${start} -i "${inputUrl}" -t ${duration} -c:v libx264 -c:a aac -y "${outputPath}"`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error('FFmpeg error:', stderr);
      return res.status(500).json({ error: 'FFmpeg failed', stderr });
    }

    res.download(outputPath, (err) => {
      if (err) console.error('Download error:', err);
      fs.unlinkSync(outputPath); // Clean up
    });
  });
});

app.listen(port, () => console.log(`Trimmer API running on port ${port}`));
