// Cấu hình hệ thống Hỗ trợ Giáo viên & Học sinh THPT – Trường THPT Đa Kia
const SYSTEM_CONFIG = {
    appName: "HỖ TRỢ GIÁO VIÊN & HỌC SINH THPT – THPT ĐA KIA",
    author: "Võ Văn Bình – Tổ trưởng chuyên môn Tổ Toán – Tin, Trường THPT Đa Kia",
    googleScriptUrl: "https://script.google.com/macros/s/AKfycbxM-soCzU6dcT_xZA8FVG0IVs04Vvk6wy-RIhO167KF6yiM1-x5bVk77AEiv_0y00JYpw/exec",
    // Mã băm SHA-256 mặc định của mật khẩu quản trị tác giả: Vanphong@2015
    masterAdminUser: "vovanbinh",
    masterAdminPassHash: "8c2f8799f44d0759467e19758d917e640b99e60770922b9694a59d292746233b"
};

const SUBJECT_LIST = [
    { id: "toan", name: "Toán học", icon: "📐" },
    { id: "vatli", name: "Vật lí", icon: "⚡" },
    { id: "hoahoc", name: "Hóa học", icon: "🧪" },
    { id: "sinhhoc", name: "Sinh học", icon: "🧬" },
    { id: "tinhoc", name: "Tin học", icon: "💻" },
    { id: "nguvan", name: "Ngữ văn", icon: "📖" },
    { id: "tienganh", name: "Tiếng Anh", icon: "🌐" },
    { id: "lichsu", name: "Lịch sử", icon: "🏛️" },
    { id: "diali", name: "Địa lí", icon: "🌍" },
    { id: "gdktpl", name: "GDKT & Pháp luật", icon: "⚖️" }
];

async function sha256Hex(text) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function syncFromGoogleSheets() {
    if (!SYSTEM_CONFIG.googleScriptUrl || SYSTEM_CONFIG.googleScriptUrl.startsWith("DAN_URL")) return null;
    try {
        const res = await fetch(SYSTEM_CONFIG.googleScriptUrl);
        if (!res.ok) return null;
        const data = await res.json();
        if (Array.isArray(data.students) && data.students.length > 0) {
            const normalized = data.students.map(s => ({
                ...s,
                is_weak_mode: String(s.is_weak_mode).toUpperCase() === "TRUE"
            }));
            localStorage.setItem("dakia_all_students", JSON.stringify(normalized));
        }
        if (Array.isArray(data.exams)) {
            const parsedExams = data.exams.map(ex => {
                let qs = [];
                try { qs = typeof ex.questionsJson === "string" ? JSON.parse(ex.questionsJson) : (ex.questionsJson || []); } catch (_) {}
                return { ...ex, questions: qs };
            });
            localStorage.setItem("dakia_uploaded_exams", JSON.stringify(parsedExams));
        }
        if (Array.isArray(data.teachers) && data.teachers.length > 0) {
            localStorage.setItem("dakia_teachers", JSON.stringify(data.teachers));
        }
        return data;
    } catch (_) {
        return null;
    }
}
