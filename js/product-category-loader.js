// js/product-category-loader.js

document.addEventListener('DOMContentLoaded', function() {
  // Danh sách category cần load
  const categories = [
    {id: 'sp-dap', apiCat: 'dap'},
    {id: 'sp-dac-amp', apiCat: 'dacamp'},
    {id: 'sp-cables', apiCat: 'cable'},
    {id: 'sp-acess', apiCat: 'accessory'},
    {id: 'sp-headphone', apiCat: 'headphone'}
  ];

  categories.forEach(cat => {
    fetch(`http://localhost:3000/api/products?category=${cat.apiCat}`)
      .then(res => res.json())
      .then(products => {
        // Lấy 5 sản phẩm mới nhất (id lớn nhất)
        products.sort((a, b) => b.id - a.id);
        const latestProducts = products.slice(0, 5);
        renderProductsToCarousel(latestProducts, cat.id);
      })
      .catch(error => {
        const carousel = document.getElementById(cat.id);
        if (carousel) carousel.innerHTML = '<p>Lỗi tải sản phẩm</p>';
      });
  });

  function renderProductsToCarousel(products, carouselId) {
    const carouselElement = document.getElementById(carouselId);
    if (!carouselElement) return;
    carouselElement.innerHTML = '';
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
            <a href="#" class="cart-btn" data-product-id="${product.id}"><i class="fas fa-shopping-cart"></i></a>
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

    // Khởi tạo lại carousel
    $(`#${carouselId}`).trigger('destroy.owl.carousel');
    $(`#${carouselId}`).owlCarousel({
      loop: products.length >= 3,
      margin: 10,
      nav: products.length >= 3,
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
        const productId = parseInt(this.dataset.productId);
        if (window.cart) {
          window.cart.addItem(productId);
          // Hiển thị thông báo thành công
          const toast = document.createElement('div');
          toast.className = 'toast show';
          toast.innerHTML = `
            <div class="toast-header">
              <strong class="me-auto">Thông báo</strong>
              <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
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
          alert('Vui lòng đợi giỏ hàng được khởi tạo!');
        }
      });
    });
  }
});
