// Cart functionality
document.addEventListener('DOMContentLoaded', function() {
    // Clear cart functionality
    const clearCartBtn = document.getElementById('clear-cart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to clear your cart?')) {
                try {
                    const response = await fetch('/cart/clear', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });
                    
                    if (response.ok) {
                        location.reload();
                    } else {
                        alert('Error clearing cart. Please try again.');
                    }
                } catch (error) {
                    console.error('Error clearing cart:', error);
                    alert('Error clearing cart. Please try again.');
                }
            }
        });
    }

    // Proceed to checkout functionality
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            // For now, we'll show a simple checkout form
            // In a real application, this would redirect to a payment processor
            showCheckoutModal();
        });
    }


    // Remove item functionality
    const removeBtns = document.querySelectorAll('.remove-btn');
    removeBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const productId = this.getAttribute('data-product-id');
            
            if (confirm('Are you sure you want to remove this item from your cart?')) {
                try {
                    const response = await fetch(`/cart/remove/${productId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });
                    
                    if (response.ok) {
                        location.reload();
                    } else {
                        alert('Error removing item. Please try again.');
                    }
                } catch (error) {
                    console.error('Error removing item:', error);
                    alert('Error removing item. Please try again.');
                }
            }
        });
    });
});

// Simple checkout modal (placeholder for real payment integration)
function showCheckoutModal() {
    const modal = document.createElement('div');
    modal.className = 'checkout-modal';
    modal.innerHTML = `
        <div class="checkout-modal-content">
            <div class="checkout-modal-header">
                <h2>Checkout</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="checkout-modal-body">
                <p>Thank you for your interest in our ceramics!</p>
                <p>For now, this is a demo checkout. In a real application, this would integrate with a payment processor like Stripe or PayPal.</p>
                <div class="checkout-info">
                    <h3>Contact Information</h3>
                    <p><strong>Email:</strong> agatha.abdala@hotmail.com</p>
                    <p><strong>Phone:</strong> +351 967 799 032</p>
                    <p>Please contact us directly to complete your purchase.</p>
                </div>
            </div>
            <div class="checkout-modal-footer">
                <button class="btn btn-outline close-modal">Close</button>
                <button class="btn btn-primary" onclick="alert('Thank you! We will contact you soon to complete your order.')">Place Order</button>
            </div>
        </div>
    `;
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .checkout-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .checkout-modal-content {
            background: white;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .checkout-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #eee;
        }
        .checkout-modal-header h2 {
            margin: 0;
        }
        .close-modal {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }
        .checkout-modal-body {
            padding: 1.5rem;
        }
        .checkout-info {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
        }
        .checkout-modal-footer {
            display: flex;
            gap: 1rem;
            padding: 1.5rem;
            border-top: 1px solid #eee;
            justify-content: flex-end;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeModal = () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
    };
    
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}
