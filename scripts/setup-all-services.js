#!/usr/bin/env node

/**
 * ============================================================
 *  🚀 Diet Diary — AWS Learner Lab Setup Automation
 * ============================================================
 *  Attempts to automate all 5 services. If a service blocks
 *  SDK-based provisioning (Learner Lab restriction), it logs
 *  clear manual instructions and continues with the rest.
 *
 *  Services:
 *    1 → S3 Bucket      (image storage)
 *    2 → SNS Topic      (calorie alerts)
 *    3 → RDS MySQL      (database)
 *    4 → Secrets Manager (centralized config)
 *    5 → Rekognition     (AI image analysis — serverless)
 *    6 → DB table init   (if RDS is reachable)
 *    7 → Smoke test      (verify all connections)
 *
 *  Usage:
 *    node scripts/setup-all-services.js
 *    npm run setup:aws
 * ============================================================
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

// ── SDK imports ──────────────────────────────────────────────
const { S3Client, CreateBucketCommand, PutBucketCorsCommand,
        HeadBucketCommand, ListBucketsCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SNSClient, CreateTopicCommand,
        SubscribeCommand, ListTopicsCommand }                      = require('@aws-sdk/client-sns');
const { RDSClient, CreateDBInstanceCommand,
        DescribeDBInstancesCommand }                               = require('@aws-sdk/client-rds');
const { SecretsManagerClient, CreateSecretCommand,
        GetSecretValueCommand, UpdateSecretCommand,
        ListSecretsCommand }                                       = require('@aws-sdk/client-secrets-manager');
const { RekognitionClient, DetectLabelsCommand }                  = require('@aws-sdk/client-rekognition');
const { EC2Client, AuthorizeSecurityGroupIngressCommand }         = require('@aws-sdk/client-ec2');

// ── Config ───────────────────────────────────────────────────
const REGION       = process.env.AWS_REGION   || 'us-east-1';
const ACCOUNT_ID   = process.env.AWS_ACCOUNT_ID;
const BUCKET_NAME  = process.env.S3_BUCKET_NAME || `dietdiary-${ACCOUNT_ID}-images`;
const SNS_TOPIC    = 'DietDiaryAlerts';
const DB_INSTANCE  = 'dietdiary-db';
const DB_NAME      = 'dietdiary';
const DB_USER      = 'dietadmin';
const DB_PASS      = 'DietDiary2024Secure!';
const SECRET_NAME  = 'DietDiary/Prod';

const credentials = {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken:    process.env.AWS_SESSION_TOKEN,
};
const clientCfg = { region: REGION, credentials };

const s3       = new S3Client(clientCfg);
const sns      = new SNSClient(clientCfg);
const rds      = new RDSClient(clientCfg);
const secretsM = new SecretsManagerClient(clientCfg);
const rekog    = new RekognitionClient(clientCfg);
const ec2      = new EC2Client(clientCfg);

// ── Helpers ──────────────────────────────────────────────────
const HR    = () => console.log('─'.repeat(60));
const ok    = (m) => console.log(`  ✅  ${m}`);
const warn  = (m) => console.log(`  ⚠️   ${m}`);
const fail  = (m) => console.log(`  ❌  ${m}`);
const info  = (m) => console.log(`  ℹ️   ${m}`);
const manual = (lines) => {
    console.log('  ┌─── MANUAL STEP (do this in AWS Console) ───');
    lines.forEach(l => console.log(`  │  ${l}`));
    console.log('  └─────────────────────────────────────────────');
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateEnvFile(updates) {
    const envPath = path.join(__dirname, '..', '.env');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const line  = `${key}=${value}`;
        content = regex.test(content) ? content.replace(regex, line) : content + `\n${line}`;
    }
    fs.writeFileSync(envPath, content.trimEnd() + '\n', 'utf8');
}

// Track overall results
const RESULTS = {};

// ══════════════════════════════════════════════════════════════
//  Phase 1: S3
// ══════════════════════════════════════════════════════════════
async function setupS3() {
    console.log('\n📦  Phase 1 / 5 — Amazon S3 (Image Storage)');
    HR();

    // First: check if bucket already exists (maybe created via Console)
    try {
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        ok(`Bucket "${BUCKET_NAME}" exists — reusing it.`);
        RESULTS.S3 = '✅';
        
        // Try to set CORS
        try {
            await s3.send(new PutBucketCorsCommand({
                Bucket: BUCKET_NAME,
                CORSConfiguration: {
                    CORSRules: [{
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                        AllowedOrigins: ['*'],
                        ExposeHeaders:  ['ETag'],
                    }],
                },
            }));
            ok('CORS policy configured.');
        } catch (e) {
            warn(`CORS config skipped (${e.name}) — set it via Console if needed.`);
        }

        updateEnvFile({ S3_BUCKET_NAME: BUCKET_NAME });
        ok(`.env → S3_BUCKET_NAME=${BUCKET_NAME}`);
        return BUCKET_NAME;
    } catch {
        // Bucket doesn't exist — try to create
    }

    try {
        await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        ok(`Bucket "${BUCKET_NAME}" created.`);
        RESULTS.S3 = '✅';
    } catch (e) {
        if (e.name === 'BucketAlreadyOwnedByYou' || e.name === 'BucketAlreadyExists') {
            ok('Bucket already exists — reusing.');
            RESULTS.S3 = '✅';
        } else if (e.name === 'AccessDenied' || e.Code === 'AccessDenied') {
            warn('CreateBucket is BLOCKED by Learner Lab policy.');
            manual([
                '1. Go to AWS Console → S3',
                `2. Create Bucket → Name: "${BUCKET_NAME}"`,
                '3. Region: us-east-1',
                '4. Block All Public Access: ✅ (keep checked)',
                '5. Create Bucket',
                '6. Re-run this script after creating the bucket.',
            ]);
            RESULTS.S3 = '⚠️ Manual';
            updateEnvFile({ S3_BUCKET_NAME: BUCKET_NAME });
            return BUCKET_NAME;
        } else {
            throw e;
        }
    }

    // CORS
    try {
        await s3.send(new PutBucketCorsCommand({
            Bucket: BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [{
                    AllowedHeaders: ['*'],
                    AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                    AllowedOrigins: ['*'],
                    ExposeHeaders:  ['ETag'],
                }],
            },
        }));
        ok('CORS policy configured.');
    } catch (e) {
        warn(`CORS: ${e.message} — configure via Console.`);
    }

    updateEnvFile({ S3_BUCKET_NAME: BUCKET_NAME });
    ok(`.env → S3_BUCKET_NAME=${BUCKET_NAME}`);
    return BUCKET_NAME;
}

// ══════════════════════════════════════════════════════════════
//  Phase 2: SNS
// ══════════════════════════════════════════════════════════════
async function setupSNS() {
    console.log('\n🔔  Phase 2 / 5 — Amazon SNS (Notifications)');
    HR();

    try {
        const { TopicArn } = await sns.send(new CreateTopicCommand({ Name: SNS_TOPIC }));
        ok(`Topic ARN: ${TopicArn}`);
        RESULTS.SNS = '✅';

        const email = process.env.NOTIFICATION_EMAIL;
        if (email) {
            try {
                await sns.send(new SubscribeCommand({
                    TopicArn, Protocol: 'email', Endpoint: email,
                }));
                ok(`Subscription for ${email} — check inbox to confirm!`);
            } catch (e) {
                warn(`Subscribe failed: ${e.message}`);
            }
        } else {
            info('Tip: Set NOTIFICATION_EMAIL in .env to auto-subscribe.');
        }

        updateEnvFile({ SNS_TOPIC_ARN: TopicArn });
        ok(`.env → SNS_TOPIC_ARN=${TopicArn}`);
        return TopicArn;
    } catch (e) {
        if (e.name === 'AccessDenied' || e.name === 'AuthorizationErrorException') {
            warn('SNS CreateTopic is BLOCKED by Learner Lab policy.');
            manual([
                '1. Go to AWS Console → SNS → Topics',
                `2. Create Topic → Standard → Name: "${SNS_TOPIC}"`,
                '3. Create Subscription → Email → your email',
                '4. Confirm the email subscription',
                '5. Copy Topic ARN → paste into .env as SNS_TOPIC_ARN=...',
                '6. Re-run this script.',
            ]);
            RESULTS.SNS = '⚠️ Manual';
            return process.env.SNS_TOPIC_ARN || 'PENDING';
        }
        throw e;
    }
}

// ══════════════════════════════════════════════════════════════
//  Phase 3: RDS
// ══════════════════════════════════════════════════════════════
async function setupRDS() {
    console.log('\n🏗️  Phase 3 / 5 — Amazon RDS (MySQL Database)');
    HR();

    let endpoint = process.env.DB_HOST;

    // Check if instance already exists
    try {
        const desc = await rds.send(new DescribeDBInstancesCommand({
            DBInstanceIdentifier: DB_INSTANCE,
        }));
        const inst   = desc.DBInstances[0];
        const status = inst.DBInstanceStatus;
        ok(`Instance "${DB_INSTANCE}" found — Status: ${status}`);

        if (status === 'available') {
            endpoint = inst.Endpoint.Address;
            ok(`Endpoint: ${endpoint}`);
            RESULTS.RDS = '✅';

            // Try to open port 3306
            await openRDSSecurityGroup(inst);
        } else {
            info(`RDS is "${status}" — waiting for it to become available...`);
            endpoint = await waitForRDS();
            RESULTS.RDS = '✅';
        }
    } catch (e) {
        if (e.name === 'DBInstanceNotFoundFault' || e.name === 'DBInstanceNotFound' 
            || e.message?.includes('DBInstanceNotFound')) {
            info('No existing instance found. Attempting to create...');

            try {
                await rds.send(new CreateDBInstanceCommand({
                    DBInstanceIdentifier: DB_INSTANCE,
                    DBInstanceClass:      'db.t3.micro',
                    Engine:               'mysql',
                    EngineVersion:        '8.0',
                    MasterUsername:       DB_USER,
                    MasterUserPassword:  DB_PASS,
                    AllocatedStorage:    20,
                    DBName:              DB_NAME,
                    PubliclyAccessible:  true,
                    BackupRetentionPeriod: 0,
                    DeletionProtection:  false,
                    MonitoringInterval:  0,
                }));
                ok('RDS creation initiated (10-15 min).');
                info('Waiting for RDS to become available...');
                endpoint = await waitForRDS();
                RESULTS.RDS = '✅';
            } catch (createErr) {
                if (createErr.name === 'AccessDenied' || createErr.name === 'AccessDeniedException') {
                    warn('RDS CreateDBInstance is BLOCKED by Learner Lab policy.');
                    manual([
                        '1. Go to AWS Console → RDS → Create Database',
                        '2. Standard Create → MySQL → Free Tier template',
                        `3. DB Instance Identifier: "${DB_INSTANCE}"`,
                        `4. Master Username: "${DB_USER}"`,
                        `5. Master Password: "${DB_PASS}"`,
                        '6. Public Access: Yes (for local dev)',
                        `7. Initial Database Name: "${DB_NAME}"`,
                        '8. UNCHECK "Enable enhanced monitoring"',
                        '9. Wait ~10 min → copy Endpoint → paste into .env as DB_HOST=...',
                        '10. Re-run this script.',
                    ]);
                    RESULTS.RDS = '⚠️ Manual';
                } else {
                    throw createErr;
                }
            }
        } else if (e.name === 'AccessDenied' || e.name === 'AccessDeniedException') {
            warn('RDS DescribeDBInstances is BLOCKED.');
            manual([
                '1. Create RDS instance manually via AWS Console',
                '2. Copy the endpoint into .env as DB_HOST=...',
                '3. Re-run this script.',
            ]);
            RESULTS.RDS = '⚠️ Manual';
        } else {
            throw e;
        }
    }

    if (endpoint && endpoint !== 'localhost') {
        updateEnvFile({
            DB_HOST:     endpoint,
            DB_USER:     DB_USER,
            DB_PASSWORD: DB_PASS,
            DB_NAME:     DB_NAME,
            DB_PORT:     '3306',
        });
        ok('.env updated with RDS credentials.');
    }

    return endpoint;
}

async function waitForRDS() {
    const MAX_WAIT = 20 * 60 * 1000;
    const POLL     = 30 * 1000;
    const start    = Date.now();

    while (Date.now() - start < MAX_WAIT) {
        try {
            const desc = await rds.send(new DescribeDBInstancesCommand({
                DBInstanceIdentifier: DB_INSTANCE,
            }));
            const inst   = desc.DBInstances[0];
            const status = inst.DBInstanceStatus;

            if (status === 'available') {
                const ep = inst.Endpoint.Address;
                ok(`RDS is AVAILABLE → ${ep}`);
                await openRDSSecurityGroup(inst);
                return ep;
            }

            const elapsed = Math.round((Date.now() - start) / 1000);
            info(`Status: ${status} … (${elapsed}s)`);
        } catch (e) {
            info(`Poll error: ${e.message}`);
        }
        await sleep(POLL);
    }
    warn('RDS did not become available in 20 min. Check Console and re-run.');
    return process.env.DB_HOST || 'PENDING';
}

async function openRDSSecurityGroup(inst) {
    if (!inst?.VpcSecurityGroups) return;
    for (const sg of inst.VpcSecurityGroups) {
        try {
            await ec2.send(new AuthorizeSecurityGroupIngressCommand({
                GroupId: sg.VpcSecurityGroupId,
                IpPermissions: [{
                    IpProtocol: 'tcp',
                    FromPort: 3306, ToPort: 3306,
                    IpRanges: [{ CidrIp: '0.0.0.0/0', Description: 'MySQL (lab)' }],
                }],
            }));
            ok(`SG ${sg.VpcSecurityGroupId}: port 3306 opened.`);
        } catch (e) {
            if (e.name === 'InvalidPermission.Duplicate') {
                info(`SG ${sg.VpcSecurityGroupId}: port 3306 already open.`);
            } else {
                warn(`SG mod skipped: ${e.message}`);
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  Phase 4: Secrets Manager
// ══════════════════════════════════════════════════════════════
async function setupSecretsManager(dbHost, bucketName, snsArn) {
    console.log('\n🔐  Phase 4 / 5 — AWS Secrets Manager');
    HR();

    const secretValue = JSON.stringify({
        DB_HOST:        dbHost || 'PENDING',
        DB_USER:        DB_USER,
        DB_PASSWORD:    DB_PASS,
        DB_NAME:        DB_NAME,
        S3_BUCKET_NAME: bucketName,
        SNS_TOPIC_ARN:  snsArn || 'PENDING',
    });

    try {
        // Try to read existing secret
        try {
            await secretsM.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
            info(`Secret "${SECRET_NAME}" exists — updating...`);
            await secretsM.send(new UpdateSecretCommand({
                SecretId: SECRET_NAME, SecretString: secretValue,
            }));
            ok('Secret updated with latest values.');
        } catch (e) {
            if (e.name === 'ResourceNotFoundException') {
                await secretsM.send(new CreateSecretCommand({
                    Name: SECRET_NAME, SecretString: secretValue,
                    Description: 'Diet Diary credentials (auto)',
                }));
                ok(`Secret "${SECRET_NAME}" created.`);
            } else {
                throw e;
            }
        }
        RESULTS.SecretsManager = '✅';

        updateEnvFile({ AWS_SECRET_NAME: SECRET_NAME });
        ok(`.env → AWS_SECRET_NAME=${SECRET_NAME}`);
    } catch (e) {
        if (e.name === 'AccessDeniedException' || e.name === 'AccessDenied') {
            warn('Secrets Manager is BLOCKED by Learner Lab policy.');
            manual([
                '1. Go to AWS Console → Secrets Manager',
                '2. Store a new secret → "Other type"',
                '3. Add these key/value pairs:',
                `   DB_HOST = ${dbHost || 'YOUR_RDS_ENDPOINT'}`,
                `   DB_USER = ${DB_USER}`,
                `   DB_PASSWORD = ${DB_PASS}`,
                `   DB_NAME = ${DB_NAME}`,
                `   S3_BUCKET_NAME = ${bucketName}`,
                `   SNS_TOPIC_ARN = ${snsArn || 'YOUR_SNS_ARN'}`,
                `4. Secret Name: "${SECRET_NAME}"`,
                '5. Finish.',
            ]);
            RESULTS.SecretsManager = '⚠️ Manual';
        } else {
            throw e;
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  Phase 5: Rekognition (verify only)
// ══════════════════════════════════════════════════════════════
async function verifyRekognition() {
    console.log('\n🕵️  Phase 5 / 5 — Amazon Rekognition (Verify)');
    HR();
    info('Rekognition is serverless — no setup needed.');

    try {
        await rekog.send(new DetectLabelsCommand({
            Image: { Bytes: Buffer.from('not-a-real-image') },
            MaxLabels: 1,
        }));
        ok('Rekognition responded.');
        RESULTS.Rekognition = '✅';
    } catch (e) {
        if (e.name === 'InvalidImageFormatException' || e.name === 'ImageTooSmallException'
            || e.message?.includes('Invalid image') || e.message?.includes('minimum')) {
            ok('Rekognition is REACHABLE (got expected image-format error = auth works).');
            RESULTS.Rekognition = '✅';
        } else if (e.name === 'AccessDeniedException') {
            fail('Rekognition ACCESS DENIED. Ensure LabInstanceProfile is attached.');
            RESULTS.Rekognition = '❌';
        } else {
            warn(`Rekognition: ${e.name} — ${e.message}`);
            RESULTS.Rekognition = '⚠️';
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  Phase 6: Initialize DB tables
// ══════════════════════════════════════════════════════════════
async function initializeDatabase(dbHost) {
    console.log('\n📋  Phase 6 — Database Table Initialization');
    HR();

    if (!dbHost || dbHost === 'localhost' || dbHost === 'PENDING') {
        warn('Skipping DB init — no valid RDS endpoint yet.');
        info('Set DB_HOST in .env and re-run.');
        return;
    }

    let mysql;
    try {
        mysql = require('mysql2/promise');
    } catch {
        warn('mysql2 not installed. Run: npm install mysql2');
        return;
    }

    try {
        info(`Connecting to ${dbHost}…`);
        const conn = await mysql.createConnection({
            host: dbHost, user: DB_USER, password: DB_PASS,
            database: DB_NAME, port: 3306, connectTimeout: 15000,
        });

        // customers table (user.controller)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        ok("'customers' table ready.");

        // meals table (food.controller)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS meals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                day VARCHAR(50) NOT NULL,
                data JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_day (username, day)
            )
        `);
        ok("'meals' table ready.");

        // food_items table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS food_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                day VARCHAR(50),
                title VARCHAR(255) NOT NULL,
                url TEXT,
                calories INT,
                carbs FLOAT,
                fat FLOAT,
                protein FLOAT,
                image_url TEXT,
                category VARCHAR(100),
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        ok("'food_items' table ready.");

        // users table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                role VARCHAR(50) DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        ok("'users' table ready.");

        // meal_logs table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS meal_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                day VARCHAR(50),
                meal_type VARCHAR(50),
                food_id INT,
                servings FLOAT DEFAULT 1,
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        ok("'meal_logs' table ready.");

        await conn.end();
        ok('All 5 tables created / verified.');
    } catch (e) {
        fail(`DB init failed: ${e.message}`);
        if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
            info('RDS may still be booting OR security group blocks port 3306.');
            info('Check Console → RDS → Security Group → Inbound Rules → add 3306.');
        }
        info('Re-run this script once RDS is reachable.');
    }
}

// ══════════════════════════════════════════════════════════════
//  Phase 7: Smoke Test 
// ══════════════════════════════════════════════════════════════
async function smokeTest() {
    console.log('\n🧪  Phase 7 — Final Connectivity Report');
    HR();

    // Fill in any missing results with a quick test
    if (!RESULTS.S3) {
        try {
            await s3.send(new ListBucketsCommand({}));
            RESULTS.S3 = '✅';
        } catch { RESULTS.S3 = RESULTS.S3 || '❌'; }
    }

    if (!RESULTS.SNS) {
        try {
            await sns.send(new ListTopicsCommand({}));
            RESULTS.SNS = '✅';
        } catch { RESULTS.SNS = RESULTS.SNS || '❌'; }
    }

    if (!RESULTS.SecretsManager) {
        try {
            await secretsM.send(new ListSecretsCommand({}));
            RESULTS.SecretsManager = '✅';
        } catch { RESULTS.SecretsManager = RESULTS.SecretsManager || '❌'; }
    }

    if (!RESULTS.RDS) {
        try {
            await rds.send(new DescribeDBInstancesCommand({}));
            RESULTS.RDS = '✅';
        } catch { RESULTS.RDS = RESULTS.RDS || '❌'; }
    }

    if (!RESULTS.Rekognition) {
        RESULTS.Rekognition = '⏭️ Skipped';
    }

    // Print final report
    console.log('\n' + '═'.repeat(60));
    console.log('  📊  FINAL SERVICE STATUS');
    console.log('═'.repeat(60));
    const order = ['S3', 'SNS', 'RDS', 'SecretsManager', 'Rekognition'];
    for (const svc of order) {
        const status = RESULTS[svc] || '❓';
        const pad = svc.padEnd(18);
        console.log(`    ${status}  ${pad}`);
    }

    const passed = Object.values(RESULTS).filter(v => v === '✅').length;
    console.log(`\n  Score: ${passed} / ${order.length} services fully automated.`);

    if (passed < order.length) {
        console.log('\n  💡 For any ⚠️ items, follow the manual steps printed above,');
        console.log('     then re-run:  npm run setup:aws');
    }
    console.log('═'.repeat(60));
}

// ══════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════
async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   🚀  DIET DIARY — FULL AWS SETUP AUTOMATION           ║');
    console.log('║   S3 · SNS · RDS · Secrets Manager · Rekognition       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        fail('Missing AWS credentials in .env — aborting.');
        process.exit(1);
    }
    info(`Region: ${REGION}  |  Account: ${ACCOUNT_ID || 'not set'}`);

    // Run each phase independently — failures don't block others
    let bucket = BUCKET_NAME, snsArn = '', dbHost = process.env.DB_HOST || '';

    try { bucket  = await setupS3();  } catch (e) { fail(`S3: ${e.message}`);  RESULTS.S3 = '❌'; }
    try { snsArn  = await setupSNS(); } catch (e) { fail(`SNS: ${e.message}`); RESULTS.SNS = '❌'; }
    try { dbHost  = await setupRDS(); } catch (e) { fail(`RDS: ${e.message}`); RESULTS.RDS = '❌'; }
    try { await setupSecretsManager(dbHost, bucket, snsArn); } catch (e) { fail(`Secrets: ${e.message}`); RESULTS.SecretsManager = '❌'; }
    try { await verifyRekognition(); } catch (e) { fail(`Rekognition: ${e.message}`); RESULTS.Rekognition = '❌'; }
    try { await initializeDatabase(dbHost); } catch (e) { fail(`DB Init: ${e.message}`); }

    await smokeTest();

    console.log('\n🎉  Setup complete!');
    console.log('    npm start → http://localhost:3000\n');
}

main().catch(err => {
    console.error('\n💥  Unexpected error:', err);
    process.exit(1);
});
