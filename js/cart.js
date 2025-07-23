// Cart management
class Cart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cart')) || [];
        this.updateCartCount();
        this.loadCartItems();
        this.setupEventListeners();
        console.log('Cart initialized with items:', this.items); // Debug log
    }

    // Update cart count in navbar
    updateCartCount() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = this.items.reduce((total, item) => total + item.quantity, 0);
        }
    }

    // Load cart items from localStorage
    loadCartItems() {
        const cartItemsContainer = document.getElementById('cartItems');
        if (!cartItemsContainer) return;

        if (this.items.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Giỏ hàng của bạn đang trống</p>
                    <a href="Product.html" class="continue-shopping">Tiếp tục mua sắm</a>
                </div>
            `;
            this.updateSummary(0, 0);
            return;
        }

        // Fetch product details for each item
        Promise.all(this.items.map(item => 
            fetch(`http://localhost:3000/api/product/${item.id}`)
                .then(res => res.json())
                .then(product => ({
                    ...item,
                    product: product // Gán dữ liệu product đã fetch vào item
                }))
                .catch(error => {
                    console.error(`Error fetching product ${item.id}:`, error);
                    return {...item, product: null}; // Trả về item với product là null nếu fetch lỗi
                })
        )).then(itemsWithDetails => {
            console.log('Fetched items with details:', itemsWithDetails); // Log dữ liệu sau fetch
            // Lọc bỏ các mục không có dữ liệu product hợp lệ nếu cần thiết
            const validItems = itemsWithDetails.filter(item => item.product && typeof item.product.price !== 'undefined');
            
            if (validItems.length !== itemsWithDetails.length) {
                 console.warn('Some items could not fetch product details and were removed:', itemsWithDetails.length - validItems.length);
            }

            // Cập nhật lại this.items với thông tin product đầy đủ (chỉ các mục hợp lệ)
            this.items = validItems;
            this.renderCartItems(this.items); // Render với dữ liệu đầy đủ và hợp lệ
            this.updateSummary(); // Chỉ gọi updateSummary sau khi dữ liệu đã fetch và lọc
        }).catch(error => {
            console.error('Error during Promise.all for cart items:', error);
            cartItemsContainer.innerHTML = '<div class="alert alert-danger">Lỗi khi tải giỏ hàng</div>';
        });
    }

    // Render cart items
    renderCartItems(items) {
        const cartItemsContainer = document.getElementById('cartItems');
        if (!cartItemsContainer) return;

        cartItemsContainer.innerHTML = items.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.product.images[0] || 'images/placeholder.jpg'}" 
                     alt="${item.product.name}" 
                     class="cart-item-image">
                <div class="cart-item-details">
                    <h3 class="cart-item-title">${item.product.name}</h3>
                    <div class="cart-item-price">${item.product.formattedPrice}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn decrease">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1">
                        <button class="quantity-btn increase">+</button>
                    </div>
                </div>
                <div class="cart-item-actions">
                    <i class="fas fa-trash remove-item"></i>
                </div>
            </div>
        `).join('');

        // Add event listeners for quantity buttons and remove button
        this.setupItemEventListeners();
    }

    // Setup event listeners for cart items
    setupItemEventListeners() {
        const cartItemsContainer = document.getElementById('cartItems');
        if (!cartItemsContainer) return;

        // Xử lý sự kiện click cho nút tăng giảm và xóa
        cartItemsContainer.addEventListener('click', (e) => {
            const cartItem = e.target.closest('.cart-item');
            if (!cartItem) return;

            const itemId = parseInt(cartItem.dataset.id);
            
            if (e.target.classList.contains('decrease') || e.target.closest('.decrease')) {
                this.updateQuantity(itemId, -1);
            } else if (e.target.classList.contains('increase') || e.target.closest('.increase')) {
                this.updateQuantity(itemId, 1);
            } else if (e.target.classList.contains('remove-item') || e.target.closest('.remove-item')) {
                this.removeItem(itemId);
            }
        });

        // Xử lý sự kiện thay đổi số lượng từ input
        cartItemsContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('quantity-input')) {
                const cartItem = e.target.closest('.cart-item');
                if (!cartItem) return;

                const itemId = parseInt(cartItem.dataset.id);
                const newQuantity = parseInt(e.target.value);
                if (newQuantity > 0) {
                    this.setQuantity(itemId, newQuantity);
                }
            }
        });
    }

    // Update item quantity
    updateQuantity(itemId, change) {
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return;

        const newQuantity = this.items[itemIndex].quantity + change;
        if (newQuantity < 1) return;

        this.items[itemIndex].quantity = newQuantity;
        this.saveCart();

        // Cập nhật UI trực tiếp
        const cartItem = document.querySelector(`.cart-item[data-id="${itemId}"]`);
        if (cartItem) {
            const quantityInput = cartItem.querySelector('.quantity-input');
            if (quantityInput) {
                quantityInput.value = newQuantity;
            }
        }

        // Cập nhật tổng tiền
        this.updateSummary();
    }

    // Set item quantity
    setQuantity(itemId, quantity) {
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return;

        if (quantity < 1) quantity = 1;
        this.items[itemIndex].quantity = quantity;
        this.saveCart();
        this.updateSummary();
    }

    // Remove item from cart
    removeItem(itemId) {
        const cartItem = document.querySelector(`.cart-item[data-id="${itemId}"]`);
        if (cartItem) {
            // Thêm hiệu ứng fade out
            cartItem.style.transition = 'all 0.3s ease';
            cartItem.style.opacity = '0';
            cartItem.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                this.items = this.items.filter(item => parseInt(item.id) !== itemId);
                this.saveCart();
                this.loadCartItems();
            }, 300);
        }
    }

    // Add item to cart
    addItem(productId, quantity = 1) {
        console.log('Adding item to cart:', productId, quantity); // Debug log
        const existingItem = this.items.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({ id: productId, quantity });
        }

        this.saveCart();
        this.loadCartItems();
        console.log('Cart after adding item:', this.items); // Debug log
    }

    // Save cart to localStorage
    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.items));
        this.updateCartCount();
    }

    // Update cart summary
    updateSummary() {
        const subtotal = this.items.reduce((total, item) => {
            // Kiểm tra xem chi tiết sản phẩm đã có chưa và giá có hợp lệ không
            if (!item.product || typeof item.product.price === 'undefined') {
                console.warn('Product details or price missing for item:', item);
                return total;
            }
            
            // Chuyển giá sản phẩm sang dạng số trước khi tính toán
            const price = parseFloat(item.product.price);
            if (isNaN(price)) {
                 console.error('Invalid price for item:', item.product.price);
                 return total;
            }

            return total + (price * item.quantity);
        }, 0);

        const shipping = subtotal > 0 ? 30000 : 0; // Phí vận chuyển 30,000đ
        const total = subtotal + shipping;

        const subtotalElement = document.getElementById('subtotal');
        const shippingElement = document.getElementById('shipping');
        const totalElement = document.getElementById('total');

        if (subtotalElement) subtotalElement.textContent = this.formatPrice(subtotal) + 'đ';
        if (shippingElement) shippingElement.textContent = this.formatPrice(shipping) + 'đ';
        if (totalElement) totalElement.textContent = this.formatPrice(total) + 'đ';
    }

    // Format price
    formatPrice(price) {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // Setup event listeners
    setupEventListeners() {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                if (this.items.length === 0) {
                    alert('Giỏ hàng của bạn đang trống!');
                    return;
                }

                // Check login status
                const user = JSON.parse(localStorage.getItem('user'));
                const token = localStorage.getItem('token');
                if (!user || !token) {
                    alert('Vui lòng đăng nhập để thực hiện thanh toán!');
                    window.location.href = 'login.html';
                    return;
                }

                // Kiểm tra tồn kho trước khi thanh toán
                let hasStockIssue = false;
                for (const item of this.items) {
                    if (!item.product || typeof item.product.inventory === 'undefined') {
                        console.error('Thông tin tồn kho không có sẵn cho sản phẩm:', item);
                        alert('Không thể xác thực tồn kho, vui lòng thử lại.');
                        return; // Dừng nếu thiếu dữ liệu
                    }

                    if (item.product.inventory <= 0 || item.quantity > item.product.inventory) {
                        hasStockIssue = true;
                        break;
                    }
                }

                if (hasStockIssue) {
                    alert('Rất tiếc, sản phẩm mà bạn chọn hiện không có đủ');
                } else {
                    // Chuyển đến trang thanh toán
                    window.location.href = 'checkout.html';
                }
            });
        }
    }
}

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (!window.cart) {
        window.cart = new Cart();
        console.log('Cart initialized globally'); // Debug log
    }
});