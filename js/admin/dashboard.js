document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    // Khởi tạo các biểu đồ
    initializeCharts();
    
    // Load dữ liệu ban đầu
    loadData();

    // Tự động cập nhật dữ liệu mỗi 5 phút
    setInterval(loadData, 300000);
});

// Khởi tạo các biểu đồ
function initializeCharts() {
    // Biểu đồ doanh thu
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    window.revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Doanh thu',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });

    // Biểu đồ trạng thái đơn hàng
    const orderStatusCtx = document.getElementById('orderStatusChart').getContext('2d');
    window.orderStatusChart = new Chart(orderStatusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Chờ xác nhận', 'Đang xử lý', 'Đang giao hàng', 'Hoàn thành', 'Đã hủy'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(75, 192, 75, 0.5)',
                    'rgba(255, 99, 132, 0.5)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// Load dữ liệu
async function loadData() {
    showLoading();
    try {
        const overviewResponse = await fetch('http://localhost:3000/api/admin/dashboard/overview?timeRange=today', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!overviewResponse.ok) throw new Error('Lỗi tải dữ liệu tổng quan');
        const data = await overviewResponse.json();

        // Cập nhật tổng quan
        updateOverview(data);
        // Cập nhật biểu đồ doanh thu
        updateRevenueChart(data.revenue_chart);
        // Cập nhật biểu đồ trạng thái đơn hàng
        updateOrderStatusChart(data.order_status_stats);
        // Cập nhật bảng đơn hàng gần đây
        updateRecentOrdersTable(data.recent_orders);
        // Cập nhật bảng sản phẩm sắp hết hàng
        updateLowStockTable(data.low_stock_products);
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra khi tải dữ liệu: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Cập nhật tổng quan
function updateOverview(data) {
    document.getElementById('todayRevenue').textContent = formatPrice(data.today_revenue);
    document.getElementById('newOrders').textContent = data.new_orders;
    document.getElementById('newCustomers').textContent = data.new_customers;
    document.getElementById('lowStock').textContent = data.low_stock_products ? data.low_stock_products.length : 0;
}

// Cập nhật biểu đồ doanh thu
function updateRevenueChart(revenue_chart) {
    if (!window.revenueChart) return;
    window.revenueChart.data.labels = revenue_chart.map(r => formatDate(r.date));
    window.revenueChart.data.datasets[0].data = revenue_chart.map(r => r.revenue);
    window.revenueChart.update();
}

// Cập nhật biểu đồ trạng thái đơn hàng
function updateOrderStatusChart(order_status_stats) {
    if (!window.orderStatusChart) return;
    // Map trạng thái về đúng thứ tự: pending, processing, shipping, completed, cancelled
    const statusOrder = ['pending', 'processing', 'shipping', 'completed', 'cancelled'];
    const statusCounts = statusOrder.map(status => {
        const found = order_status_stats.find(s => s.status === status);
        return found ? found.count : 0;
    });
    window.orderStatusChart.data.datasets[0].data = statusCounts;
    window.orderStatusChart.update();
}

// Cập nhật bảng đơn hàng gần đây
function updateRecentOrdersTable(orders) {
    const tableBody = document.getElementById('recentOrdersBody');
    tableBody.innerHTML = '';
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.username || order.customer_name || ''}</td>
            <td>${formatPrice(order.total_amount)}</td>
            <td>
                <span class="badge ${getOrderStatusBadgeClass(order.status)}">
                    ${getOrderStatusText(order.status)}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewOrderDetails(${order.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Cập nhật bảng sản phẩm sắp hết hàng
function updateLowStockTable(products) {
    const tableBody = document.getElementById('lowStockBody');
    tableBody.innerHTML = '';
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>
                <span class="badge ${getStockBadgeClass(product.inventory)}">
                    ${product.inventory}
                </span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Làm mới dữ liệu
function refreshData() {
    loadData();
}

// Thay đổi khoảng thời gian
function changeTimeRange(range) {
    window.currentTimeRange = range;
    loadData();
}

// Xem chi tiết đơn hàng
function viewOrderDetails(orderId) {
    window.location.href = `orders.html?id=${orderId}`;
}

// Cập nhật tồn kho
function updateStock(productId) {
    window.location.href = `products.html?id=${productId}`;
}

// Utility functions
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

function formatGrowth(growth) {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth}%`;
}

function getOrderStatusBadgeClass(status) {
    const classes = {
        'pending': 'bg-warning',
        'processing': 'bg-info',
        'shipping': 'bg-primary',
        'completed': 'bg-success',
        'cancelled': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
}

function getOrderStatusText(status) {
    const texts = {
        'pending': 'Chờ xác nhận',
        'processing': 'Đang xử lý',
        'shipping': 'Đang giao hàng',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    return texts[status] || status;
}

function getStockBadgeClass(quantity) {
    if (quantity <= 0) return 'bg-danger';
    if (quantity <= 10) return 'bg-warning';
    return 'bg-success';
}

function showLoading() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) loading.style.display = 'flex';
}

function hideLoading() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) loading.style.display = 'none';
} 