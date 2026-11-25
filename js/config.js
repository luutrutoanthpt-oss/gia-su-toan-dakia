// Cấu hình hệ thống Hỗ trợ Giáo viên & Học sinh THPT – Trường THPT Đa Kia
const SYSTEM_CONFIG = {
    appName: "HỖ TRỢ GIÁO VIÊN & HỌC SINH THPT – THPT ĐA KIA",
    author: "Võ Văn Bình – Tổ trưởng chuyên môn Tổ Toán – Tin, Trường THPT Đa Kia",
    googleScriptUrl: "https://script.google.com/macros/s/AKfycbxM-soCzU6dcT_xZA8FVG0IVs04Vvk6wy-RIhO167KF6yiM1-x5bVk77AEiv_0y00JYpw/exec",
// Tài khoản Quản trị Tác giả: vovanbinh | Mật khẩu mặc định: Vanphong@2015
    masterAdminUser: "vovanbinh",
    masterAdminPassHash: "a1c9a0312143d9859e0d4137a106f69939e17b09d4c2653839a4b7391b742c33"
};

async function sha256Hex(str) {
    if (window.crypto && window.crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    return str;
}

async function syncFromGoogleSheets() {
    if (!SYSTEM_CONFIG.googleScriptUrl || SYSTEM_CONFIG.googleScriptUrl.startsWith("DAN_URL")) return null;
    try {
        const res = await fetch(SYSTEM_CONFIG.googleScriptUrl + "?action=sync_all");
        if (!res.ok) return null;
        const data = await res.json();
        if (Array.isArray(data.students) && data.students.length > 0) {
            localStorage.setItem("dakia_all_students", JSON.stringify(data.students));
        }
        if (Array.isArray(data.teachers)) {
            localStorage.setItem("dakia_teachers", JSON.stringify(data.teachers));
        }
        if (Array.isArray(data.exams)) {
            localStorage.setItem("dakia_uploaded_exams", JSON.stringify(data.exams));
        }
        return data;
    } catch (_) {
        return null;
    }
}
