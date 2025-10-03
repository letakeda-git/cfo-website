// Product page functionality
let productImages = [];
let currentImageIndex = 0;

// Initialize product page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get product images from the page
    const imagesData = document.getElementById('productImagesData');
    if (imagesData) {
        productImages = JSON.parse(imagesData.textContent);
    }
    
    // Initialize navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn && nextBtn && productImages.length > 1) {
        prevBtn.addEventListener('click', previousImage);
        nextBtn.addEventListener('click', nextImage);
    }
    
    // Initialize add to cart functionality
    initializeAddToCart();
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (productImages.length > 1) {
            if (e.key === 'ArrowRight') {
                nextImage();
            } else if (e.key === 'ArrowLeft') {
                previousImage();
            }
        }
    });
});

// Add to cart functionality
function initializeAddToCart() {
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
}

// Image navigation functions
function changeImage(index) {
    if (index >= 0 && index < productImages.length) {
        currentImageIndex = index;
        const mainImage = document.getElementById('mainImage');
        if (mainImage) {
            mainImage.src = productImages[index];
        }
        
        // Update image counter
        const counter = document.getElementById('currentImageNumber');
        if (counter) {
            counter.textContent = currentImageIndex + 1;
        }
    }
}

function nextImage() {
    const nextIndex = (currentImageIndex + 1) % productImages.length;
    changeImage(nextIndex);
}

function previousImage() {
    const prevIndex = (currentImageIndex - 1 + productImages.length) % productImages.length;
    changeImage(prevIndex);
}
