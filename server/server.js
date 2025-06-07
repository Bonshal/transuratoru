const express = require("express");
const multer = require("multer");
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

// Function to perform OCR using manga-ocr (Python-based)
async function performMangaOCR(imagePath) {
    try {
        console.log("[performMangaOCR] Starting manga-ocr for:", imagePath);
        
        // Verify image file exists and is readable
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
        }
        
        const stats = fs.statSync(imagePath);
        if (!stats.isFile() || stats.size === 0) {
            throw new Error(`Invalid image file: ${imagePath} (size: ${stats.size} bytes)`);
        }
        
        console.log("[performMangaOCR] Image file verified - Size:", stats.size, "bytes");
        
        // Verify Python environment exists
        const pythonPath = path.join(__dirname, 'manga_ocr_env/bin/python');
        if (!fs.existsSync(pythonPath)) {
            throw new Error(`Python virtual environment not found at: ${pythonPath}`);
        }
        
        // Use Python subprocess to run manga-ocr with virtual environment
        const { spawn } = require('child_process');
        
        return new Promise((resolve, reject) => {
            // Set a timeout for the OCR process
            const timeout = setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('manga-ocr process timed out after 60 seconds'));
            }, 60000);
            
            const pythonProcess = spawn(pythonPath, ['-c', `
import sys
import os
sys.path.append('.')

# Verify image file accessibility from Python
image_path = '${imagePath}'
if not os.path.exists(image_path):
    print(f"ERROR: Image file not found: {image_path}", file=sys.stderr)
    sys.exit(1)

try:
    from manga_ocr import MangaOcr
    print("manga-ocr module imported successfully", file=sys.stderr)
    
    mocr = MangaOcr()
    print("MangaOcr instance created successfully", file=sys.stderr)
    
    text = mocr(image_path)
    print("OCR processing completed", file=sys.stderr)
    
    if not text or text.strip() == "":
        print("WARNING: No text extracted from image", file=sys.stderr)
        print("")  # Empty output for consistency
    else:
        print(text)
        
except ImportError as e:
    print(f"ERROR: Failed to import manga-ocr: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"ERROR: manga-ocr processing failed: {e}", file=sys.stderr)
    sys.exit(1)
`]);

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                const stderrData = data.toString();
                errorOutput += stderrData;
                
                // Log progress messages from stderr (these are our status updates)
                if (stderrData.includes('manga-ocr module imported') || 
                    stderrData.includes('MangaOcr instance created') || 
                    stderrData.includes('OCR processing completed') ||
                    stderrData.includes('WARNING:')) {
                    console.log("[performMangaOCR]", stderrData.trim());
                }
            });

            pythonProcess.on('close', (code) => {
                clearTimeout(timeout);
                
                if (code !== 0) {
                    console.error("[performMangaOCR] Python process failed with code:", code);
                    console.error("[performMangaOCR] Error output:", errorOutput);
                    reject(new Error(`manga-ocr failed with exit code ${code}: ${errorOutput}`));
                } else {
                    const extractedText = output.trim();
                    
                    // Enhanced logging of extracted text
                    console.log("=== MANGA OCR RESULT ===");
                    console.log("[performMangaOCR] Raw output length:", output.length);
                    console.log("[performMangaOCR] Trimmed text length:", extractedText.length);
                    
                    if (extractedText.length === 0) {
                        console.log("[performMangaOCR] ⚠️  WARNING: No text was extracted from the image");
                        console.log("[performMangaOCR] This could mean:");
                        console.log("  - The image contains no Japanese text");
                        console.log("  - The text is too blurry or small to detect");
                        console.log("  - The image format is not supported");
                    } else {
                        console.log("[performMangaOCR] ✅ Successfully extracted text:");
                        console.log("--- EXTRACTED JAPANESE TEXT ---");
                        console.log(extractedText);
                        console.log("--- END EXTRACTED TEXT ---");
                        
                        // Additional text analysis
                        const lines = extractedText.split('\n').filter(line => line.trim().length > 0);
                        console.log("[performMangaOCR] Text analysis:");
                        console.log(`  - Lines of text: ${lines.length}`);
                        console.log(`  - Characters: ${extractedText.length}`);
                        console.log(`  - Contains hiragana: ${/[\u3040-\u309F]/.test(extractedText)}`);
                        console.log(`  - Contains katakana: ${/[\u30A0-\u30FF]/.test(extractedText)}`);
                        console.log(`  - Contains kanji: ${/[\u4E00-\u9FAF]/.test(extractedText)}`);
                    }
                    console.log("========================");
                    
                    resolve(extractedText);
                }
            });

            pythonProcess.on('error', (error) => {
                clearTimeout(timeout);
                console.error("[performMangaOCR] ❌ Process spawn error:", error);
                console.error("[performMangaOCR] This usually means:");
                console.error("  - Python virtual environment is not set up correctly");
                console.error("  - manga-ocr is not installed in the virtual environment");
                console.error("  - File permissions issue");
                reject(new Error(`Failed to start manga-ocr process: ${error.message}`));
            });
        });
    } catch (error) {
        console.error("[performMangaOCR] ❌ Setup error:", error.message);
        throw error;
    }
}

app.post("/api/ocr", upload.single("image"), async(req,res)=>{
    const imagePath = path.resolve(req.file.path)
    try{
        console.log("[OCR Route] Starting OCR for uploaded image");
        console.log("[OCR Route] Image path:", imagePath);
        
        const japText = await performMangaOCR(imagePath);
        console.log("[OCR Route] OCR completed. Text length:", japText.length);
        
        if (japText.length > 0) {
            console.log("[OCR Route] First 100 chars:", japText.substring(0, 100) + (japText.length > 100 ? "..." : ""));
        } else {
            console.log("[OCR Route] ⚠️  No text extracted from image");
        }

        const translated = await translateWithAI(japText)
        console.log("[OCR Route] Translation completed. Length:", translated.length);
        console.log("[OCR Route] First 100 chars of translation:", translated.substring(0, 100) + (translated.length > 100 ? "..." : ""));
        
        res.json({
            japanese : japText,
            english: translated.trim()
        })
    } catch(err){
        console.error("[OCR Route] ❌ Error:", err.message);
        console.error("[OCR Route] Full error:", err);
        res.status(500).json({error:"OCR or translation failed",details:err.message})
    } finally {
        // Clean up uploaded file
        try {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log("[OCR Route] 🗑️  Cleaned up uploaded file:", imagePath);
            }
        } catch (cleanupError) {
            console.error("[OCR Route] ⚠️  Failed to clean up file:", cleanupError.message);
        }
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));