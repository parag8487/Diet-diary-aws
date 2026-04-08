const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

/**
 * Service to fetch secrets from AWS Secrets Manager.
 * Helps keep credentials out of .env files in production.
 */
class SecretsService {
    constructor() {
        this.client = new SecretsManagerClient({ 
            region: process.env.AWS_REGION || "us-east-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            }
        });
    }

    async getSecret(secretName) {
        try {
            const response = await this.client.send(
                new GetSecretValueCommand({ SecretId: secretName })
            );
            return JSON.parse(response.SecretString);
        } catch (error) {
            console.error(`Error fetching secret ${secretName}:`, error);
            throw error;
        }
    }

    /**
     * Loads secrets into process.env if running in a cloud environment
     */
    async loadSecrets() {
        if (process.env.NODE_ENV === 'production' && process.env.AWS_SECRET_NAME) {
            const secrets = await this.getSecret(process.env.AWS_SECRET_NAME);
            Object.keys(secrets).forEach(key => {
                process.env[key] = secrets[key];
            });
            console.log('Secrets loaded from AWS Secrets Manager');
        }
    }
}

module.exports = new SecretsService();
