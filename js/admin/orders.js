document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra đăng nhập
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  // Kiểm tra token hợp lệ
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));

      // Kiểm tra thời gian hết hạn
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.log("Token đã hết hạn");
        localStorage.removeItem("token");
        window.location.href = "../login.html";
        return;
      }

      // Kiểm tra quyền
      if (
        !payload.role ||
        (payload.role !== "admin" && payload.role !== "super_admin")
      ) {
        console.log("Không có quyền admin");
        window.location.href = "../login.html";
        return;
      }
    }
  } catch (e) {
    console.error("Lỗi khi parse JWT:", e);
    window.location.href = "../login.html";
    return;
  }

  // Load danh sách đơn hàng
  loadOrders();

  // Xử lý tìm kiếm và lọc
  document
    .getElementById("searchInput")
    .addEventListener("input", debounce(loadOrders, 500));
  document
    .getElementById("statusFilter")
    .addEventListener("change", loadOrders);
  document.getElementById("dateFilter").addEventListener("change", loadOrders);
});

// Load danh sách đơn hàng
async function loadOrders() {
  try {
    const searchQuery = document.getElementById("searchInput").value || "";
    const status = document.getElementById("statusFilter").value || "";
    const date = document.getElementById("dateFilter").value || "";
    const token = localStorage.getItem("token");

    console.log(
      `Đang tải đơn hàng với bộ lọc: search=${searchQuery}, status=${status}, date=${date}`
    );

    const response = await fetch(
      `http://localhost:3000/api/admin/orders?search=${encodeURIComponent(
        searchQuery
      )}&status=${encodeURIComponent(status)}&date=${encodeURIComponent(date)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("Response status:", response.status, response.statusText);

    // Xử lý lỗi xác thực
    if (response.status === 401 || response.status === 403) {
      console.log("Lỗi xác thực - chuyển hướng đến trang đăng nhập");
      localStorage.removeItem("token");
      alert(
        "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại."
      );
      window.location.href = "../login.html";
      return;
    }

    if (!response.ok) {
      throw new Error(`Lỗi tải danh sách đơn hàng: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Đã nhận dữ liệu đơn hàng:", data);

    // Extract the orders array from the response
    const orders = data.orders || [];

    const tableBody = document.getElementById("ordersTableBody");
    if (!tableBody) {
      console.error("Không tìm thấy phần tử ordersTableBody");
      return;
    }

    tableBody.innerHTML = "";

    if (orders.length === 0) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Không có đơn hàng nào</td>
                </tr>
            `;
      return;
    }

    orders.forEach((order) => {
      const row = document.createElement("tr");
      row.setAttribute("data-order-id", order.id || order._id);
      row.innerHTML = `
                <td>${order.order_code || order.id || order._id || ""}</td>
                <td>
                    <div class="customer-cell">
                        <strong>${
                          order.address_name ||
                          order.shipping_name ||
                          "Không có tên"
                        }</strong>
                        <br>
                        <small class="text-muted">${
                          order.address_phone ||
                          order.shipping_phone ||
                          "Không có SĐT"
                        }</small>
                    </div>
                </td>
                <td>${formatDateTime(order.created_at || order.createdAt)}</td>
                <td>${formatPrice(
                  order.total_amount || order.totalAmount || 0
                )}</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(order.status)}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info me-1" onclick="viewOrderDetails('${
                      order.id || order._id
                    }')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${
                      order.status === "pending"
                        ? `
                    <button class="btn btn-sm btn-success me-1" onclick="confirmOrder('${
                      order.id || order._id
                    }')">
                        <i class="fas fa-check"></i> Xác nhận
                    </button>
                    `
                        : ""
                    }
                    ${
                      order.status === "processing"
                        ? `
                    <button class="btn btn-sm btn-danger me-1" onclick="cancelOrder('${
                      order.id || order._id
                    }')">
                        <i class="fas fa-times"></i> Hủy đơn
                    </button>
                    `
                        : ""
                    }
                    ${
                      order.status === "processing"
                        ? `
                    <button class="btn btn-sm btn-primary me-1" onclick="initiateShipping('${
                      order.id || order._id
                    }')">
                        <i class="fas fa-truck"></i> Vận chuyển
                    </button>
                    `
                        : ""
                    }
                    ${
                      order.status === "processing" ||
                      order.status === "shipping"
                        ? `
                    <button class="btn btn-sm btn-warning me-1" onclick="manageShippingStatus('${
                      order.id || order._id
                    }')">
                        <i class="fas fa-shipping-fast"></i> Trạng thái vận chuyển
                    </button>
                    `
                        : ""
                    }
                    <button class="btn btn-sm btn-success me-1" onclick="printInvoice('${
                      order.id || order._id
                    }')">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="btn btn-sm btn-danger me-1" onclick="deleteOrder('${
                      order.id || order._id
                    }')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Lỗi:", error);
    const tableBody = document.getElementById("ordersTableBody");
    if (tableBody) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        <div class="alert alert-danger">
                            Có lỗi xảy ra khi tải danh sách đơn hàng: ${error.message}
                            <button class="btn btn-sm btn-primary mt-2" onclick="loadMockOrders()">
                                Tải dữ liệu mẫu
                            </button>
                        </div>
                    </td>
                </tr>
            `;
    }
  }
}

// Xem chi tiết đơn hàng
async function viewOrderDetails(orderId) {
  try {
    console.log(`Đang tải chi tiết đơn hàng ID: ${orderId}`);
    const token = localStorage.getItem("token");

    const response = await fetch(
      `http://localhost:3000/api/admin/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("Response status:", response.status, response.statusText);

    // Xử lý lỗi xác thực
    if (response.status === 401 || response.status === 403) {
      console.log("Lỗi xác thực - chuyển hướng đến trang đăng nhập");
      localStorage.removeItem("token");
      alert(
        "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại."
      );
      window.location.href = "../login.html";
      return;
    }

    if (response.status === 404) {
      alert("Không tìm thấy đơn hàng");
      return;
    }

    if (!response.ok) {
      throw new Error(`Lỗi tải thông tin đơn hàng: ${response.statusText}`);
    }

    const order = await response.json();
    console.log("Chi tiết đơn hàng:", order);

    // Hiển thị thông tin giao hàng (từ đơn hàng, không phải thông tin cá nhân)
    const customerInfo = document.getElementById("customerInfo");
    if (customerInfo) {
      customerInfo.innerHTML = `
                <div class="shipping-info-section">
                    <h6 class="text-primary mb-3">
                        <i class="fas fa-shipping-fast me-2"></i>Thông tin giao hàng
                    </h6>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Người nhận:</strong> ${
                              order.address_name ||
                              order.shipping_name ||
                              "Không có tên"
                            }</p>
                            <p><strong>Số điện thoại:</strong> ${
                              order.address_phone ||
                              order.shipping_phone ||
                              "Không có SĐT"
                            }</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Địa chỉ giao hàng:</strong></p>
                            <p class="text-muted">${
                              order.address_detail &&
                              order.ward_name &&
                              order.district_name &&
                              order.province_name
                                ? `${order.address_detail}, ${order.ward_name}, ${order.district_name}, ${order.province_name}`
                                : order.shipping_address || "Không có địa chỉ"
                            }</p>
                        </div>
                    </div>
                </div>
                <hr>
                <div class="customer-info-section">
                    <h6 class="text-secondary mb-3">
                        <i class="fas fa-user me-2"></i>Thông tin khách hàng
                    </h6>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Tên đăng nhập:</strong> ${
                              order.username || "Không có"
                            }</p>
                            <p><strong>Email:</strong> ${
                              order.email ||
                              order.user?.email ||
                              "Không có email"
                            }</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Họ tên:</strong> ${
                              order.user_fullname || "Chưa cập nhật"
                            }</p>
                            <p><strong>SĐT cá nhân:</strong> ${
                              order.phone || "Chưa cập nhật"
                            }</p>
                        </div>
                    </div>
                </div>
            `;
    } else {
      console.error("Không tìm thấy phần tử customerInfo");
    }

    // Hiển thị thông tin đơn hàng và vận chuyển
    const shippingInfo = document.getElementById("shippingInfo");
    if (shippingInfo) {
      shippingInfo.innerHTML = `
                <div class="order-info-section">
                    <h6 class="text-dark mb-3">
                        <i class="fas fa-receipt me-2"></i>Thông tin đơn hàng
                    </h6>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Mã đơn hàng:</strong> ${
                              order.order_code || order.id || order._id
                            }</p>
                            <p><strong>Ngày đặt:</strong> ${
                              order.created_at
                                ? new Date(order.created_at).toLocaleDateString(
                                    "vi-VN"
                                  )
                                : "Không có"
                            }</p>
                            <p><strong>Phương thức thanh toán:</strong> ${
                              getPaymentMethodText(order.payment_method) ||
                              "Không có"
                            }</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Tổng tiền:</strong> <span class="text-primary fw-bold">${formatPrice(
                              order.total_amount || order.final_amount || 0
                            )}</span></p>
                            <p><strong>Trạng thái đơn hàng:</strong>
                                <span class="badge ${getStatusBadgeClass(
                                  order.status
                                )}">${getStatusText(order.status)}</span>
                            </p>
                            <p><strong>Ghi chú:</strong> ${
                              order.note || "Không có"
                            }</p>
                        </div>
                    </div>
                </div>
            `;
    } else {
      console.error("Không tìm thấy phần tử shippingInfo");
    }

    // Hiển thị danh sách sản phẩm
    const tableBody = document.getElementById("orderItemsBody");
    if (tableBody) {
      tableBody.innerHTML = "";

      // Kiểm tra cấu trúc dữ liệu items
      const items = order.items || order.order_details || [];

      if (items.length === 0) {
        tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">Không có sản phẩm nào</td>
                    </tr>
                `;
      } else {
        items.forEach((item) => {
          const productName = item.name || item.product_name || "Không có tên";
          const quantity = item.quantity || 0;
          const price = item.price || 0;
          const total = quantity * price;

          const row = document.createElement("tr");
          row.innerHTML = `
                        <td>${productName}</td>
                        <td>${quantity}</td>
                        <td>${formatPrice(price)}</td>
                        <td>${formatPrice(total)}</td>
                    `;
          tableBody.appendChild(row);
        });
      }
    } else {
      console.error("Không tìm thấy phần tử orderItemsBody");
    }

    // Hiển thị tổng tiền
    const orderTotal = document.getElementById("orderTotal");
    if (orderTotal) {
      orderTotal.textContent = formatPrice(
        order.total_amount || order.final_amount || 0
      );
    }

    // Hiển thị modal
    const modal = new bootstrap.Modal(
      document.getElementById("orderDetailsModal")
    );
    modal.show();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải thông tin đơn hàng: " + error.message);

    // Nếu có lỗi, thử tải dữ liệu mẫu
    const mockOrders = JSON.parse(localStorage.getItem("mockOrders") || "[]");
    const mockOrder = mockOrders.find((o) => o.id == orderId);

    if (mockOrder) {
      viewMockOrderDetails(orderId);
    }
  }
}

// Xem chi tiết đơn hàng mẫu
function viewMockOrderDetails(orderId) {
  console.log(`Đang tải chi tiết đơn hàng mẫu ID: ${orderId}`);

  const mockOrders = JSON.parse(localStorage.getItem("mockOrders") || "[]");
  const order = mockOrders.find((o) => o.id == orderId);

  if (!order) {
    alert("Không tìm thấy đơn hàng");
    return;
  }

  // Hiển thị thông tin giao hàng (từ đơn hàng mẫu)
  document.getElementById("customerInfo").innerHTML = `
        <div class="shipping-info-section">
            <h6 class="text-primary mb-3">
                <i class="fas fa-shipping-fast me-2"></i>Thông tin giao hàng (Mẫu)
            </h6>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Người nhận:</strong> ${order.address_name}</p>
                    <p><strong>Số điện thoại:</strong> ${order.address_phone}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Địa chỉ giao hàng:</strong></p>
                    <p class="text-muted">${order.address_detail}, ${order.ward_name}, ${order.district_name}, ${order.province_name}</p>
                </div>
            </div>
        </div>
        <hr>
        <div class="customer-info-section">
            <h6 class="text-secondary mb-3">
                <i class="fas fa-user me-2"></i>Thông tin khách hàng (Mẫu)
            </h6>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Tên đăng nhập:</strong> ${order.username}</p>
                    <p><strong>Email:</strong> ${order.email}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Họ tên:</strong> ${order.user_fullname}</p>
                    <p><strong>SĐT cá nhân:</strong> ${order.user_phone}</p>
                </div>
            </div>
        </div>
    `;

  // Hiển thị thông tin đơn hàng mẫu
  document.getElementById("shippingInfo").innerHTML = `
        <div class="order-info-section">
            <h6 class="text-dark mb-3">
                <i class="fas fa-receipt me-2"></i>Thông tin đơn hàng (Mẫu)
            </h6>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Mã đơn hàng:</strong> ${order.id}</p>
                    <p><strong>Ngày đặt:</strong> ${new Date(
                      order.created_at
                    ).toLocaleDateString("vi-VN")}</p>
                    <p><strong>Phương thức thanh toán:</strong> ${getPaymentMethodText(
                      order.payment_method
                    )}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Tổng tiền:</strong> <span class="text-primary fw-bold">${formatPrice(
                      order.total_amount
                    )}</span></p>
                    <p><strong>Trạng thái đơn hàng:</strong>
                        <span class="badge ${getStatusBadgeClass(
                          order.status
                        )}">${getStatusText(order.status)}</span>
                    </p>
                    <p><strong>Ghi chú:</strong> ${
                      order.shipping_notes || "Không có"
                    }</p>
                </div>
            </div>
        </div>
    `;

  // Hiển thị danh sách sản phẩm
  const tableBody = document.getElementById("orderItemsBody");
  tableBody.innerHTML = "";

  order.items.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${formatPrice(item.price)}</td>
            <td>${formatPrice(item.quantity * item.price)}</td>
        `;
    tableBody.appendChild(row);
  });

  // Hiển thị modal
  const modal = new bootstrap.Modal(
    document.getElementById("orderDetailsModal")
  );
  modal.show();
}

// Khởi tạo vận chuyển - chỉ hiện khi trạng thái processing
async function initiateShipping(orderId) {
  try {
    // Kiểm tra xem đơn hàng đã có thông tin vận chuyển chưa
    const shippingResponse = await fetch(
      `http://localhost:3000/api/admin/orders/${orderId}/shipping-info`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (shippingResponse.ok) {
      const shippingInfo = await shippingResponse.json();
      if (shippingInfo && shippingInfo.length > 0) {
        alert(
          "Đơn hàng này đã có thông tin vận chuyển. Vui lòng sử dụng nút 'Trạng thái vận chuyển' để cập nhật."
        );
        return;
      }
    }

    // Reset form
    document.getElementById("orderId").value = orderId;
    document.getElementById("shippingMethod").value = "";
    document.getElementById("trackingNumber").value = "";
    document.getElementById("estimatedDelivery").value = "";

    // Hiển thị modal
    const modal = new bootstrap.Modal(document.getElementById("shippingModal"));
    modal.show();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi khởi tạo vận chuyển: " + error.message);
  }
}

// Xác nhận thông tin vận chuyển
async function confirmShipping() {
  const orderId = document.getElementById("orderId").value;
  const shippingMethod = document.getElementById("shippingMethod").value;
  const trackingNumber = document.getElementById("trackingNumber").value;
  const estimatedDelivery = document.getElementById("estimatedDelivery").value;

  if (!shippingMethod || !trackingNumber) {
    alert("Vui lòng nhập đầy đủ thông tin đơn vị vận chuyển và mã vận chuyển!");
    return;
  }

  const data = {
    order_id: orderId,
    shipping_method: shippingMethod,
    tracking_number: trackingNumber,
    estimated_delivery: estimatedDelivery || null,
    status: "pending",
  };

  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/shipping-info`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Lỗi tạo thông tin vận chuyển");
    }

    // Không cập nhật trạng thái đơn hàng, giữ nguyên trạng thái processing
    // Chỉ khi giao hàng thành công mới chuyển thành completed

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("shippingModal")
    );
    modal.hide();
    loadOrders();
    alert("Tạo thông tin vận chuyển thành công!");
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tạo thông tin vận chuyển: " + error.message);
  }
}

// Quản lý trạng thái vận chuyển
async function manageShippingStatus(orderId) {
  try {
    // Lấy thông tin vận chuyển hiện tại
    const response = await fetch(
      `http://localhost:3000/api/admin/orders/${orderId}/shipping-info`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Không thể lấy thông tin vận chuyển");
    }

    const shippingInfo = await response.json();

    if (!shippingInfo || shippingInfo.length === 0) {
      alert(
        "Đơn hàng này chưa có thông tin vận chuyển. Vui lòng tạo thông tin vận chuyển trước."
      );
      return;
    }

    const shipping = shippingInfo[0];

    // Hiển thị thông tin vận chuyển
    const shippingInfoDisplay = document.getElementById("shippingInfoDisplay");
    shippingInfoDisplay.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h6 class="card-title">Thông tin vận chuyển</h6>
          <p><strong>Đơn vị vận chuyển:</strong> ${shipping.shipping_method}</p>
          <p><strong>Mã vận chuyển:</strong> ${shipping.tracking_number}</p>
          <p><strong>Trạng thái:</strong> <span class="badge ${getShippingStatusBadgeClass(
            shipping.status
          )}">${getShippingStatusText(shipping.status)}</span></p>
          <p><strong>Thời gian giao ước tính:</strong> ${
            shipping.estimated_delivery
              ? new Date(shipping.estimated_delivery).toLocaleDateString(
                  "vi-VN"
                )
              : "Chưa có"
          }</p>
          <p><strong>Thời gian giao thực tế:</strong> ${
            shipping.actual_delivery
              ? new Date(shipping.actual_delivery).toLocaleDateString("vi-VN")
              : "Chưa có"
          }</p>
        </div>
      </div>
    `;

    // Lưu orderId để sử dụng trong updateShippingStatus
    document
      .getElementById("shippingStatusModal")
      .setAttribute("data-order-id", orderId);

    // Hiển thị modal
    const modal = new bootstrap.Modal(
      document.getElementById("shippingStatusModal")
    );
    modal.show();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi lấy thông tin vận chuyển: " + error.message);
  }
}

// Cập nhật trạng thái vận chuyển
async function updateShippingStatus(status) {
  const orderId = document
    .getElementById("shippingStatusModal")
    .getAttribute("data-order-id");

  try {
    // Lấy shipping_info_id
    const shippingResponse = await fetch(
      `http://localhost:3000/api/admin/orders/${orderId}/shipping-info`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!shippingResponse.ok) {
      throw new Error("Không thể lấy thông tin vận chuyển");
    }

    const shippingInfo = await shippingResponse.json();
    if (!shippingInfo || shippingInfo.length === 0) {
      throw new Error("Không tìm thấy thông tin vận chuyển");
    }

    const shippingId = shippingInfo[0].id;
    const updateData = { status: status };

    // Nếu status là delivered, thêm actual_delivery
    if (status === "delivered") {
      updateData.actual_delivery = new Date().toISOString().split("T")[0];

      // Cập nhật trạng thái đơn hàng thành completed
      await updateOrderStatus(orderId, "completed");
    }

    // Nếu status là failed, cập nhật trạng thái đơn hàng thành "giao hàng thất bại"
    if (status === "failed") {
      await updateOrderStatus(orderId, "failed_delivery");
    }

    // Cập nhật trạng thái vận chuyển
    const response = await fetch(
      `http://localhost:3000/api/admin/shipping-info/${shippingId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Lỗi cập nhật trạng thái vận chuyển"
      );
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("shippingStatusModal")
    );
    modal.hide();
    loadOrders();

    const statusText = getShippingStatusText(status);
    alert(`Cập nhật trạng thái vận chuyển thành công: ${statusText}`);
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi cập nhật trạng thái vận chuyển: " + error.message);
  }
}

// Hàm mới để cập nhật trạng thái đơn hàng, tránh lặp code
async function updateOrderStatus(orderId, newStatus) {
  const orderUpdateResponse = await fetch(
    `http://localhost:3000/api/admin/orders/${orderId}/status`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ status: newStatus }),
    }
  );

  if (!orderUpdateResponse.ok) {
    console.warn(`Không thể cập nhật trạng thái đơn hàng thành ${newStatus}`);
  }
}

// Hàm hỗ trợ cho shipping status
function getShippingStatusBadgeClass(status) {
  switch (status) {
    case "pending":
      return "bg-warning";
    case "in_transit":
      return "bg-info";
    case "delivered":
      return "bg-success";
    case "failed":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}

function getShippingStatusText(status) {
  switch (status) {
    case "pending":
      return "Chờ xử lý";
    case "in_transit":
      return "Đang vận chuyển";
    case "delivered":
      return "Đã giao hàng";
    case "failed":
      return "Giao hàng thất bại";
    default:
      return "Không xác định";
  }
}

// In hóa đơn
async function printInvoice(orderId) {
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/invoice`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Lỗi tạo hóa đơn");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice_${orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tạo hóa đơn: " + error.message);
  }
}

// Xuất báo cáo đơn hàng
function exportOrders() {
  const modal = new bootstrap.Modal(document.getElementById("exportModal"));
  modal.show();
}

async function generateReport() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const format = document.getElementById("exportFormat").value;

  try {
    const response = await fetch(
      `/api/admin/orders/report?start_date=${startDate}&end_date=${endDate}&format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Lỗi tạo báo cáo");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_report_${startDate}_${endDate}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("exportModal")
    );
    modal.hide();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tạo báo cáo: " + error.message);
  }
}

// Utility functions
function formatPrice(price) {
  if (price === undefined || price === null) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function formatDateTime(dateTime) {
  if (!dateTime) return "Không có ngày";
  try {
    return new Date(dateTime).toLocaleString("vi-VN");
  } catch (e) {
    console.error("Lỗi định dạng ngày tháng:", e);
    return dateTime.toString();
  }
}

function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
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
    case "failed_delivery":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}

function getStatusText(status) {
  switch (status?.toLowerCase()) {
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
    case "failed_delivery":
      return "Giao hàng thất bại";
    default:
      return "Không xác định";
  }
}

function getPaymentMethodText(method) {
  switch (method) {
    case "cod":
      return "Thanh toán khi nhận hàng (COD)";
    case "bank_transfer":
      return "Chuyển khoản ngân hàng";
    case "credit_card":
      return "Thẻ tín dụng";
    case "e_wallet":
      return "Ví điện tử";
    case "momo":
      return "Ví MoMo";
    case "zalopay":
      return "ZaloPay";
    default:
      return method || "Không xác định";
  }
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

// Tải dữ liệu đơn hàng mẫu khi API không hoạt động
function loadMockOrders() {
  console.log("Tải dữ liệu đơn hàng mẫu");

  const mockOrders = [
    {
      id: 1,
      username: "user_a",
      shipping_name: "Nguyễn Văn A",
      shipping_phone: "0987654321",
      shipping_address: "123 Đường ABC, Phường 1, Quận 1, TP.HCM",
      address_name: "Nguyễn Văn A",
      address_phone: "0987654321",
      address_detail: "123 Đường ABC",
      ward_name: "Phường 1",
      district_name: "Quận 1",
      province_name: "TP.HCM",
      created_at: new Date().toISOString(),
      total_amount: 1500000,
      status: "pending",
      email: "nguyenvana@example.com",
      phone: "0987654321",
      address: "123 Đường ABC, Quận 1, TP.HCM",
      user_fullname: "Nguyễn Văn A",
      user_phone: "0987654321",
      shipping_method: "Standard",
      tracking_number: "",
      shipping_status: "pending",
      shipping_notes: "",
      payment_method: "cod",
      items: [
        { name: "Sản phẩm mẫu 1", quantity: 2, price: 500000 },
        { name: "Sản phẩm mẫu 2", quantity: 1, price: 500000 },
      ],
    },
    {
      id: 2,
      username: "user_b",
      shipping_name: "Trần Thị B",
      shipping_phone: "0123456789",
      shipping_address: "456 Đường XYZ, Phường 2, Quận 2, TP.HCM",
      address_name: "Trần Thị B",
      address_phone: "0123456789",
      address_detail: "456 Đường XYZ",
      ward_name: "Phường 2",
      district_name: "Quận 2",
      province_name: "TP.HCM",
      created_at: new Date(Date.now() - 86400000).toISOString(), // Hôm qua
      total_amount: 2000000,
      status: "processing",
      email: "tranthib@example.com",
      phone: "0123456789",
      address: "456 Đường XYZ, Quận 2, TP.HCM",
      user_fullname: "Trần Thị B",
      user_phone: "0123456789",
      shipping_method: "Express",
      tracking_number: "TK123456",
      shipping_status: "processing",
      shipping_notes: "Giao buổi sáng",
      payment_method: "bank_transfer",
      items: [{ name: "Sản phẩm mẫu 3", quantity: 1, price: 2000000 }],
    },
    {
      id: 3,
      username: "user_c",
      shipping_name: "Lê Văn C",
      shipping_phone: "0369852147",
      shipping_address: "789 Đường DEF, Phường 3, Quận 3, TP.HCM",
      address_name: "Lê Văn C",
      address_phone: "0369852147",
      address_detail: "789 Đường DEF",
      ward_name: "Phường 3",
      district_name: "Quận 3",
      province_name: "TP.HCM",
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 ngày trước
      total_amount: 3000000,
      status: "completed",
      email: "levanc@example.com",
      phone: "0369852147",
      address: "789 Đường DEF, Quận 3, TP.HCM",
      user_fullname: "Lê Văn C",
      user_phone: "0369852147",
      shipping_method: "Standard",
      tracking_number: "TK654321",
      shipping_status: "delivered",
      shipping_notes: "",
      payment_method: "momo",
      items: [{ name: "Sản phẩm mẫu 4", quantity: 3, price: 1000000 }],
    },
  ];

  const tableBody = document.getElementById("ordersTableBody");
  tableBody.innerHTML = "";

  mockOrders.forEach((order) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${order.id}</td>
            <td>
                <div class="customer-cell">
                    <strong>${order.shipping_name}</strong>
                    <br>
                    <small class="text-muted">${order.shipping_phone}</small>
                </div>
            </td>
            <td>${formatDateTime(order.created_at)}</td>
            <td>${formatPrice(order.total_amount)}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(order.status)}">
                    ${getStatusText(order.status)}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-info me-1" onclick="viewMockOrderDetails(${
                  order.id
                })">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-primary me-1" onclick="updateMockShipping(${
                  order.id
                })">
                    <i class="fas fa-truck"></i>
                </button>
                <button class="btn btn-sm btn-success me-1" onclick="printMockInvoice(${
                  order.id
                })">
                    <i class="fas fa-print"></i>
                </button>
            </td>
        `;
    tableBody.appendChild(row);
  });

  // Lưu dữ liệu mẫu vào localStorage để sử dụng cho các hàm khác
  localStorage.setItem("mockOrders", JSON.stringify(mockOrders));
}

// Add new function to handle order confirmation
async function confirmOrder(orderId) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập lại!");
      window.location.href = "../login.html";
      return;
    }

    // Kiểm tra orderId
    if (!orderId) {
      alert("Không tìm thấy mã đơn hàng!");
      return;
    }

    console.log(`Đang xác nhận đơn hàng ID: ${orderId}`);

    const response = await fetch(
      `http://localhost:3000/api/admin/orders/${orderId}/confirm`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Log response để debug
    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    if (response.status === 401 || response.status === 403) {
      alert(
        "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại."
      );
      localStorage.removeItem("token");
      window.location.href = "../login.html";
      return;
    }

    if (response.status === 404) {
      alert("Không tìm thấy đơn hàng hoặc API endpoint không tồn tại!");
      return;
    }

    if (!response.ok) {
      let errorMessage = `Lỗi xác nhận đơn hàng: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.error("Không thể parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    let result;
    try {
      result = await response.json();
    } catch (e) {
      console.error("Không thể parse success response:", e);
      result = { success: true };
    }

    alert("Đã xác nhận đơn hàng thành công!");

    // Cập nhật UI ngay lập tức
    const orderRow = document.querySelector(`tr[data-order-id="${orderId}"]`);
    if (orderRow) {
      const statusCell = orderRow.querySelector("td:nth-child(5)");
      if (statusCell) {
        statusCell.innerHTML = `
                    <span class="badge ${getStatusBadgeClass("processing")}">
                        ${getStatusText("processing")}
                    </span>
                `;
      }

      // Ẩn nút xác nhận
      const confirmButton = orderRow.querySelector(
        'button[onclick*="confirmOrder"]'
      );
      if (confirmButton) {
        confirmButton.style.display = "none";
      }
    }

    // Reload danh sách đơn hàng để cập nhật toàn bộ
    loadOrders();
  } catch (error) {
    console.error("Lỗi khi xác nhận đơn hàng:", error);
    alert("Có lỗi xảy ra khi xác nhận đơn hàng: " + error.message);
  }
}

// Thêm hàm xóa đơn hàng
async function deleteOrder(orderId) {
  if (!orderId) {
    alert("Không tìm thấy mã đơn hàng!");
    return;
  }
  if (
    !confirm(
      "Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác!"
    )
  ) {
    return;
  }
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `http://localhost:3000/api/admin/orders/${orderId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.status === 401 || response.status === 403) {
      alert(
        "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại."
      );
      localStorage.removeItem("token");
      window.location.href = "../login.html";
      return;
    }
    if (response.status === 404) {
      alert("Không tìm thấy đơn hàng hoặc API endpoint không tồn tại!");
      return;
    }
    if (!response.ok) {
      let errorMessage = `Lỗi xóa đơn hàng: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }
    alert("Đã xóa đơn hàng thành công!");
    loadOrders();
  } catch (error) {
    console.error("Lỗi khi xóa đơn hàng:", error);
    alert("Có lỗi xảy ra khi xóa đơn hàng: " + error.message);
  }
}

// Thêm hàm hủy đơn hàng
async function cancelOrder(orderId) {
  if (!orderId) {
    alert("Không tìm thấy mã đơn hàng!");
    return;
  }
  if (
    !confirm(
      "Bạn có chắc chắn muốn hủy đơn hàng này? Tồn kho sẽ được hoàn lại!"
    )
  ) {
    return;
  }
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `http://localhost:3000/api/admin/orders/${orderId}/cancel`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.status === 401 || response.status === 403) {
      alert(
        "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại."
      );
      localStorage.removeItem("token");
      window.location.href = "../login.html";
      return;
    }
    if (response.status === 404) {
      alert("Không tìm thấy đơn hàng hoặc API endpoint không tồn tại!");
      return;
    }
    if (!response.ok) {
      let errorMessage = `Lỗi hủy đơn hàng: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }
    alert("Đã hủy đơn hàng thành công và hoàn lại tồn kho!");
    loadOrders();
  } catch (error) {
    console.error("Lỗi khi hủy đơn hàng:", error);
    alert("Có lỗi xảy ra khi hủy đơn hàng: " + error.message);
  }
}
