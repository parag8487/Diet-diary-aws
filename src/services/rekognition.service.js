const { RekognitionClient, DetectLabelsCommand } = require("@aws-sdk/client-rekognition");

/**
 * Service for analyzing food images using Amazon Rekognition.
 */
class RekognitionService {
    constructor() {
        this.client = new RekognitionClient({ 
            region: process.env.AWS_REGION || "us-east-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            }
        });
    }
    /**
     * Detects labels (objects/food) in an image stored in S3
     * @param {string} bucket - S3 Bucket Name
     * @param {string} key - S3 Object Key (file name)
     */
    async detectFoodLabels(bucket, key) {
        const command = new DetectLabelsCommand({
            Image: {
                S3Object: {
                    Bucket: bucket,
                    Name: key,
                },
            },
            MaxLabels: 10,
            MinConfidence: 75,
        });

        try {
            const response = await this.client.send(command);
            // Return labels that are likely to be food
            return response.Labels.map(label => label.Name);
        } catch (error) {
            console.error("Rekognition Error:", error);
            throw new Error("Failed to analyze image: " + error.message);
        }
    }
}

module.exports = new RekognitionService();
