const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'eu-west-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB();

const tableName = 'agatha-oeiras-about';

async function createAboutTable() {
  try {
    console.log('Creating about page content table...');
    
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
          AttributeType: 'S'
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    };

    const result = await dynamodb.createTable(tableParams).promise();
    console.log('✅ About table created successfully:', result.TableDescription.TableName);
    
    // Wait for table to be active
    console.log('Waiting for table to be active...');
    await dynamodb.waitFor('tableExists', { TableName: tableName }).promise();
    console.log('✅ Table is now active');
    
    // Insert default about content
    await insertDefaultAboutContent();
    
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log('✅ About table already exists');
      await insertDefaultAboutContent();
    } else {
      console.error('❌ Error creating about table:', error);
    }
  }
}

async function insertDefaultAboutContent() {
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    
    const defaultContent = {
      id: 'about-content',
      heroTitle: 'About Our Ceramics',
      heroSubtitle: 'Discover the story behind our handcrafted pieces',
      philosophyTitle: 'Our Philosophy',
      philosophyContent: 'We believe that the objects we use daily should be beautiful, functional, and made with care. Our ceramics are created using traditional techniques passed down through generations, combined with a modern minimalist aesthetic.',
      philosophyContent2: 'Each piece tells a story of craftsmanship and attention to detail.',
      processTitle: 'Our Process',
      processContent: 'From selecting the finest clay to the final firing, every step in our process is carefully considered. We use sustainable practices and locally sourced materials whenever possible.',
      processImageAlt: 'Ceramic making process',
      valuesTitle: 'Our Values',
      qualityTitle: 'Quality',
      qualityContent: 'We never compromise on quality. Every piece is carefully inspected and finished to the highest standards.',
      sustainabilityTitle: 'Sustainability',
      sustainabilityContent: 'We are committed to sustainable practices, using eco-friendly materials and processes.',
      authenticityTitle: 'Authenticity',
      authenticityContent: 'Each piece is handcrafted, making it unique and authentic - no mass production here.',
      updatedAt: new Date().toISOString()
    };
    
    const params = {
      TableName: tableName,
      Item: defaultContent
    };
    
    await docClient.put(params).promise();
    console.log('✅ Default about content inserted successfully');
    
  } catch (error) {
    console.error('❌ Error inserting default about content:', error);
  }
}

// Run the script
createAboutTable()
  .then(() => {
    console.log('🎉 About table setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
