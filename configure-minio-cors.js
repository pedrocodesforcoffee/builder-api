const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'testtest123'
  },
  forcePathStyle: true
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: ['http://localhost:3001', 'http://localhost:3000'],
      ExposeHeaders: ['ETag', 'x-amz-request-id'],
      MaxAgeSeconds: 3000
    }
  ]
};

(async () => {
  try {
    // Configure CORS for quarantine bucket
    await client.send(new PutBucketCorsCommand({
      Bucket: 'builder-uploads-quarantine',
      CORSConfiguration: corsConfiguration
    }));
    console.log('✓ CORS configured for builder-uploads-quarantine');
    
    // Configure CORS for production bucket
    await client.send(new PutBucketCorsCommand({
      Bucket: 'builder-documents-local',
      CORSConfiguration: corsConfiguration
    }));
    console.log('✓ CORS configured for builder-documents-local');
    
    console.log('\nCORS rules applied:');
    console.log('- Allowed origins: http://localhost:3001, http://localhost:3000');
    console.log('- Allowed methods: GET, PUT, POST, DELETE, HEAD');
    console.log('- Allowed headers: *');
    console.log('- Exposed headers: ETag, x-amz-request-id');
  } catch (error) {
    console.error('Error:', error.message);
    if (error.$metadata) {
      console.error('Status:', error.$metadata.httpStatusCode);
    }
  }
})();
