const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

/**
 * Service for handling image storage in Amazon S3.
 * Replaces local image storage for food items and user profiles.
 */
class S3Service {
    constructor() {
        const clientConfig = { 
            region: process.env.AWS_REGION || "us-east-1"
        };

        // Only add credentials if explicitly provided (for local dev)
        // On EC2, this allows the SDK to use the instance profile automatically
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            clientConfig.credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            };
        }

        this.client = new S3Client(clientConfig);
        this.bucketName = process.env.S3_BUCKET_NAME;
    }

    async uploadImage(file, key) {
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        });
        await this.client.send(command);
        return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    }

    async getPresignedUrl(key) {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key
        });
        return await getSignedUrl(this.client, command, { expiresIn: 3600 });
    }
}

module.exports = new S3Service();
