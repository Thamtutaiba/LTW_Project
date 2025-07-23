// Quản lý địa chỉ nâng cao cho profile.html
// Yêu cầu backend cung cấp các API:
// GET /api/admin/addresses (lấy danh sách địa chỉ user)
// POST /api/admin/addresses (thêm mới)
// PUT /api/admin/addresses/:id (cập nhật)
// DELETE /api/admin/addresses/:id (xóa)
// PATCH /api/admin/addresses/:id/default (chọn mặc định)
// GET /api/admin/provinces, /api/admin/districts?province_id, /api/admin/wards?district_id

let provinces = [], districts = [], wards = [];
let userAddresses = [];

// Helper function to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Load tỉnh/thành phố
function loadProvinces(selectedId) {
  fetch('http://localhost:3000/api/admin/provinces', {
    headers: getAuthHeaders()
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        provinces = data;
        const select = document.getElementById('provinceSelect');
        select.innerHTML = '<option value="">Chọn tỉnh/thành</option>' +
          provinces.map(p => `<option value="${p.id}" ${selectedId==p.id?'selected':''}>${p.name}</option>`).join('');
      } else {
        console.error('Provinces data is not an array:', data);
      }
    })
    .catch(error => {
      console.error('Error loading provinces:', error);
    });
}

// Load quận/huyện theo tỉnh
function loadDistricts(provinceId, selectedId) {
  if (!provinceId) return;
  fetch(`http://localhost:3000/api/admin/districts?province_id=${provinceId}`, {
    headers: getAuthHeaders()
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        districts = data;
        const select = document.getElementById('districtSelect');
        select.innerHTML = '<option value="">Chọn quận/huyện</option>' +
          districts.map(d => `<option value="${d.id}" ${selectedId==d.id?'selected':''}>${d.name}</option>`).join('');
      } else {
        console.error('Districts data is not an array:', data);
      }
    })
    .catch(error => {
      console.error('Error loading districts:', error);
    });
}

// Load phường/xã theo quận
function loadWards(districtId, selectedId) {
  if (!districtId) return;
  fetch(`http://localhost:3000/api/admin/wards?district_id=${districtId}`, {
    headers: getAuthHeaders()
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        wards = data;
        const select = document.getElementById('wardSelect');
        select.innerHTML = '<option value="">Chọn phường/xã</option>' +
          wards.map(w => `<option value="${w.id}" ${selectedId==w.id?'selected':''}>${w.name}</option>`).join('');
      } else {
        console.error('Wards data is not an array:', data);
      }
    })
    .catch(error => {
      console.error('Error loading wards:', error);
    });
}

// Load danh sách địa chỉ
function loadAddresses() {
  fetch('http://localhost:3000/api/admin/addresses', {
    headers: getAuthHeaders()
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        userAddresses = data;
        renderAddressList();
      } else {
        console.error('Addresses data is not an array:', data);
      }
    })
    .catch(error => {
      console.error('Error loading addresses:', error);
    });
}

// Hiển thị danh sách địa chỉ
function renderAddressList() {
  const list = document.getElementById('addressList');
  if (!userAddresses.length) {
    list.innerHTML = '<div class="text-muted">Chưa có địa chỉ nào</div>';
    return;
  }
  list.innerHTML = userAddresses.map(addr => `
    <div class="card mb-2 ${addr.is_default ? 'border-primary' : ''}">
      <div class="card-body d-flex justify-content-between align-items-center">
        <div>
          <div><b>${addr.name}</b> <span class="badge bg-secondary ms-2">${addr.phone}</span></div>
          <div>${addr.address_detail}, ${addr.ward_name}, ${addr.district_name}, ${addr.province_name}</div>
          ${addr.is_default ? '<span class="badge bg-primary">Mặc định</span>' : ''}
        </div>
        <div>
          ${!addr.is_default ? `<button class="btn btn-outline-primary btn-sm me-1" onclick="setDefaultAddress(${addr.id})">Đặt mặc định</button>` : ''}
          <button class="btn btn-outline-warning btn-sm me-1" onclick="editAddress(${addr.id})">Sửa</button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteAddress(${addr.id})">Xóa</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Sự kiện thêm địa chỉ
$('#addAddressBtn').on('click', function() {
  $('#addressModalTitle').text('Thêm địa chỉ');
  $('#addressForm')[0].reset();
  $('#addressId').val('');
  loadProvinces();
  $('#districtSelect').html('<option value="">Chọn quận/huyện</option>');
  $('#wardSelect').html('<option value="">Chọn phường/xã</option>');
  $('#addressModal').modal('show');
});

// Sự kiện chọn tỉnh/thành
$('#provinceSelect').on('change', function() {
  loadDistricts(this.value);
  $('#wardSelect').html('<option value="">Chọn phường/xã</option>');
});
// Sự kiện chọn quận/huyện
$('#districtSelect').on('change', function() {
  loadWards(this.value);
});

// Sự kiện submit form địa chỉ
$('#addressForm').on('submit', function(e) {
  e.preventDefault();
  const id = $('#addressId').val();
  const data = {
    name: $('#addressName').val(),
    phone: $('#addressPhone').val(),
    province_id: $('#provinceSelect').val(),
    district_id: $('#districtSelect').val(),
    ward_id: $('#wardSelect').val(),
    address_detail: $('#addressDetail').val(),
    is_default: $('#isDefaultAddress').is(':checked') ? 1 : 0
  };
  const url = id ? `http://localhost:3000/api/admin/addresses/${id}` : 'http://localhost:3000/api/admin/addresses';
  const method = id ? 'PUT' : 'POST';
  fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(() => {
      $('#addressModal').modal('hide');
      loadAddresses();
    })
    .catch(error => {
      console.error('Error saving address:', error);
      alert('Có lỗi xảy ra khi lưu địa chỉ');
    });
});

// Sửa địa chỉ
window.editAddress = function(id) {
  const addr = userAddresses.find(a => a.id == id);
  if (!addr) return;
  $('#addressModalTitle').text('Sửa địa chỉ');
  $('#addressId').val(addr.id);
  $('#addressName').val(addr.name);
  $('#addressPhone').val(addr.phone);
  loadProvinces(addr.province_id);
  setTimeout(() => {
    loadDistricts(addr.province_id, addr.district_id);
    setTimeout(() => {
      loadWards(addr.district_id, addr.ward_id);
    }, 200);
  }, 200);
  $('#addressDetail').val(addr.address_detail);
  $('#isDefaultAddress').prop('checked', !!addr.is_default);
  $('#addressModal').modal('show');
}

// Xóa địa chỉ
window.deleteAddress = function(id) {
  if (!confirm('Bạn chắc chắn muốn xóa địa chỉ này?')) return;
  fetch(`http://localhost:3000/api/admin/addresses/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(() => loadAddresses())
    .catch(error => {
      console.error('Error deleting address:', error);
      alert('Có lỗi xảy ra khi xóa địa chỉ');
    });
}

// Đặt làm mặc định
window.setDefaultAddress = function(id) {
  fetch(`http://localhost:3000/api/admin/addresses/${id}/default`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(() => loadAddresses())
    .catch(error => {
      console.error('Error setting default address:', error);
      alert('Có lỗi xảy ra khi đặt địa chỉ mặc định');
    });
}

// Khởi tạo khi vào trang
$(document).ready(function() {
  loadAddresses();
}); 