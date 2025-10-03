// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }));
}

// Single product layout detection
document.addEventListener('DOMContentLoaded', function() {
    const productsGrid = document.querySelector('.products-grid');
    if (productsGrid) {
        const productCards = productsGrid.querySelectorAll('.product-card');
        if (productCards.length === 1) {
            productsGrid.classList.add('single-product');
        }
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add to cart functionality
document.addEventListener('DOMContentLoaded', function() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    
    addToCartButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const productId = this.getAttribute('data-product-id');
            const productName = this.getAttribute('data-product-name');
            const productPrice = this.getAttribute('data-product-price');
            
            try {
                const response = await fetch('/cart/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        productId: parseInt(productId),
                        quantity: 1
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Update cart count in navigation
                    const cartCount = document.getElementById('cart-count');
                    if (cartCount) {
                        cartCount.textContent = result.cartItemCount;
                    }
                    
                    // Show success message
                    this.textContent = 'Added!';
                    this.classList.add('btn-success');
                    
                    setTimeout(() => {
                        this.textContent = 'Add to Cart';
                        this.classList.remove('btn-success');
                    }, 2000);
                } else {
                    alert('Error adding to cart: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error adding to cart:', error);
                alert('Error adding to cart. Please try again.');
            }
        });
    });
});

// Form submission handling
const contactForm = document.querySelector('form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        // Simple validation
        if (!data.name || !data.email || !data.message) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // Simulate form submission
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;
        
        setTimeout(() => {
            submitButton.textContent = 'Message Sent!';
            submitButton.classList.add('btn-success');
            
            setTimeout(() => {
                submitButton.textContent = originalText;
                submitButton.classList.remove('btn-success');
                submitButton.disabled = false;
                this.reset();
            }, 2000);
        }, 1500);
    });
}

// Lazy loading for images
const images = document.querySelectorAll('img[data-src]');
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
        }
    });
});

images.forEach(img => imageObserver.observe(img));

// Add loading animation for product images
document.querySelectorAll('.product-image img').forEach(img => {
    // Set initial opacity to 0 for fade-in effect
    img.classList.add('fade-in');
    
    // Check if image is already loaded
    if (img.complete && img.naturalHeight !== 0) {
        img.classList.add('loaded');
    } else {
        img.addEventListener('load', function() {
            this.classList.add('loaded');
        });
        
        // Fallback: if load event doesn't fire, show image after a short delay
        setTimeout(() => {
            if (!img.classList.contains('loaded')) {
                img.classList.add('loaded');
            }
        }, 1000);
    }
});

// Filter functionality for products page
const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        this.classList.add('active');
        
        // Here you would typically make an AJAX request or update the URL
        // For now, we'll just scroll to the products section
        const productsSection = document.querySelector('.products-grid-section');
        if (productsSection) {
            productsSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Add scroll effect to navbar
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Product card hover effects
document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.classList.add('hovered');
    });
    
    card.addEventListener('mouseleave', function() {
        this.classList.remove('hovered');
    });
});

// Add fade-in animation for sections
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-visible');
        }
    });
}, observerOptions);

// Observe all sections for fade-in effect
document.querySelectorAll('section').forEach(section => {
    section.classList.add('fade-in-section');
    observer.observe(section);
});

// Product image click to open in full size
document.addEventListener('DOMContentLoaded', function() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <img class="modal-image" src="" alt="">
                <button class="modal-close">&times;</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add click event to all product images
    document.querySelectorAll('.product-image img, .product-images img, .main-image-container img').forEach(img => {
        img.classList.add('clickable-image');
        img.addEventListener('click', function() {
            const modalImg = modal.querySelector('.modal-image');
            modalImg.src = this.src;
            modalImg.alt = this.alt;
            modal.classList.add('modal-visible');
            document.body.classList.add('modal-open');
        });
    });

    // Close modal functionality
    const closeModal = () => {
        modal.classList.remove('modal-visible');
        document.body.classList.remove('modal-open');
    };

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('modal-visible')) {
            closeModal();
        }
    });
});

