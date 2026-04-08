require('dotenv').config();
const { S3Client, CreateBucketCommand, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

async function setupS3Bucket() {
    const bucketName = 'dietdiary-' + process.env.AWS_ACCOUNT_ID + '-images';
    
    console.log('Setting up S3 Bucket...');
    console.log('Bucket Name:', bucketName);
    
    try {
        const s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            }
        });

        // Create bucket
        console.log('Creating bucket...');
        const createBucketCommand = new CreateBucketCommand({
            Bucket: bucketName,
        });
        
        await s3Client.send(createBucketCommand);
        console.log('✅ Bucket created successfully!');

        // Set up CORS policy for frontend access
        console.log('Setting up CORS policy...');
        const corsCommand = new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                        AllowedOrigins: ['*'],
                        ExposeHeaders: ['ETag']
                    }
                ]
            }
        });
        
        await s3Client.send(corsCommand);
        console.log('✅ CORS policy configured successfully!');

        console.log('\n🎉 S3 Setup Complete!');
        console.log('Bucket URL:', `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com`);
        console.log('\nAdd this to your .env file:');
        console.log(`S3_BUCKET_NAME=${bucketName}`);
        
        return bucketName;
    } catch (error) {
        if (error.name === 'BucketAlreadyExists') {
            console.log('⚠️  Bucket already exists. Using existing bucket.');
            console.log('Bucket Name:', bucketName);
            console.log('\nAdd this to your .env file:');
            console.log(`S3_BUCKET_NAME=${bucketName}`);
            return bucketName;
        } else {
            console.error('❌ Error creating bucket:', error.message);
            throw error;
        }
    }
}

setupS3Bucket()
    .then(bucketName => {
        console.log('\nSetup completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\nSetup failed!');
        process.exit(1);
    });
