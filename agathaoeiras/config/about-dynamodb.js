const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'eu-west-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = 'agatha-oeiras-about';

// Fallback in-memory storage for about content
let fallbackAboutContent = {
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
  authenticityContent: 'Each piece is handcrafted, making it unique and authentic - no mass production here.'
};

class AboutContentDB {
  async getAboutContent() {
    try {
      const params = {
        TableName: tableName,
        Key: {
          id: 'about-content'
        }
      };

      const result = await docClient.get(params).promise();
      
      if (result.Item) {
        return result.Item;
      } else {
        console.log('No about content found, using fallback');
        return fallbackAboutContent;
      }
    } catch (error) {
      console.error('Error getting about content from DynamoDB:', error);
      console.log('Using fallback about content');
      return fallbackAboutContent;
    }
  }

  async updateAboutContent(content) {
    try {
      const params = {
        TableName: tableName,
        Item: {
          id: 'about-content',
          ...content,
          updatedAt: new Date().toISOString()
        }
      };

      await docClient.put(params).promise();
      console.log('About content updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating about content in DynamoDB:', error);
      // Update fallback content
      Object.assign(fallbackAboutContent, content);
      return false;
    }
  }
}

module.exports = new AboutContentDB();
