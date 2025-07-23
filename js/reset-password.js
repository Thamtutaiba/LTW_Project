document.addEventListener('DOMContentLoaded', function() {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const loadingMessage = document.getElementById('loadingMessage');
    const tokenInput = document.getElementById('token');
    
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        showError('Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.');
        resetPasswordForm.style.display = 'none';
        return;
    }
    
    tokenInput.value = token;
    
    // Verify token on page load
    verifyToken(token);
    
    // Toggle password visibility
    document.getElementById('togglePassword').addEventListener('click', function() {
        togglePasswordVisibility('password', this);
    });
    
    document.getElementById('toggleConfirmPassword').addEventListener('click', function() {
        togglePasswordVisibility('confirmPassword', this);
    });
    
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validate passwords
            if (!password || !confirmPassword) {
                showError('Vui lòng nhập đầy đủ thông tin');
                return;
            }
            
            if (password.length < 6) {
                showError('Mật khẩu phải có ít nhất 6 ký tự');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('Mật khẩu xác nhận không khớp');
                return;
            }
            
            // Show loading state
            setLoading(true);
            hideMessages();
            
            try {
                const response = await fetch('http://localhost:3000/api/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        token: token,
                        password: password 
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showSuccess();
                    resetPasswordForm.style.display = 'none';
                } else {
                    showError(data.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
                }
            } catch (error) {
                console.error('Error:', error);
                showError('Có lỗi xảy ra khi kết nối đến máy chủ. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        });
    }
    
    async function verifyToken(token) {
        loadingMessage.classList.remove('d-none');
        
        try {
            const response = await fetch(`http://localhost:3000/api/verify-reset-token?token=${token}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                showError(data.message || 'Liên kết không hợp lệ hoặc đã hết hạn');
                resetPasswordForm.style.display = 'none';
            }
        } catch (error) {
            console.error('Error verifying token:', error);
            showError('Có lỗi xảy ra khi xác thực liên kết');
            resetPasswordForm.style.display = 'none';
        } finally {
            loadingMessage.classList.add('d-none');
        }
    }
    
    function togglePasswordVisibility(inputId, button) {
        const input = document.getElementById(inputId);
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
    
    function setLoading(loading) {
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Đặt lại mật khẩu';
        }
    }
    
    function showSuccess() {
        successMessage.classList.remove('d-none');
        errorMessage.classList.add('d-none');
    }
    
    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('d-none');
        successMessage.classList.add('d-none');
    }
    
    function hideMessages() {
        successMessage.classList.add('d-none');
        errorMessage.classList.add('d-none');
    }
});
