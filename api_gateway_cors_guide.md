# API Gateway CORS Configuration Guide

## Overview

This guide will help you configure CORS (Cross-Origin Resource Sharing) on your AWS API Gateway to allow requests from your frontend application hosted at `hsitapp.link`.

The error you're seeing (`Origin https://www.hsitapp.link is not allowed by Access-Control-Allow-Origin`) occurs because your API Gateway is not configured to accept requests from your website domain.

## Step-by-Step Configuration

### 1. Log in to AWS Management Console

- Go to https://console.aws.amazon.com/
- Sign in with your AWS account credentials

### 2. Navigate to API Gateway

- In the AWS Management Console, search for "API Gateway" in the search bar
- Click on "API Gateway" in the search results

### 3. Select Your API

- From the list of APIs, select your API (the one with the ID `huqwwv8anj`)
- This should take you to the API Gateway console for your specific API

### 4. Enable CORS for Your API

#### Option A: Using the Console (Recommended for Beginners)

1. In the left navigation pane, click on "Resources"
2. Select the "/" resource (or the resource that contains all your API methods)
3. Click on "Actions" dropdown
4. Select "Enable CORS"
5. In the "Enable CORS" form:
   - For "Access-Control-Allow-Origin", enter `https://www.hsitapp.link`
   - Check "Access-Control-Allow-Credentials"
   - For "Access-Control-Allow-Headers", add:
     ```
     Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-auth-token,Origin
     ```
   - For "Access-Control-Allow-Methods", ensure all methods your API uses are selected (GET, POST, PUT, DELETE, OPTIONS)
6. Click "Enable CORS and replace existing CORS headers"
7. In the confirmation dialog, click "Yes, replace existing values"

#### Option B: Using AWS CLI (Advanced)

If you prefer using the AWS CLI, you can update the CORS configuration with the following commands:

```bash
# Get your API ID (replace with your actual API ID)
API_ID=huqwwv8anj

# Update CORS configuration
aws apigateway update-gateway-response \
  --rest-api-id $API_ID \
  --response-type DEFAULT_4XX \
  --response-parameters "gatewayresponse.header.Access-Control-Allow-Origin='https://www.hsitapp.link'" \
  --response-parameters "gatewayresponse.header.Access-Control-Allow-Credentials='true'"

aws apigateway update-gateway-response \
  --rest-api-id $API_ID \
  --response-type DEFAULT_5XX \
  --response-parameters "gatewayresponse.header.Access-Control-Allow-Origin='https://www.hsitapp.link'" \
  --response-parameters "gatewayresponse.header.Access-Control-Allow-Credentials='true'"
```

### 5. Deploy Your API

After enabling CORS, you need to deploy your API for the changes to take effect:

1. Click on "Actions" dropdown
2. Select "Deploy API"
3. In the "Deploy API" dialog:
   - For "Deployment stage", select your existing stage (likely "prod")
   - For "Deployment description", enter "CORS configuration update"
4. Click "Deploy"

### 6. Test Your CORS Configuration

After deploying your API with CORS enabled, you should test it:

1. Deploy the updated frontend code we've provided
2. Open your application in a browser
3. Open the browser's developer tools (F12 or right-click > Inspect)
4. Go to the Console tab
5. Try to sign up or log in
6. Check if there are any CORS-related errors

## Troubleshooting

If you still encounter CORS issues after following these steps:

1. **Check the Origin Header**: Ensure the Origin header in the API Gateway configuration exactly matches your website URL (including https:// and any www. prefix)

2. **Verify OPTIONS Method**: For each endpoint, ensure the OPTIONS method is properly configured to handle preflight requests

3. **Check Response Headers**: Verify that your API responses include the correct CORS headers:
   - Access-Control-Allow-Origin: https://www.hsitapp.link
   - Access-Control-Allow-Credentials: true
   - Access-Control-Allow-Methods: (methods your API supports)
   - Access-Control-Allow-Headers: (headers your API accepts)

4. **Clear Browser Cache**: Sometimes browsers cache CORS errors. Try clearing your browser cache or using an incognito/private window

5. **Check Lambda Functions**: If your API Gateway uses Lambda functions, ensure they also return the appropriate CORS headers

## Additional Resources

- [AWS Documentation: Enabling CORS for a REST API Resource](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)
- [AWS Documentation: Gateway Responses for CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-gatewayResponse-definition.html)
- [MDN Web Docs: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
