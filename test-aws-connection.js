require('dotenv').config();
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

async function testAWSConnection() {
    console.log('Testing AWS Credentials...');
    console.log('Region:', process.env.AWS_REGION);
    console.log('Account ID:', process.env.AWS_ACCOUNT_ID);
    
    try {
        // Create S3 client with credentials from .env
        const s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            }
        });

        // Test by listing S3 buckets
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);
        
        console.log('\n✅ AWS Connection Successful!');
        console.log('S3 Buckets:', response.Buckets.map(b => b.Name).join(', ') || 'No buckets found');
        console.log('Credentials are working correctly.');
        
        return true;
    } catch (error) {
        console.error('\n❌ AWS Connection Failed!');
        console.error('Error:', error.message);
        
        if (error.name === 'InvalidAccessKeyId') {
            console.error('Your Access Key ID is invalid or expired.');
        } else if (error.name === 'SignatureDoesNotMatch') {
            console.error('Your Secret Access Key is incorrect.');
        } else if (error.name === 'ExpiredToken') {
            console.error('Your Session Token has expired. Please get new credentials from AWS Academy.');
        }
        
        return false;
    }
}

testAWSConnection().then(success => {
    process.exit(success ? 0 : 1);
});
