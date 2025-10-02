# AWS SES Email Setup Guide

This guide will help you set up AWS SES (Simple Email Service) to enable real email sending from the contact form.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured (optional but recommended)
- Domain name (for production) or email addresses for verification

## Step 1: Access AWS SES Console

1. Log in to your AWS Console
2. Navigate to **Simple Email Service (SES)**
3. Make sure you're in the correct region (eu-west-1 for this project)

## Step 2: Verify Email Addresses (Development)

For development/testing, you can verify individual email addresses:

### Verify Sender Email (FROM_EMAIL)
1. In SES Console, go to **Verified identities**
2. Click **Create identity**
3. Choose **Email address**
4. Enter your sender email: `noreply@agathaoeiras.com`
5. Click **Create identity**
6. Check your email and click the verification link

### Verify Recipient Email (TO_EMAIL)
1. Repeat the process for: `agathaabdala@hotmail.com`
2. Check the email and click the verification link

## Step 3: Verify Domain (Production - Recommended)

For production, it's better to verify your entire domain:

1. In SES Console, go to **Verified identities**
2. Click **Create identity**
3. Choose **Domain**
4. Enter your domain: `agathaoeiras.com`
5. Follow the DNS verification process
6. Add the required DNS records to your domain

## Step 4: Request Production Access (If Needed)

If you're in the SES sandbox (default for new accounts):

1. In SES Console, go to **Account dashboard**
2. Check your sending quota and reputation
3. If you see "Sandbox" status, click **Request production access**
4. Fill out the form explaining your use case
5. Wait for approval (usually 24-48 hours)

## Step 5: Test Email Sending

Once verification is complete, test the contact form:

```bash
# Test the contact form
curl -X POST http://localhost:3000/contact \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=Test User&email=test@example.com&message=Test message"
```

## Step 6: Monitor Email Sending

1. In SES Console, go to **Sending statistics**
2. Monitor bounce and complaint rates
3. Keep bounce rate below 5% and complaint rate below 0.1%

## Troubleshooting

### Common Issues

1. **"Email address is not verified"**
   - Solution: Verify both FROM_EMAIL and TO_EMAIL addresses in SES Console

2. **"MessageRejected: Email address not verified"**
   - Solution: Check that all email addresses are verified in the correct region

3. **"Account is in sandbox mode"**
   - Solution: Request production access or use verified email addresses

4. **"Daily sending quota exceeded"**
   - Solution: Request quota increase in SES Console

### Testing Commands

```bash
# Test SES configuration
node test-ses.js

# Test contact form
curl -X POST http://localhost:3000/contact \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=Test&email=test@example.com&message=Test"
```

## Environment Variables

Make sure your `.env` file contains:

```bash
# AWS Configuration
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Email Configuration
FROM_EMAIL=noreply@agathaoeiras.com
TO_EMAIL=agathaabdala@hotmail.com
```

## Security Best Practices

1. **Use IAM Roles** instead of access keys when possible
2. **Limit SES permissions** to only what's needed
3. **Monitor sending statistics** regularly
4. **Set up bounce and complaint handling**
5. **Use verified domains** for production

## Production Recommendations

1. **Verify your domain** instead of individual emails
2. **Set up SPF, DKIM, and DMARC** records
3. **Monitor reputation** and sending statistics
4. **Implement bounce handling** in your application
5. **Use dedicated IP** for high-volume sending

## Support

If you encounter issues:

1. Check AWS SES documentation
2. Review CloudWatch logs
3. Verify all email addresses are confirmed
4. Check your AWS account limits and quotas

---

**Note**: This setup is required for the contact form to send real emails. Without proper SES configuration, contact form submissions will be logged to the console only.
