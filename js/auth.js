document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth.js loaded');
    
    // Kiểm tra trạng thái đăng nhập
    const user = JSON.parse(localStorage.getItem('user')); // Thay userData thành user
    const token = localStorage.getItem('token');
    const userIcon = document.getElementById('userIcon');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginLink = document.getElementById('loginLink');
    const signupLink = document.getElementById('signupLink');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    console.log('User:', user);
    console.log('Token:', token);

    function updateLoginState() {
        // Nếu có token nhưng không có user, thử lấy thông tin user từ token
        if (token && !user) {
            try {
                const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                const tempUser = {
                    username: tokenPayload.username,
                    email: tokenPayload.email
                };
                localStorage.setItem('user', JSON.stringify(tempUser)); // Thay userData thành user
                console.log('Retrieved user data from token:', tempUser);
                return updateLoginState(); // Gọi lại với user mới
            } catch (error) {
                console.error('Error parsing token:', error);
                // Nếu không thể lấy thông tin từ token, xóa token
                localStorage.removeItem('token');
            }
        }

        if (user && token) {
            console.log('User is logged in');
            // Đã đăng nhập
            if (userIcon) {
                userIcon.innerHTML = '<i class="fas fa-user-check"></i>';
            }
            
            // Ẩn link đăng nhập/đăng ký
            if (loginLink) {
                loginLink.style.display = 'none';
            }
            if (signupLink) {
                signupLink.style.display = 'none';
            }
            
            // Hiển thị nút đăng xuất
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
            }

            // Thêm tên người dùng vào dropdown (nếu chưa có)
            const existingUsernameItem = dropdownMenu.querySelector('.username-item');
            if (!existingUsernameItem) {
                const usernameItem = document.createElement('li');
                usernameItem.className = 'username-item';
                usernameItem.innerHTML = `<span class="dropdown-item-text">Xin chào, ${user.username}</span>`;
                dropdownMenu.insertBefore(usernameItem, dropdownMenu.firstChild);
            }
        } else {
            console.log('User is not logged in');
            // Chưa đăng nhập
            if (userIcon) {
                userIcon.innerHTML = '<i class="fas fa-user"></i>';
            }
            
            // Hiển thị link đăng nhập/đăng ký
            if (loginLink) {
                loginLink.style.display = 'block';
            }
            if (signupLink) {
                signupLink.style.display = 'block';
            }
            
            // Ẩn nút đăng xuất
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }
            
            // Xóa tên người dùng khỏi dropdown
            const usernameItem = dropdownMenu.querySelector('.username-item');
            if (usernameItem) {
                usernameItem.remove();
            }
        }
    }

    // Cập nhật trạng thái ban đầu
    updateLoginState();

    // Xử lý sự kiện click cho icon user
    if (userIcon) {
        userIcon.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('User icon clicked');
            // Toggle dropdown menu
            const dropdown = this.closest('.dropdown');
            if (dropdown) {
                const dropdownMenu = dropdown.querySelector('.dropdown-menu');
                if (dropdownMenu) {
                    dropdownMenu.classList.toggle('show');
                    console.log('Dropdown menu toggled');
                }
            }
        });
    }

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', function(e) {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target) && !e.target.closest('.dropdown-toggle')) {
                dropdown.classList.remove('show');
            }
        });
    });

    // Xử lý đăng xuất
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Logout clicked');
            logout();
        });
    }

    // Thêm event listener cho biểu tượng giỏ hàng
    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) {
        cartIcon.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'cart.html';
        });
    }

    // Lắng nghe sự kiện storage để cập nhật khi đăng nhập/đăng xuất từ tab khác
    window.addEventListener('storage', function(e) {
        if (e.key === 'user' || e.key === 'token') { // Thay userData thành user
            updateLoginState();
        }
    });
});

// Hàm đăng xuất
function logout() {
    console.log('Logging out...');
    // Xóa thông tin đăng nhập khỏi localStorage
    localStorage.removeItem('user'); // Thay userData thành user
    localStorage.removeItem('token');
    
    // Hiển thị thông báo
    alert('Đăng xuất thành công!');
    
    // Chuyển hướng về trang chủ
    window.location.href = 'index.html';
}