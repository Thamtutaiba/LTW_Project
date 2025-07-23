// search.js - Xử lý chức năng tìm kiếm sản phẩm
document.addEventListener('DOMContentLoaded', function() {
    // Lấy các phần tử DOM cần thiết
    const searchIcon = document.getElementById('searchIcon');
    const searchModal = document.createElement('div');
    
    // Tạo modal tìm kiếm
    searchModal.id = 'searchModal';
    searchModal.className = 'search-modal';
    searchModal.innerHTML = `
        <div class="search-content">
            <div class="search-header">
                <h2>Tìm kiếm sản phẩm</h2>
                <button id="closeSearchBtn" class="close-btn">&times;</button>
            </div>
            <div class="search-form">
                <input type="text" id="searchInput" placeholder="Nhập tên sản phẩm (nhiều sản phẩm cách nhau bởi dấu phẩy)..." autocomplete="off">
                <button id="searchBtn"><i class="fas fa-search"></i></button>
            </div>
            <div class="search-results" id="searchResults"></div>
        </div>
    `;
    
    // Thêm modal vào body
    document.body.appendChild(searchModal);
    
    // Lấy các phần tử DOM sau khi đã tạo modal
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    // Hiển thị modal khi click vào icon tìm kiếm
    searchIcon.addEventListener('click', function(e) {
        e.preventDefault();
        searchModal.classList.add('show');
        searchInput.focus();
    });
    
    // Đóng modal khi click vào nút đóng hoặc khu vực bên ngoài modal
    closeSearchBtn.addEventListener('click', closeSearchModal);
    searchModal.addEventListener('click', function(e) {
        if (e.target === searchModal) {
            closeSearchModal();
        }
    });
    
    // Hàm đóng modal tìm kiếm
    function closeSearchModal() {
        searchModal.classList.remove('show');
        searchInput.value = '';
        searchResults.innerHTML = '';
    }
    
    // Tìm kiếm khi nhấn Enter trong ô input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Tìm kiếm khi click vào nút tìm kiếm
    searchBtn.addEventListener('click', performSearch);
    
    // Hàm thực hiện tìm kiếm
    function performSearch() {
        const searchTerms = searchInput.value.trim();
        
        if (searchTerms.length === 0) {
            return; // Không tìm kiếm nếu không có từ khóa
        }
        
        // Hiển thị thông báo đang tìm kiếm
        searchResults.innerHTML = '<div class="searching-message">Đang tìm kiếm...</div>';
        
        // Gửi yêu cầu tìm kiếm đến server
        fetch(`http://localhost:3000/api/search?terms=${encodeURIComponent(searchTerms)}`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Lỗi kết nối đến server: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        displaySearchResults(data);
    })
    .catch(error => {
        console.error('Lỗi tìm kiếm:', error);
        searchResults.innerHTML = `<div class="error-message">Đã xảy ra lỗi: ${error.message}</div>`;
    });
    }
    
    // Hàm hiển thị kết quả tìm kiếm
    function displaySearchResults(products) {
        searchResults.innerHTML = '';
        
        if (products.length === 0) {
            searchResults.innerHTML = '<div class="no-results">Không tìm thấy sản phẩm nào.</div>';
            return;
        }
        
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'results-container';
        
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            // Xử lý hình ảnh sản phẩm (lấy ảnh đầu tiên từ mảng images)
            let imageUrl = 'images/placeholder.jpg'; // Hình mặc định nếu không có ảnh
            if (product.images && product.images.length > 0) {
                imageUrl = product.images[0]; // Lấy ảnh đầu tiên
            }
            
            // Format giá tiền
            const formattedPrice = new Intl.NumberFormat('vi-VN').format(product.price) + 'VNĐ';
            
            // Tạo HTML cho sản phẩm
            productCard.innerHTML = `
                <a href="product-detail.html?id=${product.id}&category=${product.category || ''}" class="product-link">
                    <div class="product-image">
                        <img src="${imageUrl}" alt="${product.name}">
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <div class="product-brand">${product.brand || ''}</div>
                        <div class="product-price">${formattedPrice}</div>
                    </div>
                </a>
            `;
            
            resultsContainer.appendChild(productCard);
        });
        
        searchResults.appendChild(resultsContainer);
    }
});