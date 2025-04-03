const { bot } = require("../lib/");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require('dotenv').config();

// ElevenLabs Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "sk_9a08a800e9507bea2ce25862ebfef7d81eff81cd1eeea08e";
const VOICE_ID = "iP95p4xoKVk53GoZ742B"; // Chris voice

bot(
  {
    pattern: "voice ?(.*)",
    desc: "Convert text to voice note",
    type: "media",
  },
  async (message, match) => {
    try {
      // 1. Validate Input
      if (!match) return await message.send("Please provide text\nExample: .voice Hello world");

      // 2. Create temp directory if not exists
      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      // 3. Generate Audio
      const response = await axios({
        method: "POST",
        url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        data: {
          text: match,
          model_id: "eleven_turbo_v2",
          voice_settings: {
            stability: 0.8,
            similarity_boost: 0.3
          }
        },
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "accept": "audio/mpeg"
        },
        responseType: "arraybuffer",
        timeout: 30000
      });

      // 4. Save Audio File
      const audioPath = path.join(tempDir, `${Date.now()}.mp3`);
      fs.writeFileSync(audioPath, response.data);

      // 5. Send Voice Note
      await message.send(
        fs.readFileSync(audioPath),
        { mimetype: "audio/mpeg", ptt: true },
        "audio"
      );

      // 6. Cleanup
      fs.unlinkSync(audioPath);

    } catch (error) {
      console.error("Voice Error:", error);
      let errorMsg = "⚠️ Failed to generate voice";
      
      if (error.response?.status === 401) {
        errorMsg = "⚠️ Invalid API Key\nGet one from ElevenLabs.io";
      } else if (error.code === "ECONNABORTED") {
        errorMsg = "⚠️ Request timeout. Try shorter text";
      } else if (error.response) {
        errorMsg = `⚠️ API Error: ${error.response.status} - ${error.response.data}`;
      }
      
      await message.send(errorMsg);
    }
  }
);
