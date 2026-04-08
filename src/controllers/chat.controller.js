const rekognitionService = require('../services/rekognition.service');
const s3Service = require('../services/s3.service');
const snsService = require('../services/sns.service');
const fs = require('fs').promises;
const path = require('path');

const dataPath = path.join(__dirname, '..', '..', 'data', 'foods.json');

/**
 * Controller for the AI Chatbot, now using Amazon Rekognition for image analysis
 * and rule-based logic for nutrition advice (as Bedrock is restricted in lab).
 */
class ChatController {
    async handleChat(req, res) {
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ reply: "Message cannot be empty." });

        try {
            // Simple rule-based logic for chat (since Bedrock is unavailable)
            let reply = "I'm your Diet Assistant. Try asking about 'calories', 'protein', or upload a food photo!";
            const lowerMessage = message.toLowerCase();
            
            if (lowerMessage.includes('calorie')) {
                reply = "Most healthy adult men need about 2,500 kcal a day, while women need around 2,000 kcal.";
            } else if (lowerMessage.includes('protein')) {
                reply = "Protein is essential for muscle repair. Good sources include eggs, chicken, and lentils.";
            }

            res.json({ reply });
        } catch (error) {
            console.error('Chat error:', error);
            res.status(500).json({ reply: 'Sorry, the assistant is currently unavailable.' });
        }
    }

    /**
     * Analyzes a food image using Amazon Rekognition
     * 1. Receives a base64 or buffer image
     * 2. Uploads to S3
     * 3. Uses Rekognition to detect food
     */
    async analyzeFoodImage(req, res) {
        const { imageBase64, filename, bucket, key: providedKey } = req.body;
        
        try {
            let finalBucket = bucket || s3Service.bucketName;
            let finalKey = providedKey;

            // If base64 is provided, upload to S3 first
            if (imageBase64) {
                const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                finalKey = `uploads/${Date.now()}_${filename || 'image.jpg'}`;
                await s3Service.uploadImage({ buffer, mimetype: 'image/jpeg' }, finalKey);
            }

            if (!finalBucket || !finalKey) {
                return res.status(400).json({ error: "S3 Bucket and Key (or imageBase64) are required." });
            }

            // Detect labels
            const labels = await rekognitionService.detectFoodLabels(finalBucket, finalKey);

            // Optional: Notify via SNS
            if (process.env.SNS_TOPIC_ARN) {
                await snsService.sendNotification(
                    process.env.SNS_TOPIC_ARN,
                    `Food analysis completed for: ${finalKey}. Labels: ${labels.join(', ')}`,
                    "Diet Diary: AI Analysis"
                );
            }

            res.json({ 
                imageUrl: `https://${finalBucket}.s3.amazonaws.com/${finalKey}`,
                labels, 
                message: labels.length > 0 
                    ? `Detected: ${labels.join(', ')}.` 
                    : "No food identified."
            });
        } catch (error) {
            console.error('Rekognition Error:', error);
            res.status(500).json({ error: "Failed to analyze image." });
        }
    }

    async handleAdminChat(req, res) {
        res.json({ reply: "Admin mode active. Please use the dashboard for user management." });
    }
}

module.exports = new ChatController();
