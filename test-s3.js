require('dotenv').config();
const s3Service = require('./src/services/s3.service');

async function testS3Service() {
    console.log('Testing S3 Service Configuration...');
    console.log('Bucket Name:', process.env.S3_BUCKET_NAME);
    console.log('Region:', process.env.AWS_REGION);
    
    try {
        // Test by generating a presigned URL (this validates credentials without uploading)
        const testKey = 'test-file.jpg';
        console.log('\nGenerating presigned URL for test file:', testKey);
        
        const url = await s3Service.getPresignedUrl(testKey);
        console.log('✅ S3 Service configured successfully!');
        console.log('Presigned URL generated:', url.substring(0, 50) + '...');
        
        console.log('\n🎉 S3 is ready for file uploads!');
        return true;
    } catch (error) {
        console.error('\n❌ S3 Service test failed!');
        console.error('Error:', error.message);
        
        if (error.name === 'NoSuchBucket') {
            console.error('Bucket does not exist. Please check S3_BUCKET_NAME in .env');
        } else if (error.name === 'AccessDenied') {
            console.error('Access denied. Check your AWS credentials.');
        }
        
        return false;
    }
}

testS3Service().then(success => {
    process.exit(success ? 0 : 1);
});
