const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'eu-west-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB();

const createTables = async () => {
  try {
    console.log('🏗️  Setting up DynamoDB tables for Agatha Oeiras ceramics store...');

    // Create Products table
    const productsTableParams = {
      TableName: 'agatha-oeiras-products',
      KeySchema: [
        { AttributeName: 'id', KeyType: 'NUMBER' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'N' }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    };

    console.log('📦 Creating products table...');
    await dynamodb.createTable(productsTableParams).promise();
    console.log('✅ Products table created successfully');

    // Create Sessions table
    const sessionsTableParams = {
      TableName: 'agatha-oeiras-sessions',
      KeySchema: [
        { AttributeName: 'id', KeyType: 'STRING' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: {
        AttributeName: 'ttl',
        Enabled: true
      }
    };

    console.log('🔐 Creating sessions table...');
    await dynamodb.createTable(sessionsTableParams).promise();
    console.log('✅ Sessions table created successfully');

    // Wait for tables to be active
    console.log('⏳ Waiting for tables to be active...');
    await dynamodb.waitFor('tableExists', { TableName: 'agatha-oeiras-products' }).promise();
    await dynamodb.waitFor('tableExists', { TableName: 'agatha-oeiras-sessions' }).promise();

    console.log('🎉 All tables created successfully!');
    console.log('📋 Tables created:');
    console.log('   - agatha-oeiras-products');
    console.log('   - agatha-oeiras-sessions');

  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log('ℹ️  Tables already exist, skipping creation');
    } else {
      console.error('❌ Error creating tables:', error);
      process.exit(1);
    }
  }
};

const seedProducts = async () => {
  const { productsDB } = require('../config/dynamodb');
  
  const sampleProducts = [
    {
      id: 1,
      name: "House",
      price: 45,
      image: "/images/igreja.jpeg",
      description: "Hand-thrown ceramic bowl with a clean, minimalist design. Perfect for daily use.",
      category: "bowls"
    },
    {
      id: 2,
      name: "Organic Vase",
      price: 85,
      image: "/images/igreja.jpeg",
      description: "Sculptural ceramic vase with organic curves. A statement piece for any space.",
      category: "vases"
    },
    {
      id: 3,
      name: "Coffee Mug Set",
      price: 65,
      image: "/images/igreja.jpeg",
      description: "Set of two handcrafted coffee mugs. Each piece is unique and functional.",
      category: "mugs"
    },
    {
      id: 4,
      name: "Decorative Plate",
      price: 35,
      image: "/images/igreja.jpeg",
      description: "Artistic ceramic plate with subtle texture. Perfect for display or serving.",
      category: "plates"
    },
    {
      id: 5,
      name: "Tea Cup & Saucer",
      price: 55,
      image: "/images/igreja.jpeg",
      description: "Elegant tea cup and saucer set. Hand-glazed with a matte finish.",
      category: "cups"
    },
    {
      id: 6,
      name: "Large Serving Bowl",
      price: 95,
      image: "/images/igreja.jpeg",
      description: "Generous serving bowl perfect for salads, pasta, or decorative display.",
      category: "bowls"
    }
  ];

  try {
    console.log('🌱 Seeding products...');
    for (const product of sampleProducts) {
      await productsDB.create(product);
      console.log(`   ✅ Added ${product.name}`);
    }
    console.log('🎉 Products seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding products:', error);
  }
};

// Run setup
const main = async () => {
  await createTables();
  await seedProducts();
  console.log('🚀 DynamoDB setup complete!');
  process.exit(0);
};

main();

