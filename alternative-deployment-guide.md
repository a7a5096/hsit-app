# Alternative Deployment Guide for HSIT Mobile Website

This guide provides alternative deployment options for the HSIT mobile website in case direct deployment through AWS Amplify CLI encounters issues.

## Option 1: AWS Amplify Console Deployment

### Prerequisites
- AWS account with the credentials provided
- The project files prepared for deployment

### Steps

1. **Prepare your project for deployment**
   - Ensure all files are in the correct structure
   - Create a zip file of the entire project

2. **Log in to AWS Amplify Console**
   - Go to https://console.aws.amazon.com/amplify/
   - Sign in with the provided credentials:
     - Username: HSIT-Admin1
     - Password: !!AAmm!!2
     - Or use the root account: hsit@notmailinator.com / HH$$iitt2

3. **Create a new app**
   - Click "New app" > "Host web app"
   - Select "Deploy without Git provider" option
   - Click "Continue"

4. **Upload your build**
   - Enter "HSIT-Investing" as the App name
   - Select "Drag and drop" or browse to upload your zip file
   - Click "Save and deploy"

5. **Configure environment variables**
   - After deployment starts, go to "Environment variables"
   - Add the following variables:
     ```
     MONGODB_URI=mongodb://localhost:27017/hsit
     JWT_SECRET=your_jwt_secret
     TWILIO_ACCOUNT_SID=your_twilio_sid
     TWILIO_AUTH_TOKEN=your_twilio_token
     TWILIO_PHONE_NUMBER=your_twilio_phone
     ADMIN_EMAIL=a7a5096@googlemail.com
     ADMIN_PHONE=931-321-0988
     UBT_INITIAL_EXCHANGE_RATE=1
     UBT_RATE_INCREASE=0.04
     UBT_BUY_RATE_FACTOR=0.98
     ```

## Option 2: Manual Deployment to Amazon S3 + API Gateway

### Prerequisites
- AWS account with the credentials provided
- AWS CLI installed and configured

### Steps

1. **Deploy the frontend to S3**
   ```bash
   # Create an S3 bucket
   aws s3 mb s3://hsit-investing-app
   
   # Enable website hosting
   aws s3 website s3://hsit-investing-app --index-document index.html --error-document index.html
   
   # Set bucket policy for public access
   aws s3api put-bucket-policy --bucket hsit-investing-app --policy file://bucket-policy.json
   
   # Upload files
   aws s3 sync ./project s3://hsit-investing-app --exclude "backend/*" --exclude "node_modules/*"
   ```

2. **Deploy the backend to AWS Lambda + API Gateway**
   ```bash
   # Package the backend
   cd project
   zip -r ../backend.zip backend package.json package-lock.json
   
   # Create Lambda function
   aws lambda create-function \
     --function-name hsit-api \
     --runtime nodejs16.x \
     --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
     --handler backend/server.lambda.js \
     --zip-file fileb://../backend.zip
   
   # Create API Gateway
   aws apigateway create-rest-api --name hsit-api
   ```

3. **Connect frontend to backend**
   - Update API endpoint in frontend configuration

## Option 3: Deploy to Netlify (Frontend) + Heroku (Backend)

### Prerequisites
- Netlify account
- Heroku account

### Steps

1. **Deploy frontend to Netlify**
   - Sign up for Netlify
   - Drag and drop the project folder (excluding backend)
   - Configure custom domain if needed

2. **Deploy backend to Heroku**
   ```bash
   # Install Heroku CLI
   npm install -g heroku
   
   # Login to Heroku
   heroku login
   
   # Create a new Heroku app
   heroku create hsit-api
   
   # Add MongoDB addon
   heroku addons:create mongodb:sandbox
   
   # Set environment variables
   heroku config:set JWT_SECRET=your_jwt_secret
   heroku config:set TWILIO_ACCOUNT_SID=your_twilio_sid
   heroku config:set TWILIO_AUTH_TOKEN=your_twilio_token
   heroku config:set TWILIO_PHONE_NUMBER=your_twilio_phone
   heroku config:set ADMIN_EMAIL=a7a5096@googlemail.com
   heroku config:set ADMIN_PHONE=931-321-0988
   heroku config:set UBT_INITIAL_EXCHANGE_RATE=1
   heroku config:set UBT_RATE_INCREASE=0.04
   heroku config:set UBT_BUY_RATE_FACTOR=0.98
   
   # Deploy to Heroku
   git subtree push --prefix backend heroku main
   ```

3. **Update frontend API endpoint**
   - Update API endpoint in frontend configuration to point to Heroku

## Troubleshooting

### AWS Amplify CLI Issues
- If encountering "Invalid security token" errors, try using the AWS Management Console directly
- Verify IAM permissions for the provided credentials
- Check if MFA is required for the account

### Deployment Failures
- Verify all required files are included in the deployment package
- Check for syntax errors in configuration files
- Ensure environment variables are correctly set

### Backend Connection Issues
- Verify CORS settings are properly configured
- Check API endpoint URLs in frontend code
- Test API endpoints independently using tools like Postman

For additional support, contact the AWS support team or refer to the AWS documentation.
