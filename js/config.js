// Cấu hình kết nối Cơ sở dữ liệu Supabase (Miễn phí)
// Thầy/Cô sẽ dán URL và ANON_KEY từ Supabase vào đây ở Giai đoạn 4
const SUPABASE_CONFIG = {
    url: "YOUR_SUPABASE_URL",
    anonKey: "YOUR_SUPABASE_ANON_KEY"
};

// Mật khẩu đăng nhập trang Quản trị Giáo viên (admin.html) - Có thể đổi tùy ý
const TEACHER_ADMIN_PASS = "Vanphong@2015";

// Khởi tạo kết nối Supabase nếu đã cấu hình
let supabaseClient = null;
if (window.supabase && SUPABASE_CONFIG.url !== "YOUR_SUPABASE_URL") {
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
}
// Hỗ trợ dán ảnh trực tiếp từ Clipboard (Ctrl + V) vào ô chat
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;

    chatInput.addEventListener('paste', function (event) {
        const items = (event.clipboardData || event.originalEvent?.clipboardData)?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                event.preventDefault(); // Ngăn dán tên file rác vào ô chữ
                const file = items[i].getAsFile();
                if (!file) return;

                // Nạp file ảnh vào input file hiện có và kích hoạt hàm xem trước ảnh của hệ thống
                const imageInput = document.getElementById('imageInput');
                if (imageInput) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    imageInput.files = dataTransfer.files;

                    if (typeof window.handleImageUpload === 'function') {
                        window.handleImageUpload({ target: imageInput });
                    } else {
                        imageInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                break;
            }
        }
    });
});
