// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    
    // Check if user is already logged in
    checkExistingSession();
    
    // Form submission handler
    loginForm.addEventListener('submit', handleLogin);
    
    // Auto-focus username field
    usernameInput.focus();
    
    // Enter key handling
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });

    // Load saved username if remember me was checked
    loadSavedCredentials();
});

// Single user credentials - In production, this would be handled by your backend
const validCredentials = {
    username: 'admin',
    password: 'admin123'
};

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Basic validation
    if (!username || !password) {
        showMessage('Please enter both username and password.', 'error');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    // Simulate API call delay
    setTimeout(() => {
        // Check credentials
        if (username === validCredentials.username && password === validCredentials.password) {
            // Successful login
            const sessionData = {
                username: username,
                loginTime: new Date().toISOString(),
                sessionId: generateSessionId()
            };
            
            // Store session data
            if (rememberMe) {
                localStorage.setItem('userSession', JSON.stringify(sessionData));
                localStorage.setItem('savedUsername', username);
            } else {
                sessionStorage.setItem('userSession', JSON.stringify(sessionData));
            }
            
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to main application
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } else {
            // Failed login
            showMessage('Invalid username or password. Please try again.', 'error');
            setLoadingState(false);
            
            // Shake animation for error
            document.querySelector('.login-card').style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                document.querySelector('.login-card').style.animation = '';
            }, 500);
            
            // Clear password field
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    }, 1000); // Simulate network delay
}

function setLoadingState(isLoading) {
    const loginBtn = document.querySelector('.login-btn');
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    
    if (isLoading) {
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
    } else {
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

function checkExistingSession() {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            const loginTime = new Date(session.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            // Check if session is still valid (24 hours for localStorage, 8 hours for sessionStorage)
            const maxHours = localStorage.getItem('userSession') ? 24 : 8;
            
            if (hoursDiff < maxHours) {
                // Valid session exists, redirect to dashboard
                showMessage('Welcome back! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
                return;
            } else {
                // Session expired, clear it
                localStorage.removeItem('userSession');
                sessionStorage.removeItem('userSession');
                showMessage('Session expired. Please login again.', 'warning');
            }
        } catch (error) {
            // Invalid session data, clear it
            localStorage.removeItem('userSession');
            sessionStorage.removeItem('userSession');
        }
    }
}

function loadSavedCredentials() {
    const savedUsername = localStorage.getItem('savedUsername');
    if (savedUsername) {
        document.getElementById('username').value = savedUsername;
        document.getElementById('rememberMe').checked = true;
        document.getElementById('password').focus();
    }
}

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleIcon.textContent = '👁️';
    }
}

function showMessage(message, type) {
    const messageContainer = document.getElementById('messageContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    messageContainer.appendChild(messageDiv);
    
    // Show message
    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 100);
    
    // Hide message after 4 seconds
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => {
            if (messageContainer.contains(messageDiv)) {
                messageContainer.removeChild(messageDiv);
            }
        }, 300);
    }, 4000);
}

// Clear any leftover error states on input
document.addEventListener('input', function(e) {
    if (e.target.type === 'text' || e.target.type === 'password') {
        e.target.style.borderColor = '#e0e6ed';
    }
});

// Show demo info in console
console.log('%c PC Inventory Management System ', 'background: #3498db; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');
console.log('%c Demo Login Credentials: ', 'color: #2c3e50; font-weight: bold;');
console.log('Username: admin');
console.log('Password: admin123');