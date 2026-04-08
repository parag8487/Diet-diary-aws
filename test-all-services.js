const secretsService = require('./src/services/secrets.service');
const s3Service = require('./src/services/s3.service');
const rekognitionService = require('./src/services/rekognition.service');
const snsService = require('./src/services/sns.service');
const pool = require('./src/config/database');

async function testAllServices() {
    console.log("--- AWS Learner Lab Connectivity Test ---");

    try {
        // 1. Secrets Manager
        console.log("\n[1] Testing Secrets Manager...");
        if (process.env.AWS_SECRET_NAME) {
            const secrets = await secretsService.getSecret(process.env.AWS_SECRET_NAME);
            console.log("✅ Successfully fetched secrets keys:", Object.keys(secrets));
        } else {
            console.log("⏭️ Skipping Secrets Manager (AWS_SECRET_NAME not set)");
        }

        // 2. S3
        console.log("\n[2] Testing S3 (List Buckets)...");
        try {
            // Note: S3Client.send(new ListBucketsCommand({})) would require more permissions
            // We just check if the client can be instantiated and bucket name is present
            if (s3Service.bucketName) {
                console.log(`✅ S3 Bucket name configured: ${s3Service.bucketName}`);
            } else {
                console.log("❌ S3 Bucket name missing in environment");
            }
        } catch (e) { console.log("❌ S3 error:", e.message); }

        // 3. RDS (MySQL)
        console.log("\n[3] Testing RDS (MySQL) connectivity...");
        try {
            const [rows] = await pool.query('SELECT 1 + 1 AS result');
            console.log("✅ RDS Connectivity Successful. 1+1 =", rows[0].result);
        } catch (e) {
            console.log("❌ RDS Connection failed. Ensure endpoint/security group is correct.");
            console.log("   Error:", e.message);
        }

        // 4. Rekognition
        console.log("\n[4] Testing Rekognition client...");
        if (rekognitionService) {
            console.log("✅ Rekognition client initialized.");
        }

        // 5. SNS
        console.log("\n[5] Testing SNS Topic...");
        if (process.env.SNS_TOPIC_ARN) {
            console.log("✅ SNS Topic ARN detected:", process.env.SNS_TOPIC_ARN);
        } else {
            console.log("⏭️ Skipping SNS (SNS_TOPIC_ARN not set)");
        }

        console.log("\n--- Test Finished ---");
    } catch (error) {
        console.error("\nCRITICAL ERR:", error.message);
    } finally {
        process.exit();
    }
}

testAllServices();
