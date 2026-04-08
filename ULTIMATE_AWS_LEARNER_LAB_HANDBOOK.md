# 🚀 Ultimate AWS Learner Lab Setup Handbook

This guide provides the **exact** steps to deploy your Diet Diary project using the 5 permitted services in your Learner Lab. 

> [!IMPORTANT]
> **Region Lock:** Always ensure the region in the top-right corner of your AWS Console is **N. Virginia (us-east-1)**.

---

## 🏗️ Phase 1: Amazon RDS (The Database)
This is where your user data and meal logs will live.

1.  **Navigate to RDS**: In the AWS Console search bar, type `RDS`.
2.  **Create Database**:
    *   Choose **Standard Create**.
    *   **Engine**: MySQL.
    *   **Templates**: **Free Tier** (This automatically selects the allowed `db.t3.micro`).
3.  **Settings**:
    *   **DB Instance Identifier**: `diet-diary-db`
    *   **Master Username**: `admin`
    *   **Master Password**: *[Set a strong one and save it!]*
4.  **Connectivity**:
    *   **VPC**: Use the Default VPC.
    *   **Public Access**: **No** (The EC2 instance will talk to it internally).
    *   **Security Group**: Choose "Create New" and name it `rds-sg`.
5.  **Additional Configuration (CRITICAL)**:
    *   **Initial Database Name**: `diet_diary`
    *   **Enhanced Monitoring**: **Uncheck** "Enable enhanced monitoring" (Forbidden in Lab).
6.  **Create**: Wait ~5 minutes for the status to show "Available".
7.  **Post-Setup**: Click on your DB, go to **Connectivity & security**, and copy the **Endpoint** (e.g., `diet-diary-db.xyz.us-east-1.rds.amazonaws.com`).

---

## 📦 Phase 2: Amazon S3 (Image Storage)
This is where food photos are stored.

1.  **Navigate to S3**: Search for `S3`.
2.  **Create Bucket**:
    *   **Bucket Name**: `diet-diary-photos-[your-name]` (Must be unique worldwide).
    *   **Region**: us-east-1.
3.  **Object Ownership**: ACLs disabled (recommended).
4.  **Block Public Access**: Keep **all** boxes checked (We will use Presigned URLs for security).
5.  **Create Bucket**.

---

## 🔐 Phase 3: AWS Secrets Manager (Config)
This centralizes your passwords so you don't leak them in code.

1.  **Navigate to Secrets Manager**: Search for `Secrets Manager`.
2.  **Store a new secret**:
    *   **Secret type**: "Other type of secret".
    *   **Key/Value pairs**:
        *   `DB_HOST`: *[Your RDS Endpoint]*
        *   `DB_USER`: `admin`
        *   `DB_PASSWORD`: *[Your RDS Password]*
        *   `DB_NAME`: `diet_diary`
        *   `S3_BUCKET_NAME`: *[Your S3 Bucket Name]*
        *   `SNS_TOPIC_ARN`: *[Leave blank for now, we'll edit later]*
    *   **Secret Name**: `DietDiary/Prod`
3.  **Finish**: Store the secret.

---

## 🔔 Phase 4: Amazon SNS (Notifications)
This sends alerts if calories are too high.

1.  **Navigate to SNS**: Search for `SNS`.
2.  **Create Topic**:
    *   **Type**: Standard.
    *   **Name**: `DietDiaryAlerts`.
3.  **Create Subscription**:
    *   Click on your new topic -> **Create Subscription**.
    *   **Protocol**: Email.
    *   **Endpoint**: Your own email address.
4.  **CONFIRMATION**: Check your email inbox. You **must** click the "Confirm Subscription" link sent by AWS.
5.  **Copy ARN**: Copy the Topic ARN (e.g., `arn:aws:sns:us-east-1:123:DietDiaryAlerts`) and update it in your **Secrets Manager** secret.

---

## 🕵️ Phase 5: Amazon Rekognition (AI)
No setup needed! This service is "Serverless." Once your `LabRole` is attached to EC2, the code can use it automatically.

---

## 💻 Phase 6: Amazon EC2 (The Server)
The "Brain" that runs your Node.js application.

1.  **Navigate to EC2**: Search for `EC2`.
2.  **Launch Instance**:
    *   **Name**: `DietDiaryServer`.
    *   **AMI**: Amazon Linux 2023.
    *   **Instance Type**: `t3.micro` (Allowed in Lab).
3.  **Key Pair**: Choose **`vockey`** (Pre-created for you).
4.  **Network Settings**:
    *   **Security Group**: Create a new one `web-sg`.
    *   **Rules**:
        *   Allow **SSH** (Port 22) from your IP.
        *   Allow **Custom TCP** (Port **3000**) from anywhere (to access the app).
5.  **Advanced Details (CRITICAL)**:
    *   **IAM Instance Profile**: Select **`LabInstanceProfile`**. This is what gives your code permission to talk to S3 and Rekognition.
6.  **Launch**.

---

## 🚀 Phase 7: Final Deployment
Once you SSH into your EC2 instance (using `vockey` and the guide's SSH instructions):

```bash
# 1. Update and install Node.js
sudo dnf update -y
sudo dnf install -y nodejs

# 2. Upload your code to EC2
# (Recommendation: Use SCP if on Windows or 'git clone' if you pushed to GitHub)

# 3. Inside your project folder:
npm install

# 4. Initialize Database (Creates tables in RDS)
node scripts/init-db.js

# 5. Start Server
npm start
```

---

## 💰 Budget Preservation Tips
*   **Stop** your EC2 and RDS instances when you are not working.
*   **Do not** enable "Multi-AZ" on RDS.
*   **Delete** old S3 photos if they accumulate.
