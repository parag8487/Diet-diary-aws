const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mysql = require('mysql2/promise');
require('dotenv').config();

function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.avif': 'image/avif',
        '.webp': 'image/webp'
    };
    return map[ext] || 'application/octet-stream';
}

// AWS Config
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
    }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const LOCAL_IMAGES_DIR = path.join(__dirname, '../public/images/images');

async function syncImages() {
    console.log('🚀 Starting Image Sync to S3...');

    if (!BUCKET_NAME) {
        console.error('❌ Error: S3_BUCKET_NAME not found in .env');
        process.exit(1);
    }

    // Connect to RDS
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT) || 3306
        });
        console.log('✅ Connected to RDS Database');
    } catch (err) {
        console.error('❌ Database Connection Error:', err.message);
        process.exit(1);
    }

    // Read all images from local directory
    if (!fs.existsSync(LOCAL_IMAGES_DIR)) {
        console.error(`❌ Local images directory not found: ${LOCAL_IMAGES_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(LOCAL_IMAGES_DIR);
    console.log(`📂 Found ${files.length} files in local directory`);

    for (const file of files) {
        const filePath = path.join(LOCAL_IMAGES_DIR, file);
        if (fs.lstatSync(filePath).isDirectory()) continue;

        const fileContent = fs.readFileSync(filePath);
        const contentType = getContentType(file);

        console.log(`⬆️  Uploading ${file}...`);

        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: file,
                Body: fileContent,
                ContentType: contentType
            }));

            const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(file)}`;
            console.log(`✅ Uploaded: ${s3Url}`);

            // Update database
            // The local path in foods.json is either "./images/filename" or "images/filename"
            // We search for anything ending in this filename
            const updateQuery = `
                UPDATE food_items 
                SET url = ? 
                WHERE url LIKE ? OR url = ?
            `;
            const [result] = await db.query(updateQuery, [s3Url, `%/${file}`, file]);
            
            if (result.affectedRows > 0) {
                console.log(`📝 Updated ${result.affectedRows} rows in DB for ${file}`);
            } else {
                console.log(`ℹ️  No DB update needed for ${file} (not found in food_items table)`);
            }

        } catch (err) {
            console.error(`❌ Error processing ${file}:`, err.message);
        }
    }

    console.log('\n✨ Sync Process Completed!');
    await db.end();
}

syncImages().catch(err => console.error('💥 Fatal Error:', err));
