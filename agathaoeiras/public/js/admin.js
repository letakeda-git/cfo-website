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
