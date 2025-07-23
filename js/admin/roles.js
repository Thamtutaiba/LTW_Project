document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra đăng nhập
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  // Load danh sách roles và permissions
  loadRoles();
  loadPermissions();

  // Xử lý thêm role mới
  document.getElementById("saveRoleBtn").addEventListener("click", addRole);

  // Xử lý cập nhật role
  document
    .getElementById("updateRoleBtn")
    .addEventListener("click", updateRole);

  // Xử lý lưu permissions
  document
    .getElementById("savePermissionsBtn")
    .addEventListener("click", savePermissions);
});

let allPermissions = [];

// Load danh sách permissions
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

    allPermissions = await response.json();
    displayPermissionsInModal();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải danh sách permissions: " + error.message);
  }
}

// Hiển thị permissions trong modal
function displayPermissionsInModal() {
  const container = document.getElementById("permissionsContainer");
  container.innerHTML = "";

  allPermissions.forEach((permission) => {
    const div = document.createElement("div");
    div.className = "form-check";
    div.innerHTML = `
      <input
        class="form-check-input"
        type="checkbox"
        value="${permission.id}"
        id="permission_${permission.id}"
      />
      <label
        class="form-check-label"
        for="permission_${permission.id}"
      >
        ${permission.description || permission.name}
      </label>
    `;
    container.appendChild(div);
  });
}

// Load danh sách roles
async function loadRoles() {
  try {
    const response = await fetch("http://localhost:3000/api/admin/roles", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      if (response.status === 404) {
        console.error("API endpoint không tồn tại");
        return;
      }
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }
    const roles = await response.json();
    const tableBody = document.getElementById("rolesTableBody");
    tableBody.innerHTML = "";
    roles.forEach((role) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${role.id}</td>
                <td>${role.name}</td>
                <td>${role.description || ""}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-2" onclick="editRole(${
                      role.id
                    })">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-info me-2" onclick="managePermissions(${
                      role.id
                    })">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRole(${
                      role.id
                    })">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi tải danh sách roles: " + error.message);
  }
}

// Thêm role mới
async function addRole() {
  const name = document.getElementById("roleName").value;
  const description = document.getElementById("roleDescription").value;
  try {
    const response = await fetch("http://localhost:3000/api/admin/roles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ name, description }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("addRoleModal")
    );
    modal.hide();
    loadRoles();
    alert("Thêm role thành công");
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi thêm role: " + error.message);
  }
}

// Chỉnh sửa role
async function editRole(roleId) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/roles/${roleId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const role = await response.json();
    document.getElementById("editRoleId").value = role.id;
    document.getElementById("editRoleName").value = role.name;
    document.getElementById("editRoleDescription").value =
      role.description || "";

    const modal = new bootstrap.Modal(document.getElementById("editRoleModal"));
    modal.show();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi lấy thông tin role: " + error.message);
  }
}

// Cập nhật role
async function updateRole() {
  const roleId = document.getElementById("editRoleId").value;
  const name = document.getElementById("editRoleName").value;
  const description = document.getElementById("editRoleDescription").value;

  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/roles/${roleId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name, description }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Đóng modal và load lại danh sách
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("editRoleModal")
    );
    modal.hide();
    loadRoles();
    alert("Cập nhật role thành công");
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi cập nhật role: " + error.message);
  }
}

// Xóa role
async function deleteRole(roleId) {
  if (!confirm("Bạn có chắc chắn muốn xóa role này?")) {
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/roles/${roleId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    loadRoles();
    alert("Xóa role thành công");
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi xóa role: " + error.message);
  }
}

// Quản lý permissions
async function managePermissions(roleId) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/roles/${roleId}/permissions`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const permissions = await response.json();
    document.getElementById("permissionsRoleId").value = roleId;

    // Reset tất cả checkbox
    const checkboxes = document.querySelectorAll(
      '#permissionsContainer input[type="checkbox"]'
    );
    checkboxes.forEach((checkbox) => (checkbox.checked = false));

    // Check các permissions hiện có
    permissions.forEach((permission) => {
      const checkbox = document.getElementById(`permission_${permission.id}`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });

    const modal = new bootstrap.Modal(
      document.getElementById("permissionsModal")
    );
    modal.show();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi lấy danh sách permissions: " + error.message);
  }
}

// Lưu permissions
async function savePermissions() {
  const roleId = document.getElementById("permissionsRoleId").value;
  const checkboxes = document.querySelectorAll(
    '#permissionsContainer input[type="checkbox"]:checked'
  );
  const permissionIds = Array.from(checkboxes).map((checkbox) =>
    parseInt(checkbox.value)
  );

  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/roles/${roleId}/permissions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ permissionIds }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Đóng modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("permissionsModal")
    );
    modal.hide();
    alert("Lưu permissions thành công");
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Có lỗi xảy ra khi lưu permissions: " + error.message);
  }
}
