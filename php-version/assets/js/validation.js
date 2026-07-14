/**
 * Form Validation Script
 * Client-side checks for Login, Sign Up, and Event Submissions
 */

// Helper to show dynamic inline error (or native alert if needed)
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Check if error message element already exists
    let errorElem = field.parentNode.querySelector('.validation-error-msg');
    if (!errorElem) {
        errorElem = document.createElement('span');
        errorElem.className = 'validation-error-msg text-danger text-xs mt-2 d-block';
        field.parentNode.appendChild(errorElem);
    }
    
    errorElem.textContent = message;
    field.style.borderColor = 'var(--color-danger)';
    field.focus();
}

function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const errorElem = field.parentNode.querySelector('.validation-error-msg');
    if (errorElem) {
        errorElem.remove();
    }
    field.style.borderColor = '';
}

// ----------------------------------------------------
// SIGN UP FORM VALIDATION
// ----------------------------------------------------
function validateSignUpForm() {
    let isValid = true;
    
    const fullName = document.getElementById('full_name');
    const email = document.getElementById('email');
    const studentClass = document.getElementById('class');
    const section = document.getElementById('section');
    const admissionNumber = document.getElementById('admission_number');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    
    // Clear all previous errors
    ['full_name', 'email', 'class', 'section', 'admission_number', 'password', 'confirm_password'].forEach(clearError);
    
    // Full Name
    if (fullName && fullName.value.trim() === '') {
        showError('full_name', 'Full name is required.');
        isValid = false;
    }
    
    // Email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && email.value.trim() === '') {
        showError('email', 'Email address is required.');
        isValid = false;
    } else if (email && !emailPattern.test(email.value.trim())) {
        showError('email', 'Please enter a valid email address.');
        isValid = false;
    }
    
    // Class
    if (studentClass && studentClass.value.trim() === '') {
        showError('class', 'Class is required.');
        isValid = false;
    }
    
    // Section
    if (section && section.value.trim() === '') {
        showError('section', 'Section is required.');
        isValid = false;
    }
    
    // Admission Number
    if (admissionNumber && admissionNumber.value.trim() === '') {
        showError('admission_number', 'Admission number is required.');
        isValid = false;
    }
    
    // Password
    if (password && password.value === '') {
        showError('password', 'Password is required.');
        isValid = false;
    } else if (password && password.value.length < 6) {
        showError('password', 'Password must be at least 6 characters long.');
        isValid = false;
    }
    
    // Confirm Password
    if (confirmPassword && confirmPassword.value === '') {
        showError('confirm_password', 'Please confirm your password.');
        isValid = false;
    } else if (password && confirmPassword && password.value !== confirmPassword.value) {
        showError('confirm_password', 'Passwords do not match.');
        isValid = false;
    }
    
    return isValid;
}

// ----------------------------------------------------
// LOGIN FORM VALIDATION
// ----------------------------------------------------
function validateLoginForm() {
    let isValid = true;
    
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    
    ['email', 'password'].forEach(clearError);
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && email.value.trim() === '') {
        showError('email', 'Email address is required.');
        isValid = false;
    } else if (email && !emailPattern.test(email.value.trim())) {
        showError('email', 'Please enter a valid email address.');
        isValid = false;
    }
    
    if (password && password.value === '') {
        showError('password', 'Password is required.');
        isValid = false;
    }
    
    return isValid;
}

// ----------------------------------------------------
// ADMIN LOGIN VALIDATION
// ----------------------------------------------------
function validateAdminLoginForm() {
    let isValid = true;
    
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    
    ['username', 'password'].forEach(clearError);
    
    if (username && username.value.trim() === '') {
        showError('username', 'Username is required.');
        isValid = false;
    }
    
    if (password && password.value === '') {
        showError('password', 'Password is required.');
        isValid = false;
    }
    
    return isValid;
}

// ----------------------------------------------------
// EVENT FORM VALIDATION
// ----------------------------------------------------
function validateEventForm() {
    let isValid = true;
    
    const title = document.getElementById('title');
    const category = document.getElementById('category');
    const eventDate = document.getElementById('event_date');
    const description = document.getElementById('description');
    const fileInput = document.getElementById('event_image');
    
    ['title', 'category', 'event_date', 'description'].forEach(clearError);
    
    if (title && title.value.trim() === '') {
        showError('title', 'Event title is required.');
        isValid = false;
    }
    
    if (category && category.value === '') {
        showError('category', 'Please select a category.');
        isValid = false;
    }
    
    if (eventDate && eventDate.value === '') {
        showError('event_date', 'Please select an event date.');
        isValid = false;
    }
    
    if (description && description.value.trim() === '') {
        showError('description', 'Event description is required.');
        isValid = false;
    }
    
    // Optional Image file check
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const fileSizeMB = file.size / (1024 * 1024);
        
        if (fileSizeMB > 2) {
            alert('Image file size exceeds the 2MB limit.');
            isValid = false;
        }
    }
    
    return isValid;
}
