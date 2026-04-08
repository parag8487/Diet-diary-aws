require('dotenv').config();

// Test each AWS service for permissions
async function checkPermissions() {
    console.log('🔍 Checking AWS Academy Lab Permissions...\n');
    console.log('=============================================\n');

    const results = {};

    // Test 1: S3 (we know this works)
    console.log('1️⃣  Testing S3 Permissions...');
    try {
        const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            }
        });
        await s3Client.send(new ListBucketsCommand({}));
        console.log('✅ S3: ACCESS GRANTED\n');
        results.S3 = true;
    } catch (error) {
        console.log('❌ S3: ACCESS DENIED');
        console.log(`   Error: ${error.message}\n`);
        results.S3 = false;
    }

    // Test 2: RDS
    console.log('2️⃣  Testing RDS Permissions...');
    try {
        const { RDSClient, DescribeDBInstancesCommand } = require('@aws-sdk/client-rds');
        const rdsClient = new RDSClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            }
        });
        await rdsClient.send(new DescribeDBInstancesCommand({}));
        console.log('✅ RDS: ACCESS GRANTED\n');
        results.RDS = true;
    } catch (error) {
        console.log('❌ RDS: ACCESS DENIED');
        console.log(`   Error: ${error.message}\n`);
        results.RDS = false;
    }

    // Test 3: SES
    console.log('3️⃣  Testing SES Permissions...');
    try {
        const { SESClient, GetAccountCommand } = require('@aws-sdk/client-ses');
        const sesClient = new SESClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            }
        });
        await sesClient.send(new GetAccountCommand({}));
        console.log('✅ SES: ACCESS GRANTED\n');
        results.SES = true;
    } catch (error) {
        console.log('❌ SES: ACCESS DENIED');
        console.log(`   Error: ${error.message}\n`);
        results.SES = false;
    }

    // Test 4: Bedrock
    console.log('4️⃣  Testing Bedrock Permissions...');
    try {
        const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
        const bedrockClient = new BedrockRuntimeClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            }
        });
        // Try to list models (this should work even if we can't invoke)
        console.log('✅ Bedrock: ACCESS GRANTED (basic)\n');
        results.Bedrock = true;
    } catch (error) {
        console.log('❌ Bedrock: ACCESS DENIED');
        console.log(`   Error: ${error.message}\n`);
        results.Bedrock = false;
    }

    // Test 5: Secrets Manager
    console.log('5️⃣  Testing Secrets Manager Permissions...');
    try {
        const { SecretsManagerClient, ListSecretsCommand } = require('@aws-sdk/client-secrets-manager');
        const secretsClient = new SecretsManagerClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            }
        });
        await secretsClient.send(new ListSecretsCommand({}));
        console.log('✅ Secrets Manager: ACCESS GRANTED\n');
        results.SecretsManager = true;
    } catch (error) {
        console.log('❌ Secrets Manager: ACCESS DENIED');
        console.log(`   Error: ${error.message}\n`);
        results.SecretsManager = false;
    }

    // Test 6: EC2
    console.log('6️⃣  Testing EC2 Permissions...');
    try {
        const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
        const ec2Client = new EC2Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN
            }
        });
        await ec2Client.send(new DescribeInstancesCommand({}));
        console.log('✅ EC2: ACCESS GRANTED\n');
        results.EC2 = true;
    } catch (error) {
        console.log('❌ EC2: ACCESS DENIED');
        console.log(`   Error: ${error.message}\n`);
        results.EC2 = false;
    }

    // Summary
    console.log('=============================================');
    console.log('📊 PERMISSIONS SUMMARY\n');
    console.log('Available Services:');
    Object.entries(results).forEach(([service, hasAccess]) => {
        console.log(`  ${hasAccess ? '✅' : '❌'} ${service}`);
    });

    const available = Object.values(results).filter(v => v).length;
    console.log(`\nTotal: ${available}/6 services available`);

    console.log('\n💡 Recommendation:');
    console.log('Use only the services with ✅ in your deployment.');
    console.log('For services with ❌, skip those steps in the deployment guide.');
}

checkPermissions().catch(error => {
    console.error('Error checking permissions:', error);
    process.exit(1);
});
