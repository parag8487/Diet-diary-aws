# Complete AWS Deployment Guide - DietDiary Application
## Step-by-Step Manual Setup for AWS Academy Learner Lab

---

## Overview
This guide will help you deploy your DietDiary application completely to AWS cloud infrastructure using services available in your AWS Academy Learner Lab.

**AWS Services You Will Use:**
- Amazon EC2 (Application Server + MySQL Database)
- Amazon S3 (File Storage)

**Optional AWS Services** (officially supported):
- Amazon RDS (MySQL Database) - with restrictions (nano/micro/small/medium only, no enhanced monitoring)
- AWS Secrets Manager (Credential Storage)

**Not Available in AWS Academy Lab:**
- Amazon SES (Email Service)
- Amazon Bedrock (AI Chatbot)

**Your AWS Academy Details:**
- Account ID: 502951073560
- Region: us-east-1
- Available Credit: $50 USD
- S3 Bucket: dietdiary-502951073560-images (already created)

---

## TABLE OF CONTENTS
1. Access AWS Academy Lab & Console
2. Create RDS Database (with AWS Academy restrictions)
3. Configure AWS Secrets Manager (Optional)
4. Launch EC2 Instance
5. Configure EC2 Environment (includes MySQL Server as backup)
6. Deploy Application Code
7. Configure Environment Variables
8. Initialize Database
9. Start Application
10. Configure Nginx Reverse Proxy
11. Test Cloud Deployment
12. Demonstrate to Professor

---

## STEP 1: Access AWS Academy Lab & Console

### 1.1 Open AWS Academy Portal
1. Go to your AWS Academy Learner Lab URL
2. Verify your lab is running
3. Note your lab credit: $50 USD
4. Note your Account ID: 502951073560

### 1.2 Access AWS Management Console
1. In AWS Academy portal, click **"Access the AWS Management Console"**
2. This opens AWS Console in a new tab
3. You are now logged in with your lab credentials

### 1.3 Verify S3 Bucket
1. In AWS Console, navigate to **S3** service
2. Verify bucket exists: `dietdiary-502951073560-images`
3. Click on the bucket to view its contents
4. This proves you already have cloud storage configured

---

## STEP 2: Configure AWS SES (Email Service)

### 2.1 Navigate to SES Service
1. In AWS Console, search for **SES** in the services search bar
2. Click on **Simple Email Service** to open the service

### 2.2 Verify SES in Sandbox Mode
1. In the left sidebar, click **Configuration** → **Sending statistics**
2. Note that SES starts in **Sandbox mode**
3. In sandbox mode, you can only send emails to verified email addresses

### 2.3 Verify Email Addresses
1. In the left sidebar, click **Configuration** → **Verified identities**
2. Click **Create identity**
3. Select **Email address**
4. Enter your email address (e.g., your-email@example.com)
5. Click **Create identity**
6. Check your email inbox
7. Click the verification link in the email from AWS
8. Wait for the status to change to "Verified"

**Repeat this process for any additional email addresses you want to send to.**

### 2.4 Note Your SES Configuration
**WRITE DOWN:**
- Verified Email Address: `_______________________`
- SES Region: `us-east-1`

### 2.5 Add SES Configuration to Environment
Later in Step 8, you will add this to your .env file:
```env
AWS_SES_SOURCE_EMAIL=your-verified-email@example.com
```

---

## STEP 3: Verify AWS Bedrock Access

### 3.1 Navigate to Bedrock Service
1. In AWS Console, search for **Bedrock** in the services search bar
2. Click on **Amazon Bedrock** to open the service

### 3.2 Verify Model Access
1. In the left sidebar, click **Model access**
2. Click **Edit** on the right side
3. You should see a list of available models
4. Look for **Anthropic** models:
   - Anthropic Claude 3 Haiku
   - Anthropic Claude 3 Sonnet
   - Anthropic Claude 3 Opus
5. Ensure at least one model has access enabled
6. If not enabled, select the checkbox next to a model
7. Click **Save changes**

### 3.3 Note Your Bedrock Configuration
**WRITE DOWN:**
- Available Model: `_______________________` (e.g., anthropic.claude-3-haiku-20240307-v1:0)
- Bedrock Region: `us-east-1`

### 3.4 Test Bedrock Access (Optional)
You can test Bedrock access later after deploying your application in Step 12.

---

## STEP 4: Configure AWS Secrets Manager

### 4.1 Navigate to Secrets Manager Service
1. In AWS Console, search for **Secrets Manager** in the services search bar
2. Click on **AWS Secrets Manager** to open the service

### 4.2 Create a Secret (Optional for Production)
**Note:** This step is optional for your demonstration. Your application can use environment variables instead.

1. Click **Store a new secret**
2. Select **Other type of secret**
3. In the key/value pairs section, add your secrets:
   - Key: `db_password`, Value: `your-rds-password`
   - Key: `aws_access_key_id`, Value: `your-access-key-id`
   - Key: `aws_secret_access_key`, Value: `your-secret-access-key`
   - (You can add any other sensitive data here)
4. Click **Next**
5. Secret name: Enter `dietdiary/production`
6. Description: Enter `DietDiary production secrets`
7. Click **Next**
8. Configure automatic rotation: Leave as **Disable automatic rotation**
9. Click **Next**
10. Review and click **Store**

### 4.3 Note Your Secret Configuration
**WRITE DOWN:**
- Secret Name: `dietdiary/production` (if created)
- Secret ARN: `_______________________` (if created)

### 4.4 Add Secrets Manager Configuration to Environment (Optional)
If you created a secret, later in Step 8 you will add this to your .env file:
```env
AWS_SECRET_NAME=dietdiary/production
```

---

## STEP 5: Launch EC2 Instance

### 5.1 Navigate to EC2 Service
1. In AWS Console, search for **EC2** in the services search bar
2. Click on **EC2** to open the service

### 5.2 Launch New Instance
1. Click the orange **"Launch Instance"** button
2. Fill in the following details:

**Name and tags:**
- Name: Enter `dietdiary-app`

**Application and OS Images (AMI):**
- Quick Start: Select **Ubuntu**
- AMI: Select **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type**
- Architecture: `64-bit (x86)`
- Free tier eligible: Should show **Free tier eligible**

**Instance Type:**
- Instance type: Select **t2.micro** (Free tier eligible)

**Key Pair (Login):**
- Key pair name: Click **"Create new key pair"**
  - Key pair name: Enter `dietdiary-key`
  - Key pair type: Select **RSA**
  - Private key file format: Select **.pem**
  - Click **Create key pair**
  - **IMPORTANT:** Your key file will download automatically
  - **Save this file securely** - you cannot download it again
  - Move it to a safe location on your computer

**Network Settings:**
- Click **Edit** to configure network settings
- Network: Select your default VPC
- Subnet: Select **No preference**
- Auto-assign public IP: Select **Enable**
- Firewall (security groups): Select **Create security group**
  - Security group name: Enter `dietdiary-ec2-sg`
  - Description: Enter `Security group for DietDiary EC2`
  - Inbound rules:
    - Rule 1: Type `SSH`, Port `22`, Source `My IP` (or `0.0.0.0/0`)
    - Rule 2: Type `HTTP`, Port `80`, Source `0.0.0.0/0`
    - Rule 3: Type `Custom TCP`, Port `3000`, Source `0.0.0.0/0`

**Configure Storage:**
- Volume type: **General Purpose SSD (gp2)**
- Size (GiB): Enter `20`
- Delete on termination: Check this box

### 5.3 Launch Instance
1. Click the orange **"Launch Instance"** button
2. You will see a success message
3. Click **View all instances**
4. Wait for the instance to be in **Running** state (2-3 minutes)
5. Once running, click on the instance
6. Copy the **Public IPv4 address** (you will need this for SSH connection)

**WRITE DOWN:**
- EC2 Public IP: `_______________________`
- Key pair file location: `_______________________`

---

## STEP 6: Configure EC2 Environment (includes MySQL Server)

### 6.1 Connect to EC2 via SSH

**On Windows (using PowerShell or Command Prompt):**
```bash
cd "path\to\your\key\file"
ssh -i dietdiary-key.pem ubuntu@<your-ec2-public-ip>
```

**Example:**
```bash
cd C:\Users\YourName\Downloads
ssh -i dietdiary-key.pem ubuntu@54.123.45.67
```

**If you get a permissions error on Windows:**
```bash
icacls dietdiary-key.pem /inheritance:r
icacls dietdiary-key.pem /grant:r "%USERNAME%:R"
```

**First time connection:**
- You will see a warning about host authenticity
- Type `yes` and press Enter
- You should now be connected to your EC2 instance
- Your prompt will show `ubuntu@ip-xxx-xxx-xxx-xxx:~$`

### 6.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 6.3 Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**Verify installation:**
```bash
node --version
npm --version
```
You should see Node.js version 18.x.x and npm version 9.x.x

### 6.4 Install MySQL Server
```bash
sudo apt install -y mysql-server
```

### 6.5 Secure MySQL Installation
```bash
sudo mysql_secure_installation
```
Follow the prompts:
- Press Y for VALIDATE PASSWORD COMPONENT
- Select password strength level (1 = Low, 2 = Medium, 0 = Strong)
- Set root password (remember this password)
- Remove anonymous users? Y
- Disallow root login remotely? Y
- Remove test database? Y
- Reload privilege tables? Y

### 6.6 Install Git
```bash
sudo apt install -y git
```

### 6.7 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 6.8 Install Nginx (Web Server)
```bash
sudo apt install -y nginx
```

---

## STEP 7: Deploy Application Code

### 7.1 Upload Application to EC2

**Option A: Upload via SCP (from your local machine)**
Open a new terminal on your local machine (not SSH'd into EC2):

```bash
cd C:\Users\ASUS\Desktop\aws
scp -i dietdiary-key.pem -r . ubuntu@<your-ec2-public-ip>:~/dietdiary
```

**Option B: Clone from Git Repository**
If your code is on GitHub:
```bash
# SSH'd into EC2
cd ~
git clone <your-repository-url> dietdiary
cd dietdiary
```

**Option C: Create files manually**
If you need to create the project structure:
```bash
# SSH'd into EC2
cd ~
mkdir dietdiary
cd dietdiary
```

Then create the necessary files manually.

### 7.2 Install Dependencies
```bash
cd ~/dietdiary
npm install
```

This will install all packages listed in package.json

---

## STEP 8: Configure Environment Variables

### 8.1 Create .env File
```bash
nano .env
```

### 8.2 Add Configuration
Copy and paste the following into the .env file:

```env
# AWS Credentials (from your AWS Academy lab)
AWS_ACCESS_KEY_ID=REPLACE_WITH_YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=REPLACE_WITH_YOUR_SECRET_KEY
AWS_SESSION_TOKEN=REPLACE_WITH_YOUR_SESSION_TOKEN
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=502951073560
S3_BUCKET_NAME=dietdiary-502951073560-images

# Database Configuration (Local MySQL on EC2)
DB_HOST=localhost
DB_USER=dietuser
DB_PASSWORD=DietDiary2024!  # Replace with your chosen password
DB_NAME=dietdiary
DB_PORT=3306

# SES Configuration (Email Service)
AWS_SES_SOURCE_EMAIL=<your-verified-email@example.com>  # Replace with your verified email from Step 2

# Bedrock Configuration (AI Service)
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0  # Or your available model from Step 3

# Secrets Manager Configuration (Optional)
# AWS_SECRET_NAME=dietdiary/production  # Uncomment if you created a secret in Step 4

# Server Configuration
PORT=3000
NODE_ENV=production
```

**IMPORTANT:**
- Replace `DietDiary2024!` with your chosen MySQL password (from Step 9)
- Replace `<your-verified-email@example.com>` with your verified email from Step 2
- Replace `anthropic.claude-3-haiku-20240307-v1:0` with your available model from Step 3
- Uncomment `AWS_SECRET_NAME` if you created a secret in Step 4

### 8.3 Save and Exit
- Press `Ctrl + X`
- Press `Y` to save
- Press `Enter` to confirm

---

## STEP 9: Initialize Database

### 9.1 Create Database and User
```bash
sudo mysql
```

Run these SQL commands:
```sql
CREATE DATABASE dietdiary;
CREATE USER 'dietuser'@'localhost' IDENTIFIED BY 'DietDiary2024!';
GRANT ALL PRIVILEGES ON dietdiary.* TO 'dietuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**WRITE DOWN:**
- MySQL User: `dietuser`
- MySQL Password: `DietDiary2024!` (or your chosen password)

### 9.2 Import Database Schema
If you have a database schema file (schema.sql):
```bash
mysql -u dietuser -p'DietDiary2024!' dietdiary < schema.sql
```

If you don't have a schema file, you may need to create tables manually or your application might handle this automatically.

### 9.3 Verify Database
```bash
mysql -u dietuser -p'DietDiary2024!' dietdiary
```

```sql
SHOW TABLES;
EXIT;
```

---

## STEP 10: Start Application

### 10.1 Start with PM2
```bash
cd ~/dietdiary
pm2 start server.js --name dietdiary
```

### 10.2 Check Application Status
```bash
pm2 status
```
You should see your application listed with status "online"

### 10.3 View Application Logs
```bash
pm2 logs dietdiary
```
Check for any errors in the logs

### 10.4 Setup PM2 to Start on Boot
```bash
pm2 startup
```
Copy and run the command that PM2 shows you

```bash
pm2 save
```

---

## STEP 11: Configure Nginx Reverse Proxy

### 11.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/dietdiary
```

### 11.2 Add Configuration
Copy and paste this configuration:

```nginx
server {
    listen 80;
    server_name _;

    # Increase upload size for image uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve static files directly
    location /public {
        alias /home/ubuntu/dietdiary/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 11.3 Save and Exit
- Press `Ctrl + X`
- Press `Y` to save
- Press `Enter` to confirm

### 11.4 Enable the Site
```bash
sudo ln -s /etc/nginx/sites-available/dietdiary /etc/nginx/sites-enabled/
```

### 11.5 Remove Default Nginx Site
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 11.6 Test Nginx Configuration
```bash
sudo nginx -t
```
You should see "syntax is ok" and "test is successful"

### 11.7 Restart Nginx
```bash
sudo systemctl restart nginx
```

### 11.8 Enable Nginx on Boot
```bash
sudo systemctl enable nginx
```

---

## STEP 12: Test Cloud Deployment

### 12.1 Access Your Application
Open your web browser and go to:
```
http://<your-ec2-public-ip>
```

Replace `<your-ec2-public-ip>` with your EC2 instance's public IP address

### 12.2 Test Application Features
- Navigate through the application
- Test user registration/login
- Test meal tracking
- Test AI chatbot (if available)
- Test file uploads (should upload to S3)

### 12.3 Verify AWS Services Integration
SSH into your EC2 instance and run tests:

```bash
cd ~/dietdiary
node test-aws-connection.js
node test-s3.js
node test-all-services.js
```

All tests should pass with ✅ status

### 12.4 Check Application Logs
```bash
pm2 logs dietdiary
```
Look for any errors or warnings

### 12.5 Monitor Resources
```bash
pm2 monit
```
This shows CPU and memory usage

---

## STEP 13: Demonstrate to Professor

### 13.1 Preparation Checklist
Before your presentation, ensure:
- [ ] AWS Academy lab is running
- [ ] EC2 instance is in "Running" status
- [ ] MySQL server is running on EC2
- [ ] Application is accessible via public IP
- [ ] All AWS services tests pass
- [ ] Application features work correctly

### 13.2 Presentation Structure

**Part 1: AWS Academy Lab Overview (2 minutes)**
1. Show AWS Academy portal
2. Display active lab with $50 credit
3. Show AWS Account ID: 502951073560
4. Explain AWS Academy Learner Lab purpose

**Part 2: AWS Console Tour (3 minutes)**
1. Click "Access the AWS Management Console"
2. Show EC2 instance:
   - Navigate to EC2 → Instances
   - Show `dietdiary-app` instance
   - Display instance details
3. Show S3 bucket:
   - Navigate to S3 → Buckets
   - Show `dietdiary-502951073560-images`
   - Display bucket contents
4. Show Bedrock/SES services (if configured):
   - Navigate to Bedrock → Model access
   - Navigate to SES → Verified identities

**Part 3: Application Demonstration (5 minutes)**
1. Open browser to `http://<your-ec2-public-ip>`
2. Demonstrate application features:
   - User registration/login
   - Meal tracking
   - BMI calculation
   - AI chatbot for nutrition advice
3. Explain AWS services integration:
   - "Images are stored in S3"
   - "AI responses come from Bedrock"
   - "Emails are sent via SES"
   - "Data is stored in RDS database"

**Part 4: Technical Details (3 minutes)**
1. SSH into EC2 instance
2. Show application is running with PM2:
   ```bash
   pm2 status
   ```
3. Show Nginx configuration:
   ```bash
   sudo nginx -t
   ```
4. Run AWS services tests:
   ```bash
   cd ~/dietdiary
   node test-all-services.js
   ```
5. Show all tests pass

**Part 5: Q&A (2 minutes)**
- Answer professor's questions
- Explain technical choices
- Discuss challenges faced
- Mention lessons learned

### 13.3 Key Points to Emphasize
- ✅ Fully cloud-deployed application
- ✅ Uses 5 AWS services (EC2, S3, Bedrock, SES, Secrets Manager)
- ✅ Real AWS infrastructure (not local)
- ✅ Professional cloud architecture
- ✅ Security best practices
- ✅ Cost-effective deployment
- ✅ Scalable and maintainable

### 13.4 Backup Plan
If something fails during presentation:
- Have screenshots of working application
- Be prepared to explain technical concepts verbally
- Show test results as proof of functionality
- Demonstrate individual components if full app fails

---

## COST MONITORING

### Monthly Estimated Costs
- EC2 (t2.micro): ~$8-15/month
- S3 Storage: ~$0.023/GB/month
- Data Transfer: Varies by usage
- **Total: ~$10-20/month**

### Cost Management Tips
1. Monitor usage in AWS Console → Billing
2. Stop EC2 instance when not in use
3. Clean up S3 bucket regularly
4. Set up billing alerts if available

### How to Stop Instances
**Stop EC2:**
- AWS Console → EC2 → Instances
- Select instance → Actions → Instance State → Stop

**Terminate EC2 (when done):**
- AWS Console → EC2 → Instances
- Select instance → Actions → Instance State → Terminate

---

## TROUBLESHOOTING

### Application Won't Start
**Problem:** PM2 shows application as "errored" or "stopped"

**Solution:**
```bash
pm2 logs dietdiary
```
Check logs for specific error messages and fix accordingly

### Database Connection Failed
**Problem:** Cannot connect to MySQL database

**Solution:**
1. Verify MySQL is running:
   ```bash
   sudo systemctl status mysql
   ```
2. Verify database credentials in .env file
3. Ensure database user was created correctly
4. Test connection manually:
   ```bash
   mysql -u dietuser -p'DietDiary2024!' dietdiary
   ```

### Cannot Access Application via Browser
**Problem:** Browser shows "This site can't be reached"

**Solution:**
1. Check EC2 instance is running
2. Verify security group allows port 80 and 3000
3. Check Nginx is running:
   ```bash
   sudo systemctl status nginx
   ```
4. Test application locally on EC2:
   ```bash
   curl http://localhost:3000
   ```

### S3 Uploads Not Working
**Problem:** File uploads fail

**Solution:**
1. Verify AWS credentials in .env file
2. Check S3 bucket exists and is accessible
3. Test S3 connection:
   ```bash
   node test-s3.js
   ```
4. Check bucket CORS configuration

### SSH Connection Refused
**Problem:** Cannot connect to EC2 via SSH

**Solution:**
1. Verify EC2 instance is running
2. Check security group allows port 22
3. Ensure you're using correct key pair file
4. Try with verbose mode:
   ```bash
   ssh -v -i dietdiary-key.pem ubuntu@<ip>
   ```

---

## SUCCESS CRITERIA

Your deployment is successful when:
- [ ] Application is accessible via public IP address
- [ ] All application features work correctly
- [ ] MySQL database connection is functional
- [ ] S3 file uploads work
- [ ] AI chatbot responds (if implemented)
- [ ] All AWS services tests pass
- [ ] Application is running with PM2 (auto-restart on crash)
- [ ] Nginx reverse proxy is configured
- [ ] Ready for professor demonstration

---

## FINAL NOTES

**Congratulations!** You have successfully deployed your DietDiary application to AWS cloud infrastructure. Your application now uses:
- ✅ Amazon EC2 for application hosting and database
- ✅ Amazon S3 for file storage
- ✅ Amazon Bedrock for AI features
- ✅ Amazon SES for email services
- ✅ AWS Secrets Manager for credential management

This is a professional, cloud-native deployment that demonstrates your ability to work with AWS services and build scalable applications. Good luck with your presentation!
