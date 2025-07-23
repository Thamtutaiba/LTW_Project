document.addEventListener('DOMContentLoaded', function() {
    const brandsContainer = document.getElementById('brands-container');
    if (!brandsContainer) {
        console.error('Không tìm thấy phần tử brands-container');
        return;
    }

    const category = brandsContainer.dataset.category || 'dap'; // Mặc định là 'dap'

    // Lấy danh sách brand từ API
    fetch(`http://localhost:3000/api/brands?category=${category}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi kết nối tới API');
            }
            return response.json();
        })
        .then(brands => {
            brandsContainer.innerHTML = ''; // Xóa nội dung "Đang tải thương hiệu..."

            brands.forEach(brand => {
                const brandId = `sp-${brand.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                const sectionHtml = `
                    <section class="section" id="${brand.toLowerCase()}">
                        <div class="container">
                            <header class="section-header">
                                <h2>${brand}</h2>
                                <p>Thương hiệu ${category.toUpperCase()} nổi tiếng</p>
                            </header>
                            <div class="row">
                                <div class="col-lg-12">
                                    <div class="owl-carousel owl-theme" id="${brandId}">
                                        <p>Đang tải sản phẩm...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                `;
                brandsContainer.insertAdjacentHTML('beforeend', sectionHtml);

                // Tải sản phẩm cho brand này
                loadProductsByBrand(brand, category, brandId);
            });
        })
        .catch(error => {
            console.error('Lỗi khi tải danh sách thương hiệu:', error);
            brandsContainer.innerHTML = '<p>Lỗi tải thương hiệu</p>';
        });
});


function renderProductsToCarousel(products, carouselId) {
    console.log(`Rendering ${products.length} products to carousel #${carouselId}`);
    const carouselElement = document.getElementById(carouselId);
    if (!carouselElement) return;

    // Xóa nội dung cũ
    carouselElement.innerHTML = '';

    // Lọc sản phẩm trùng lặp
    const uniqueProducts = products.filter((product, index, self) =>
        index === self.findIndex((p) => p.id === product.id)
    );

    // Tạo các phần tử sản phẩm
    uniqueProducts.forEach(product => {
        console.log(`Creating element for product ${product.id}: ${product.name}`);
        const productId = product.id;
        const productCategory = product.category;
        const imageUrl = product.images && product.images.length > 0 ? product.images[0] : 'images/placeholder.jpg';
        const detailUrl = `product-detail.html?id=${productId}&category=${productCategory}`;
        
        const productElement = document.createElement('div');
        productElement.className = 'item';
        
        productElement.innerHTML = `
            <div class="hinh">
                <img src="${imageUrl}" alt="${product.name}" />
                <div class="social">
                    <a href="${detailUrl}" class="view-btn" data-product-id="${productId}" data-category="${productCategory}">
                        <i class="fas fa-eye"></i>
                    </a>
                    <a href="#" class="favorite-btn" data-product-id="${productId}">
                        <i class="fas fa-star"></i>
                    </a>
                    <a href="#" class="cart-btn" data-product-id="${productId}">
                        <i class="fas fa-shopping-cart"></i>
                    </a>
                </div>
            </div>
            <p class="d-flex justify-content-between">
                <b>${product.name}</b>
                <b>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                </b>
            </p>
            <p class="product-price">${product.formattedPrice}</p>
        `;
        
        carouselElement.appendChild(productElement);
    });
    
    // Thêm event listener để debug khi click vào nút xem chi tiết
    $(carouselElement).find('.view-btn').on('click', function(e) {
        const productId = $(this).data('product-id');
        const category = $(this).data('category');
        console.log(`View button clicked for product ID: ${productId}, category: ${category}`);
    });

    // Thêm event listener cho nút thêm vào giỏ hàng
    $(carouselElement).find('.cart-btn').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const productId = parseInt($(this).data('product-id'));
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
    
    $(document).ready(function(){
        $(`#${carouselId}`).trigger('destroy.owl.carousel');
        $(`#${carouselId}`).owlCarousel({
            loop: uniqueProducts.length >= 3,
            margin: 10,
            nav: uniqueProducts.length >= 3,
            navText: [
                '<i class="fas fa-chevron-left"></i>',
                '<i class="fas fa-chevron-right"></i>'
            ],
            autoplay: true,
            autoplayTimeout: 3000,
            autoplayHoverPause: true,
            responsive: {
                0: {
                    items: 1
                },
                600: {
                    items: 2
                },
                1000: {
                    items: 4
                }
            }
        });
    });
}

function loadProductsByBrand(brand, category, carouselId) {
    const encodedBrand = encodeURIComponent(brand);
    fetch(`http://localhost:3000/api/products?category=${category}&brand=${encodedBrand}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi kết nối tới API');
            }
            return response.json();
        })
        .then(products => {
            renderProductsToCarousel(products, carouselId);
        })
        .catch(error => {
            console.error('Lỗi khi tải sản phẩm:', error);
            const carouselElement = document.getElementById(carouselId);
            if (carouselElement) {
                carouselElement.innerHTML = '<p>Lỗi tải sản phẩm</p>';
            }
        });
}