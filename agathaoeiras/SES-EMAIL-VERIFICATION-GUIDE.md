# AWS SES Email Verification Guide

## Current Issue
The contact form is not sending emails because the email addresses are not verified in AWS SES. You need to verify both the sender and recipient email addresses.

## Step-by-Step Verification Process

### 1. Access AWS SES Console
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Make sure you're in the **eu-west-1** region (Ireland)
3. Search for "SES" or go to **Simple Email Service**

### 2. Verify Sender Email (FROM_EMAIL)
1. In SES Console, click **"Verified identities"** in the left sidebar
2. Click **"Create identity"**
3. Choose **"Email address"**
4. Enter: `noreply@agathaoeiras.com`
5. Click **"Create identity"**
6. **Check your email inbox** for a verification email from AWS
7. **Click the verification link** in the email

### 3. Verify Recipient Email (TO_EMAIL)
1. Repeat the same process for: `agathaabdala@hotmail.com`
2. **Check the hotmail inbox** for the verification email
3. **Click the verification link**

### 4. Check Verification Status
1. Go back to **"Verified identities"**
2. You should see both emails listed with **"Verified"** status
3. If they show **"Pending verification"**, check your email again

## Alternative: Use Your Own Email Addresses

If you want to use different email addresses:

1. **Update the .env file** with your preferred emails:
   ```bash
   FROM_EMAIL=your-email@yourdomain.com
   TO_EMAIL=your-email@yourdomain.com
   ```

2. **Verify those email addresses** in AWS SES Console

## Testing After Verification

Once both emails are verified:

1. **Test the contact form** at `http://localhost:3000/contact`
2. **Fill out the form** with test data
3. **Submit** - you should receive a real email!
4. **Check the server logs** - should show "Email sent successfully"

## Troubleshooting

### If you don't receive verification emails:
1. **Check spam/junk folder**
2. **Wait a few minutes** - AWS emails can be delayed
3. **Try a different email address** if needed

### If verification fails:
1. **Make sure you're in the correct AWS region** (eu-west-1)
2. **Check your AWS account permissions**
3. **Try using a different email service** (Gmail, Outlook, etc.)

### If you're in SES Sandbox:
1. **Check your sending quota** in SES Console
2. **Request production access** if needed
3. **Use verified email addresses only**

## Quick Test Commands

```bash
# Test contact form
curl -X POST http://localhost:3000/contact \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=Test User&email=test@example.com&message=Test message"

# Check server logs for email status
tail -f server.log
```

## Expected Behavior After Verification

✅ **Before verification**: Contact form shows error, emails logged to console
✅ **After verification**: Contact form sends real emails to `agathaabdala@hotmail.com`

## Need Help?

If you're still having issues:
1. **Check AWS SES Console** for any error messages
2. **Verify you're in the correct region** (eu-west-1)
3. **Make sure both email addresses are verified**
4. **Check your AWS account has SES permissions**

---

**Important**: Without email verification, the contact form will only log submissions to the console and not send actual emails.
