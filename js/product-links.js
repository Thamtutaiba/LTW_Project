// Tìm tất cả các thẻ <a> có icon con mắt và gán href dựa trên data-id
document.addEventListener('DOMContentLoaded', () => {
    const eyeIcons = document.querySelectorAll('a[data-id]');
    eyeIcons.forEach(icon => {
      const productId = icon.getAttribute('data-id');
      icon.setAttribute('href', `product.html?id=${productId}`);
    });
  });