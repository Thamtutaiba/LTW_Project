document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra và hiển thị tham số URL để debug
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const category = urlParams.get('category');
    const productDetailContainer = document.getElementById('product-detail-container');

    console.log('URL Parameters:', {
        id: productId,
        category: category,
        fullUrl: window.location.href,
        searchParams: window.location.search
    });

    if (!productDetailContainer) {
        console.error('Không tìm thấy phần tử product-detail-container');
        return;
    }

    if (!productId) {
        productDetailContainer.innerHTML = 
            '<div class="alert alert-danger">Lỗi: ID sản phẩm không được cung cấp trong URL</div>';
        return;
    }

    // Hiển thị thông báo đang tải
    productDetailContainer.innerHTML = 
        '<div class="alert alert-info">Đang tải thông tin sản phẩm...</div>';

    // Timeout để đảm bảo UI cập nhật trước khi fetch
    setTimeout(() => {
        // Thêm timeout 10s cho fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        fetch(`http://localhost:3000/api/product/${productId}`, { signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId);
                console.log('API Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url
                });

                if (!response.ok) {
                    throw new Error(`Lỗi HTTP: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(product => {
                console.log('Product data received:', product);
                if (!product || typeof product !== 'object') {
                    throw new Error('Dữ liệu sản phẩm không hợp lệ');
                }
                renderProductDetails(product, productDetailContainer);
                if (product.category) {
                    // Đảm bảo brand và price hợp lệ
                    const brand = product.brand || '';
                    const price = product.price || 0;
                    loadRelatedProducts(product.category, product.id, brand, price);
                }
            })
            .catch(error => {
                console.error('Lỗi:', error);
                const errorMessage = error.name === 'AbortError' 
                    ? 'Server không phản hồi, vui lòng thử lại sau'
                    : error.message;
                productDetailContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <h4>Không thể tải thông tin sản phẩm</h4>
                        <p>${errorMessage}</p>
                        <p>Vui lòng thử lại sau hoặc quay về <a href="index.html">trang chủ</a>.</p>
                    </div>
                `;
            });
    }, 100);
});

function renderProductDetails(product, container) {
    document.title = `${product.name} | Music Lover`;

    const detailHTML = `
        <div class="row">
            <!-- Product Images -->
            <div class="col-md-5">
                <div class="main-product-image mb-3">
                    <img id="main-product-img" src="${product.images && product.images.length > 0 ? product.images[0] : 'images/placeholder.jpg'}" alt="${product.name}" class="img-fluid">
                </div>
                <div class="product-thumbnails d-flex justify-content-center" id="product-thumbnails">
                    ${product.images && product.images.length > 0 ? product.images.map(img => `
                        <div class="thumbnail-item mx-2">
                            <img src="${img}" alt="${product.name}" class="img-fluid" onclick="updateMainImage('${img}')">
                        </div>
                    `).join('') : ''}
                </div>
            </div>
            
            <!-- Product Information -->
            <div class="col-md-7">
                <h1 class="product-title">${product.name}</h1>
                <p class="brand-name">Thương hiệu <span class="text-primary">${product.brand || 'Unknown'}</span></p>
                
                <div class="price-section">
                    <h2 class="product-price-in-detail">${product.formattedPrice || formatPrice(product.price) + 'đ'}</h2>
                    <div class="warranty-badge">
                        <i class="fa-solid fa-shield"></i>
                        <span>${product.warranty ? `Bảo hành ${product.warranty}` : 'Bảo hành 12 tháng'}</span>
                    </div>
                </div>
                
                <div class="product-inventory-status mt-2 mb-2">
                    <span class="badge bg-info text-dark me-2">Còn lại: <b>${product.inventory ?? 'N/A'}</b></span>
                    <span class="badge bg-success">Đã bán: <b>${product.quantity_sold ?? 0}</b></span>
                </div>
                
                <div class="buy-button mt-4">
                    <button class="btn btn-warning btn-lg px-5 cart-btn" data-product-id="${product.id}">
                        <i class="fa-solid fa-cart-shopping me-2"></i> MUA HÀNG
                    </button>
                </div>
                
                <div class="product-specifications mt-4">
                    <h3>Thông số kỹ thuật</h3>
                    <ul class="specs-list">
                        ${product.specifications && product.specifications.length > 0 ? 
                            product.specifications.map(spec => `<li>${spec}</li>`).join('') :
                            `<li>Thương hiệu: ${product.brand || 'N/A'}</li>
                            <li>Loại sản phẩm: ${product.category || 'N/A'}</li>
                            <li>Bảo hành: ${product.warranty || '12 tháng'}</li>`
                        }
                    </ul>
                </div>
            </div>
        </div>
        
        <!-- Product Description Section -->
        <div class="row mt-5">
            <div class="col-12">
                <div class="product-description">
                    <h3>Mô tả sản phẩm</h3>
                    <div class="mt-3">
                        ${product.description || `<p>Đang cập nhật mô tả cho ${product.name}...</p>`}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Related Products Section -->
        <div class="row mt-5">
            <div class="col-12">
                <h3>Sản phẩm liên quan</h3>
                <div class="row mt-3" id="related-products">
                    <div class="col-12 text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Đang tải...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = detailHTML;

    // Thêm event listener cho nút thêm vào giỏ hàng
    const cartBtn = container.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = parseInt(this.dataset.productId);
            console.log('Cart button clicked for product:', productId);
            
            if (window.cart) {
                window.cart.addItem(productId);
                // Hiển thị thông báo thành công
                const toast = document.createElement('div');
                toast.className = 'toast show position-fixed top-0 end-0 m-3';
                toast.style.zIndex = '9999';
                toast.innerHTML = `
                    <div class="toast-header bg-success text-white">
                        <strong class="me-auto">Thông báo</strong>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body">
                        Đã thêm sản phẩm vào giỏ hàng!
                    </div>
                `;
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.remove();
                }, 3000);
            } else {
                console.error('Cart not initialized when button clicked');
                alert('Vui lòng đợi giỏ hàng được khởi tạo...');
            }
        });
    }
}

function updateMainImage(imageSrc) {
    console.log('Updating main image to:', imageSrc);
    const mainImg = document.getElementById('main-product-img');
    if (mainImg) {
        mainImg.src = imageSrc;
    } else {
        console.error('Cannot find main-product-img element');
    }
}

function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function loadRelatedProducts(category, currentProductId, brand, price) {
    const relatedProductsContainer = document.getElementById('related-products');
    if (!relatedProductsContainer) return;

    const fetchProducts = (url) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        return fetch(url, { signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`Lỗi HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(products => products.filter(p => p.id != currentProductId));
    };

    // Encode tham số URL để tránh lỗi ký tự đặc biệt
    const encodedCategory = encodeURIComponent(category);
    const encodedBrand = encodeURIComponent(brand || '');

    // Ưu tiên sản phẩm cùng thương hiệu
    fetchProducts(`http://localhost:3000/api/products?category=${encodedCategory}&brand=${encodedBrand}`)
        .then(products => {
            let relatedProducts = products.slice(0, 4);
            
            // Nếu không đủ 4 sản phẩm, lấy thêm theo giá
            if (relatedProducts.length < 4 && price > 0) {
                return fetchProducts(`http://localhost:3000/api/products?category=${encodedCategory}&price=${price}&priceRange=20`)
                    .then(priceBasedProducts => {
                        const combined = [...relatedProducts, ...priceBasedProducts]
                            .filter((p, index, self) => self.findIndex(p2 => p2.id === p.id) === index)
                            .slice(0, 4);
                        return combined;
                    });
            }
            return relatedProducts;
        })
        .then(relatedProducts => {
            if (relatedProducts.length === 0) {
                relatedProductsContainer.innerHTML = '<div class="col-12"><p>Không có sản phẩm liên quan</p></div>';
                return;
            }
            
            relatedProductsContainer.innerHTML = '';
            
            relatedProducts.forEach(product => {
                const imageUrl = product.images && product.images.length > 0 
                    ? product.images[0] 
                    : 'images/placeholder.jpg';
                
                const productElement = document.createElement('div');
                productElement.className = 'col-md-3 col-sm-6 mb-4';
                productElement.innerHTML = `
                    <div class="card product-card h-100">
                        <img src="${imageUrl}" class="card-img-top" alt="${product.name}">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text">${product.formattedPrice}</p>
                            <a href="product-detail.html?id=${product.id}" class="btn btn-primary mt-auto">Xem chi tiết</a>
                        </div>
                    </div>
                `;
                
                relatedProductsContainer.appendChild(productElement);
            });
        })
        .catch(error => {
            console.error('Lỗi khi tải sản phẩm liên quan:', error);
            const errorMessage = error.name === 'AbortError' 
                ? 'Server không phản hồi'
                : 'Lỗi tải sản phẩm liên quan';
            relatedProductsContainer.innerHTML = `<div class="col-12"><p>${errorMessage}</p></div>`;
        });
}