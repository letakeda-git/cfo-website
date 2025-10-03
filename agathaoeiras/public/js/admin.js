// Admin functionality
function previewImages(input) {
    const previewGrid = document.getElementById('previewGrid');
    const imagesPreview = document.getElementById('imagesPreview');
    
    // Clear previous previews
    previewGrid.innerHTML = '';
    
    if (input.files && input.files.length > 0) {
        imagesPreview.style.display = 'block';
        
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
        imagesPreview.style.display = 'none';
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

// Delete product function
function deleteProduct(productId) {
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
}

// Close modal function
function closeModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
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

// Add error styling
const style = document.createElement('style');
style.textContent = `
    .error {
        border-color: #dc3545 !important;
        box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
    }
`;
document.head.appendChild(style);
