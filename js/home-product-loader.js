// js/home-product-loader.js

document.addEventListener('DOMContentLoaded', function() {
  // Đảm bảo cart đã được khởi tạo
  if (!window.cart) {
    console.log('Waiting for cart initialization...');
    const checkCartInterval = setInterval(() => {
      if (window.cart) {
        console.log('Cart is now initialized');
        clearInterval(checkCartInterval);
        initializeProducts();
      }
    }, 100);
  } else {
    initializeProducts();
  }

  function initializeProducts() {
    // Sản phẩm mới
    fetch('http://localhost:3000/api/products/latest')
      .then(res => res.json())
      .then(products => {
        renderProductsToCarousel(products, 'sp-headphone');
      })
      .catch(error => {
        document.getElementById('sp-headphone').innerHTML = '<p>Lỗi tải sản phẩm mới</p>';
      });

    // Sản phẩm hot
    fetch('http://localhost:3000/api/products/hot')
      .then(res => res.json())
      .then(products => {
        renderProductsToCarousel(products, 'sp-hot-headphone');
      })
      .catch(error => {
        document.getElementById('sp-hot-headphone').innerHTML = '<p>Lỗi tải sản phẩm hot</p>';
      });
  }

  function renderProductsToCarousel(products, carouselId) {
    const carouselElement = document.getElementById(carouselId);
    if (!carouselElement) return;

    // Xóa nội dung cũ
    carouselElement.innerHTML = '';

    // Tạo các phần tử sản phẩm
    products.forEach(product => {
      const imageUrl = product.images && product.images.length > 0 ? product.images[0] : 'images/placeholder.jpg';
      const detailUrl = `product-detail.html?id=${product.id}&category=${product.category}`;
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div class="hinh">
          <img src="${imageUrl}" alt="${product.name}" />
          <div class="social">
            <a href="${detailUrl}" class="view-btn"><i class="fas fa-eye"></i></a>
            <a href="#"><i class="fas fa-star"></i></a>
            <a href="#" class="cart-btn" data-product-id="${product.id}">
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
      carouselElement.appendChild(item);
    });

    // Khởi tạo carousel trước
    $(`#${carouselId}`).trigger('destroy.owl.carousel');
    $(`#${carouselId}`).owlCarousel({
      loop: products.length >= 4,
      margin: 10,
      nav: true,
      navText: [
        '<i class="fas fa-chevron-left"></i>',
        '<i class="fas fa-chevron-right"></i>'
      ],
      autoplay: true,
      autoplayTimeout: 3000,
      autoplayHoverPause: true,
      responsive: {
        0: { items: 1 },
        600: { items: 2 },
        1000: { items: 4 }
      }
    });

    // Thêm event listener cho nút thêm vào giỏ hàng
    carouselElement.querySelectorAll('.cart-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const productId = parseInt(this.dataset.productId);
        console.log('Cart button clicked for product:', productId); // Debug log
        
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
          console.error('Cart not initialized when button clicked'); // Debug log
          alert('Vui lòng đợi giỏ hàng được khởi tạo...');
        }
      });
    });
  }
});

// Hàm hiển thị toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-header">
      <strong class="me-auto">Thông báo</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      ${message}
    </div>
  `;
  document.body.appendChild(toast);
  
  const bsToast = new bootstrap.Toast(toast, {
    animation: true,
    autohide: true,
    delay: 3000
  });
  bsToast.show();
  
  // Xóa toast khỏi DOM sau khi ẩn
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}
