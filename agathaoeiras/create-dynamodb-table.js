const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'eu-west-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB();

// Table configuration
const tableName = 'agatha-oeiras-products';

const tableParams = {
  TableName: tableName,
  KeySchema: [
    {
      AttributeName: 'id',
      KeyType: 'HASH' // Primary key
    }
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'id',
      AttributeType: 'N'
    }
  ],
  BillingMode: 'PAY_PER_REQUEST', // On-demand billing
  Tags: [
    {
      Key: 'Project',
      Value: 'Agatha Oeiras Ceramics'
    },
    {
      Key: 'Environment',
      Value: 'Development'
    }
  ]
};

async function createTable() {
  try {
    console.log('🔧 Creating DynamoDB table...');
    console.log(`📋 Table Name: ${tableName}`);
    console.log(`🌍 Region: ${AWS.config.region}`);
    
    // Check if table already exists
    try {
      const describeResult = await dynamodb.describeTable({ TableName: tableName }).promise();
      console.log('✅ Table already exists!');
      console.log(`📊 Table Status: ${describeResult.Table.TableStatus}`);
      console.log(`🔑 Primary Key: ${describeResult.Table.KeySchema[0].AttributeName}`);
      return;
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        console.log('📝 Table does not exist, creating new table...');
      } else {
        throw error;
      }
    }
    
    // Create the table
    const result = await dynamodb.createTable(tableParams).promise();
    console.log('✅ Table creation initiated!');
    console.log(`📊 Table Status: ${result.TableDescription.TableStatus}`);
    console.log(`🔑 Primary Key: ${result.TableDescription.KeySchema[0].AttributeName}`);
    
    // Wait for table to be active
    console.log('⏳ Waiting for table to become active...');
    await dynamodb.waitFor('tableExists', { TableName: tableName }).promise();
    console.log('🎉 Table is now active and ready to use!');
    
    // Add some sample data
    console.log('📦 Adding sample products...');
    await addSampleProducts();
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    if (error.code === 'ResourceInUseException') {
      console.log('ℹ️  Table already exists and is in use.');
    } else {
      console.error('💥 Failed to create table:', error.message);
    }
  }
}

async function addSampleProducts() {
  const docClient = new AWS.DynamoDB.DocumentClient();
  
  const sampleProducts = [
    {
      id: 1,
      name: 'Handcrafted Ceramic Bowl',
      price: 25.99,
      image: '/images/igreja.jpeg',
      description: 'Beautiful handcrafted ceramic bowl perfect for serving or decoration.',
      category: 'bowls'
    },
    {
      id: 2,
      name: 'Elegant Ceramic Vase',
      price: 45.50,
      image: '/images/igreja.jpeg',
      description: 'Stunning ceramic vase with traditional Portuguese patterns.',
      category: 'vases'
    },
    {
      id: 3,
      name: 'Artisan Coffee Mug',
      price: 18.75,
      image: '/images/igreja.jpeg',
      description: 'Handmade ceramic coffee mug with unique glazing.',
      category: 'mugs'
    }
  ];
  
  for (const product of sampleProducts) {
    try {
      await docClient.put({
        TableName: tableName,
        Item: product
      }).promise();
      console.log(`✅ Added product: ${product.name}`);
    } catch (error) {
      console.error(`❌ Failed to add product ${product.name}:`, error.message);
    }
  }
  
  console.log('🎉 Sample products added successfully!');
}

// Run the script
createTable();
