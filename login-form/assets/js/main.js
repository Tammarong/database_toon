/*===== FOCUS =====*/
const inputs = document.querySelectorAll(".form__input")

/*=== Add focus ===*/
function addfocus(){
    let parent = this.parentNode.parentNode
    parent.classList.add("focus")
}

/*=== Remove focus ===*/
function remfocus(){
    let parent = this.parentNode.parentNode
    if(this.value == ""){
        parent.classList.remove("focus")
    }
}

/*=== To call function===*/
inputs.forEach(input=>{
    input.addEventListener("focus",addfocus)
    input.addEventListener("blur",remfocus)
})

/*===== FORM TOGGLE =====*/
function toggleForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (formType === 'register') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'grid';
    } else {
        registerForm.style.display = 'none';
        loginForm.style.display = 'grid';
    }
    
    // Reinitialize focus effects for new form inputs
    const newInputs = document.querySelectorAll(".form__input");
    newInputs.forEach(input => {
        input.addEventListener("focus", addfocus);
        input.addEventListener("blur", remfocus);
    });
}

/*===== FORM SUBMISSION =====*/
// Login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('#loginForm form');
    const registerForm = document.querySelector('#registerForm form');

    // Login form handler
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                showMessage(data.message, 'success');
                // Clear form
                loginForm.reset();
                // Store user information in localStorage
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                // Redirect to todo-list after successful login
                setTimeout(() => {
                    window.location.href = '/todo-list/';
                }, 1000);
            } else {
                showMessage(data.message, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Connection error. Please try again.', 'error');
        }
    });

    // Register form handler
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fullName = document.getElementById('registerFullName').value;
        const email = document.getElementById('registerEmail').value;
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (!fullName || !email || !username || !password || !confirmPassword) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fullName, email, username, password })
            });

            const data = await response.json();

            if (data.success) {
                showMessage(data.message, 'success');
                // Clear form
                registerForm.reset();
                // Switch to login form
                setTimeout(() => {
                    toggleForm('login');
                    showMessage('Registration successful! Please login.', 'success');
                }, 1000);
            } else {
                showMessage(data.message, 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showMessage('Connection error. Please try again.', 'error');
        }
    });
});

/*===== MESSAGE DISPLAY =====*/
function showMessage(message, type) {
    // Remove existing message
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background-color: #4CAF50;' : 'background-color: #f44336;'}
    `;

    // Add animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(messageDiv);

    // Remove message after 3 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 300);
    }, 3000);
}

/*===== SUCCESS MODAL FUNCTIONS =====*/
function showSuccessModal(user) {
    // Update user information in the modal
    document.getElementById('userName').textContent = user.fullName;
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userUsername').textContent = `@${user.username}`;
    
    // Show the modal
    const modal = document.getElementById('successModal');
    modal.style.display = 'block';
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'none';
    
    // Restore body scroll
    document.body.style.overflow = 'auto';
}

function logout() {
    // Close the modal
    closeSuccessModal();
    
    // Show logout message
    showMessage('You have been logged out successfully', 'success');
    
    // Clear any stored user data (if you have any)
    // localStorage.removeItem('user');
    // sessionStorage.removeItem('user');
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('successModal');
    if (event.target === modal) {
        closeSuccessModal();
    }
}

// Theme switching functionality
function changeTheme(theme) {
    // Remove existing theme classes
    document.body.classList.remove('standard', 'light', 'darker');
    
    // Add new theme class
    document.body.classList.add(theme);
    
    // Save theme preference
    localStorage.setItem('savedTheme', theme);
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('savedTheme');
    
    if (savedTheme) {
        changeTheme(savedTheme);
    } else {
        // Default to standard theme
        changeTheme('standard');
    }
});
