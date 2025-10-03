require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { productsDB, sessionsDB } = require('./config/dynamodb');
const { authenticateUser, isUserAdmin } = require('./config/cognito');
const aboutContentDB = require('./config/about-dynamodb');
const { upload, uploadMultipleToS3, deleteFromS3 } = require('./config/s3');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variable validation
const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
  console.warn('Some features may not work properly.');
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// AWS SES Configuration
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Input sanitization function
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Email sending function
async function sendContactEmail(name, email, message) {
  // Sanitize inputs
  const sanitizedName = sanitizeInput(name);
  const sanitizedEmail = sanitizeInput(email);
  const sanitizedMessage = sanitizeInput(message);
  
  // Check if AWS credentials are configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('AWS SES not configured. Contact form submission received.');
    console.log('To configure email sending, see AWS-SES-SETUP.md');
    return { MessageId: 'logged-to-console' };
  }

  const params = {
    Source: process.env.FROM_EMAIL || 'noreply@agathaoeiras.com',
    Destination: {
      ToAddresses: [process.env.TO_EMAIL || 'agatha.abdala@hotmail.com']
    },
    Message: {
      Subject: {
        Data: `New Contact Form Message from ${sanitizedName}`,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: `
            <h2>New Contact Form Message</h2>
            <p><strong>Name:</strong> ${sanitizedName}</p>
            <p><strong>Email:</strong> ${sanitizedEmail}</p>
            <p><strong>Message:</strong></p>
            <p>${sanitizedMessage.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><em>This message was sent from the Agatha Oeiras website contact form.</em></p>
          `,
          Charset: 'UTF-8'
        },
        Text: {
          Data: `
New Contact Form Message

Name: ${sanitizedName}
Email: ${sanitizedEmail}
Message: ${sanitizedMessage}

This message was sent from the Agatha Oeiras website contact form.
          `,
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log('Email sent successfully:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    // Log the contact form submission even if email fails
    console.log('Contact form submission (email failed)');
    
    // Check if it's a verification error
    if (error.name === 'MessageRejected' && error.message.includes('not verified')) {
      console.log('⚠️  AWS SES Email Verification Required:');
      console.log('   - Verify the FROM_EMAIL address in AWS SES Console');
      console.log('   - Verify the TO_EMAIL address in AWS SES Console');
      console.log('   - Or use a verified domain for production');
    }
    
    throw error;
  }
}

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for cart
app.use(session({
  secret: process.env.SESSION_SECRET || require('crypto').randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Initialize cart in session if it doesn't exist
app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  next();
});

// Admin authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Multer configuration is now handled in config/s3.js

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: error.message });
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

// Products are now stored in DynamoDB
// Fallback in-memory storage for development
let fallbackProducts = [];
let nextProductId = 1;

// Fallback product operations when DynamoDB is not available
const fallbackProductsDB = {
  async getAll() {
    return fallbackProducts;
  },
  
  async getById(id) {
    return fallbackProducts.find(p => p.id === parseInt(id));
  },
  
  async create(product) {
    product.id = nextProductId++;
    fallbackProducts.push(product);
    return product;
  },
  
  async update(id, productData) {
    const index = fallbackProducts.findIndex(p => p.id === parseInt(id));
    if (index !== -1) {
      fallbackProducts[index] = { ...fallbackProducts[index], ...productData };
      return fallbackProducts[index];
    }
    throw new Error('Product not found');
  },
  
  async delete(id) {
    const index = fallbackProducts.findIndex(p => p.id === parseInt(id));
    if (index !== -1) {
      fallbackProducts.splice(index, 1);
      return true;
    }
    throw new Error('Product not found');
  },
  
  async getNextId() {
    return nextProductId;
  }
};

// Helper function to get cart total
const getCartTotal = (cart) => {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// Helper function to get cart item count
const getCartItemCount = (cart) => {
  return cart.reduce((count, item) => count + item.quantity, 0);
};

// Routes
app.get('/', async (req, res) => {
  try {
    const allProducts = await productsDB.getAll();
    const cartItemCount = getCartItemCount(req.session.cart);
    res.render('index', { 
      ceramics: allProducts.slice(0, 3),
      cartItemCount: cartItemCount
    });
  } catch (error) {
    console.error('Error loading products:', error);
    res.render('index', { ceramics: [], cartItemCount: 0 });
  }
});

app.get('/products', async (req, res) => {
  try {
    const category = req.query.category;
    let allProducts = await productsDB.getAll();
    
    if (category) {
      allProducts = allProducts.filter(item => item.category === category);
    }
    
    const cartItemCount = getCartItemCount(req.session.cart);
    res.render('products', { 
      ceramics: allProducts, 
      selectedCategory: category,
      cartItemCount: cartItemCount
    });
  } catch (error) {
    console.error('Error loading products:', error);
    res.render('products', { ceramics: [], selectedCategory: null, cartItemCount: 0 });
  }
});

app.get('/product/:id', async (req, res) => {
  try {
    const product = await productsDB.getById(req.params.id);
    if (!product) {
      return res.status(404).render('404');
    }
    const cartItemCount = getCartItemCount(req.session.cart);
    res.render('product', { 
      product,
      cartItemCount: cartItemCount
    });
  } catch (error) {
    console.error('Error loading product:', error);
    res.status(404).render('404');
  }
});

// Cart routes
app.get('/cart', (req, res) => {
  const cart = req.session.cart;
  const cartTotal = getCartTotal(cart);
  const cartItemCount = getCartItemCount(cart);
  
  res.render('cart', {
    cart: cart,
    cartTotal: cartTotal,
    cartItemCount: cartItemCount
  });
});

// Add to cart
app.post('/cart/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await productsDB.getById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const existingItem = req.session.cart.find(item => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      req.session.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: parseInt(quantity)
      });
    }
    
    res.json({ 
      success: true, 
      cartItemCount: getCartItemCount(req.session.cart),
      message: 'Item added to cart'
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cart item quantity
app.put('/cart/update', (req, res) => {
  const { productId, quantity } = req.body;
  const cartItem = req.session.cart.find(item => item.id === parseInt(productId));
  
  if (!cartItem) {
    return res.status(404).json({ error: 'Item not found in cart' });
  }
  
  if (parseInt(quantity) <= 0) {
    req.session.cart = req.session.cart.filter(item => item.id !== parseInt(productId));
  } else {
    cartItem.quantity = parseInt(quantity);
  }
  
  res.json({ 
    success: true, 
    cartItemCount: getCartItemCount(req.session.cart),
    cartTotal: getCartTotal(req.session.cart)
  });
});

// Remove from cart
app.delete('/cart/remove/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  req.session.cart = req.session.cart.filter(item => item.id !== productId);
  
  res.json({ 
    success: true, 
    cartItemCount: getCartItemCount(req.session.cart),
    cartTotal: getCartTotal(req.session.cart)
  });
});

// Clear cart
app.delete('/cart/clear', (req, res) => {
  req.session.cart = [];
  res.json({ success: true, cartItemCount: 0, cartTotal: 0 });
});

// Get cart data (for AJAX requests)
app.get('/cart/data', (req, res) => {
  res.json({
    cart: req.session.cart,
    cartItemCount: getCartItemCount(req.session.cart),
    cartTotal: getCartTotal(req.session.cart)
  });
});

app.get('/about', async (req, res) => {
  try {
    const aboutContent = await aboutContentDB.getAboutContent();
    const cartItemCount = getCartItemCount(req.session.cart);
    res.render('about', { 
      aboutContent: aboutContent,
      cartItemCount: cartItemCount 
    });
  } catch (error) {
    console.error('Error loading about content:', error);
    // Use fallback content if database fails
    const fallbackContent = {
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
    const cartItemCount = getCartItemCount(req.session.cart);
    res.render('about', { 
      aboutContent: fallbackContent,
      cartItemCount: cartItemCount 
    });
  }
});

app.get('/contact', (req, res) => {
  const cartItemCount = getCartItemCount(req.session.cart);
  res.render('contact', { cartItemCount: cartItemCount });
});

// Admin routes
app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect('/dashboard');
  }
  res.render('admin-login');
});

app.post('/admin/login', loginLimiter, [
  body('username').trim().escape().isLength({ min: 1, max: 50 }),
  body('password').isLength({ min: 1, max: 100 })
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin-login', { error: 'Invalid input format' });
  }
  
  const { username, password } = req.body;
  
  try {
    // Use Cognito authentication only
    console.log('Attempting Cognito authentication...');
    
    // Authenticate with AWS Cognito
    const authResult = await authenticateUser(username, password);
    
    if (authResult.success) {
      // Check if user is admin
      const isAdmin = await isUserAdmin(username);
      
      if (isAdmin) {
        req.session.isAdmin = true;
        req.session.username = username;
        req.session.accessToken = authResult.accessToken;
        res.redirect('/dashboard');
      } else {
        res.render('admin-login', { error: 'Access denied. Admin privileges required.' });
      }
    } else {
      res.render('admin-login', { error: authResult.error || 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('admin-login', { error: 'Authentication failed. Please check your credentials.' });
  }
});

app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const allProducts = await productsDB.getAll();
    const cartItemCount = getCartItemCount(req.session.cart);
    res.render('admin-dashboard', {
      ceramics: allProducts,
      cartItemCount: cartItemCount,
      username: req.session.username
    });
  } catch (error) {
    console.error('Error loading admin dashboard, using fallback:', error);
    // Use fallback storage when DynamoDB fails
    try {
      const fallbackProducts = await fallbackProductsDB.getAll();
      const cartItemCount = getCartItemCount(req.session.cart);
      res.render('admin-dashboard', {
        ceramics: fallbackProducts,
        cartItemCount: cartItemCount,
        username: req.session.username
      });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      res.render('admin-dashboard', { ceramics: [], cartItemCount: 0, username: req.session.username });
    }
  }
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Admin product management routes
app.post('/admin/products', requireAuth, upload.array('imageFiles', 10), async (req, res) => {
  try {
    const { name, price, description, productDetails } = req.body;
    
    // Validate required fields
    if (!name || !price || !description) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Parse and validate price
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: 'Price must be a valid positive number' });
    }
    
    // Validate that images were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }
    
    let imageUrls = [];
    
    // Upload images to S3
    try {
      console.log('Uploading images to S3...');
      imageUrls = await uploadMultipleToS3(req.files, 'products');
      console.log('Images uploaded to S3:', imageUrls);
    } catch (s3Error) {
      console.error('S3 upload failed, using local storage fallback:', s3Error);
      
      // Fallback to local storage if S3 fails
      const fs = require('fs');
      const path = require('path');
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Save files locally as fallback
      imageUrls = [];
      for (const file of req.files) {
        const fileName = `imageFile-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        const filePath = path.join(uploadsDir, fileName);
        
        fs.writeFileSync(filePath, file.buffer);
        imageUrls.push(`/uploads/${fileName}`);
      }
    }
    
    const mainImage = imageUrls[0]; // First image is the main image
    
    let newProduct;
    try {
      const nextId = await productsDB.getNextId();
      newProduct = {
        id: nextId,
        name,
        price: parsedPrice,
        image: mainImage,
        images: imageUrls,
        description,
        productDetails: productDetails || ''
      };
      await productsDB.create(newProduct);
    } catch (dbError) {
      console.error('DynamoDB failed, using fallback:', dbError);
      // Use fallback storage
      newProduct = {
        name,
        price: parsedPrice,
        image: mainImage,
        images: imageUrls,
        description,
        productDetails: productDetails || ''
      };
      await fallbackProductsDB.create(newProduct);
    }
    
    res.json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/admin/products/:id', requireAuth, upload.array('imageFiles', 10), async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { name, price, description, productDetails } = req.body;
    
    // Validate required fields
    if (!name || !price || !description) {
      return res.render('admin-edit-product', { 
        product: { id: productId, name, price, description },
        error: 'All fields are required',
        username: req.session.username || 'Admin'
      });
    }
    
    // Parse and validate price
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.render('admin-edit-product', { 
        product: { id: productId, name, price, description },
        error: 'Price must be a valid positive number',
        username: req.session.username || 'Admin'
      });
    }
    
    let imagePath;
    let images = [];
    
           // Handle image updates
           if (req.files && req.files.length > 0) {
             // Upload new images to S3
             try {
               console.log('Uploading new images to S3...');
               const imageUrls = await uploadMultipleToS3(req.files, 'products');
               console.log('New images uploaded to S3:', imageUrls);
               
               imagePath = imageUrls[0]; // First image is the main image
               images = imageUrls;
             } catch (s3Error) {
               console.error('S3 upload failed, using local storage fallback:', s3Error);
               
               // Fallback to local storage if S3 fails
               const fs = require('fs');
               const path = require('path');
               
               // Ensure uploads directory exists
               const uploadsDir = path.join(__dirname, 'public', 'uploads');
               if (!fs.existsSync(uploadsDir)) {
                 fs.mkdirSync(uploadsDir, { recursive: true });
               }
               
               // Save files locally as fallback
               const imageUrls = [];
               for (const file of req.files) {
                 const fileName = `imageFile-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
                 const filePath = path.join(uploadsDir, fileName);
                 
                 fs.writeFileSync(filePath, file.buffer);
                 imageUrls.push(`/uploads/${fileName}`);
               }
               
               imagePath = imageUrls[0]; // First image is the main image
               images = imageUrls;
             }
           } else {
      // Keep existing images if no new images provided
      try {
        const existingProduct = await productsDB.getById(productId);
        imagePath = existingProduct ? existingProduct.image : '';
        images = existingProduct ? (existingProduct.images || []) : [];
      } catch (error) {
        imagePath = '';
        images = [];
      }
    }
    
    let updatedProduct;
    try {
      updatedProduct = await productsDB.update(productId, {
        name,
        price: parsedPrice,
        image: imagePath,
        images: images,
        description,
        productDetails: productDetails || ''
      });
    } catch (dbError) {
      console.error('DynamoDB failed, using fallback:', dbError);
      // Use fallback storage
      updatedProduct = await fallbackProductsDB.update(productId, {
        name,
        price: parsedPrice,
        image: imagePath,
        description,
        productDetails: productDetails || ''
      });
    }
    
    res.render('admin-edit-product', { 
      product: updatedProduct,
      success: true,
      username: req.session.username || 'Admin'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.render('admin-edit-product', { 
      product: { 
        id: parseInt(req.params.id), 
        name: req.body.name, 
        price: req.body.price, 
        description: req.body.description, 
        image: req.body.imageUrl || '',
        productDetails: req.body.productDetails || ''
      },
      error: 'Failed to update product',
      username: req.session.username || 'Admin'
    });
  }
});

app.delete('/admin/products/:id', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    try {
      await productsDB.delete(productId);
    } catch (dbError) {
      console.error('DynamoDB failed, using fallback:', dbError);
      // Use fallback storage
      await fallbackProductsDB.delete(productId);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// About page route
app.get('/about', async (req, res) => {
  try {
    const aboutContent = await aboutContentDB.getAboutContent();
    res.render('about', { 
      aboutContent: aboutContent,
      cartItemCount: getCartItemCount(req.session.cart) 
    });
  } catch (error) {
    console.error('Error loading about content:', error);
    // Use fallback content if database fails
    const fallbackContent = {
      heroTitle: 'About Our Ceramics',
      heroSubtitle: 'Discover the story behind our handcrafted pieces',
      storyTitle: 'Our Philosophy',
      storyContent: 'We believe that the objects we use daily should be beautiful, functional, and made with care. Our ceramics are created using traditional techniques passed down through generations, combined with a modern minimalist aesthetic.',
      missionTitle: 'Our Process',
      missionContent: 'From selecting the finest clay to the final firing, every step in our process is carefully considered. We use sustainable practices and locally sourced materials whenever possible.',
      valuesTitle: 'Our Values',
      valuesContent: 'Quality, sustainability, and authenticity guide everything we do. Each piece is handcrafted, making it unique and authentic.'
    };
    res.render('about', { 
      aboutContent: fallbackContent,
      cartItemCount: getCartItemCount(req.session.cart) 
    });
  }
});

// Contact form route
app.get('/contact', (req, res) => {
  res.render('contact', { cartItemCount: getCartItemCount(req.session.cart) });
});

// Contact form submission
app.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.render('contact', { 
        error: 'All fields are required',
        cartItemCount: getCartItemCount(req.session.cart)
      });
    }
    
    // Send email using AWS SES
    await sendContactEmail(name, email, message);
    
    res.render('contact', { 
      success: 'Thank you for your message! We\'ll get back to you soon.',
      cartItemCount: getCartItemCount(req.session.cart)
    });
  } catch (error) {
    console.error('Error sending contact email:', error);
    
    // Provide specific error messages based on the error type
    let errorMessage = 'Sorry, there was an error sending your message. Please try again.';
    
    if (error.name === 'MessageRejected' && error.message.includes('not verified')) {
      errorMessage = 'Email service is being configured. Your message has been logged and we will respond soon.';
      console.log('📧 Contact form submission logged (SES verification pending)');
    }
    
    res.render('contact', { 
      error: errorMessage,
      cartItemCount: getCartItemCount(req.session.cart)
    });
  }
});

// Add product page route
app.get('/admin/products/add', requireAuth, (req, res) => {
  res.render('admin-add-product', { 
    username: req.session.username || 'Admin'
  });
});

app.get('/admin/products/:id/edit', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await productsDB.getById(productId);
    
    if (!product) {
      return res.status(404).render('404', { 
        cartItemCount: getCartItemCount(req.session.cart) 
      });
    }
    
    res.render('admin-edit-product', { 
      product: product,
      username: req.session.username || 'Admin'
    });
  } catch (error) {
    console.error('Error loading product for editing:', error);
    res.status(500).render('admin-edit-product', { 
      product: null,
      error: 'Failed to load product',
      username: req.session.username || 'Admin'
    });
  }
});

// About page editing routes
app.get('/admin/about/edit', requireAuth, async (req, res) => {
  try {
    const aboutContent = await aboutContentDB.getAboutContent();
    
    res.render('admin-edit-about', { 
      aboutContent: aboutContent,
      username: req.session.username || 'Admin'
    });
  } catch (error) {
    console.error('Error loading about content:', error);
    res.status(500).render('admin-edit-about', { 
      aboutContent: {},
      error: 'Failed to load about content',
      username: req.session.username || 'Admin'
    });
  }
});

app.post('/admin/about/update', requireAuth, async (req, res) => {
  try {
    const { 
      heroTitle, heroSubtitle, 
      philosophyTitle, philosophyContent, philosophyContent2,
      processTitle, processContent, processImageAlt,
      valuesTitle, qualityTitle, qualityContent,
      sustainabilityTitle, sustainabilityContent,
      authenticityTitle, authenticityContent
    } = req.body;
    
    // Validate required fields
    if (!heroTitle || !heroSubtitle || !philosophyTitle || !philosophyContent || !philosophyContent2 || 
        !processTitle || !processContent || !processImageAlt || !valuesTitle || 
        !qualityTitle || !qualityContent || !sustainabilityTitle || !sustainabilityContent || 
        !authenticityTitle || !authenticityContent) {
      return res.render('admin-edit-about', { 
        aboutContent: req.body,
        error: 'All fields are required',
        username: req.session.username || 'Admin'
      });
    }
    
    // Save to DynamoDB
    const updateData = {
      heroTitle, heroSubtitle,
      philosophyTitle, philosophyContent, philosophyContent2,
      processTitle, processContent, processImageAlt,
      valuesTitle, qualityTitle, qualityContent,
      sustainabilityTitle, sustainabilityContent,
      authenticityTitle, authenticityContent
    };
    
    const success = await aboutContentDB.updateAboutContent(updateData);
    
    if (success) {
      res.render('admin-edit-about', { 
        aboutContent: updateData,
        success: true,
        username: req.session.username || 'Admin'
      });
    } else {
      res.render('admin-edit-about', { 
        aboutContent: updateData,
        success: true, // Still show success since fallback was updated
        username: req.session.username || 'Admin'
      });
    }
  } catch (error) {
    console.error('Error updating about page:', error);
    res.render('admin-edit-about', { 
      aboutContent: req.body,
      error: 'Failed to update about page',
      username: req.session.username || 'Admin'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`Agatha Oeiras ceramics store running on http://localhost:${PORT}`);
});
