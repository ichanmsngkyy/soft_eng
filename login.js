// Login functionality - Production Ready
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    
    // Check for any messages from redirect (like session expired)
    checkRedirectMessages();
    
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

// Main login handler
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
    
    setLoadingState(true);
    authenticateUser(username, password, rememberMe);
}

async function authenticateUser(username, password, rememberMe) {
    try {
        const response = await fetch('http://localhost:4567/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (response.ok) {
            const data = await response.json();
            handleLoginSuccess(data.user, data.token, rememberMe);
        } else {
            const err = await response.json();
            handleLoginError(err.error || 'Invalid username or password');
        }
    } catch (error) {
        handleLoginError('Network error');
    }
}

// Handle successful login
function handleLoginSuccess(user, token, rememberMe) {
    const sessionData = {
        username: user.username,
        token: token, // Store actual JWT token in production
        loginTime: new Date().toISOString(),
        sessionId: generateSessionId()
    };
    
    // Store session data
    if (rememberMe) {
        localStorage.setItem('userSession', JSON.stringify(sessionData));
        localStorage.setItem('savedUsername', user.username);
    } else {
        sessionStorage.setItem('userSession', JSON.stringify(sessionData));
    }
    
    showMessage('Login successful! Redirecting...', 'success');
    
    // Redirect to main application
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

// Handle login error
function handleLoginError(message) {
    showMessage(message || 'Login failed. Please try again.', 'error');
    setLoadingState(false);
    
    // Shake animation for error
    const loginCard = document.querySelector('.login-card');
    if (loginCard) {
        loginCard.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            loginCard.style.animation = '';
        }, 500);
    }
    
    // Clear password field and focus
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// Set loading state for login button
function setLoadingState(isLoading) {
    const loginBtn = document.querySelector('.login-btn');
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    
    if (loginBtn) {
        loginBtn.disabled = isLoading;
        if (isLoading) {
            loginBtn.classList.add('loading');
        } else {
            loginBtn.classList.remove('loading');
        }
    }
    
    if (btnText) {
        btnText.style.display = isLoading ? 'none' : 'inline';
    }
    
    if (btnLoading) {
        btnLoading.style.display = isLoading ? 'inline' : 'none';
    }
}

// Check for existing valid session
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
                clearStoredSessions();
                showMessage('Session expired. Please login again.', 'warning');
            }
        } catch (error) {
            // Invalid session data, clear it
            clearStoredSessions();
            console.error('Error parsing session data:', error);
        }
    }
}

// Check for messages from redirects
function checkRedirectMessages() {
    const message = sessionStorage.getItem('loginMessage');
    if (message) {
        showMessage(message, 'warning');
        sessionStorage.removeItem('loginMessage');
    }
}

// Load saved username if remember me was checked
function loadSavedCredentials() {
    const savedUsername = localStorage.getItem('savedUsername');
    if (savedUsername) {
        const usernameInput = document.getElementById('username');
        const rememberMeCheckbox = document.getElementById('rememberMe');
        const passwordInput = document.getElementById('password');
        
        if (usernameInput) usernameInput.value = savedUsername;
        if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
        if (passwordInput) passwordInput.focus();
    }
}

// Clear all stored sessions
function clearStoredSessions() {
    localStorage.removeItem('userSession');
    sessionStorage.removeItem('userSession');
}

// Generate session ID
function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');
    
    if (passwordInput && toggleIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleIcon.textContent = '👁️';
        }
    }
}

// Show message notifications
function showMessage(message, type) {
    const messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    messageContainer.appendChild(messageDiv);
    
    // Show message with animation
    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 100);
    
    // Auto-hide message after 4 seconds
    setTimeout(() => {
        if (messageDiv.classList.contains('show')) {
            messageDiv.classList.remove('show');
            setTimeout(() => {
                if (messageContainer.contains(messageDiv)) {
                    messageContainer.removeChild(messageDiv);
                }
            }, 300);
        }
    }, 4000);
}

// Clear input error states on typing
document.addEventListener('input', function(e) {
    if (e.target.type === 'text' || e.target.type === 'password') {
        e.target.style.borderColor = '#e0e6ed';
    }
});

// Prevent form submission with empty fields
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.id === 'username' || activeElement.id === 'password')) {
            e.preventDefault();
            handleLogin(e);
        }
    }
});

// Development console info
console.log('%c PC Inventory Management System ', 'background: #3498db; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');
console.log('%c Demo Login Credentials: ', 'color: #2c3e50; font-weight: bold;');
console.log('Username: admin');
console.log('Password: admin123');
console.log('%c Ready for backend integration! ', 'background: #2ecc71; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');