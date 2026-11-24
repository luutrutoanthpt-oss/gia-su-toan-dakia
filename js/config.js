// Cấu hình kết nối Cơ sở dữ liệu Supabase (Miễn phí)
// Thầy/Cô sẽ dán URL và ANON_KEY từ Supabase vào đây ở Giai đoạn 4
const SUPABASE_CONFIG = {
    url: "YOUR_SUPABASE_URL",
    anonKey: "YOUR_SUPABASE_ANON_KEY"
};

// Mật khẩu đăng nhập trang Quản trị Giáo viên (admin.html) - Có thể đổi tùy ý
const TEACHER_ADMIN_PASS = "ToanDaKia2026";

// Khởi tạo kết nối Supabase nếu đã cấu hình
let supabaseClient = null;
if (window.supabase && SUPABASE_CONFIG.url !== "YOUR_SUPABASE_URL") {
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
}