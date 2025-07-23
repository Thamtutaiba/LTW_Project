document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra đăng nhập
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  // Khởi tạo các biểu đồ
  initializeCharts();

  // Load dữ liệu ban đầu
  loadData();
});

// Khởi tạo các biểu đồ
function initializeCharts() {
  // Biểu đồ doanh thu
  const revenueCtx = document.getElementById("revenueChart").getContext("2d");
  window.revenueChart = new Chart(revenueCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Doanh thu",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  });

  // Biểu đồ sản phẩm bán chạy
  const topProductsCtx = document
    .getElementById("topProductsChart")
    .getContext("2d");
  window.topProductsChart = new Chart(topProductsCtx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Số lượng bán",
          data: [],
          backgroundColor: "rgba(54, 162, 235, 0.5)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  });

  // Biểu đồ phân khúc khách hàng
  const customerSegmentsCtx = document
    .getElementById("customerSegmentsChart")
    .getContext("2d");
  window.customerSegmentsChart = new Chart(customerSegmentsCtx, {
    type: "doughnut",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [
            "rgba(255, 99, 132, 0.5)",
            "rgba(54, 162, 235, 0.5)",
            "rgba(255, 206, 86, 0.5)",
            "rgba(75, 192, 192, 0.5)",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  });

  // Biểu đồ dự báo doanh thu
  const revenueForecastCtx = document
    .getElementById("revenueForecastChart")
    .getContext("2d");
  window.revenueForecastChart = new Chart(revenueForecastCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Doanh thu thực tế",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
        {
          label: "Dự báo",
          data: [],
          borderColor: "rgb(255, 99, 132)",
          borderDash: [5, 5],
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  });
}

// Load dữ liệu
async function loadData() {
  try {
    // Load tổng quan
    const overviewResponse = await fetch(
      "http://localhost:3000/api/admin/reports/overview",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!overviewResponse.ok) throw new Error("Lỗi tải dữ liệu tổng quan");
    const overview = await overviewResponse.json();
    updateOverview(overview);

    // Load doanh thu
    const revenueResponse = await fetch(
      "http://localhost:3000/api/admin/reports/revenue",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!revenueResponse.ok) throw new Error("Lỗi tải dữ liệu doanh thu");
    const revenue = await revenueResponse.json();
    updateRevenueChart(revenue);

    // Load sản phẩm bán chạy
    const topProductsResponse = await fetch(
      "http://localhost:3000/api/admin/reports/top-products",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!topProductsResponse.ok)
      throw new Error("Lỗi tải dữ liệu sản phẩm bán chạy");
    const topProducts = await topProductsResponse.json();
    updateTopProductsChart(topProducts);
    updateTopProductsTable(topProducts);

    // Load phân khúc khách hàng
    const customerSegmentsResponse = await fetch(
      "http://localhost:3000/api/admin/reports/customer-segments",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!customerSegmentsResponse.ok)
      throw new Error("Lỗi tải dữ liệu phân khúc khách hàng");
    const customerSegments = await customerSegmentsResponse.json();
    updateCustomerSegmentsChart(customerSegments);

    // Load dự báo doanh thu
    const revenueForecastResponse = await fetch(
      "http://localhost:3000/api/admin/reports/revenue-forecast",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!revenueForecastResponse.ok)
      throw new Error("Lỗi tải dữ liệu dự báo doanh thu");
    const revenueForecast = await revenueForecastResponse.json();
    updateRevenueForecastChart(revenueForecast);

    // Load khách hàng tiềm năng
    const potentialCustomersResponse = await fetch(
      "http://localhost:3000/api/admin/reports/potential-customers",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!potentialCustomersResponse.ok)
      throw new Error("Lỗi tải dữ liệu khách hàng tiềm năng");
    const potentialCustomers = await potentialCustomersResponse.json();
    updatePotentialCustomersTable(potentialCustomers);
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải dữ liệu: " + error.message);
  }
}

// Cập nhật tổng quan
function updateOverview(data) {
  document.getElementById("todayRevenue").textContent = formatPrice(
    data.today_revenue
  );
  document.getElementById("todayOrders").textContent = data.today_orders;
  document.getElementById("newCustomers").textContent = data.new_customers;
  document.getElementById("conversionRate").textContent =
    data.conversion_rate + "%";
}

// Cập nhật biểu đồ doanh thu
function updateRevenueChart(data) {
  window.revenueChart.data.labels = data.labels;
  window.revenueChart.data.datasets[0].data = data.values;
  window.revenueChart.update();
}

// Cập nhật biểu đồ sản phẩm bán chạy
function updateTopProductsChart(data) {
  window.topProductsChart.data.labels = data.map((item) => item.name);
  window.topProductsChart.data.datasets[0].data = data.map(
    (item) => item.quantity
  );
  window.topProductsChart.update();
}

// Cập nhật bảng sản phẩm bán chạy
function updateTopProductsTable(data) {
  const tableBody = document.getElementById("topProductsBody");
  tableBody.innerHTML = "";

  data.forEach((product) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>${formatPrice(product.revenue)}</td>
            <td>
                <span class="${
                  product.growth >= 0 ? "text-success" : "text-danger"
                }">
                    ${product.growth >= 0 ? "+" : ""}${product.growth}%
                </span>
            </td>
        `;
    tableBody.appendChild(row);
  });
}

// Cập nhật biểu đồ phân khúc khách hàng
function updateCustomerSegmentsChart(data) {
  window.customerSegmentsChart.data.labels = data.map((item) => item.segment);
  window.customerSegmentsChart.data.datasets[0].data = data.map(
    (item) => item.value
  );
  window.customerSegmentsChart.update();
}

// Cập nhật biểu đồ dự báo doanh thu
function updateRevenueForecastChart(data) {
  window.revenueForecastChart.data.labels = data.labels;
  window.revenueForecastChart.data.datasets[0].data = data.actual;
  window.revenueForecastChart.data.datasets[1].data = data.forecast;
  window.revenueForecastChart.update();
}

// Cập nhật bảng khách hàng tiềm năng
function updatePotentialCustomersTable(data) {
  const tableBody = document.getElementById("potentialCustomersBody");
  tableBody.innerHTML = "";

  data.forEach((customer) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${customer.name}</td>
            <td>${formatPrice(customer.potential_value)}</td>
            <td>${customer.purchase_probability}%</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewCustomerDetails(${
                  customer.id
                })">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
    tableBody.appendChild(row);
  });
}

// Thay đổi khoảng thời gian
function changeTimeRange(range) {
  // Cập nhật tham số thời gian và tải lại dữ liệu
  window.currentTimeRange = range;
  loadData();
}

// Hiển thị modal chọn khoảng thời gian tùy chỉnh
function showCustomDateRange() {
  const modal = new bootstrap.Modal(document.getElementById("dateRangeModal"));
  modal.show();
}

// Áp dụng khoảng thời gian tùy chỉnh
function applyCustomDateRange() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  if (!startDate || !endDate) {
    alert("Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc");
    return;
  }

  window.currentTimeRange = {
    start: startDate,
    end: endDate,
  };

  const modal = bootstrap.Modal.getInstance(
    document.getElementById("dateRangeModal")
  );
  modal.hide();
  loadData();
}

// Xuất báo cáo
async function exportReport(format) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/reports/export?format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Lỗi xuất báo cáo");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi xuất báo cáo: " + error.message);
  }
}

// Utility functions
function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function formatDateTime(dateTime) {
  return new Date(dateTime).toLocaleString("vi-VN");
}
