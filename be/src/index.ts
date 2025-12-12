require("dotenv").config();
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import {basePrompt as nodeBasePrompt} from "./defaults/node";
import {basePrompt as reactBasePrompt} from "./defaults/react";
import cors from "cors";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const app = express();
app.use(cors())
app.use(express.json())

app.post("/template", async (req, res) => {
    try {
        const prompt = req.body.prompt;
        
        const model = genAI.getGenerativeModel({ model: "models/gemini-flash-latest" });
        const systemPrompt = "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra";
        
        const response = await model.generateContent(`${systemPrompt}\n\nUser request: ${prompt}`);
        const answer = response.response.text().trim().toLowerCase(); // react or node
    if (answer == "react") {
        res.json({
            prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [reactBasePrompt]
        })
        return;
    }

    if (answer === "node") {
        res.json({
            prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [nodeBasePrompt]
        })
        return;
    }

    res.status(403).json({message: "You cant access this"})
    return;
    
    } catch (error) {
        console.error("Error in /template:", error);
        
        // Handle rate limiting specifically
        if (error instanceof Error && error.message.includes('429')) {
            // Extract retry delay if available
            const retryMatch = error.message.match(/retry in (\d+(?:\.\d+)?)s/);
            const retryDelay = retryMatch ? parseFloat(retryMatch[1]) : 60;
            
            res.status(429).json({
                message: "Rate limit exceeded", 
                error: "API quota exceeded. Please wait before making more requests.",
                retryAfter: Math.ceil(retryDelay),
                isRateLimit: true
            });
            return;
        }
        
        res.status(500).json({message: "Internal server error", error: error instanceof Error ? error.message : String(error)});
    }
})

app.post("/chat", async (req, res) => {
    try {
        const messages = req.body.messages;
        const model = genAI.getGenerativeModel({ model: "models/gemini-flash-latest" });
        
        // For Gemini, we need to handle conversation differently
        // Let's combine all messages into a single prompt for now
        let fullPrompt = getSystemPrompt() + "\n\n";
        
        messages.forEach((msg: any) => {
            if (msg.role === 'user') {
                fullPrompt += `User: ${msg.content}\n`;
            } else if (msg.role === 'assistant') {
                fullPrompt += `Assistant: ${msg.content}\n`;
            }
        });
        
        const response = await model.generateContent(fullPrompt);
        
        console.log("Gemini response:", response);

        res.json({
            response: response.response.text()
        });
    } catch (error) {
        console.error("Error in /chat:", error);
        
        // Handle rate limiting specifically
        if (error instanceof Error && error.message.includes('429')) {
            // Extract retry delay if available
            const retryMatch = error.message.match(/retry in (\d+(?:\.\d+)?)s/);
            const retryDelay = retryMatch ? parseFloat(retryMatch[1]) : 60;
            
            res.status(429).json({
                message: "Rate limit exceeded", 
                error: "API quota exceeded. Please wait before making more requests.",
                retryAfter: Math.ceil(retryDelay),
                isRateLimit: true
            });
            return;
        }
        
        res.status(500).json({message: "Internal server error", error: error instanceof Error ? error.message : String(error)});
    }
})

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});

