#!/usr/bin/env node

/**
 * ============================================================
 *  🎯 Diet Diary — Interactive AWS Lab Configurator
 * ============================================================
 *  Since the Learner Lab blocks SDK-based resource creation,
 *  this script guides you through creating each service via
 *  the AWS Console, then auto-configures your .env, creates
 *  DB tables, and validates everything.
 *
 *  Usage:  node scripts/configure-after-console.js
 *          npm run configure
 * ============================================================
 */

require('dotenv').config();
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const ENV_PATH = path.join(__dirname, '..', '.env');

// ── Helpers ──────────────────────────────────────────────────
function readEnv() {
    return fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
}

function updateEnvFile(updates) {
    let content = readEnv();
    for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const line  = `${key}=${value}`;
        content = regex.test(content) ? content.replace(regex, line) : content + `\n${line}`;
    }
    fs.writeFileSync(ENV_PATH, content.trimEnd() + '\n', 'utf8');
    // Also update process.env
    Object.assign(process.env, updates);
}

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
    });
}

const ok   = (m) => console.log(`  ✅  ${m}`);
const warn = (m) => console.log(`  ⚠️   ${m}`);
const fail = (m) => console.log(`  ❌  ${m}`);
const info = (m) => console.log(`  ℹ️   ${m}`);
const HR   = () => console.log('─'.repeat(60));

// ══════════════════════════════════════════════════════════════
//  Step 1: S3 Bucket
// ══════════════════════════════════════════════════════════════
async function configureS3() {
    console.log('\n📦  Step 1 / 5 — S3 Bucket');
    HR();

    const current = process.env.S3_BUCKET_NAME;
    if (current) {
        info(`Current S3_BUCKET_NAME = ${current}`);
        const keep = await ask('  Keep this? (y/n): ');
        if (keep.toLowerCase() === 'y') { ok('Keeping.'); return; }
    }

    console.log(`
  Go to AWS Console → S3 → Create Bucket:
    • Bucket Name:  dietdiary-YOUR_ACCOUNT_ID-images
    • Region:       us-east-1
    • Public Access: Block all (keep defaults)
    • Click "Create Bucket"
  `);

    const bucket = await ask('  Paste your bucket name here: ');
    if (bucket) {
        updateEnvFile({ S3_BUCKET_NAME: bucket });
        ok(`Saved → S3_BUCKET_NAME=${bucket}`);
    } else {
        warn('Skipped S3 config.');
    }
}

// ══════════════════════════════════════════════════════════════
//  Step 2: SNS Topic
// ══════════════════════════════════════════════════════════════
async function configureSNS() {
    console.log('\n🔔  Step 2 / 5 — SNS Topic');
    HR();

    const current = process.env.SNS_TOPIC_ARN;
    if (current && current !== 'PENDING') {
        info(`Current SNS_TOPIC_ARN = ${current}`);
        const keep = await ask('  Keep this? (y/n): ');
        if (keep.toLowerCase() === 'y') { ok('Keeping.'); return; }
    }

    console.log(`
  Go to AWS Console → SNS → Topics → Create topic:
    • Type:   Standard
    • Name:   DietDiaryAlerts
    • Click "Create topic"
  Then → Create subscription:
    • Protocol: Email
    • Endpoint: your-email@example.com
    • Confirm the email!
  Copy the Topic ARN from the topic page.
  `);

    const arn = await ask('  Paste your Topic ARN: ');
    if (arn) {
        updateEnvFile({ SNS_TOPIC_ARN: arn });
        ok(`Saved → SNS_TOPIC_ARN=${arn}`);
    } else {
        warn('Skipped SNS config.');
    }
}

// ══════════════════════════════════════════════════════════════
//  Step 3: RDS Database
// ══════════════════════════════════════════════════════════════
async function configureRDS() {
    console.log('\n🏗️  Step 3 / 5 — RDS MySQL');
    HR();

    const current = process.env.DB_HOST;
    if (current && current !== 'localhost' && current !== 'PENDING') {
        info(`Current DB_HOST = ${current}`);
        const keep = await ask('  Keep this? (y/n): ');
        if (keep.toLowerCase() === 'y') { ok('Keeping.'); return; }
    }

    console.log(`
  Go to AWS Console → RDS → Create Database:
    • Standard Create → MySQL → Free Tier template
    • DB Instance Identifier: dietdiary-db
    • Master Username:        dietadmin
    • Master Password:        DietDiary2024Secure!
    • Public access:          Yes
    • Initial Database Name:  dietdiary
    • UNCHECK "Enable enhanced monitoring"
    • Click "Create database"
    • Wait ~10 min for it to show "Available"
    • Copy the Endpoint (under Connectivity & security)
  `);

    const endpoint = await ask('  Paste your RDS Endpoint (e.g. dietdiary-db.xxx.rds.amazonaws.com): ');
    if (endpoint) {
        const user = await ask('  Master username [dietadmin]: ') || 'dietadmin';
        const pass = await ask('  Master password [DietDiary2024Secure!]: ') || 'DietDiary2024Secure!';
        const dbname = await ask('  Database name [dietdiary]: ') || 'dietdiary';

        updateEnvFile({
            DB_HOST: endpoint,
            DB_USER: user,
            DB_PASSWORD: pass,
            DB_NAME: dbname,
            DB_PORT: '3306',
        });
        ok('Saved RDS credentials to .env');
    } else {
        warn('Skipped RDS config.');
    }
}

// ══════════════════════════════════════════════════════════════
//  Step 4: Secrets Manager
// ══════════════════════════════════════════════════════════════
async function configureSecretsManager() {
    console.log('\n🔐  Step 4 / 5 — Secrets Manager');
    HR();

    console.log(`
  Go to AWS Console → Secrets Manager → Store a new secret:
    • Secret type: "Other type of secret"
    • Add these key/value pairs:
        DB_HOST        = ${process.env.DB_HOST || 'YOUR_RDS_ENDPOINT'}
        DB_USER        = ${process.env.DB_USER || 'dietadmin'}
        DB_PASSWORD    = ${process.env.DB_PASSWORD || 'DietDiary2024Secure!'}
        DB_NAME        = ${process.env.DB_NAME || 'dietdiary'}
        S3_BUCKET_NAME = ${process.env.S3_BUCKET_NAME || 'YOUR_BUCKET'}
        SNS_TOPIC_ARN  = ${process.env.SNS_TOPIC_ARN || 'YOUR_TOPIC_ARN'}
    • Secret name: DietDiary/Prod
    • Click "Store"
  `);

    const done = await ask('  Done? (y/skip): ');
    if (done.toLowerCase() === 'y') {
        updateEnvFile({ AWS_SECRET_NAME: 'DietDiary/Prod' });
        ok('AWS_SECRET_NAME set.');
    } else {
        warn('Skipped Secrets Manager.');
    }
}

// ══════════════════════════════════════════════════════════════
//  Step 5: Rekognition — nothing to do
// ══════════════════════════════════════════════════════════════
async function configureRekognition() {
    console.log('\n🕵️  Step 5 / 5 — Rekognition');
    HR();
    ok('Rekognition is serverless — no setup needed!');
    info('It will work automatically when your code runs on EC2 with LabInstanceProfile.');
    info('(Won\'t work from your local machine since the Lab blocks it from outside)');
}

// ══════════════════════════════════════════════════════════════
//  Bonus: Initialize Database Tables
// ══════════════════════════════════════════════════════════════
async function initDB() {
    console.log('\n📋  Bonus — Initialize Database Tables');
    HR();

    const host = process.env.DB_HOST;
    if (!host || host === 'localhost' || host === 'PENDING') {
        warn('No valid DB_HOST — skipping table creation.');
        return false;
    }

    let mysql;
    try {
        mysql = require('mysql2/promise');
    } catch {
        warn('mysql2 not installed. Run: npm install mysql2');
        return false;
    }

    try {
        info(`Connecting to ${host}…`);
        const conn = await mysql.createConnection({
            host, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME, port: parseInt(process.env.DB_PORT || '3306'),
            connectTimeout: 15000,
        });

        await conn.query(`CREATE TABLE IF NOT EXISTS customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            last_login TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        ok("'customers' ✓");

        await conn.query(`CREATE TABLE IF NOT EXISTS meals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            day VARCHAR(50) NOT NULL,
            data JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_day (username, day)
        )`);
        ok("'meals' ✓");

        await conn.query(`CREATE TABLE IF NOT EXISTS food_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            day VARCHAR(50), title VARCHAR(255) NOT NULL,
            url TEXT, calories INT, carbs FLOAT, fat FLOAT, protein FLOAT,
            image_url TEXT, category VARCHAR(100), created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        ok("'food_items' ✓");

        await conn.query(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(255), role VARCHAR(50) DEFAULT 'customer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        ok("'users' ✓");

        await conn.query(`CREATE TABLE IF NOT EXISTS meal_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT, day VARCHAR(50), meal_type VARCHAR(50),
            food_id INT, servings FLOAT DEFAULT 1,
            logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        ok("'meal_logs' ✓");

        await conn.end();
        ok('All 5 tables ready!');
        return true;
    } catch (e) {
        fail(`DB error: ${e.message}`);
        if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
            info('Check: RDS status = Available? Security Group allows port 3306?');
        }
        return false;
    }
}

// ══════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════
async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   🎯  DIET DIARY — AWS Lab Configuration Wizard        ║');
    console.log('║   Create services in Console → paste values here       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    await configureS3();
    await configureSNS();
    await configureRDS();
    await configureSecretsManager();
    await configureRekognition();

    const dbOk = await initDB();

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('  📊  CONFIGURATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`    S3 Bucket     : ${process.env.S3_BUCKET_NAME || '❌ not set'}`);
    console.log(`    SNS Topic ARN : ${process.env.SNS_TOPIC_ARN || '❌ not set'}`);
    console.log(`    RDS Endpoint  : ${process.env.DB_HOST || '❌ not set'}`);
    console.log(`    Secret Name   : ${process.env.AWS_SECRET_NAME || '❌ not set'}`);
    console.log(`    Rekognition   : ✅ Serverless (no config needed)`);
    console.log(`    DB Tables     : ${dbOk ? '✅ Created' : '⚠️ Pending'}`);
    console.log('═'.repeat(60));

    console.log('\n  Next: npm start → http://localhost:3000\n');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
