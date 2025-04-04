# AWS Amplify Deployment Guide

This document provides instructions for deploying the HSIT mobile website to AWS Amplify.

## Prerequisites

- AWS IAM credentials (provided in the requirements)
- AWS CLI installed and configured
- Node.js and npm installed

## Deployment Steps

### 1. Install AWS Amplify CLI

```bash
npm install -g @aws-amplify/cli
```

### 2. Configure AWS Amplify

```bash
amplify configure
```

When prompted, use the following credentials:
- IAM Username: HSIT-Admin1
- IAM Password: !!AAmm!!2

### 3. Initialize Amplify in the Project

```bash
cd /path/to/project
amplify init
```

Use the following settings:
- Project name: hsit-mobile
- Environment: prod
- Default editor: Visual Studio Code (or your preferred editor)
- Type of app: javascript
- JavaScript framework: none
- Source directory path: /
- Distribution directory path: /
- Build command: npm run build
- Start command: npm start

### 4. Add Authentication

```bash
amplify add auth
```

Use the default configuration for Cognito user pool.

### 5. Add API

```bash
amplify add api
```

Choose REST API and configure it to connect to your backend.

### 6. Add Hosting

```bash
amplify add hosting
```

Choose "Hosting with Amplify Console" and "Manual deployment".

### 7. Deploy

```bash
amplify publish
```

This will deploy your application to AWS Amplify.

## Post-Deployment Configuration

After deployment, you'll need to:

1. Set up environment variables in the Amplify Console:
   - MONGODB_URI
   - JWT_SECRET
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_PHONE_NUMBER
   - ADMIN_EMAIL
   - ADMIN_PHONE

2. Configure the database connection in the Amplify Console.

3. Set up the domain and SSL certificate if needed.

## Accessing the Deployed Application

Once deployed, your application will be available at the URL provided by AWS Amplify. You can find this URL in the Amplify Console.

## Troubleshooting

If you encounter any issues during deployment:

1. Check the Amplify Console logs for error messages.
2. Verify that all environment variables are correctly set.
3. Ensure that the MongoDB connection is properly configured.
4. Check that the Twilio credentials are valid.

For additional support, contact the AWS support team or refer to the AWS Amplify documentation.
