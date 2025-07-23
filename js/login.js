document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // Lưu thông tin người dùng và token vào localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Hiển thị thông báo thành công
                    alert('Đăng nhập thành công!');
                    
                    // Kiểm tra nếu là admin thì chuyển đến trang admin
                    if (data.user.role === 'admin') {
                        window.location.href = 'admin/dashboard.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                } else {
                    // Hiển thị thông báo lỗi
                    alert(data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu.');
                }
            } catch (error) {
                console.error('Lỗi:', error);
                alert('Có lỗi xảy ra. Vui lòng thử lại sau.');
            }
        });
    }
});