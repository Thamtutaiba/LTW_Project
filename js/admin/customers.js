document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra đăng nhập
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  // Load danh sách khách hàng
  loadCustomers();

  // Xử lý tìm kiếm và lọc
  document
    .getElementById("searchInput")
    .addEventListener("input", debounce(loadCustomers, 500));
  document
    .getElementById("tierFilter")
    .addEventListener("change", loadCustomers);
  document.getElementById("sortBy").addEventListener("change", loadCustomers);
});

// Load danh sách khách hàng
async function loadCustomers() {
  try {
    const searchQuery = document.getElementById("searchInput").value;
    const tier = document.getElementById("tierFilter").value;
    const sortBy = document.getElementById("sortBy").value;

    const response = await fetch(
      `/api/admin/customers?search=${searchQuery}&tier=${tier}&sort=${sortBy}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Lỗi tải danh sách khách hàng");
    }

    const customers = await response.json();
    const tableBody = document.getElementById("customersTableBody");
    tableBody.innerHTML = "";

    customers.forEach((customer) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${customer.id}</td>
                <td>${customer.fullname}</td>
                <td>${customer.email}</td>
                <td>${customer.phone || "Chưa cập nhật"}</td>
                <td>
                    <span class="badge ${getTierBadgeClass(customer.tier_id)}">
                        ${getTierName(customer.tier_id)}
                    </span>
                </td>
                <td>${customer.points}</td>
                <td>${customer.total_orders}</td>
                <td>${formatPrice(customer.total_spent)}</td>
                <td>
                    <button class="btn btn-sm btn-info me-1" onclick="viewCustomerDetails(${
                      customer.id
                    })">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning me-1" onclick="viewCustomerReviews(${
                      customer.id
                    })">
                        <i class="fas fa-star"></i>
                    </button>
                </td>
            `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải danh sách khách hàng: " + error.message);
  }
}

// Xem chi tiết khách hàng
async function viewCustomerDetails(customerId) {
  try {
    const response = await fetch(`/api/admin/customers/${customerId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Lỗi tải thông tin khách hàng");
    }

    const customer = await response.json();

    // Hiển thị thông tin cá nhân
    document.getElementById("customerInfo").innerHTML = `
            <p><strong>Tên:</strong> ${customer.fullname}</p>
            <p><strong>Email:</strong> ${customer.email}</p>
            <p><strong>Điện thoại:</strong> ${
              customer.phone || "Chưa cập nhật"
            }</p>
            <p><strong>Địa chỉ:</strong> ${
              customer.address || "Chưa cập nhật"
            }</p>
            <p><strong>Ngày tham gia:</strong> ${formatDateTime(
              customer.created_at
            )}</p>
        `;

    // Hiển thị thống kê
    document.getElementById("customerStats").innerHTML = `
            <p><strong>Hạng:</strong> ${getTierName(customer.tier_id)}</p>
            <p><strong>Điểm tích lũy:</strong> ${customer.points}</p>
            <p><strong>Số đơn hàng:</strong> ${customer.total_orders}</p>
            <p><strong>Tổng chi tiêu:</strong> ${formatPrice(
              customer.total_spent
            )}</p>
            <p><strong>Đơn hàng gần nhất:</strong> ${
              customer.last_order_date
                ? formatDateTime(customer.last_order_date)
                : "Chưa có"
            }</p>
        `;

    // Hiển thị lịch sử đơn hàng
    const orderHistoryBody = document.getElementById("orderHistoryBody");
    orderHistoryBody.innerHTML = "";

    customer.orders.forEach((order) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${order.id}</td>
                <td>${formatDateTime(order.created_at)}</td>
                <td>${formatPrice(order.total_amount)}</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(order.status)}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
            `;
      orderHistoryBody.appendChild(row);
    });

    // Hiển thị modal
    const modal = new bootstrap.Modal(
      document.getElementById("customerDetailsModal")
    );
    modal.show();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải thông tin khách hàng: " + error.message);
  }
}

// Xem đánh giá của khách hàng
async function viewCustomerReviews(customerId) {
  try {
    const response = await fetch(`/api/admin/customers/${customerId}/reviews`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Lỗi tải đánh giá");
    }

    const reviews = await response.json();
    const tableBody = document.getElementById("reviewsTableBody");
    tableBody.innerHTML = "";

    reviews.forEach((review) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${review.product_name}</td>
                <td>${generateStarRating(review.rating)}</td>
                <td>${review.comment || "Không có nhận xét"}</td>
                <td>${formatDateTime(review.created_at)}</td>
                <td>
                    <span class="badge ${getReviewStatusBadgeClass(
                      review.status
                    )}">
                        ${getReviewStatusText(review.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-success me-1" onclick="updateReviewStatus(${
                      review.id
                    }, 'approved')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="updateReviewStatus(${
                      review.id
                    }, 'rejected')">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    // Hiển thị modal
    const modal = new bootstrap.Modal(document.getElementById("reviewsModal"));
    modal.show();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải đánh giá: " + error.message);
  }
}

// Cập nhật trạng thái đánh giá
async function updateReviewStatus(reviewId, status) {
  try {
    const response = await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error("Lỗi cập nhật trạng thái đánh giá");
    }

    // Tải lại danh sách đánh giá
    const customerId =
      document.getElementById("reviewsModal").dataset.customerId;
    viewCustomerReviews(customerId);
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi cập nhật trạng thái đánh giá: " + error.message);
  }
}

// Hiển thị modal gửi email
function showSendEmailModal() {
  const modal = new bootstrap.Modal(document.getElementById("sendEmailModal"));
  modal.show();
}

// Gửi email thông báo
async function sendEmail() {
  const recipients = Array.from(
    document.getElementById("emailRecipients").selectedOptions
  ).map((option) => option.value);
  const subject = document.getElementById("emailSubject").value;
  const content = document.getElementById("emailContent").value;

  try {
    const response = await fetch("/api/admin/notifications/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        recipients,
        subject,
        content,
      }),
    });

    if (!response.ok) {
      throw new Error("Lỗi gửi email");
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("sendEmailModal")
    );
    modal.hide();
    alert("Gửi email thành công");
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi gửi email: " + error.message);
  }
}

// Hiển thị modal phân loại khách hàng
function showCustomerTierModal() {
  loadCustomerTiers();
  const modal = new bootstrap.Modal(
    document.getElementById("customerTierModal")
  );
  modal.show();
}

// Load danh sách hạng khách hàng
async function loadCustomerTiers() {
  try {
    const response = await fetch("/api/admin/customers/tiers", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Lỗi tải danh sách hạng khách hàng");
    }

    const tiers = await response.json();
    const tableBody = document.getElementById("tierTableBody");
    tableBody.innerHTML = "";

    tiers.forEach((tier) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${tier.name}</td>
                <td>${tier.min_points}</td>
                <td>${tier.discount_percent}%</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="editTier(${tier.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTier(${tier.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải danh sách hạng khách hàng: " + error.message);
  }
}

// Hiển thị modal thêm hạng mới
function showAddTierModal() {
  document.getElementById("tierForm").reset();
  const modal = new bootstrap.Modal(document.getElementById("addTierModal"));
  modal.show();
}

// Lưu hạng khách hàng
async function saveTier() {
  const data = {
    name: document.getElementById("tierName").value,
    min_points: document.getElementById("minPoints").value,
    discount_percent: document.getElementById("discountPercent").value,
    description: document.getElementById("tierDescription").value,
  };

  try {
    const response = await fetch("/api/admin/customers/tiers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Lỗi lưu hạng khách hàng");
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("addTierModal")
    );
    modal.hide();
    loadCustomerTiers();
    alert("Thêm hạng khách hàng thành công");
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi lưu hạng khách hàng: " + error.message);
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

function getTierBadgeClass(tierId) {
  switch (tierId) {
    case 1:
      return "bg-secondary";
    case 2:
      return "bg-info";
    case 3:
      return "bg-warning";
    case 4:
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}

function getTierName(tierId) {
  switch (tierId) {
    case 1:
      return "Đồng";
    case 2:
      return "Bạc";
    case 3:
      return "Vàng";
    case 4:
      return "Kim cương";
    default:
      return "Chưa phân hạng";
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "pending":
      return "bg-warning";
    case "processing":
      return "bg-info";
    case "shipping":
      return "bg-primary";
    case "completed":
      return "bg-success";
    case "cancelled":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}

function getStatusText(status) {
  switch (status) {
    case "pending":
      return "Chờ xử lý";
    case "processing":
      return "Đang xử lý";
    case "shipping":
      return "Đang giao hàng";
    case "completed":
      return "Hoàn thành";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
}

function getReviewStatusBadgeClass(status) {
  switch (status) {
    case "pending":
      return "bg-warning";
    case "approved":
      return "bg-success";
    case "rejected":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}

function getReviewStatusText(status) {
  switch (status) {
    case "pending":
      return "Chờ duyệt";
    case "approved":
      return "Đã duyệt";
    case "rejected":
      return "Đã từ chối";
    default:
      return status;
  }
}

function generateStarRating(rating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      stars += '<i class="fas fa-star text-warning"></i>';
    } else {
      stars += '<i class="far fa-star text-warning"></i>';
    }
  }
  return stars;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
