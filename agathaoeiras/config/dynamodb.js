const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'eu-west-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Table names
const PRODUCTS_TABLE = 'agatha-oeiras-products';
const SESSIONS_TABLE = 'agatha-oeiras-sessions';

// Products table operations
const productsDB = {
  // Get all products
  async getAll() {
    const params = {
      TableName: PRODUCTS_TABLE
    };
    try {
      const result = await dynamodb.scan(params).promise();
      return result.Items || [];
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  },

  // Get product by ID
  async getById(id) {
    const params = {
      TableName: PRODUCTS_TABLE,
      Key: { id: parseInt(id) }
    };
    try {
      const result = await dynamodb.get(params).promise();
      return result.Item;
    } catch (error) {
      console.error('Error getting product:', error);
      return null;
    }
  },

  // Create new product
  async create(product) {
    const params = {
      TableName: PRODUCTS_TABLE,
      Item: product
    };
    try {
      await dynamodb.put(params).promise();
      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  // Update product
  async update(id, product) {
    const params = {
      TableName: PRODUCTS_TABLE,
      Key: { id: parseInt(id) },
      UpdateExpression: 'SET #name = :name, #price = :price, #image = :image, #images = :images, #description = :description, #productDetails = :productDetails',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#price': 'price',
        '#image': 'image',
        '#images': 'images',
        '#description': 'description',
        '#productDetails': 'productDetails'
      },
      ExpressionAttributeValues: {
        ':name': product.name,
        ':price': product.price,
        ':image': product.image,
        ':images': product.images || [],
        ':description': product.description,
        ':productDetails': product.productDetails || ''
      },
      ReturnValues: 'ALL_NEW'
    };
    try {
      const result = await dynamodb.update(params).promise();
      return result.Attributes;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Delete product
  async delete(id) {
    const params = {
      TableName: PRODUCTS_TABLE,
      Key: { id: parseInt(id) }
    };
    try {
      await dynamodb.delete(params).promise();
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  // Get next ID
  async getNextId() {
    try {
      const products = await this.getAll();
      if (products.length === 0) return 1;
      const maxId = Math.max(...products.map(p => p.id));
      return maxId + 1;
    } catch (error) {
      console.error('Error getting next ID:', error);
      return 1;
    }
  }
};

// Sessions table operations
const sessionsDB = {
  // Get session
  async get(sessionId) {
    const params = {
      TableName: SESSIONS_TABLE,
      Key: { id: sessionId }
    };
    try {
      const result = await dynamodb.get(params).promise();
      return result.Item;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  // Set session
  async set(sessionId, sessionData, ttl) {
    const params = {
      TableName: SESSIONS_TABLE,
      Item: {
        id: sessionId,
        data: sessionData,
        ttl: ttl
      }
    };
    try {
      await dynamodb.put(params).promise();
      return true;
    } catch (error) {
      console.error('Error setting session:', error);
      throw error;
    }
  },

  // Delete session
  async delete(sessionId) {
    const params = {
      TableName: SESSIONS_TABLE,
      Key: { id: sessionId }
    };
    try {
      await dynamodb.delete(params).promise();
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }
};

module.exports = {
  productsDB,
  sessionsDB,
  PRODUCTS_TABLE,
  SESSIONS_TABLE
};

