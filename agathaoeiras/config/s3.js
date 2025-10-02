const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const path = require('path');

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'agatha-oeiras-images';
const BUCKET_REGION = process.env.AWS_REGION || 'eu-west-1';

// Configure multer for memory storage (we'll upload directly to S3)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    // Additional security checks
    if (!file.originalname || file.originalname.length > 255) {
      return cb(new Error('Invalid filename'));
    }
    
    // Check for suspicious file extensions
    const suspiciousExtensions = /\.(exe|bat|cmd|scr|pif|vbs|js|jar|php|asp|jsp)$/i;
    if (suspiciousExtensions.test(file.originalname)) {
      return cb(new Error('File type not allowed for security reasons'));
    }
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

// Generate unique filename
const generateFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalName);
  return `products/${timestamp}-${randomString}${extension}`;
};

// Upload file to S3
const uploadToS3 = async (file, folder = 'products') => {
  try {
    const fileName = generateFileName(file.originalname);
    const key = `${folder}/${fileName}`;
    
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256'
    };
    
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    
    // Return the public URL
    const publicUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${key}`;
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

// Upload multiple files to S3
const uploadMultipleToS3 = async (files, folder = 'products') => {
  try {
    const uploadPromises = files.map(file => uploadToS3(file, folder));
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('Error uploading multiple files to S3:', error);
    throw error;
  }
};

// Delete file from S3
const deleteFromS3 = async (imageUrl) => {
  try {
    // Extract key from URL
    const urlParts = imageUrl.split('/');
    const key = urlParts.slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/
    
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key
    };
    
    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
};

// Get signed URL for private access (if needed)
const getSignedUrlForImage = async (imageUrl, expiresIn = 3600) => {
  try {
    const urlParts = imageUrl.split('/');
    const key = urlParts.slice(3).join('/');
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

module.exports = {
  s3Client,
  upload,
  uploadToS3,
  uploadMultipleToS3,
  deleteFromS3,
  getSignedUrlForImage,
  BUCKET_NAME,
  BUCKET_REGION
};
