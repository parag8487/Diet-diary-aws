require('dotenv').config();
const { RDSClient, CreateDBInstanceCommand, DescribeDBInstancesCommand } = require('@aws-sdk/client-rds');

async function setupRDS() {
    console.log('Setting up AWS RDS Database for Cloud Deployment...\n');
    
    const rdsClient = new RDSClient({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN
        }
    });

    const dbInstanceIdentifier = 'dietdiary-db';
    const dbName = 'dietdiary';
    const masterUsername = 'dietadmin';
    const masterPassword = 'DietDiary2024!'; // You should change this in production

    console.log('Configuration:');
    console.log('- Instance ID:', dbInstanceIdentifier);
    console.log('- Database Name:', dbName);
    console.log('- Username:', masterUsername);
    console.log('- Instance Class: db.t3.micro (Free Tier)');
    console.log('- Storage: 20 GB\n');

    try {
        // Check if instance already exists
        console.log('Checking if database instance already exists...');
        const describeCommand = new DescribeDBInstancesCommand({
            DBInstanceIdentifier: dbInstanceIdentifier
        });

        try {
            const existingInstance = await rdsClient.send(describeCommand);
            console.log('⚠️  Database instance already exists!');
            console.log('Status:', existingInstance.DBInstances[0].DBInstanceStatus);
            console.log('Endpoint:', existingInstance.DBInstances[0].Endpoint.Address);
            console.log('\nSkipping creation. Using existing instance.\n');
            return existingInstance.DBInstances[0].Endpoint.Address;
        } catch (error) {
            if (error.name === 'DBInstanceNotFound') {
                console.log('No existing instance found. Creating new one...\n');
            } else {
                throw error;
            }
        }

        // Create new RDS instance
        console.log('Creating RDS instance (this will take 10-15 minutes)...');
        const createCommand = new CreateDBInstanceCommand({
            DBInstanceIdentifier: dbInstanceIdentifier,
            DBInstanceClass: 'db.t3.micro',
            Engine: 'mysql',
            MasterUsername: masterUsername,
            MasterUserPassword: masterPassword,
            AllocatedStorage: 20,
            DBName: dbName,
            PubliclyAccessible: true,
            VpcSecurityGroupIds: [], // Use default security group
            BackupRetentionPeriod: 7,
            DeletionProtection: false
        });

        await rdsClient.send(createCommand);
        console.log('✅ RDS instance creation initiated!');
        console.log('\n⏰ Please wait 10-15 minutes for the instance to be ready.');
        console.log('You can check the status in AWS Console → RDS → Databases\n');

        console.log('Once the instance is available, add these to your .env file:');
        console.log(`DB_HOST=${dbInstanceIdentifier}.cluster-${process.env.AWS_REGION}.rds.amazonaws.com`);
        console.log(`DB_USER=${masterUsername}`);
        console.log(`DB_PASSWORD=${masterPassword}`);
        console.log(`DB_NAME=${dbName}`);
        console.log('DB_PORT=3306');

        return `${dbInstanceIdentifier}.cluster-${process.env.AWS_REGION}.rds.amazonaws.com`;

    } catch (error) {
        console.error('❌ Error setting up RDS:', error.message);
        console.error('\nThis might be because:');
        console.error('- RDS service is not available in your AWS Academy lab');
        console.error('- Insufficient permissions');
        console.error('- Instance creation limits reached');
        console.error('\nYou can manually create RDS in AWS Console if needed.');
        throw error;
    }
}

setupRDS()
    .then(endpoint => {
        console.log('\n🎉 RDS Setup Complete!');
        console.log('Next: Deploy application to Elastic Beanstalk');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ RDS Setup Failed');
        console.error('You may need to create RDS manually in AWS Console');
        process.exit(1);
    });
