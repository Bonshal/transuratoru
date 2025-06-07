const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const fs = require("fs")
require('dotenv').config();
const OpenAI = require("openai")

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir);
    console.log("Uploads directory created successfully");
  } catch (err) {
    console.error("Error creating uploads directory:", err);
  }
}


const app = express();

app.use(cors())
const upload = multer({dest: path.join(__dirname, "uploads")}) // Creates 'uploads' folder in your server directory

console.log(process.env.NEBIUS_API_KEY)

let client;
try {
  client = new OpenAI({
    baseURL: 'https://api.studio.nebius.com/v1/',
    apiKey: process.env.NEBIUS_API_KEY,
  });
  console.log("OpenAI client initialized successfully");
} catch (error) {
  console.error("Error initializing OpenAI client:", error);
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const translateWithAI = async ( japText)=>{
    try{
    const messages =[
        {
            role:"user",
            content: `Translate the following Japanese manga dialogue into natural-sounding English. Provide ONLY the translated English text, without any additional explanations, commentary, or tags like <think></think>:\n\n${japText}`
        },
    ]

    const response = await client.chat.completions.create({
        model: "Qwen/Qwen3-235B-A22B",
        temperature: 0.6,
        max_tokens: 8192,
        top_p: 0.95,
        messages: messages,
    })
    
    let translatedText = response.choices[0].message.content
    translatedText = translatedText.replace(/<think>[\s\S]*?<\/think>/gi, '');
    translatedText = translatedText.trim();
    console.log(translatedText)
    return translatedText
    }catch(err)
    {
        console.log("error translating",err)
        throw err;
    }
}

app.post("/api/ocr", upload.single("image"), async(req,res)=>{
    const imagePath = path.resolve(req.file.path)
    try{
        const result = await Tesseract.recognize(imagePath,"jpn")
        const japText = result.data.text;
        console.log(japText)

        const translated = await translateWithAI(japText)
        console.log(translated)
        res.json({
            japnese : japText,
            english: translated.trim()
        })
    } catch(err){
        res.status(500).json({error:"OCR or translation failed",details:err.message})
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));