// Admin functionality
function previewImages(input) {
    const previewGrid = document.getElementById('previewGrid');
    const imagesPreview = document.getElementById('imagesPreview');
    
    // Clear previous previews
    previewGrid.innerHTML = '';
    
    if (input.files && input.files.length > 0) {
        imagesPreview.classList.remove('hidden');
        
        Array.from(input.files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview ${index + 1}">
                    <span class="preview-label">Image ${index + 1}</span>
                `;
                previewGrid.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    } else {
        imagesPreview.classList.add('hidden');
    }
}

// Cancel button functionality
function handleCancelButton() {
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            window.location.href = '/dashboard';
        });
    }
}

// Delete product functionality
function handleDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.btn-delete');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            if (confirm('Are you sure you want to delete this product?')) {
                deleteProduct(productId);
            }
        });
    });
}

// Close modal functionality
function handleCloseModal() {
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            closeModal();
        });
    }
}

// Delete product function - Make globally accessible
window.deleteProduct = function(productId) {
    fetch(`/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            alert('Error deleting product: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error deleting product');
    });
};

// Close modal function - Make globally accessible
window.closeModal = function() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// Dashboard specific functionality
let currentProductId = null;

function toggleEditImageInput() {
    const imageType = document.getElementById('editImageType');
    const uploadGroup = document.getElementById('editImageUploadGroup');
    const urlGroup = document.getElementById('editImageUrlGroup');
    
    if (imageType && uploadGroup && urlGroup) {
        if (imageType.value === 'upload') {
            uploadGroup.classList.remove('hidden');
            urlGroup.classList.add('hidden');
            const fileInput = document.getElementById('editImageFile');
            const urlInput = document.getElementById('editImageUrl');
            if (fileInput) fileInput.required = true;
            if (urlInput) urlInput.required = false;
        } else {
            uploadGroup.classList.add('hidden');
            urlGroup.classList.remove('hidden');
            const fileInput = document.getElementById('editImageFile');
            const urlInput = document.getElementById('editImageUrl');
            if (fileInput) fileInput.required = false;
            if (urlInput) urlInput.required = true;
        }
    }
}

// Edit Product - Make globally accessible
window.editProduct = function(productId) {
    // Find product data from the page
    const productCards = document.querySelectorAll('.product-card-admin');
    let productData = null;
    
    productCards.forEach(card => {
        const editBtn = card.querySelector('.btn-edit');
        if (editBtn && editBtn.getAttribute('href') && editBtn.getAttribute('href').includes(productId)) {
            const name = card.querySelector('h3').textContent;
            const price = card.querySelector('p strong').textContent.replace('€', '');
            const category = card.querySelector('p').textContent.split('•')[1].trim();
            const description = card.querySelectorAll('p')[1].textContent;
            const image = card.querySelector('img').src;
            
            productData = { name, price, category, description, image };
        }
    });
    
    if (productData) {
        currentProductId = productId;
        const nameInput = document.getElementById('editName');
        const priceInput = document.getElementById('editPrice');
        const categoryInput = document.getElementById('editCategory');
        const urlInput = document.getElementById('editImageUrl');
        const descriptionInput = document.getElementById('editDescription');
        const imageTypeSelect = document.getElementById('editImageType');
        const modal = document.getElementById('editModal');
        
        if (nameInput) nameInput.value = productData.name;
        if (priceInput) priceInput.value = productData.price;
        if (categoryInput) categoryInput.value = productData.category;
        if (urlInput) urlInput.value = productData.image;
        if (descriptionInput) descriptionInput.value = productData.description;
        
        // Set to URL mode and show current image
        if (imageTypeSelect) {
            imageTypeSelect.value = 'url';
            toggleEditImageInput();
        }
        
        if (modal) modal.classList.remove('hidden');
    }
};

// Update Product Form
function initializeEditForm() {
    const editForm = document.getElementById('editProductForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            
            try {
                const response = await fetch(`/admin/products/${currentProductId}`, {
                    method: 'PUT',
                    body: formData
                });
                
                if (response.ok) {
                    location.reload();
                } else {
                    alert('Error updating product');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error updating product');
            }
        });
    }
}

// Close modal when clicking outside
function initializeModalClickOutside() {
    window.onclick = function(event) {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            closeModal();
        }
    }
}

// Initialize all event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize cancel buttons
    handleCancelButton();
    
    // Initialize delete buttons
    handleDeleteButtons();
    
    // Initialize close modal buttons
    handleCloseModal();
    
    // Initialize file input for image preview
    const imageFiles = document.getElementById('imageFiles');
    if (imageFiles) {
        imageFiles.addEventListener('change', function() {
            previewImages(this);
        });
    }
    
    // Initialize dashboard specific functionality
    initializeEditForm();
    initializeModalClickOutside();
    
    // Initialize image type toggle
    const imageTypeSelect = document.getElementById('editImageType');
    if (imageTypeSelect) {
        imageTypeSelect.addEventListener('change', toggleEditImageInput);
    }
});

// Auto-save functionality
let autoSaveTimeout;
document.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', function() {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            console.log('Auto-save triggered');
        }, 2000);
    });
});

// Form validation
function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });
    
    return isValid;
}

// Error styling is now handled by external CSS
