document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra đăng nhập
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  // Load danh sách người dùng
  loadUsers();

  // Xử lý thêm người dùng mới
  document.getElementById("saveUserBtn").addEventListener("click", addUser);

  // Xử lý cập nhật người dùng
  document
    .getElementById("updateUserBtn")
    .addEventListener("click", updateUser);

  // Xử lý tìm kiếm và lọc
  document.getElementById("searchInput").addEventListener(
    "input",
    debounce(() => loadUsers(1), 500)
  );
  document
    .getElementById("roleFilter")
    .addEventListener("change", () => loadUsers(1));
  document
    .getElementById("statusFilter")
    .addEventListener("change", () => loadUsers(1));
});

let currentPage = 1;
const itemsPerPage = 10;

// Load danh sách người dùng
async function loadUsers(page = 1) {
  try {
    const searchQuery = document.getElementById("searchInput").value;
    const roleFilter = document.getElementById("roleFilter").value;
    const statusFilter = document.getElementById("statusFilter").value;

    const params = new URLSearchParams({
      page: page,
      limit: itemsPerPage,
      search: searchQuery,
      role: roleFilter,
      status: statusFilter,
    });

    const response = await fetch(
      `http://localhost:3000/api/admin/users?${params}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    displayUsers(data.users);
    displayPagination(data.totalPages, page);
    currentPage = page;
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải danh sách người dùng: " + error.message);
  }
}

// Hiển thị danh sách người dùng
function displayUsers(users) {
  const tableBody = document.getElementById("usersTableBody");
  tableBody.innerHTML = "";

  users.forEach((user) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.fullname || "N/A"}</td>
      <td>${user.email}</td>
      <td>${user.phone || "N/A"}</td>
      <td>
        <span class="badge bg-${getRoleBadgeColor(user.role)}">
          ${getRoleDisplayName(user.role)}
        </span>
      </td>
      <td>
        <span class="badge bg-${
          user.status === "active" ? "success" : "secondary"
        }">
          ${user.status === "active" ? "Hoạt động" : "Không hoạt động"}
        </span>
      </td>
      <td>${formatDate(user.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-info me-1" onclick="editUser(${
          user.id
        })" title="Chỉnh sửa">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-warning me-1" onclick="manageUserPermissions(${
          user.id
        })" title="Phân quyền">
          <i class="fas fa-key"></i>
        </button>
        <button class="btn btn-sm btn-secondary me-1" onclick="resetPassword(${
          user.id
        })" title="Reset mật khẩu">
          <i class="fas fa-lock"></i>
        </button>
        ${
          user.id !== getCurrentUserId()
            ? `
        <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})" title="Xóa">
          <i class="fas fa-trash"></i>
        </button>
        `
            : ""
        }
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Hiển thị phân trang
function displayPagination(totalPages, currentPage) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  // Previous button
  const prevLi = document.createElement("li");
  prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
  prevLi.innerHTML = `<a class="page-link" href="#" onclick="loadUsers(${
    currentPage - 1
  })">Trước</a>`;
  pagination.appendChild(prevLi);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === currentPage ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#" onclick="loadUsers(${i})">${i}</a>`;
    pagination.appendChild(li);
  }

  // Next button
  const nextLi = document.createElement("li");
  nextLi.className = `page-item ${
    currentPage === totalPages ? "disabled" : ""
  }`;
  nextLi.innerHTML = `<a class="page-link" href="#" onclick="loadUsers(${
    currentPage + 1
  })">Sau</a>`;
  pagination.appendChild(nextLi);
}

// Thêm người dùng mới
async function addUser() {
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const fullname = document.getElementById("fullname").value;
  const phone = document.getElementById("phone").value;
  const address = document.getElementById("address").value;
  const role = document.getElementById("role").value;

  if (!username || !email || !password) {
    alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        username,
        email,
        password,
        fullname,
        phone,
        address,
        role,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("addUserModal")
    );
    modal.hide();
    document.getElementById("addUserForm").reset();
    loadUsers(currentPage);
    alert("Thêm người dùng thành công!");
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi thêm người dùng: " + error.message);
  }
}

// Chỉnh sửa người dùng
async function editUser(userId) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const user = await response.json();
    document.getElementById("editUserId").value = user.id;
    document.getElementById("editUsername").value = user.username;
    document.getElementById("editEmail").value = user.email;
    document.getElementById("editFullname").value = user.fullname || "";
    document.getElementById("editPhone").value = user.phone || "";
    document.getElementById("editAddress").value = user.address || "";
    document.getElementById("editRole").value = user.role;
    document.getElementById("editStatus").value = user.status || "active";

    const modal = new bootstrap.Modal(document.getElementById("editUserModal"));
    modal.show();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi lấy thông tin người dùng: " + error.message);
  }
}

// Cập nhật người dùng
async function updateUser() {
  const userId = document.getElementById("editUserId").value;
  const email = document.getElementById("editEmail").value;
  const fullname = document.getElementById("editFullname").value;
  const phone = document.getElementById("editPhone").value;
  const address = document.getElementById("editAddress").value;
  const role = document.getElementById("editRole").value;
  const status = document.getElementById("editStatus").value;

  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          email,
          fullname,
          phone,
          address,
          role,
          status,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("editUserModal")
    );
    modal.hide();
    loadUsers(currentPage);
    alert("Cập nhật người dùng thành công!");
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi cập nhật người dùng: " + error.message);
  }
}

// Xóa người dùng
async function deleteUser(userId) {
  if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      // Nếu lỗi do user đã phát sinh giao dịch/đơn hàng
      if (errorData.message && errorData.message.includes("giao dịch/đơn hàng")) {
        alert("Không thể xóa vì người dùng này đã phát sinh giao dịch/đơn hàng!");
        return;
      }
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    loadUsers(currentPage);
    alert("Xóa người dùng thành công!");
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi xóa người dùng: " + error.message);
  }
}

// Reset mật khẩu
async function resetPassword(userId) {
  const newPassword = prompt("Nhập mật khẩu mới:");
  if (!newPassword) {
    return;
  }

  if (newPassword.length < 6) {
    alert("Mật khẩu phải có ít nhất 6 ký tự!");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/users/${userId}/reset-password`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ password: newPassword }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    alert("Reset mật khẩu thành công!");
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi reset mật khẩu: " + error.message);
  }
}

// Quản lý quyền người dùng
function manageUserPermissions(userId) {
  // Chuyển hướng đến trang phân quyền chi tiết
  window.location.href = `user-permissions.html?userId=${userId}`;
}

// Helper functions
function getRoleBadgeColor(role) {
  switch (role) {
    case "super_admin":
      return "danger";
    case "admin":
      return "warning";
    case "user":
      return "primary";
    default:
      return "secondary";
  }
}

function getRoleDisplayName(role) {
  switch (role) {
    case "super_admin":
      return "Quản trị viên cấp cao";
    case "admin":
      return "Quản trị viên";
    case "user":
      return "Người dùng";
    default:
      return role;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN");
}

function getCurrentUserId() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.id;
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("roleFilter").value = "";
  document.getElementById("statusFilter").value = "";
  loadUsers(1);
}

// Debounce function
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
