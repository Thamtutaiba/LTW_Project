const API_BASE_URL = "http://localhost:3000";

// Thêm các endpoints
const ENDPOINTS = {
  PRODUCTS: "/api/products",
  CATEGORIES: "/api/categories",
  BRANDS: "/api/brands",
  ADMIN: {
    PRODUCTS: "/api/admin/products",
    CATEGORIES: "/api/admin/categories",
    BRANDS: "/api/admin/brands",
  },
};

// Thêm biến để theo dõi trạng thái loading
let isLoading = false;

// Thêm biến toàn cục để lưu danh sách ảnh cần xóa khi cập nhật sản phẩm
let imagesToDelete = [];

// Thêm hàm hiển thị/ẩn loading
function toggleLoading(show) {
  isLoading = show;
  const loadingElement = document.getElementById("loadingIndicator");
  if (loadingElement) {
    loadingElement.style.display = show ? "block" : "none";
  }
}

// Thêm hàm kiểm tra kết nối internet
function checkInternetConnection() {
  return navigator.onLine;
}

// Thêm hàm xử lý lỗi chung
function handleError(error, message) {
  console.error(error);
  if (!checkInternetConnection()) {
    alert("Không có kết nối internet. Vui lòng kiểm tra lại kết nối của bạn.");
  } else {
    alert(message || "Có lỗi xảy ra. Vui lòng thử lại sau.");
  }
}

// Hàm xử lý hiển thị/ẩn input thương hiệu mới
function toggleNewBrandInput() {
  const brandSelect = document.getElementById("productBrand");
  const newBrandInput = document.getElementById("newBrandInput");

  if (brandSelect.value === "new_brand") {
    newBrandInput.style.display = "block";
    newBrandInput.required = true;
    brandSelect.required = false;
  } else {
    newBrandInput.style.display = "none";
    newBrandInput.required = false;
    newBrandInput.value = "";
    brandSelect.required = true;
  }
}

// Thêm hàm validate form thêm/sửa sản phẩm
function validateProductForm() {
  const name = document.getElementById("productName").value;
  const price = document.getElementById("productPrice").value;
  const brandSelect = document.getElementById("productBrand").value;
  const newBrandInput = document.getElementById("newBrandInput").value;
  const category = document.getElementById("productCategory").value;
  const inventory = document.getElementById("productInventory").value;
  const minInventory = document.getElementById("productMinInventory").value;

  // Kiểm tra thương hiệu
  const brand = brandSelect === "new_brand" ? newBrandInput : brandSelect;

  if (!name || !price || !brand || !category || !inventory || !minInventory) {
    alert("Vui lòng điền đầy đủ thông tin sản phẩm");
    return false;
  }

  if (isNaN(price) || parseFloat(price) <= 0) {
    alert("Giá sản phẩm phải lớn hơn 0");
    return false;
  }

  if (isNaN(inventory) || parseInt(inventory) < 0) {
    alert("Số lượng tồn kho không được âm");
    return false;
  }

  if (isNaN(minInventory) || parseInt(minInventory) < 0) {
    alert("Số lượng tồn kho tối thiểu không được âm");
    return false;
  }

  if (parseInt(minInventory) > parseInt(inventory)) {
    alert("Tồn kho tối thiểu không được lớn hơn tồn kho hiện tại");
    return false;
  }

  return true;
}

// Hàm này để kiểm tra token và debug thông tin
function debugToken() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("Không tìm thấy token trong localStorage");
    return;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("Token không đúng định dạng JWT");
      return;
    }

    const payload = JSON.parse(atob(parts[1]));
    console.log("Token payload:", payload);
    console.log("Token expiration:", new Date(payload.exp * 1000));
    console.log("Current time:", new Date());
    console.log("Is token expired:", payload.exp * 1000 < Date.now());
    console.log("User role:", payload.role);
    console.log("User permissions:", payload.permissions);
  } catch (e) {
    console.error("Lỗi khi parse JWT:", e);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("Đang khởi tạo trang products...");

  // Debug token khi khởi tạo trang
  debugToken();

  // Lấy và lưu thông tin người dùng từ JWT
  saveUserInfoFromJWT();

  // Kiểm tra đăng nhập và quyền
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("Không tìm thấy token, chuyển hướng đến trang đăng nhập");
    window.location.href = "../login.html";
    return;
  }

  // Kiểm tra quyền admin
  if (!checkAdminPermission()) {
    alert("Bạn không có quyền truy cập trang này");
    window.location.href = "../login.html";
    return;
  }

  console.log("Đã xác thực quyền admin, đang tải dữ liệu...");

  // Load danh sách sản phẩm
  loadProducts();

  // Load danh mục và thương hiệu cho bộ lọc và form
  loadCategories();
  loadBrands();

  // Xử lý tìm kiếm và lọc (debounce cho search input)
  document.getElementById("searchInput")?.addEventListener(
    "input",
    debounce(() => loadProducts(), 500)
  );
  document
    .getElementById("categoryFilter")
    ?.addEventListener("change", () => loadProducts());
  document
    .getElementById("brandFilter")
    ?.addEventListener("change", () => loadProducts());
  document
    .getElementById("inventoryFilter")
    ?.addEventListener("change", () => loadProducts());

  // Event Listeners cho các nút và form
  document.getElementById("addProductBtn")?.addEventListener("click", () => {
    // Reset form và thiết lập tiêu đề modal cho thêm mới
    document.getElementById("addProductForm").reset();
    document.getElementById("productId").value = "";
    document.getElementById("addProductModalLabel").textContent =
      "Thêm sản phẩm mới";
    document.getElementById("currentImages").innerHTML = ""; // Xóa ảnh cũ khi thêm mới
    document.getElementById("productImages").value = ""; // Xóa file đã chọn
    imagesToDelete = []; // Reset danh sách ảnh cần xóa
  });

  document
    .getElementById("saveProductBtn")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      const productId = document.getElementById("productId").value;
      if (productId) {
        await updateProduct(productId);
      } else {
        await addProduct();
      }
    });

  document
    .getElementById("confirmImportBtn")
    ?.addEventListener("click", importProducts);
  document
    .getElementById("exportProductsBtn")
    ?.addEventListener("click", exportProducts);
  document
    .getElementById("saveInventoryBtn")
    ?.addEventListener("click", updateInventory);
  document
    .getElementById("savePriceBtn")
    ?.addEventListener("click", updatePrice);

  // Hiển thị preview ảnh mới khi chọn file
  const productImagesInput = document.getElementById("productImages");
  if (productImagesInput) {
    productImagesInput.addEventListener("change", function () {
      const previewDiv = document.getElementById("currentImages");
      const files = this.files;

      // Nếu có file mới được chọn, hiển thị preview
      if (files && files.length > 0) {
        // Xóa preview cũ nếu có
        const existingPreviews =
          previewDiv.querySelectorAll(".new-image-preview");
        existingPreviews.forEach((preview) => preview.remove());

        Array.from(files).forEach((file) => {
          const reader = new FileReader();
          reader.onload = function (e) {
            const imgWrapper = document.createElement("div");
            imgWrapper.className = "new-image-preview";
            imgWrapper.style.display = "inline-block";
            imgWrapper.style.position = "relative";
            imgWrapper.style.margin = "5px";

            const img = document.createElement("img");
            img.src = e.target.result;
            img.style.maxWidth = "100px";
            img.style.maxHeight = "100px";
            imgWrapper.appendChild(img);

            // Thêm label "Ảnh mới"
            const label = document.createElement("div");
            label.textContent = "Ảnh mới";
            label.style.fontSize = "10px";
            label.style.textAlign = "center";
            label.style.color = "#007bff";
            label.style.marginTop = "2px";
            imgWrapper.appendChild(label);

            previewDiv.appendChild(imgWrapper);
          };
          reader.readAsDataURL(file);
        });
      }
    });
  }
});

// Lưu thông tin người dùng từ JWT
function saveUserInfoFromJWT() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));

      // Lưu thông tin người dùng vào localStorage
      if (payload.role) localStorage.setItem("userRole", payload.role);
      if (payload.userId) localStorage.setItem("userId", payload.userId);
      if (payload.username) localStorage.setItem("username", payload.username);
      if (payload.permissions)
        localStorage.setItem(
          "permissions",
          JSON.stringify(payload.permissions)
        );

      console.log("Đã lưu thông tin người dùng từ JWT");
    }
  } catch (e) {
    console.error("Lỗi khi parse JWT:", e);
  }
}

// Kiểm tra quyền admin
function checkAdminPermission() {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));

      // Kiểm tra thời gian hết hạn
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.log("Token đã hết hạn");
        localStorage.removeItem("token");
        return false;
      }

      let userRole = payload.role;
      if (userRole) {
        localStorage.setItem("userRole", userRole);
      } else {
        userRole = localStorage.getItem("userRole");
      }

      if (!userRole || (userRole !== "admin" && userRole !== "super_admin")) {
        console.log("Người dùng không có quyền admin:", userRole);
        return false;
      }

      console.log("Người dùng có quyền admin:", userRole);
      return true;
    }
  } catch (e) {
    console.error("Lỗi khi parse JWT:", e);
    return false;
  }

  return false;
}

// Kiểm tra phản hồi từ API
async function checkResponse(response) {
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    alert(
      "Phiên làm việc đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại."
    );
    window.location.href = "../login.html";
    return false;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Lỗi API: ${response.status} - ${response.statusText} - ${errorText}`
    );
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    console.warn("Response không phải là JSON. Content-Type:", contentType);
    // Vẫn trả về true nếu response.ok để các hàm khác có thể xử lý non-JSON response (ví dụ: export)
    return true;
  }

  return true;
}

// Tải danh sách sản phẩm
async function loadProducts() {
  if (isLoading) return; // Tránh gọi API liên tục

  try {
    toggleLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "../login.html";
      return;
    }

    if (!checkAdminPermission()) return;

    if (!checkInternetConnection()) {
      throw new Error(
        "Không có kết nối internet. Vui lòng kiểm tra lại kết nối của bạn."
      );
    }

    const searchQuery = document.getElementById("searchInput")?.value || "";
    const category = document.getElementById("categoryFilter")?.value || "";
    const brand = document.getElementById("brandFilter")?.value || "";
    const inventory = document.getElementById("inventoryFilter")?.value || "";

    let url = `${API_BASE_URL}${
      ENDPOINTS.ADMIN.PRODUCTS
    }?search=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(
      category
    )}&brand=${encodeURIComponent(brand)}&inventory=${encodeURIComponent(
      inventory
    )}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return; // Return sớm nếu response không hợp lệ

    const products = await response.json();
    displayProducts(products);
  } catch (error) {
    handleError(
      error,
      "Có lỗi xảy ra khi tải danh sách sản phẩm. Vui lòng thử lại sau."
    );
    const tableBody = document.getElementById("productsTableBody");
    if (tableBody) {
      tableBody.innerHTML =
        '<tr><td colspan="8" class="text-center">Không thể tải dữ liệu sản phẩm. Vui lòng thử lại.</td></tr>';
    }
  } finally {
    toggleLoading(false);
  }
}

// Hiển thị sản phẩm ra bảng
function displayProducts(products) {
  const tableBody = document.getElementById("productsTableBody");
  if (!tableBody) {
    console.error("Không tìm thấy element productsTableBody");
    return;
  }

  tableBody.innerHTML = ""; // Xóa dữ liệu cũ

  if (!Array.isArray(products) || products.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="8" class="text-center">Không có sản phẩm nào để hiển thị.</td></tr>';
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("tr");
    // Xác định trạng thái tồn kho
    let inventoryStatus = '';
    let inventoryStatusClass = '';
    if ((product.inventory || 0) > 0) {
      inventoryStatus = 'Còn hàng';
      inventoryStatusClass = 'bg-success';
    } else {
      inventoryStatus = 'Hết hàng';
      inventoryStatusClass = 'bg-danger';
    }
    row.innerHTML = `
            <td>${product.id || ""}</td>
            <td>${product.name || ""}</td>
            <td>${formatPrice(product.price || 0)}</td>
            <td>${product.brand || ""}</td>
            <td>${product.category || ""}</td>
            <td>
                <span class="badge ${getInventoryBadgeClass(
                  product.inventory || 0,
                  product.min_inventory || 0
                )}">
                    ${product.inventory || 0}
                </span>
            </td>
            <td>
                <span class="badge ${inventoryStatusClass}">
                    ${inventoryStatus}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary me-1" data-id="${
                  product.id || 0
                }" data-bs-toggle="modal" data-bs-target="#addProductModal" onclick="editProduct(${product.id || 0})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-info me-1" data-id="${
                  product.id || 0
                }" data-bs-toggle="modal" data-bs-target="#manageInventoryModal" onclick="manageInventory(${product.id || 0})">
                    <i class="fas fa-boxes"></i>
                </button>
                <button class="btn btn-sm btn-warning me-1" data-id="${
                  product.id || 0
                }" data-bs-toggle="modal" data-bs-target="#managePriceModal" onclick="managePrice(${product.id || 0})">
                    <i class="fas fa-tag"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id || 0})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
    tableBody.appendChild(row);
  });
}

// Tải danh mục
async function loadCategories() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "../login.html";
      return;
    }

    let response = await fetch(`${API_BASE_URL}${ENDPOINTS.ADMIN.CATEGORIES}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Fallback to public endpoint if admin endpoint fails
      response = await fetch(`${API_BASE_URL}${ENDPOINTS.CATEGORIES}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return; // Return sớm nếu response không hợp lệ

    const categories = await response.json();
    updateCategoryDropdowns(categories);
  } catch (error) {
    handleError(error, "Có lỗi xảy ra khi tải danh mục. Vui lòng thử lại sau.");
    const categoryFilter = document.getElementById("categoryFilter");
    const productCategory = document.getElementById("productCategory");
    if (categoryFilter)
      categoryFilter.innerHTML =
        '<option value="">Không thể tải danh mục</option>';
    if (productCategory)
      productCategory.innerHTML =
        '<option value="">Không thể tải danh mục</option>';
  }
}

// Cập nhật dropdown danh mục
function updateCategoryDropdowns(categories) {
  const categoryFilter = document.getElementById("categoryFilter");
  const productCategory = document.getElementById("productCategory");

  if (categoryFilter)
    categoryFilter.innerHTML = '<option value="">Tất cả danh mục</option>';
  if (productCategory)
    productCategory.innerHTML = '<option value="">Chọn danh mục</option>';

  if (Array.isArray(categories)) {
    categories.forEach((category) => {
      const categoryId = category.id || category._id || category;
      const categoryName = category.name || category;

      if (categoryFilter) {
        categoryFilter.innerHTML += `<option value="${categoryId}">${categoryName}</option>`;
      }
      if (productCategory) {
        productCategory.innerHTML += `<option value="${categoryId}">${categoryName}</option>`;
      }
    });
  }
}

// Tải thương hiệu
async function loadBrands() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "../login.html";
      return;
    }

    let response = await fetch(`${API_BASE_URL}${ENDPOINTS.ADMIN.BRANDS}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Fallback to public endpoint if admin endpoint fails
      response = await fetch(`${API_BASE_URL}${ENDPOINTS.BRANDS}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return; // Return sớm nếu response không hợp lệ

    const brands = await response.json();
    updateBrandDropdown(brands);
  } catch (error) {
    handleError(
      error,
      "Có lỗi xảy ra khi tải thương hiệu. Vui lòng thử lại sau."
    );
    const brandFilter = document.getElementById("brandFilter");
    if (brandFilter)
      brandFilter.innerHTML =
        '<option value="">Không thể tải thương hiệu</option>';
  }
}

// Cập nhật dropdown thương hiệu
function updateBrandDropdown(brands) {
  const brandFilter = document.getElementById("brandFilter");
  const productBrand = document.getElementById("productBrand");

  if (brandFilter)
    brandFilter.innerHTML = '<option value="">Tất cả thương hiệu</option>';
  if (productBrand)
    productBrand.innerHTML = '<option value="">Chọn thương hiệu</option>';

  if (Array.isArray(brands)) {
    brands.forEach((brand) => {
      const brandId = brand.id || brand._id || brand;
      const brandName = brand.name || brand;

      if (brandFilter) {
        brandFilter.innerHTML += `<option value="${brandId}">${brandName}</option>`;
      }
      if (productBrand) {
        productBrand.innerHTML += `<option value="${brandId}">${brandName}</option>`;
      }
    });
  }

  // Thêm option "Thương hiệu mới" vào cuối danh sách cho form sản phẩm
  if (productBrand) {
    productBrand.innerHTML +=
      '<option value="new_brand">+ Thương hiệu mới</option>';
  }
}

// Thêm sản phẩm mới
async function addProduct() {
  if (!validateProductForm()) return;

  try {
    toggleLoading(true);

    const formData = new FormData();
    formData.append("name", document.getElementById("productName").value);
    formData.append("price", document.getElementById("productPrice").value);

    // Xử lý thương hiệu (có thể là thương hiệu có sẵn hoặc thương hiệu mới)
    const brandSelect = document.getElementById("productBrand").value;
    const newBrandInput = document.getElementById("newBrandInput").value;
    const brand = brandSelect === "new_brand" ? newBrandInput : brandSelect;
    formData.append("brand", brand);
    formData.append(
      "category",
      document.getElementById("productCategory").value
    );
    formData.append(
      "inventory",
      document.getElementById("productInventory").value
    );
    formData.append(
      "min_inventory",
      document.getElementById("productMinInventory").value
    );
    formData.append(
      "description",
      document.getElementById("productDescription").value
    );

    const imageFiles = document.getElementById("productImages").files;
    for (let i = 0; i < imageFiles.length; i++) {
      formData.append("images", imageFiles[i]);
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    });

    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return; // Return sớm nếu response không hợp lệ

    const result = await response.json();
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("addProductModal")
    );
    if (modal) modal.hide();

    loadProducts();
    alert("Thêm sản phẩm thành công");
  } catch (error) {
    handleError(error, "Có lỗi xảy ra khi thêm sản phẩm");
  } finally {
    toggleLoading(false);
  }
}

// Lấy thông tin sản phẩm để chỉnh sửa
async function editProduct(productId) {
  try {
    toggleLoading(true);
    imagesToDelete = [];
    const token = localStorage.getItem("token");
    const response = await fetch(
      `${API_BASE_URL}/api/admin/products/${productId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return;
    const product = await response.json();
    document.getElementById("productId").value = product.id;
    document.getElementById("productName").value = product.name;
    document.getElementById("productPrice").value = product.price;

    // Xử lý thương hiệu khi edit
    const brandSelect = document.getElementById("productBrand");
    const newBrandInput = document.getElementById("newBrandInput");

    // Kiểm tra xem thương hiệu có trong danh sách không
    const brandOptions = Array.from(brandSelect.options).map(
      (option) => option.value
    );
    if (brandOptions.includes(product.brand)) {
      // Thương hiệu có sẵn trong dropdown
      brandSelect.value = product.brand;
      newBrandInput.style.display = "none";
      newBrandInput.required = false;
    } else {
      // Thương hiệu không có trong dropdown, hiển thị như thương hiệu mới
      brandSelect.value = "new_brand";
      newBrandInput.value = product.brand;
      newBrandInput.style.display = "block";
      newBrandInput.required = true;
    }

    document.getElementById("productCategory").value = product.category;
    document.getElementById("productInventory").value = product.inventory;
    document.getElementById("productMinInventory").value =
      product.min_inventory;
    document.getElementById("productDescription").value = product.description;
    // Hiển thị ảnh hiện tại với nút xóa
    const currentImagesDiv = document.getElementById("currentImages");
    currentImagesDiv.innerHTML = "";
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((image, idx) => {
        const imgWrapper = document.createElement("div");
        imgWrapper.className = "existing-image";
        imgWrapper.style.display = "inline-block";
        imgWrapper.style.position = "relative";
        imgWrapper.style.margin = "5px";
        const img = document.createElement("img");
        // Sửa đường dẫn ảnh - kiểm tra nhiều trường hợp
        let imageSrc = image;
        if (image.startsWith("http")) {
          imageSrc = image;
        } else if (image.startsWith("images/")) {
          imageSrc = `../${image}`;
        } else if (image.startsWith("3K IMG/")) {
          imageSrc = `../images/3K IMG/${image.replace("3K IMG/", "")}`;
        } else {
          imageSrc = `../images/3K IMG/${image}`;
        }
        img.src = imageSrc;
        img.setAttribute("data-filename", image); // Để biết tên file khi gửi lại
        img.style.maxWidth = "100px";
        img.style.maxHeight = "100px";
        img.onerror = function () {
          this.src = "../images/placeholder.jpg";
        };
        imgWrapper.appendChild(img);
        // Nút xóa
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.innerHTML = "&times;";
        delBtn.title = "Xóa ảnh này";
        delBtn.style.position = "absolute";
        delBtn.style.top = "0";
        delBtn.style.right = "0";
        delBtn.style.background = "rgba(255,0,0,0.7)";
        delBtn.style.color = "#fff";
        delBtn.style.border = "none";
        delBtn.style.borderRadius = "50%";
        delBtn.style.width = "24px";
        delBtn.style.height = "24px";
        delBtn.style.cursor = "pointer";
        delBtn.onclick = function () {
          imgWrapper.remove();
          imagesToDelete.push(image);
        };
        imgWrapper.appendChild(delBtn);
        currentImagesDiv.appendChild(imgWrapper);
      });
    }
    document.getElementById("addProductModalLabel").textContent =
      "Cập nhật sản phẩm";
    const modal = new bootstrap.Modal(
      document.getElementById("addProductModal")
    );
    modal.show();
  } catch (error) {
    handleError(error, "Không thể tải thông tin sản phẩm để chỉnh sửa.");
  } finally {
    toggleLoading(false);
  }
}

// Cập nhật sản phẩm
async function updateProduct(productId) {
  if (!validateProductForm()) return;
  try {
    toggleLoading(true);
    const formData = new FormData();
    formData.append("name", document.getElementById("productName").value);
    formData.append("price", document.getElementById("productPrice").value);

    // Xử lý thương hiệu (có thể là thương hiệu có sẵn hoặc thương hiệu mới)
    const brandSelect = document.getElementById("productBrand").value;
    const newBrandInput = document.getElementById("newBrandInput").value;
    const brand = brandSelect === "new_brand" ? newBrandInput : brandSelect;
    formData.append("brand", brand);
    formData.append(
      "category",
      document.getElementById("productCategory").value
    );
    formData.append(
      "inventory",
      document.getElementById("productInventory").value
    );
    formData.append(
      "min_inventory",
      document.getElementById("productMinInventory").value
    );
    formData.append(
      "description",
      document.getElementById("productDescription").value
    );
    // Lấy danh sách ảnh cũ còn lại (sau khi xóa)
    const currentImages = Array.from(
      document.querySelectorAll(".existing-image img")
    )
      .map((img) => img.getAttribute("data-filename"))
      .filter((filename) => !!filename && !imagesToDelete.includes(filename));
    if (currentImages.length > 0) {
      formData.append("existingImages", JSON.stringify(currentImages));
    }
    // Gửi danh sách ảnh cần xóa (nếu có)
    if (imagesToDelete.length > 0) {
      formData.append("imagesToDelete", JSON.stringify(imagesToDelete));
    }
    // Ảnh mới
    const imageFiles = document.getElementById("productImages").files;
    for (let i = 0; i < imageFiles.length; i++) {
      formData.append("images", imageFiles[i]);
    }
    const response = await fetch(
      `${API_BASE_URL}/api/admin/products/${productId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      }
    );
    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return;
    const result = await response.json();
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("addProductModal")
    );
    if (modal) modal.hide();
    loadProducts();
    alert("Cập nhật sản phẩm thành công");
    imagesToDelete = [];
    document.getElementById("productImages").value = "";
  } catch (error) {
    handleError(error, "Có lỗi xảy ra khi cập nhật sản phẩm");
  } finally {
    toggleLoading(false);
  }
}

// Xóa sản phẩm
async function deleteProduct(productId) {
  if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

  try {
    toggleLoading(true);

    const response = await fetch(
      `${API_BASE_URL}/api/admin/products/${productId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return; // Return sớm nếu response không hợp lệ

    const result = await response.json();
    loadProducts();
    alert("Xóa sản phẩm thành công");
  } catch (error) {
    handleError(error, "Có lỗi xảy ra khi xóa sản phẩm");
  } finally {
    toggleLoading(false);
  }
}

// Mở modal quản lý tồn kho
async function manageInventory(productId) {
  try {
    toggleLoading(true);
    const token = localStorage.getItem("token");
    const response = await fetch(
      `${API_BASE_URL}/api/admin/products/${productId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return; // Return sớm nếu response không hợp lệ

    const product = await response.json();

    document.getElementById("inventoryProductId").value = productId;
    document.getElementById("currentInventory").value = product.inventory;
    document.getElementById("newInventory").value = product.inventory;
    document.getElementById("minInventorySet").value = product.min_inventory;

    const modal = new bootstrap.Modal(
      document.getElementById("manageInventoryModal")
    );
    modal.show();
  } catch (error) {
    handleError(error, "Không thể tải thông tin tồn kho");
  } finally {
    toggleLoading(false);
  }
}

// Cập nhật tồn kho
async function updateInventory() {
  const productId = document.getElementById("inventoryProductId").value;
  const newInventory = document.getElementById("newInventory").value;
  const minInventory = document.getElementById("minInventorySet").value;

  if (isNaN(newInventory) || parseInt(newInventory) < 0) {
    alert("Số lượng tồn kho mới không hợp lệ");
    return;
  }
  if (isNaN(minInventory) || parseInt(minInventory) < 0) {
    alert("Số lượng tồn kho tối thiểu không hợp lệ");
    return;
  }
  if (parseInt(minInventory) > parseInt(newInventory)) {
    alert("Tồn kho tối thiểu không được lớn hơn tồn kho hiện tại");
    return false;
  }

  try {
    toggleLoading(true);
    const response = await fetch(
      `${API_BASE_URL}/api/admin/products/${productId}/inventory`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          inventory: parseInt(newInventory),
          min_inventory: parseInt(minInventory),
        }),
      }
    );

    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return; // Return sớm nếu response không hợp lệ

    const result = await response.json();
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("manageInventoryModal")
    );
    if (modal) modal.hide();

    loadProducts();
    alert("Cập nhật tồn kho thành công");
  } catch (error) {
    handleError(error, "Có lỗi xảy ra khi cập nhật tồn kho");
  } finally {
    toggleLoading(false);
  }
}

// Mở modal quản lý giá
async function managePrice(productId) {
  try {
    toggleLoading(true);
    const response = await fetch(
      `${API_BASE_URL}/api/admin/products/${productId}`
    );
    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return; // Return sớm nếu response không hợp lệ

    const product = await response.json();

    document.getElementById("priceProductId").value = productId;
    document.getElementById("currentPrice").value = formatPrice(product.price);
    document.getElementById("newPrice").value = product.price;

    const modal = new bootstrap.Modal(
      document.getElementById("managePriceModal")
    );
    modal.show();
  } catch (error) {
    handleError(error, "Không thể tải thông tin giá");
  } finally {
    toggleLoading(false);
  }
}

// Cập nhật giá
async function updatePrice() {
  const productId = document.getElementById("priceProductId").value;
  const newPrice = document.getElementById("newPrice").value;

  if (isNaN(newPrice) || parseFloat(newPrice) <= 0) {
    alert("Giá mới không hợp lệ");
    return;
  }

  try {
    toggleLoading(true);
    const response = await fetch(
      `${API_BASE_URL}/api/admin/products/${productId}/price`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ price: parseFloat(newPrice) }),
      }
    );

    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return; // Return sớm nếu response không hợp lệ

    const result = await response.json();
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("managePriceModal")
    );
    if (modal) modal.hide();

    loadProducts();
    alert("Cập nhật giá thành công");
  } catch (error) {
    handleError(error, "Có lỗi xảy ra khi cập nhật giá");
  } finally {
    toggleLoading(false);
  }
}

// Import sản phẩm
async function importProducts() {
  const file = document.getElementById("importFile").files[0];
  if (!file) {
    alert("Vui lòng chọn file để import");
    return;
  }

  try {
    toggleLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE_URL}${ENDPOINTS.ADMIN.PRODUCTS}/import`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      }
    );

    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return; // Return sớm nếu response không hợp lệ

    const result = await response.json();
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("importModal")
    );
    if (modal) modal.hide();

    loadProducts();
    alert(
      `Import thành công: ${result.success || 0} sản phẩm, ${
        result.error || 0
      } lỗi`
    );
  } catch (error) {
    handleError(error, "Có lỗi xảy ra khi import sản phẩm");
  } finally {
    toggleLoading(false);
  }
}

// Export sản phẩm
async function exportProducts() {
  try {
    toggleLoading(true);
    const response = await fetch(`${API_BASE_URL}/api/admin/products/export`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const isValidResponse = await checkResponse(response);
    if (!isValidResponse) return; // Return sớm nếu response không hợp lệ

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_export.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    alert("Export sản phẩm thành công");
  } catch (error) {
    handleError(error, "Có lỗi xảy ra khi export sản phẩm");
  } finally {
    toggleLoading(false);
  }
}

// Utility functions
function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function getInventoryBadgeClass(inventory, minInventory) {
  if (inventory <= 0) return "bg-danger";
  if (inventory <= minInventory) return "bg-warning";
  return "bg-success";
}

function debounce(func, wait = 300) {
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
