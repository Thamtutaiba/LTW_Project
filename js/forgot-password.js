document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            
            // Validate email
            if (!email) {
                showError('Vui lòng nhập địa chỉ email');
                return;
            }
            
            if (!isValidEmail(email)) {
                showError('Vui lòng nhập địa chỉ email hợp lệ');
                return;
            }
            
            // Show loading state
            setLoading(true);
            hideMessages();
            
            try {
                const response = await fetch('http://localhost:3000/api/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showSuccess();
                    forgotPasswordForm.reset();
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
    
    function setLoading(loading) {
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi liên kết đặt lại';
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
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
});
