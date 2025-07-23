document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra đăng nhập
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  // Lấy userId từ URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  
  if (!userId) {
    alert("Không tìm thấy ID người dùng!");
    window.location.href = "users.html";
    return;
  }

  // Load dữ liệu
  loadUserInfo(userId);
  loadRoles();
  loadPermissions();
  loadUserPermissions(userId);
});

let currentUserId = null;
let allPermissions = [];
let allRoles = [];

// Load thông tin người dùng
async function loadUserInfo(userId) {
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const user = await response.json();
    currentUserId = userId;
    
    // Hiển thị thông tin người dùng
    document.getElementById("userUsername").textContent = user.username;
    document.getElementById("userFullname").textContent = user.fullname || 'N/A';
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("userCurrentRole").textContent = getRoleDisplayName(user.role);
    document.getElementById("userCurrentRole").className = `badge bg-${getRoleBadgeColor(user.role)}`;
    document.getElementById("userStatus").textContent = user.status === 'active' ? 'Hoạt động' : 'Không hoạt động';
    document.getElementById("userStatus").className = `badge bg-${user.status === 'active' ? 'success' : 'secondary'}`;
    document.getElementById("userCreatedAt").textContent = formatDate(user.created_at);
    
    // Set current role in select
    document.getElementById("userRole").value = user.role;
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải thông tin người dùng: " + error.message);
  }
}

// Load danh sách vai trò
async function loadRoles() {
  try {
    const response = await fetch("/api/admin/roles", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const roles = await response.json();
    allRoles = roles;
    
    const roleSelect = document.getElementById("userRole");
    roleSelect.innerHTML = '<option value="">Chọn vai trò...</option>';
    
    roles.forEach(role => {
      const option = document.createElement("option");
      option.value = role.name;
      option.textContent = `${getRoleDisplayName(role.name)} - ${role.description}`;
      roleSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải danh sách vai trò: " + error.message);
  }
}

// Load danh sách quyền
async function loadPermissions() {
  try {
    const response = await fetch("/api/admin/permissions", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const permissions = await response.json();
    allPermissions = permissions;
    displayPermissions(permissions);
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải danh sách quyền: " + error.message);
  }
}

// Hiển thị danh sách quyền
function displayPermissions(permissions) {
  const container = document.getElementById("permissionsContainer");
  container.innerHTML = "";

  permissions.forEach(permission => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4 mb-3";
    
    col.innerHTML = `
      <div class="form-check">
        <input 
          class="form-check-input" 
          type="checkbox" 
          value="${permission.id}" 
          id="permission_${permission.id}"
        />
        <label class="form-check-label" for="permission_${permission.id}">
          <strong>${permission.name}</strong>
          <br>
          <small class="text-muted">${permission.description}</small>
        </label>
      </div>
    `;
    
    container.appendChild(col);
  });
}

// Load quyền hiện tại của người dùng
async function loadUserPermissions(userId) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/permissions`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Đánh dấu các quyền tùy chỉnh
    data.customPermissions.forEach(permission => {
      const checkbox = document.getElementById(`permission_${permission.id}`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
    
    // Hiển thị tổng hợp quyền
    displayPermissionsSummary(data.rolePermissions, data.customPermissions);
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải quyền người dùng: " + error.message);
  }
}

// Hiển thị tổng hợp quyền
function displayPermissionsSummary(rolePermissions, customPermissions) {
  const roleContainer = document.getElementById("rolePermissions");
  const customContainer = document.getElementById("customPermissions");
  
  // Quyền từ vai trò
  roleContainer.innerHTML = "";
  if (rolePermissions.length === 0) {
    roleContainer.innerHTML = '<span class="text-muted">Không có quyền từ vai trò</span>';
  } else {
    rolePermissions.forEach(permission => {
      const badge = document.createElement("span");
      badge.className = "badge bg-primary me-1 mb-1";
      badge.textContent = permission.name;
      badge.title = permission.description;
      roleContainer.appendChild(badge);
    });
  }
  
  // Quyền tùy chỉnh
  customContainer.innerHTML = "";
  if (customPermissions.length === 0) {
    customContainer.innerHTML = '<span class="text-muted">Không có quyền tùy chỉnh</span>';
  } else {
    customPermissions.forEach(permission => {
      const badge = document.createElement("span");
      badge.className = "badge bg-success me-1 mb-1";
      badge.textContent = permission.name;
      badge.title = permission.description;
      customContainer.appendChild(badge);
    });
  }
}

// Cập nhật vai trò người dùng
async function updateUserRole() {
  const newRole = document.getElementById("userRole").value;
  
  if (!newRole) {
    alert("Vui lòng chọn vai trò!");
    return;
  }
  
  if (!confirm("Bạn có chắc chắn muốn thay đổi vai trò của người dùng này?")) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/users/${currentUserId}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ role: newRole }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    alert("Cập nhật vai trò thành công!");
    loadUserInfo(currentUserId);
    loadUserPermissions(currentUserId);
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi cập nhật vai trò: " + error.message);
  }
}

// Lưu quyền tùy chỉnh
async function saveCustomPermissions() {
  const checkboxes = document.querySelectorAll('#permissionsContainer input[type="checkbox"]');
  const selectedPermissions = [];
  
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      selectedPermissions.push(parseInt(checkbox.value));
    }
  });

  try {
    const response = await fetch(`/api/admin/users/${currentUserId}/permissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ permissionIds: selectedPermissions }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    alert("Lưu quyền tùy chỉnh thành công!");
    loadUserPermissions(currentUserId);
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi lưu quyền: " + error.message);
  }
}

// Làm mới tổng hợp quyền
function refreshPermissionsSummary() {
  loadUserPermissions(currentUserId);
}

// Helper functions
function getRoleBadgeColor(role) {
  switch (role) {
    case 'super_admin': return 'danger';
    case 'admin': return 'warning';
    case 'user': return 'primary';
    default: return 'secondary';
  }
}

function getRoleDisplayName(role) {
  switch (role) {
    case 'super_admin': return 'Quản trị viên cấp cao';
    case 'admin': return 'Quản trị viên';
    case 'user': return 'Người dùng';
    default: return role;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
}
