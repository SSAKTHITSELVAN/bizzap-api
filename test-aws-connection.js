// test-aws-connection.js
// Run this script to test your AWS S3 connection

const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

async function testS3Connection() {
  try {
    console.log('🔧 Testing AWS S3 connection...');
    console.log('📍 Region:', process.env.AWS_REGION);
    console.log('🪣 Bucket:', process.env.AWS_S3_BUCKET_NAME);
    
    // Test 1: List bucket contents (should work even if empty)
    const listResult = await s3.listObjectsV2({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      MaxKeys: 1
    }).promise();
    
    console.log('✅ Successfully connected to S3!');
    console.log('📁 Bucket exists and is accessible');
    
    // Test 2: Try to upload a small test file
    const testKey = 'test/connection-test.txt';
    const testContent = 'Bizzap Chat S3 Connection Test - ' + new Date().toISOString();
    
    await s3.upload({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    }).promise();
    
    console.log('✅ Successfully uploaded test file');
    
    // Test 3: Generate signed URL
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: testKey,
      Expires: 60 // 1 minute
    });
    
    console.log('✅ Successfully generated signed URL');
    console.log('🔗 Test file URL:', signedUrl);
    
    // Test 4: Delete test file
    await s3.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: testKey
    }).promise();
    
    console.log('✅ Successfully deleted test file');
    console.log('🎉 All tests passed! Your AWS S3 setup is working correctly.');
    
  } catch (error) {
    console.error('❌ AWS S3 connection failed:');
    console.error('Error message:', error.message);
    
    if (error.code === 'InvalidAccessKeyId') {
      console.error('🔑 Check your AWS_ACCESS_KEY_ID in .env file');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('🔐 Check your AWS_SECRET_ACCESS_KEY in .env file');
    } else if (error.code === 'NoSuchBucket') {
      console.error('🪣 Check your AWS_S3_BUCKET_NAME in .env file');
    } else if (error.code === 'AccessDenied') {
      console.error('🚫 Check your IAM user permissions');
    }
    
    console.error('\n📋 Troubleshooting checklist:');
    console.error('1. Verify .env file has correct AWS credentials');
    console.error('2. Ensure S3 bucket name is correct and exists');
    console.error('3. Check IAM user has proper S3 permissions');
    console.error('4. Verify AWS region is correct');
  }
}

// Run the test
testS3Connection();