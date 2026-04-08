const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

/**
 * Service for sending notifications via Amazon SNS.
 */
class SNSService {
    constructor() {
        this.client = new SNSClient({ 
            region: process.env.AWS_REGION || "us-east-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            }
        });
    }
    /**
     * Sends a notification via SNS Topic
     * @param {string} topicArn - The SNS Topic ARN to publish to
     * @param {string} message - The message content
     * @param {string} subject - The subject line (for email)
     */
    async sendNotification(topicArn, message, subject) {
        const command = new PublishCommand({
            TopicArn: topicArn,
            Message: message,
            Subject: subject,
        });

        try {
            const response = await this.client.send(command);
            console.log("SNS Notification Sent:", response.MessageId);
            return response;
        } catch (error) {
            console.error("SNS Error:", error);
            throw new Error("Failed to send notification: " + error.message);
        }
    }
}

module.exports = new SNSService();
