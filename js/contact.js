document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    // Check if user is logged in and auto-fill form
    const user = JSON.parse(localStorage.getItem('user')); // Thay userData thành user
    const token = localStorage.getItem('token');
    
    // Update form fields based on login state
    if (user && token) {
        document.getElementById('name').value = user.username;
        document.getElementById('email').value = user.email;
        // Disable name and email fields if logged in
        document.getElementById('name').readOnly = true;
        document.getElementById('email').readOnly = true;
    }

    // Handle form submission
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Check if user is logged in
        if (!token) {
            alert('Vui lòng đăng nhập để gửi liên hệ');
            window.location.href = 'login.html';
            return;
        }

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            message: document.getElementById('message').value
        };

        try {
            const response = await fetch('http://localhost:3000/api/contact', { // Sửa cổng thành 3000
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                alert('Gửi liên hệ thành công! Chúng tôi sẽ phản hồi sớm nhất có thể.');
                contactForm.reset();
                // Keep user info if logged in
                if (user) {
                    document.getElementById('name').value = user.username;
                    document.getElementById('email').value = user.email;
                    document.getElementById('name').readOnly = true;
                    document.getElementById('email').readOnly = true;
                }
            } else {
                throw new Error(data.message || 'Có lỗi xảy ra khi gửi liên hệ');
            }
        } catch (error) {
            alert(error.message);
        }
    });

    // Add event listener for login/logout changes
    window.addEventListener('storage', function(e) {
        if (e.key === 'user' || e.key === 'token') { // Thay userData thành user
            location.reload();
        }
    });
});