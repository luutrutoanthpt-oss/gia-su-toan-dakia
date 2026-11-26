let studentList = JSON.parse(localStorage.getItem("dakia_all_students")) || [
    { student_code: "10A801", full_name: "Nguyễn Văn An", class_name: "10A8", grade: "10", is_weak_mode: true },
    { student_code: "10A802", full_name: "Trần Thị Bích", class_name: "10A8", grade: "10", is_weak_mode: false },
    { student_code: "10A803", full_name: "Lê Hoàng Nam", class_name: "10A8", grade: "10", is_weak_mode: true }
];

let teacherList = JSON.parse(localStorage.getItem("dakia_teachers")) || [];
let uploadedExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
let questionBank = JSON.parse(localStorage.getItem("dakia_question_bank")) || [
    {
        id: "QB_SAMPLE_1",
        subject: "Toán học",
        grade: "10",
        topic: "Tích vô hướng của hai vectơ",
        type: "NL",
        level: "Biết",
        content: "Trong mặt phẳng tọa độ $Oxy$, cho hai vectơ $\\vec{a} = (2; -3)$ và $\\vec{b} = (4; 1)$. Tích vô hướng $\\vec{a} \\cdot \\vec{b}$ bằng",
        options: ["$5$", "$11$", "$-5$", "$8$"],
        correct: 0,
        solution: "Ta có $\\vec{a} \\cdot \\vec{b} = 2 \\cdot 4 + (-3) \\cdot 1 = 5$.",
        author: "Võ Văn Bình"
    },
    {
        id: "QB_SAMPLE_2",
        subject: "Toán học",
        grade: "10",
        topic: "Tích vô hướng của hai vectơ",
        type: "TLN",
        level: "Hiểu",
        content: "Cho tam giác đều $ABC$ có cạnh bằng $4$. Tính giá trị của tích vô hướng $\\vec{AB} \\cdot \\vec{AC}$.",
        options: [],
        shortAnswer: "8",
        correct: 0,
        solution: "Ta có $\\vec{AB} \\cdot \\vec{AC} = AB \\cdot AC \\cdot \\cos 60^\\circ = 4 \\cdot 4 \\cdot \\frac{1}{2} = 8$.",
        author: "Võ Văn Bình"
    }
];

let mixPoolQuestions = [];
let selectedBankIds = new Set();
let currentLoggedAdmin = null;
let pendingParsedExam = null;
let latestLessonSvg = "";

if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// Tải ngầm danh sách giáo viên ngay khi mở trang đăng nhập để vào tức thì
window.addEventListener("DOMContentLoaded", () => {
    if (typeof syncFromGoogleSheets === "function") {
        syncFromGoogleSheets().then(() => {
            teacherList = JSON.parse(localStorage.getItem("dakia_teachers")) || teacherList;
        }).catch(() => {});
    }
});

// Đóng dropdown khi bấm ra ngoài
document.addEventListener("click", function (e) {
    const wrapper = document.getElementById("userMenuWrapper");
    const dropdown = document.getElementById("userProfileDropdown");
    if (wrapper && dropdown && !wrapper.contains(e.target)) {
        dropdown.classList.add("hidden");
    }
});

function toggleUserDropdown() {
    const dropdown = document.getElementById("userProfileDropdown");
    if (dropdown) dropdown.classList.toggle("hidden");
}

function openChangePasswordModal() {
    const dropdown = document.getElementById("userProfileDropdown");
    if (dropdown) dropdown.classList.add("hidden");
    document.getElementById("oldPassInput").value = "";
    document.getElementById("newPassInput").value = "";
    document.getElementById("confirmNewPassInput").value = "";
    document.getElementById("changePassModal").classList.remove("hidden");
}

function closeChangePasswordModal() {
    document.getElementById("changePassModal").classList.add("hidden");
}

async function submitChangePassword() {
    if (!currentLoggedAdmin) return;
    const oldPass = document.getElementById("oldPassInput").value.trim();
    const newPass = document.getElementById("newPassInput").value.trim();
    const confirmPass = document.getElementById("confirmNewPassInput").value.trim();

    if (!oldPass || !newPass || !confirmPass) {
        return alert("Vui lòng nhập đầy đủ các ô mật khẩu!");
    }
    if (newPass.length < 6) {
        return alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
    }
    if (newPass !== confirmPass) {
        return alert("Mật khẩu mới nhập lại chưa khớp!");
    }

    const oldHash = typeof sha256Hex === "function" ? await sha256Hex(oldPass) : oldPass;
    const newHash = typeof sha256Hex === "function" ? await sha256Hex(newPass) : newPass;

    if (currentLoggedAdmin.role === "master") {
        const customMasterHash = localStorage.getItem("dakia_master_custom_hash");
        const defaultMasterHash = typeof sha256Hex === "function" ? await sha256Hex("Vanphong@2015") : "Vanphong@2015";
        const systemMasterHash = (typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG.masterAdminPassHash) ? SYSTEM_CONFIG.masterAdminPassHash : defaultMasterHash;
        const validHash = customMasterHash || systemMasterHash;

        if (oldHash !== validHash && oldHash !== defaultMasterHash) {
            return alert("Mật khẩu hiện tại không chính xác!");
        }
        localStorage.setItem("dakia_master_custom_hash", newHash);
        closeChangePasswordModal();
        alert("Đã cập nhật mật khẩu Quản trị viên thành công!");
    } else {
        const idx = teacherList.findIndex(t => t.username.toLowerCase() === currentLoggedAdmin.username.toLowerCase());
        if (idx === -1) return alert("Không tìm thấy thông tin tài khoản giáo viên!");
        if (teacherList[idx].pass_hash !== oldHash) {
            return alert("Mật khẩu hiện tại không chính xác!");
        }
        teacherList[idx].pass_hash = newHash;
        currentLoggedAdmin.pass_hash = newHash;
        localStorage.setItem("dakia_teachers", JSON.stringify(teacherList));
        postToGoogleSheets({ action: "save_teachers", teachers: teacherList });
        closeChangePasswordModal();
        alert("Đã đổi mật khẩu và đồng bộ lên hệ thống thành công!");
    }
}

// ==================== ĐĂNG NHẬP NHANH & PHÂN QUYỀN GIAO DIỆN ====================
async function verifyAdmin() {
    const user = document.getElementById("adminUserInput").value.trim().toLowerCase();
    const pass = document.getElementById("adminPassInput").value.trim();
    const errEl = document.getElementById("adminLoginErr");
    if (!user || !pass) return;

    const passHash = typeof sha256Hex === "function" ? await sha256Hex(pass) : pass;
    const defaultMasterHash = typeof sha256Hex === "function" ? await sha256Hex("Vanphong@2015") : "Vanphong@2015";
    const customMasterHash = localStorage.getItem("dakia_master_custom_hash");
    const masterUser = (typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG.masterAdminUser) ? SYSTEM_CONFIG.masterAdminUser.toLowerCase() : "vovanbinh";
    const masterHash = customMasterHash || ((typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG.masterAdminPassHash) ? SYSTEM_CONFIG.masterAdminPassHash : defaultMasterHash);

    if (user === masterUser && (passHash === masterHash || (!customMasterHash && passHash === defaultMasterHash))) {
        currentLoggedAdmin = {
            username: user,
            full_name: "Võ Văn Bình",
            display_title: "Võ Văn Bình",
            subject: "Toán - Tin học",
            role_title: "Tổ trưởng",
            role: "master"
        };
    } else {
        teacherList = JSON.parse(localStorage.getItem("dakia_teachers")) || [];
        let found = teacherList.find(t => t.username.toLowerCase() === user && t.pass_hash === passHash);

        if (!found && typeof syncFromGoogleSheets === "function") {
            const loginBtn = document.querySelector("#adminLoginScreen button");
            const oldBtnText = loginBtn ? loginBtn.textContent : "";
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.textContent = "⏳ Đang kiểm tra tài khoản trên máy chủ...";
            }
            try {
                await syncFromGoogleSheets();
                teacherList = JSON.parse(localStorage.getItem("dakia_teachers")) || [];
                found = teacherList.find(t => t.username.toLowerCase() === user && t.pass_hash === passHash);
            } finally {
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = oldBtnText;
                }
            }
        }

        if (found) {
            currentLoggedAdmin = {
                ...found,
                display_title: found.full_name,
                role_title: found.role_title || "Giáo viên",
                role: "teacher"
            };
        }
    }

    if (!currentLoggedAdmin) {
        errEl.classList.remove("hidden");
        return;
    }

    errEl.classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.add("hidden");
    document.getElementById("adminDashboard").classList.remove("hidden");
    document.getElementById("loggedTeacherBadge").textContent =
        `Đang đăng nhập: ${currentLoggedAdmin.display_title} • Tổ: ${currentLoggedAdmin.subject} • Chức danh: ${currentLoggedAdmin.role_title || "Giáo viên"}`;

    const nameMenuEl = document.getElementById("userMenuFullName");
    if (nameMenuEl) {
        nameMenuEl.textContent = currentLoggedAdmin.full_name;
    }

    const mixGroupEl = document.getElementById("mixGroupInput");
    if (mixGroupEl && currentLoggedAdmin.subject) {
        mixGroupEl.value = currentLoggedAdmin.subject.toUpperCase();
    }

    renderAllViewsFromLocal();
    applyRoleBasedUI();
    syncNow();
}

function renderAllViewsFromLocal() {
    studentList = JSON.parse(localStorage.getItem("dakia_all_students")) || studentList;
    teacherList = JSON.parse(localStorage.getItem("dakia_teachers")) || [];
    uploadedExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
    const storedBank = JSON.parse(localStorage.getItem("dakia_question_bank"));
    if (Array.isArray(storedBank) && storedBank.length > 0) {
        questionBank = storedBank;
    }

    updateClassFilterDropdown();
    renderStudentTable();
    renderTeacherTable();
    renderUploadedExams();
    renderQuestionBank();
}

function applyRoleBasedUI() {
    const tab1Btn = document.getElementById("atab-1");
    const tab2Btn = document.getElementById("atab-2");
    const tab5Btn = document.getElementById("atab-5");
    const tab3Btn = document.getElementById("atab-3");
    const tab4Btn = document.getElementById("atab-4");
    const masterManager = document.getElementById("masterTeacherManager");

    if (tab1Btn) tab1Btn.classList.remove("hidden");

    if (currentLoggedAdmin?.role === "master") {
        if (tab1Btn) tab1Btn.textContent = "👥 1. Lớp học & Phân quyền Tổ";
        if (masterManager) masterManager.classList.remove("hidden");
    } else {
        if (tab1Btn) tab1Btn.textContent = "👥 1. Quản lý lớp học";
        if (masterManager) masterManager.classList.add("hidden");

        const sub = currentLoggedAdmin?.subject || "";
        ["examSubjectInput", "lpSubject", "qbAddSubject", "qbFilterSubject"].forEach(elId => {
            const el = document.getElementById(elId);
            if (el && sub) {
                for (const opt of el.options) {
                    if (opt.value.toLowerCase().includes(sub.toLowerCase()) || sub.toLowerCase().includes(opt.value.toLowerCase())) {
                        el.value = opt.value;
                        break;
                    }
                }
            }
        });
    }

    if (tab2Btn) tab2Btn.textContent = "📝 2. Thi Trực Tuyến & Mã QR";
    if (tab5Btn) tab5Btn.textContent = "🎲 3. Trộn Đề & QR TNMaker";
    if (tab3Btn) tab3Btn.textContent = "✨ 4. Soạn KHBD 5512, Slide & E-learning";
    if (tab4Btn) tab4Btn.textContent = "🔗 5. Tạo Mã QR & PDF sang Word";

    switchAdminTab(1);
}

function logoutAdmin() {
    currentLoggedAdmin = null;
    const dropdown = document.getElementById("userProfileDropdown");
    if (dropdown) dropdown.classList.add("hidden");
    document.getElementById("adminDashboard").classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.remove("hidden");
    document.getElementById("adminPassInput").value = "";
}

async function syncNow() {
    if (typeof syncFromGoogleSheets === "function") {
        await syncFromGoogleSheets();
    }
    renderAllViewsFromLocal();
}

function switchAdminTab(tabId) {
    document.querySelectorAll(".admin-sec").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".admin-tab-btn").forEach(btn => {
        btn.classList.remove("border-blue-700", "text-blue-700", "font-bold");
        btn.classList.add("border-transparent", "text-slate-600");
    });
    const targetSec = document.getElementById(`admin-sec-${tabId}`);
    if (targetSec) targetSec.classList.remove("hidden");

    const active = document.getElementById(`atab-${tabId}`);
    if (active) {
        active.classList.add("border-blue-700", "text-blue-700", "font-bold");
        active.classList.remove("border-transparent", "text-slate-600");
    }
}

// ==================== QUẢN LÝ TÀI KHOẢN GIÁO VIÊN, TỔ CHUYÊN MÔN & CHỨC DANH ====================
async function addTeacherAccount() {
    if (currentLoggedAdmin?.role !== "master") return;
    const username = document.getElementById("newTeaUser").value.trim().toLowerCase();
    const full_name = document.getElementById("newTeaName").value.trim();
    const subject = document.getElementById("newTeaDept").value;
    const role_title = document.getElementById("newTeaRoleTitle").value;
    const pass = document.getElementById("newTeaPass").value;

    if (!username || !full_name || !pass) {
        alert("Thầy vui lòng nhập đủ tên đăng nhập, họ tên và mật khẩu cấp cho giáo viên!");
        return;
    }
    if (teacherList.some(t => t.username === username) || username === "vovanbinh") {
        alert("Tên đăng nhập này đã tồn tại!");
        return;
    }

    const pass_hash = typeof sha256Hex === "function" ? await sha256Hex(pass) : pass;
    teacherList.push({ username, full_name, subject, role_title, role: "teacher", pass_hash });
    localStorage.setItem("dakia_teachers", JSON.stringify(teacherList));
    await postToGoogleSheets({ action: "save_teachers", teachers: teacherList });

    document.getElementById("newTeaUser").value = "";
    document.getElementById("newTeaName").value = "";
    document.getElementById("newTeaPass").value = "";
    renderTeacherTable();
    alert(`Đã cấp tài khoản cho ${role_title} ${full_name} (Tổ ${subject}) thành công!`);
}

function renderTeacherTable() {
    const tbody = document.getElementById("teacherTableBody");
    if (!tbody) return;
    if (teacherList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-3 px-3 text-center text-slate-400">Chưa có tài khoản giáo viên nào được cấp thêm.</td></tr>`;
        return;
    }
    tbody.innerHTML = teacherList.map((t, idx) => {
        const titleBadgeColor = t.role_title === "Tổ trưởng" ? "bg-amber-100 text-amber-800" : (t.role_title === "Tổ phó" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800");
        return `
        <tr>
            <td class="py-2 px-3 font-bold text-blue-700">${t.username}</td>
            <td class="py-2 px-3 font-medium">${t.full_name}</td>
            <td class="py-2 px-3">${t.subject}</td>
            <td class="py-2 px-3"><span class="${titleBadgeColor} px-2 py-0.5 rounded text-xs font-semibold">${t.role_title || "Giáo viên"}</span></td>
            <td class="py-2 px-3 text-right">
                <button onclick="removeTeacher(${idx})" class="text-xs text-red-600 hover:underline">Thu hồi</button>
            </td>
        </tr>
    `;
    }).join("");
}

async function removeTeacher(idx) {
    if (!confirm(`Thu hồi quyền truy cập của giáo viên ${teacherList[idx].full_name}?`)) return;
    teacherList.splice(idx, 1);
    localStorage.setItem("dakia_teachers", JSON.stringify(teacherList));
    await postToGoogleSheets({ action: "save_teachers", teachers: teacherList });
    renderTeacherTable();
}

async function postToGoogleSheets(payload) {
    if (typeof SYSTEM_CONFIG === "undefined" || !SYSTEM_CONFIG.googleScriptUrl || SYSTEM_CONFIG.googleScriptUrl.startsWith("DAN_URL")) return null;
    try {
        const res = await fetch(SYSTEM_CONFIG.googleScriptUrl, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        return await res.json().catch(() => ({ ok: true }));
    } catch (_) {
        return null;
    }
}

// ==================== QUẢN LÝ HỌC SINH ====================
function updateClassFilterDropdown() {
    const selectEl = document.getElementById("classFilterSelect");
    if (!selectEl) return;
    const uniqueClasses = [...new Set(studentList.map(s => String(s.class_name).toUpperCase()))].sort();
    selectEl.innerHTML = `<option value="ALL">Tất cả các lớp (${studentList.length} HS)</option>` +
        uniqueClasses.map(cls => `<option value="${cls}">Lớp ${cls}</option>`).join("");
}

function renderStudentTable() {
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    const tbody = document.getElementById("studentTableBody");
    if (!tbody) return;
    const selectedClass = document.getElementById("classFilterSelect").value;
    const searchKeyword = document.getElementById("searchStudentInput").value.trim().toLowerCase();

    document.getElementById("statTotalStudents").textContent = studentList.length;
    document.getElementById("statWeakStudents").textContent = studentList.filter(s => s.is_weak_mode).length;
    document.getElementById("statTotalLogs").textContent = logs.length;

    const filtered = studentList
        .map((stu, idx) => ({ ...stu, originalIndex: idx }))
        .filter(stu => {
            const matchClass = selectedClass === "ALL" || String(stu.class_name).toUpperCase() === selectedClass;
            const matchKey = !searchKeyword || String(stu.student_code).toLowerCase().includes(searchKeyword) || String(stu.full_name).toLowerCase().includes(searchKeyword);
            return matchClass && matchKey;
        });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-400 text-sm">Không có dữ liệu học sinh phù hợp.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((stu, i) => {
        const stuLogs = logs.filter(l => l.student_code === stu.student_code);
        const scored = stuLogs.filter(l => l.score !== null && l.score !== undefined);
        const avg = scored.length > 0 ? (scored.reduce((a, b) => a + Number(b.score), 0) / scored.length).toFixed(1) : "--";
        return `
            <tr class="hover:bg-slate-50">
                <td class="py-3 px-4 text-xs text-slate-400">${i + 1}</td>
                <td class="py-3 px-4 font-bold text-blue-700">${stu.student_code}</td>
                <td class="py-3 px-4 font-medium text-slate-800">${stu.full_name}</td>
                <td class="py-3 px-4"><span class="bg-slate-100 px-2 py-0.5 rounded font-semibold text-xs">${stu.class_name}</span></td>
                <td class="py-3 px-4">
                    <button onclick="toggleStudentWeakMode(${stu.originalIndex})" class="px-2.5 py-1 rounded-full text-xs font-semibold ${stu.is_weak_mode ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">
                        ${stu.is_weak_mode ? '⚠️ Hỗ trợ HS yếu' : 'Tiêu chuẩn'}
                    </button>
                </td>
                <td class="py-3 px-4">${stuLogs.length}</td>
                <td class="py-3 px-4 font-bold text-teal-700">${avg}</td>
                <td class="py-3 px-4 text-right"><button onclick="deleteStudent(${stu.originalIndex})" class="text-xs text-red-500 hover:underline">Xóa</button></td>
            </tr>
        `;
    }).join("");
}

async function addStudent() {
    const code = document.getElementById("newStuCode").value.trim().toUpperCase();
    const name = document.getElementById("newStuName").value.trim();
    const cls = document.getElementById("newStuClass").value.trim().toUpperCase();
    const isWeak = document.getElementById("newStuWeak").checked;
    if (!code || !name || !cls) return alert("Vui lòng nhập đủ Mã HS, Họ tên và Lớp!");
    if (studentList.some(s => s.student_code === code)) return alert("Mã học sinh đã tồn tại!");

    studentList.push({ student_code: code, full_name: name, class_name: cls, grade: cls.slice(0, 2) || "10", is_weak_mode: isWeak });
    localStorage.setItem("dakia_all_students", JSON.stringify(studentList));
    await postToGoogleSheets({ action: "save_students", students: studentList });

    document.getElementById("newStuCode").value = "";
    document.getElementById("newStuName").value = "";
    updateClassFilterDropdown();
    renderStudentTable();
}

function downloadSampleExcel() {
    const sampleData = [
        { MaHS: "10A801", HoTen: "Nguyễn Văn An", Lop: "10A8", HoTroYeu: "Có" },
        { MaHS: "10A802", HoTen: "Trần Thị Bích", Lop: "10A8", HoTroYeu: "Không" },
        { MaHS: "10A803", HoTen: "Lê Hoàng Nam", Lop: "10A8", HoTroYeu: "Có" }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachHocSinh");
    XLSX.writeFile(wb, "Mau_Danh_Sach_HS_THPT_DaKia.xlsx");
}

function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
        let added = 0;
        let updated = 0;
        rows.forEach(row => {
            const code = String(row.MaHS || row["Mã HS"] || "").trim().toUpperCase();
            const name = String(row.HoTen || row["Họ và tên"] || "").trim();
            const cls = String(row.Lop || row["Lớp"] || "").trim().toUpperCase();
            const isWeak = ["có", "co", "yes", "true", "1", "x"].includes(String(row.HoTroYeu || row["Hỗ trợ yếu"] || "").trim().toLowerCase());
            if (!code || !name || !cls) return;
            const idx = studentList.findIndex(s => s.student_code === code);
            const obj = { student_code: code, full_name: name, class_name: cls, grade: cls.slice(0, 2) || "10", is_weak_mode: isWeak };
            if (idx >= 0) {
                studentList[idx] = obj;
                updated++;
            } else {
                studentList.push(obj);
                added++;
            }
        });
        localStorage.setItem("dakia_all_students", JSON.stringify(studentList));
        await postToGoogleSheets({ action: "save_students", students: studentList });
        updateClassFilterDropdown();
        renderStudentTable();
        alert(`Đã nhập xong danh sách! Thêm mới ${added} HS, cập nhật ${updated} HS và đồng bộ lên Google Sheets.`);
    };
    reader.readAsArrayBuffer(file);
}

async function toggleStudentWeakMode(index) {
    studentList[index].is_weak_mode = !studentList[index].is_weak_mode;
    localStorage.setItem("dakia_all_students", JSON.stringify(studentList));
    await postToGoogleSheets({ action: "save_students", students: studentList });
    renderStudentTable();
}

async function deleteStudent(index) {
    if (!confirm(`Xóa học sinh ${studentList[index].full_name}?`)) return;
    studentList.splice(index, 1);
    localStorage.setItem("dakia_all_students", JSON.stringify(studentList));
    await postToGoogleSheets({ action: "save_students", students: studentList });
    updateClassFilterDropdown();
    renderStudentTable();
}

function exportReportToExcel() {
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    const rows = studentList.map((stu, i) => {
        const stuLogs = logs.filter(l => l.student_code === stu.student_code);
        const scored = stuLogs.filter(l => l.score !== null && l.score !== undefined);
        const avg = scored.length > 0 ? (scored.reduce((a, b) => a + Number(b.score), 0) / scored.length).toFixed(1) : "";
        return {
            "STT": i + 1,
            "Mã HS": stu.student_code,
            "Họ và tên": stu.full_name,
            "Lớp": stu.class_name,
            "Hỗ trợ yếu": stu.is_weak_mode ? "Có" : "Không",
            "Số lượt học": stuLogs.length,
            "Điểm trung bình": avg
        };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCao");
    XLSX.writeFile(wb, `BaoCao_THPT_DaKia_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ==================== BỘ BÓC TÁCH FILE WORD CHUẨN MẪU (GẠCH CHÂN + HÌNH ẢNH + 4 PHẦN) ====================
async function extractStructuredQuestionsFromDocx(arrayBuffer, defaultSubject = "Toán học", defaultGrade = "10", defaultTopic = "Đề kiểm tra") {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = await zip.file("word/document.xml").async("string");
    const relsXml = zip.file("word/_rels/document.xml.rels")
        ? await zip.file("word/_rels/document.xml.rels").async("string")
        : "";

    // Ánh xạ rId -> đường dẫn hình ảnh trong word/media/
    const relMap = {};
    const relRegex = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g;
    let rMatch;
    while ((rMatch = relRegex.exec(relsXml)) !== null) {
        relMap[rMatch[1]] = rMatch[2];
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXml, "application/xml");
    const pNodes = Array.from(xmlDoc.getElementsByTagName("w:p"));

    const paragraphs = [];
    for (const p of pNodes) {
        let lineText = "";
        let underlinedChars = [];
        const images = [];

        const runs = Array.from(p.getElementsByTagName("w:r"));
        for (const r of runs) {
            const uNode = r.getElementsByTagName("w:u")[0];
            const uVal = uNode ? uNode.getAttribute("w:val") : null;
            const isUnderlined = Boolean(uNode && uVal !== "none");

            // Lấy text thường và text công thức OMML (<m:t>)
            const tNodes = Array.from(r.getElementsByTagName("w:t"));
            const mtNodes = Array.from(r.getElementsByTagName("m:t"));
            const runStr = [...tNodes, ...mtNodes].map(n => n.textContent || "").join("");

            if (runStr) {
                lineText += runStr;
                if (isUnderlined) {
                    const trimmed = runStr.trim();
                    if (/^[ABCD][\.\)]?$/.test(trimmed)) {
                        underlinedChars.push(trimmed.charAt(0));
                    }
                }
            }

            // Kiểm tra hình ảnh đính kèm trong đoạn văn (<a:blip r:embed="...">)
            const blips = Array.from(r.getElementsByTagName("a:blip"));
            for (const b of blips) {
                const embedId = b.getAttribute("r:embed");
                if (embedId && relMap[embedId]) {
                    const targetPath = "word/" + relMap[embedId].replace(/^\/+/, "");
                    const imgFile = zip.file(targetPath);
                    if (imgFile) {
                        const b64 = await imgFile.async("base64");
                        const ext = targetPath.split(".").pop().toLowerCase();
                        const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
                        images.push(`data:${mime};base64,${b64}`);
                    }
                }
            }
        }

        // Bắt thêm công thức toán OMML nằm trực tiếp trong <w:p> ngoài <w:r>
        if (!lineText.trim()) {
            const allMt = Array.from(p.getElementsByTagName("m:t")).map(n => n.textContent || "").join("");
            if (allMt.trim()) lineText = allMt;
        }

        if (lineText.trim() || images.length > 0) {
            paragraphs.push({
                text: lineText.trim(),
                underlinedLetters: underlinedChars,
                images
            });
        }
    }

    // Phân chia theo Phần I, Phần II, Phần III, Phần IV và từng Câu
    let currentSection = "NL";
    const parsedQuestions = [];
    let currentQ = null;
    let inSolutionMode = false;

    const finalizeCurrentQ = () => {
        if (!currentQ) return;
        const fullBody = currentQ.rawLines.join("\n").trim();
        const solText = currentQ.solutionLines.join("\n").trim();

        if (currentQ.type === "NL") {
            const optAMatch = fullBody.match(/(?:^|\n|\s)A[\.\)]\s*([\s\S]*?)(?=(?:\n|\s)B[\.\)])/);
            const optBMatch = fullBody.match(/(?:^|\n|\s)B[\.\)]\s*([\s\S]*?)(?=(?:\n|\s)C[\.\)])/);
            const optCMatch = fullBody.match(/(?:^|\n|\s)C[\.\)]\s*([\s\S]*?)(?=(?:\n|\s)D[\.\)])/);
            const optDMatch = fullBody.match(/(?:^|\n|\s)D[\.\)]\s*([\s\S]*)$/);

            const qStem = optAMatch ? fullBody.slice(0, optAMatch.index).trim() : fullBody;
            const opts = optAMatch && optBMatch ? [
                optAMatch[1].trim(),
                optBMatch[1].trim(),
                optCMatch ? optCMatch[1].trim() : "",
                optDMatch ? optDMatch[1].trim() : ""
            ] : ["Phương án A", "Phương án B", "Phương án C", "Phương án D"];

            // Xác định đáp án đúng: ưu tiên chữ cái gạch chân trong Word, sau đó đến "Chọn X" trong lời giải
            let rightLetter = currentQ.underlinedLetter || "";
            if (!rightLetter && solText) {
                const chonMatch = solText.match(/Chọn\s+([ABCD])/i);
                if (chonMatch) rightLetter = chonMatch[1].toUpperCase();
            }
            if (!rightLetter) rightLetter = "A";

            parsedQuestions.push({
                id: `Q_${Date.now()}_${parsedQuestions.length}`,
                subject: defaultSubject,
                grade: defaultGrade,
                topic: defaultTopic,
                type: "NL",
                level: "Hiểu",
                content: qStem,
                options: opts,
                correct: Math.max(0, ["A", "B", "C", "D"].indexOf(rightLetter)),
                solution: solText,
                images: currentQ.images,
                author: currentLoggedAdmin?.full_name || "GV THPT Đa Kia"
            });
        } else if (currentQ.type === "DS") {
            const dsAMatch = fullBody.match(/(?:^|\n)\s*a[\)\.]\s*([\s\S]*?)(?=(?:\n)\s*b[\)\.])/);
            const dsBMatch = fullBody.match(/(?:^|\n)\s*b[\)\.]\s*([\s\S]*?)(?=(?:\n)\s*c[\)\.])/);
            const dsCMatch = fullBody.match(/(?:^|\n)\s*c[\)\.]\s*([\s\S]*?)(?=(?:\n)\s*d[\)\.])/);
            const dsDMatch = fullBody.match(/(?:^|\n)\s*d[\)\.]\s*([\s\S]*)$/);

            const qStem = dsAMatch ? fullBody.slice(0, dsAMatch.index).trim() : fullBody;
            const statements = dsAMatch && dsBMatch ? [
                dsAMatch[1].trim(),
                dsBMatch[1].trim(),
                dsCMatch ? dsCMatch[1].trim() : "",
                dsDMatch ? dsDMatch[1].trim() : ""
            ] : ["Ý a)", "Ý b)", "Ý c)", "Ý d)"];

            // Trích xuất chuỗi a-sai, b-sai, c-sai, d-đúng từ Lời giải
            let dsRaw = "a-đúng, b-đúng, c-sai, d-sai";
            let dsBoolArr = [true, true, false, false];
            if (solText) {
                const dsLineMatch = solText.match(/a\s*-\s*(đúng|sai)\s*,\s*b\s*-\s*(đúng|sai)\s*,\s*c\s*-\s*(đúng|sai)\s*,\s*d\s*-\s*(đúng|sai)/i);
                if (dsLineMatch) {
                    dsRaw = dsLineMatch[0];
                    dsBoolArr = [
                        dsLineMatch[1].toLowerCase() === "đúng",
                        dsLineMatch[2].toLowerCase() === "đúng",
                        dsLineMatch[3].toLowerCase() === "đúng",
                        dsLineMatch[4].toLowerCase() === "đúng"
                    ];
                }
            }

            parsedQuestions.push({
                id: `Q_${Date.now()}_${parsedQuestions.length}`,
                subject: defaultSubject,
                grade: defaultGrade,
                topic: defaultTopic,
                type: "DS",
                level: "Hiểu",
                content: qStem,
                options: statements,
                dsAnswer: dsRaw,
                dsBool: dsBoolArr,
                correct: 0,
                solution: solText,
                images: currentQ.images,
                author: currentLoggedAdmin?.full_name || "GV THPT Đa Kia"
            });
        } else if (currentQ.type === "TLN") {
            const ansLine = currentQ.shortAns || "0";
            parsedQuestions.push({
                id: `Q_${Date.now()}_${parsedQuestions.length}`,
                subject: defaultSubject,
                grade: defaultGrade,
                topic: defaultTopic,
                type: "TLN",
                level: "Vận dụng",
                content: fullBody,
                options: [],
                shortAnswer: ansLine,
                correct: 0,
                solution: solText,
                images: currentQ.images,
                author: currentLoggedAdmin?.full_name || "GV THPT Đa Kia"
            });
        } else {
            parsedQuestions.push({
                id: `Q_${Date.now()}_${parsedQuestions.length}`,
                subject: defaultSubject,
                grade: defaultGrade,
                topic: defaultTopic,
                type: "TL",
                level: "Vận dụng",
                content: fullBody,
                options: [],
                correct: 0,
                solution: solText,
                images: currentQ.images,
                author: currentLoggedAdmin?.full_name || "GV THPT Đa Kia"
            });
        }
        currentQ = null;
        inSolutionMode = false;
    };

    for (const p of paragraphs) {
        const txt = p.text;
        if (/^-{3,}\s*HẾT\s*-{3,}/i.test(txt)) {
            finalizeCurrentQ();
            break;
        }
        if (/^PHẦN\s+I[\.\:]/i.test(txt)) {
            finalizeCurrentQ();
            currentSection = "NL";
            continue;
        }
        if (/^PHẦN\s+II[\.\:]/i.test(txt)) {
            finalizeCurrentQ();
            currentSection = "DS";
            continue;
        }
        if (/^PHẦN\s+III[\.\:]/i.test(txt)) {
            finalizeCurrentQ();
            currentSection = "TLN";
            continue;
        }
        if (/^PHẦN\s+IV[\.\:]/i.test(txt)) {
            finalizeCurrentQ();
            currentSection = "TL";
            continue;
        }

        const qMatch = txt.match(/^Câu\s+\d+[\.\:]\s*([\s\S]*)/i);
        if (qMatch) {
            finalizeCurrentQ();
            currentQ = {
                type: currentSection,
                rawLines: [qMatch[1].trim()],
                solutionLines: [],
                underlinedLetter: p.underlinedLetters[0] || "",
                shortAns: "",
                images: [...p.images]
            };
            inSolutionMode = false;
            continue;
        }

        if (!currentQ) continue;

        if (p.images.length > 0) {
            currentQ.images.push(...p.images);
        }

        if (/^Đáp\s*án\s*[:\-]/i.test(txt)) {
            currentQ.shortAns = txt.replace(/^Đáp\s*án\s*[:\-]\s*/i, "").trim();
            continue;
        }

        if (/^Lời\s*giải\s*[:\-]?/i.test(txt)) {
            inSolutionMode = true;
            const afterSol = txt.replace(/^Lời\s*giải\s*[:\-]?\s*/i, "").trim();
            if (afterSol) currentQ.solutionLines.push(afterSol);
            continue;
        }

        if (inSolutionMode) {
            currentQ.solutionLines.push(txt);
        } else {
            if (p.underlinedLetters.length > 0 && !currentQ.underlinedLetter) {
                currentQ.underlinedLetter = p.underlinedLetters[0];
            }
            currentQ.rawLines.push(txt);
        }
    }
    finalizeCurrentQ();

    // Fallback nếu file Word không dùng XML gạch chân mà dùng text thuần
    if (parsedQuestions.length === 0) {
        const rawRes = await mammoth.extractRawText({ arrayBuffer });
        return parseFallbackPlainText(rawRes.value || "", defaultSubject, defaultGrade, defaultTopic);
    }
    return parsedQuestions;
}

function parseFallbackPlainText(rawText, defaultSubject, defaultGrade, defaultTopic) {
    const blocks = rawText.split(/(?=Câu\s+\d+[\.\:])/i).map(b => b.trim()).filter(b => /^Câu\s+\d+/i.test(b));
    return blocks.map((blk, i) => {
        const body = blk.replace(/^Câu\s+\d+[\.\:]\s*/i, "").trim();
        const ansMatch = body.match(/Đáp\s*án\s*[:\-]?\s*([^\n\r]+)/i);
        const rawAns = ansMatch ? ansMatch[1].trim() : "A";
        const cleanBlock = body.replace(/(?:Đáp\s*án|Lời\s*giải)\s*[:\-]?[\s\S]*/i, "").trim();
        return {
            id: `Q_${Date.now()}_${i}`,
            subject: defaultSubject,
            grade: defaultGrade,
            topic: defaultTopic,
            type: "NL",
            level: "Hiểu",
            content: cleanBlock,
            options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
            correct: Math.max(0, ["A", "B", "C", "D"].indexOf(rawAns.charAt(0).toUpperCase())),
            solution: "",
            images: [],
            author: currentLoggedAdmin?.full_name || "GV THPT Đa Kia"
        };
    });
}

// ==================== TẢI FILE ĐỀ MẪU CHUẨN WORD (.DOCX) ====================
async function downloadSampleExamDocx() {
    const { Document, Packer, Paragraph, TextRun } = docx;
    const p = (txt, bold = false, underline = false) => new Paragraph({
        children: [new TextRun({ text: txt, bold, underline: underline ? {} : undefined, size: 26, font: "Times New Roman" })],
        spacing: { after: 100 }
    });

    const doc = new Document({
        sections: [{
            children: [
                p("PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời từ câu … đến câu …. Mỗi câu hỏi thí sinh chỉ chọn một phương án.", true),
                p("Câu 1. Trong không gian Oxyz, cho hai điểm A(1; 2; -1) và B(3; 0; 5). Tọa độ trung điểm I của đoạn thẳng AB là"),
                new Paragraph({
                    children: [
                        new TextRun({ text: "A. I(2; 1; 2).\t", underline: {}, size: 26, font: "Times New Roman" }),
                        new TextRun({ text: "B. I(4; 2; 4).\tC. I(1; -1; 3).\tD. I(-1; 1; -3).", size: 26, font: "Times New Roman" })
                    ],
                    spacing: { after: 100 }
                }),
                p("Lời giải:", true),
                p("Chọn A"),
                p("Ta có tọa độ trung điểm I là ((1+3)/2; (2+0)/2; (-1+5)/2) = (2; 1; 2)."),

                p("PHẦN II. Câu trắc nghiệm đúng sai. Thí sinh trả lời từ câu … đến câu …. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.", true),
                p("Câu 1. Cho hàm số y = x^2 - 4x + 3. Xét tính đúng-sai của các khẳng định sau:"),
                p("a) Đồ thị hàm số có đỉnh là I(2; -1)."),
                p("b) Hàm số đồng biến trên khoảng (-∞; 2)."),
                p("c) Đồ thị hàm số cắt trục hoành tại hai điểm phân biệt."),
                p("d) Giá trị nhỏ nhất của hàm số trên ℝ bằng 3."),
                p("Lời giải:", true),
                p("a-đúng, b-sai, c-đúng, d-sai."),
                p("a) Đỉnh I(2; -1) nên khẳng định a đúng."),
                p("b) Hàm số nghịch biến trên (-∞; 2) nên khẳng định b sai."),

                p("PHẦN III. Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời từ câu … đến câu ….", true),
                p("Câu 1. Tính khoảng cách từ điểm M(3; 4) đến gốc tọa độ O (kết quả làm tròn đến hàng phần mười)."),
                p("Đáp án: 5"),
                p("Lời giải:", true),
                p("Ta có OM = √(3^2 + 4^2) = 5."),

                p("PHẦN IV. Câu hỏi tự luận. Thí sinh trình bày lời giải vào giấy làm bài.", true),
                p("Câu 1. Giải phương trình x^2 - 5x + 6 = 0."),
                p("Lời giải:", true),
                p("Phương trình có hai nghiệm phân biệt x = 2 và x = 3."),
                p("-------- HẾT --------", true)
            ]
        }]
    });

    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "MAU_DE_CHUAN_2018_THPT_DA_KIA.docx";
    a.click();
}

// ==================== TAB 2: THI TRỰC TUYẾN & MÃ QR (CẤU HÌNH ĐIỂM PHẦN I, II, III) ====================
async function handleWordExamUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const subject = document.getElementById("examSubjectInput").value;
    const grade = document.getElementById("examGradeInput").value;
    const duration = parseInt(document.getElementById("examDurationInput").value, 10) || 45;
    const title = document.getElementById("examTitleInput").value.trim() || file.name.replace(/\.docx$/i, "");

    const parsedQuestions = await extractStructuredQuestionsFromDocx(arrayBuffer, subject, grade, title);
    const countP1 = parsedQuestions.filter(q => q.type === "NL").length;
    const countP2 = parsedQuestions.filter(q => q.type === "DS").length;
    const countP3 = parsedQuestions.filter(q => q.type === "TLN").length;
    const countP4 = parsedQuestions.filter(q => q.type === "TL").length;

    const scoreConfig = {
        p1Total: parseFloat(document.getElementById("cfgScoreP1Total").value) || 0,
        p2_1: parseFloat(document.getElementById("cfgScoreP2_1").value) || 0,
        p2_2: parseFloat(document.getElementById("cfgScoreP2_2").value) || 0,
        p2_3: parseFloat(document.getElementById("cfgScoreP2_3").value) || 0,
        p2_4: parseFloat(document.getElementById("cfgScoreP2_4").value) || 0,
        p3Total: parseFloat(document.getElementById("cfgScoreP3Total").value) || 0
    };

    pendingParsedExam = {
        id: "EXAM_" + Date.now(),
        title,
        subject,
        grade,
        duration,
        scoreConfig,
        teacher: currentLoggedAdmin?.full_name || "Giáo viên THPT Đa Kia",
        fileName: file.name,
        questions: parsedQuestions
    };

    const p1Each = countP1 > 0 ? (scoreConfig.p1Total / countP1).toFixed(2) : 0;
    const p3Each = countP3 > 0 ? (scoreConfig.p3Total / countP3).toFixed(2) : 0;

    document.getElementById("examPreviewBox").classList.remove("hidden");
    document.getElementById("examParseSummary").textContent =
        `Đã đọc "${file.name}": Phần I (${countP1} câu × ${p1Each}đ), Phần II (${countP2} câu Đ/S), Phần III (${countP3} câu × ${p3Each}đ), Phần IV (${countP4} câu TL).`;

    document.getElementById("examParsedList").innerHTML = parsedQuestions.slice(0, 8).map((q, idx) => {
        let ansInfo = "";
        if (q.type === "NL") ansInfo = `<span class="text-emerald-700 font-bold">Đáp án: ${["A", "B", "C", "D"][q.correct]}</span>`;
        else if (q.type === "DS") ansInfo = `<span class="text-emerald-700 font-bold">${q.dsAnswer}</span>`;
        else if (q.type === "TLN") ansInfo = `<span class="text-emerald-700 font-bold">Đáp án: ${q.shortAnswer}</span>`;
        return `<div class="p-2.5 bg-white rounded-xl border border-slate-200">
            <strong>Câu ${idx + 1} [${q.type}]:</strong> ${q.content} <div class="mt-1">${ansInfo}</div>
        </div>`;
    }).join("");
}

async function publishUploadedExam() {
    if (!pendingParsedExam) return;
    const btn = document.getElementById("btnPublishExam");
    btn.disabled = true;
    btn.textContent = "⏳ Đang phát hành phòng thi & tạo mã QR...";

    // Cập nhật lại thang điểm mới nhất giáo viên vừa chỉnh trước khi bấm phát hành
    pendingParsedExam.scoreConfig = {
        p1Total: parseFloat(document.getElementById("cfgScoreP1Total").value) || 0,
        p2_1: parseFloat(document.getElementById("cfgScoreP2_1").value) || 0,
        p2_2: parseFloat(document.getElementById("cfgScoreP2_2").value) || 0,
        p2_3: parseFloat(document.getElementById("cfgScoreP2_3").value) || 0,
        p2_4: parseFloat(document.getElementById("cfgScoreP2_4").value) || 0,
        p3Total: parseFloat(document.getElementById("cfgScoreP3Total").value) || 0
    };
    pendingParsedExam.duration = parseInt(document.getElementById("examDurationInput").value, 10) || 45;

    const res = await postToGoogleSheets({
        action: "upload_exam",
        ...pendingParsedExam
    });

    const savedExam = {
        ...pendingParsedExam,
        fileUrl: res?.fileUrl || "",
        createdAt: new Date().toLocaleDateString("vi-VN")
    };

    uploadedExams.unshift(savedExam);
    localStorage.setItem("dakia_uploaded_exams", JSON.stringify(uploadedExams));

    if (Array.isArray(savedExam.questions) && savedExam.questions.length > 0) {
        questionBank = [...savedExam.questions, ...questionBank];
        localStorage.setItem("dakia_question_bank", JSON.stringify(questionBank));
        renderQuestionBank();
    }

    btn.disabled = false;
    btn.textContent = "🚀 Phát Hành Phòng Thi Online & Tạo Mã QR";
    document.getElementById("examPreviewBox").classList.add("hidden");
    pendingParsedExam = null;
    renderUploadedExams();
    alert("Đã mở phòng thi trực tuyến và tạo mã QR thành công!");
}

function renderUploadedExams() {
    const grid = document.getElementById("uploadedExamsGrid");
    if (!grid) return;
    if (uploadedExams.length === 0) {
        grid.innerHTML = `<p class="text-xs text-slate-400 col-span-3">Chưa có đề thi trực tuyến nào được phát hành.</p>`;
        return;
    }

    grid.innerHTML = uploadedExams.map((ex, idx) => {
        const cfg = ex.scoreConfig || { p1Total: 3, p2_1: 0.1, p2_2: 0.25, p2_3: 0.5, p2_4: 1, p3Total: 3 };
        return `
        <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2.5 flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start gap-2">
                    <span class="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded uppercase">${ex.subject} • Lớp ${ex.grade}</span>
                    <span class="text-[11px] text-slate-400">${ex.duration || 45} phút • ${ex.createdAt || ""}</span>
                </div>
                <h4 class="font-bold text-sm text-slate-900 mt-1.5">${ex.title}</h4>
                <p class="text-xs text-slate-500">GV: ${ex.teacher} • ${(ex.questions || []).length} câu</p>
                <p class="text-[11px] text-blue-800 mt-1">Thang điểm: P1=${cfg.p1Total}đ | P2=(${cfg.p2_1}/${cfg.p2_2}/${cfg.p2_3}/${cfg.p2_4}) | P3=${cfg.p3Total}đ</p>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-200">
                <div id="qr_exam_${idx}" class="bg-white p-1 border rounded"></div>
                <div class="flex flex-col gap-1.5 text-right">
                    <button onclick="copyExamShareLink('${ex.id}')" class="text-xs bg-blue-700 hover:bg-blue-800 text-white px-2.5 py-1 rounded font-semibold">🔗 Copy link thi</button>
                    <button onclick="deleteOnlineExam(${idx})" class="text-[11px] text-red-500 hover:underline">Xóa đề</button>
                </div>
            </div>
        </div>
    `;
    }).join("");

    uploadedExams.forEach((ex, idx) => {
        const el = document.getElementById(`qr_exam_${idx}`);
        if (el && window.QRCode) {
            const shareUrl = `${window.location.origin}/index.html?exam=${ex.id}`;
            new QRCode(el, { text: shareUrl, width: 72, height: 72 });
        }
    });
}

function deleteOnlineExam(idx) {
    if (!confirm(`Xóa đề thi trực tuyến "${uploadedExams[idx].title}"?`)) return;
    uploadedExams.splice(idx, 1);
    localStorage.setItem("dakia_uploaded_exams", JSON.stringify(uploadedExams));
    renderUploadedExams();
}

function copyExamShareLink(examId) {
    const url = `${window.location.origin}/index.html?exam=${examId}`;
    navigator.clipboard.writeText(url);
    alert("Đã sao chép đường link phòng thi trực tuyến:\n" + url);
}

// ==================== TAB 3: NGÂN HÀNG CÂU HỎI & TRỘN ĐỀ CHUẨN MẪU + QR TNMAKER ====================
function toggleNewQuestionForm() {
    document.getElementById("newQuestionForm").classList.toggle("hidden");
}

function toggleQbTypeFields() {
    const type = document.getElementById("qbAddType").value;
    const mcqFields = document.getElementById("qbMcqFields");
    const shortField = document.getElementById("qbShortField");
    if (type === "TLN") {
        mcqFields.classList.add("hidden");
        shortField.classList.remove("hidden");
    } else if (type === "TL") {
        mcqFields.classList.add("hidden");
        shortField.classList.add("hidden");
    } else {
        mcqFields.classList.remove("hidden");
        shortField.classList.add("hidden");
    }
}

async function addSingleQuestionToBank() {
    const subject = document.getElementById("qbAddSubject").value;
    const grade = document.getElementById("qbAddGrade").value;
    const topic = document.getElementById("qbAddTopic").value.trim() || "Chuyên đề chung";
    const type = document.getElementById("qbAddType").value;
    const level = document.getElementById("qbAddLevel").value;
    const content = document.getElementById("qbAddContent").value.trim();
    const solution = document.getElementById("qbSolutionInput")?.value.trim() || "";

    if (!content) return alert("Vui lòng nhập nội dung câu hỏi!");

    const newQ = {
        id: "QB_" + Date.now(),
        subject,
        grade,
        topic,
        type,
        level,
        content,
        options: [],
        correct: 0,
        solution,
        images: [],
        author: currentLoggedAdmin?.full_name || "GV THPT Đa Kia"
    };

    if (type === "TLN") {
        newQ.shortAnswer = document.getElementById("qbShortAns").value.trim();
        if (!newQ.shortAnswer) return alert("Vui lòng nhập đáp án trả lời ngắn!");
    } else if (type === "NL" || type === "DS") {
        newQ.options = [
            document.getElementById("qbOptA").value.trim(),
            document.getElementById("qbOptB").value.trim(),
            document.getElementById("qbOptC").value.trim(),
            document.getElementById("qbOptD").value.trim()
        ];
        if (newQ.options.some(o => !o)) return alert("Vui lòng nhập đủ 4 phương án / mệnh đề!");
        const rawAns = document.getElementById("qbCorrectLetter").value.trim();
        if (type === "NL") {
            const letter = (rawAns || "A").charAt(0).toUpperCase();
            newQ.correct = Math.max(0, ["A", "B", "C", "D"].indexOf(letter));
        } else {
            newQ.dsAnswer = rawAns || "a-đúng, b-đúng, c-sai, d-sai";
            const dsMatch = newQ.dsAnswer.match(/a\s*-\s*(đúng|sai)\s*,\s*b\s*-\s*(đúng|sai)\s*,\s*c\s*-\s*(đúng|sai)\s*,\s*d\s*-\s*(đúng|sai)/i);
            newQ.dsBool = dsMatch
                ? [dsMatch[1].toLowerCase() === "đúng", dsMatch[2].toLowerCase() === "đúng", dsMatch[3].toLowerCase() === "đúng", dsMatch[4].toLowerCase() === "đúng"]
                : [true, true, false, false];
        }
    }

    questionBank.unshift(newQ);
    localStorage.setItem("dakia_question_bank", JSON.stringify(questionBank));
    await postToGoogleSheets({ action: "save_question_bank", questions: questionBank });

    document.getElementById("qbAddContent").value = "";
    ["qbOptA", "qbOptB", "qbOptC", "qbOptD", "qbShortAns", "qbSolutionInput"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    toggleNewQuestionForm();
    renderQuestionBank();
    alert("Đã lưu câu hỏi vào Ngân hàng dùng chung!");
}

function getFilteredBankQuestions() {
    const fSub = document.getElementById("qbFilterSubject")?.value || "ALL";
    const fGrade = document.getElementById("qbFilterGrade")?.value || "ALL";
    const fLevel = document.getElementById("qbFilterLevel")?.value || "ALL";
    const kw = (document.getElementById("qbSearchInput")?.value || "").trim().toLowerCase();

    return questionBank.filter(q => {
        const matchSub = fSub === "ALL" || String(q.subject).toLowerCase() === fSub.toLowerCase();
        const matchGrade = fGrade === "ALL" || String(q.grade) === fGrade;
        const matchLevel = fLevel === "ALL" || String(q.level) === fLevel;
        const matchKw = !kw || String(q.content).toLowerCase().includes(kw) || String(q.topic).toLowerCase().includes(kw);
        return matchSub && matchGrade && matchLevel && matchKw;
    });
}

function renderQuestionBank() {
    const listEl = document.getElementById("questionBankList");
    const badgeEl = document.getElementById("qbCountBadge");
    if (!listEl) return;

    const filtered = getFilteredBankQuestions();
    if (badgeEl) badgeEl.textContent = `Hiển thị: ${filtered.length}/${questionBank.length} câu (Đã chọn: ${selectedBankIds.size} câu)`;

    if (filtered.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Chưa có câu hỏi nào phù hợp bộ lọc.</p>`;
        return;
    }

    listEl.innerHTML = filtered.map((q, idx) => {
        const checked = selectedBankIds.has(q.id) ? "checked" : "";
        const typeLabelMap = { NL: "Phần I (A/B/C/D)", DS: "Phần II (Đúng/Sai)", TLN: "Phần III (Trả lời ngắn)", TL: "Phần IV (Tự luận)" };
        const typeBadge = typeLabelMap[q.type] || "Câu hỏi";
        let ansPreview = "";
        if (q.type === "NL") {
            ansPreview = (q.options || []).map((o, oi) => `<span class="${oi === q.correct ? 'font-bold text-emerald-700 underline' : ''}">${String.fromCharCode(65 + oi)}. ${o}</span>`).join(" &nbsp;|&nbsp; ");
        } else if (q.type === "DS") {
            ansPreview = (q.options || []).map((o, oi) => `${String.fromCharCode(97 + oi)}) ${o}`).join(" &nbsp;|&nbsp; ") + ` → <strong>${q.dsAnswer || ""}</strong>`;
        } else if (q.type === "TLN") {
            ansPreview = `<span class="font-bold text-emerald-700">Đáp án: ${q.shortAnswer || ""}</span>`;
        } else {
            ansPreview = `<span class="text-slate-500 italic">Câu hỏi tự luận</span>`;
        }

        return `
            <div class="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 hover:bg-blue-50/30 flex items-start gap-3">
                <input type="checkbox" ${checked} onchange="toggleSingleBankQuestion('${q.id}', this.checked)" class="mt-1 w-4 h-4 cursor-pointer">
                <div class="flex-1 space-y-1">
                    <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span class="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">${q.subject} ${q.grade}</span>
                        <span class="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">${typeBadge}</span>
                        <span class="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">${q.level}</span>
                        <span class="text-slate-500 font-medium">• ${q.topic}</span>
                    </div>
                    <p class="text-xs font-semibold text-slate-900">Câu ${idx + 1}: ${q.content}</p>
                    <p class="text-[11px] text-slate-600">${ansPreview}</p>
                </div>
                <button onclick="deleteBankQuestion('${q.id}')" class="text-[11px] text-red-500 hover:underline">Xóa</button>
            </div>
        `;
    }).join("");
}

function toggleSingleBankQuestion(qId, isChecked) {
    if (isChecked) selectedBankIds.add(qId);
    else selectedBankIds.delete(qId);
    const badgeEl = document.getElementById("qbCountBadge");
    if (badgeEl) {
        const filtered = getFilteredBankQuestions();
        badgeEl.textContent = `Hiển thị: ${filtered.length}/${questionBank.length} câu (Đã chọn: ${selectedBankIds.size} câu)`;
    }
}

function toggleSelectAllBankQuestions(isChecked) {
    const filtered = getFilteredBankQuestions();
    filtered.forEach(q => {
        if (isChecked) selectedBankIds.add(q.id);
        else selectedBankIds.delete(q.id);
    });
    renderQuestionBank();
}

async function deleteBankQuestion(qId) {
    if (!confirm("Xóa câu hỏi này khỏi ngân hàng?")) return;
    questionBank = questionBank.filter(q => q.id !== qId);
    selectedBankIds.delete(qId);
    localStorage.setItem("dakia_question_bank", JSON.stringify(questionBank));
    await postToGoogleSheets({ action: "save_question_bank", questions: questionBank });
    renderQuestionBank();
}

async function handleMixSourceDocx(event) {
    const file = event.target.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const subject = document.getElementById("mixSubject").value;
    const grade = document.getElementById("mixGrade").value;
    const topic = document.getElementById("mixExamName").value.trim() || file.name.replace(/\.docx$/i, "");

    const parsed = await extractStructuredQuestionsFromDocx(arrayBuffer, subject, grade, topic);
    if (parsed.length === 0) {
        return alert("Không nhận diện được câu hỏi nào! Thầy kiểm tra lại định dạng 'Phần I.', 'Câu 1.' trong file Word.");
    }
    mixPoolQuestions = parsed;
    const c1 = parsed.filter(q => q.type === "NL").length;
    const c2 = parsed.filter(q => q.type === "DS").length;
    const c3 = parsed.filter(q => q.type === "TLN").length;
    const c4 = parsed.filter(q => q.type === "TL").length;
    renderMixPreviewBox(`Đã nạp ${parsed.length} câu từ "${file.name}": Phần I (${c1} câu), Phần II (${c2} câu), Phần III (${c3} câu), Phần IV (${c4} câu).`);
}

function loadSelectedBankToMix() {
    if (selectedBankIds.size === 0) {
        return alert("Thầy/Cô vui lòng tích chọn ít nhất 1 câu hỏi ở danh sách Ngân hàng câu hỏi bên dưới!");
    }
    mixPoolQuestions = questionBank.filter(q => selectedBankIds.has(q.id));
    renderMixPreviewBox(`Đã nạp ${mixPoolQuestions.length} câu hỏi từ Ngân hàng câu hỏi sẵn sàng trộn đề.`);
}

function renderMixPreviewBox(summaryMsg) {
    document.getElementById("mixReadyBox").classList.remove("hidden");
    document.getElementById("mixSummaryText").textContent = summaryMsg;
    document.getElementById("mixPreviewQuestions").innerHTML = mixPoolQuestions.map((q, idx) =>
        `<div class="p-2 bg-white rounded border border-slate-200"><strong>Câu ${idx + 1} [${q.type}]:</strong> ${q.content}</div>`
    ).join("");
}

async function saveMixPoolToQuestionBank() {
    if (mixPoolQuestions.length === 0) return;
    const existingContents = new Set(questionBank.map(q => q.content.trim()));
    let added = 0;
    mixPoolQuestions.forEach(q => {
        if (!existingContents.has(q.content.trim())) {
            questionBank.unshift({ ...q, id: "QB_" + Date.now() + "_" + added });
            added++;
        }
    });
    localStorage.setItem("dakia_question_bank", JSON.stringify(questionBank));
    await postToGoogleSheets({ action: "save_question_bank", questions: questionBank });
    renderQuestionBank();
    alert(`Đã lưu thêm ${added} câu hỏi mới vào Ngân hàng câu hỏi dùng chung!`);
}

function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function resolveExamCodes(count, rawCustomInput) {
    const customList = String(rawCustomInput || "")
        .split(/[,;\s]+/)
        .map(s => s.trim())
        .filter(Boolean);

    const codes = [];
    const used = new Set();

    for (let i = 0; i < count; i++) {
        if (customList[i] && !used.has(customList[i])) {
            codes.push(customList[i]);
            used.add(customList[i]);
        } else {
            let randCode = "";
            do {
                randCode = String(Math.floor(1000 + Math.random() * 9000));
            } while (used.has(randCode));
            codes.push(randCode);
            used.add(randCode);
        }
    }
    return codes;
}

function generateTnmakerQrDataUrl(qrText) {
    return new Promise((resolve) => {
        try {
            const tempDiv = document.createElement("div");
            tempDiv.style.display = "none";
            document.body.appendChild(tempDiv);
            new QRCode(tempDiv, {
                text: qrText,
                width: 340,
                height: 340,
                correctLevel: QRCode.CorrectLevel.M
            });
            setTimeout(() => {
                const canvas = tempDiv.querySelector("canvas");
                const dataUrl = canvas ? canvas.toDataURL("image/png") : null;
                document.body.removeChild(tempDiv);
                resolve(dataUrl);
            }, 130);
        } catch (_) {
            resolve(null);
        }
    });
}

function exportTnmakerExcelFile(subject, grade, allAnswerSheets) {
    const maxNL = Math.max(0, ...allAnswerSheets.map(s => s.nl.length));
    const maxDS = Math.max(0, ...allAnswerSheets.map(s => s.ds.length));
    const maxTLN = Math.max(0, ...allAnswerSheets.map(s => s.tln.length));

    const aoa = [];
    aoa.push(["Câu / Mã đề", ...allAnswerSheets.map(s => s.code)]);

    for (let i = 0; i < maxNL; i++) {
        aoa.push([`I.${i + 1}`, ...allAnswerSheets.map(s => s.nl[i]?.ans || "")]);
    }
    for (let i = 0; i < maxDS; i++) {
        aoa.push([`II.${i + 1}`, ...allAnswerSheets.map(s => s.ds[i]?.tnmakerCode || "")]);
    }
    for (let i = 0; i < maxTLN; i++) {
        aoa.push([`III.${i + 1}`, ...allAnswerSheets.map(s => s.tln[i]?.ans || "")]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DapAn_TNMaker");
    XLSX.writeFile(wb, `DapAn_TNMaker_${subject.replace(/\s+/g, "_")}_Khoi_${grade}.xlsx`);
}

async function executeShuffleAndExportWord() {
    if (mixPoolQuestions.length === 0) return alert("Chưa có câu hỏi nào để trộn đề!");

    const deptEdu = document.getElementById("mixDeptEdu").value.trim().toUpperCase() || "SỞ GD&ĐT ĐỒNG NAI";
    const schoolName = document.getElementById("mixSchoolName").value.trim().toUpperCase() || "TRƯỜNG THPT ĐA KIA";
    const groupName = document.getElementById("mixGroupInput").value.trim().toUpperCase() || "TOÁN - TIN HỌC";
    const examName = document.getElementById("mixExamName").value.trim().toUpperCase() || "KIỂM TRA ĐỊNH KÌ";
    const subject = document.getElementById("mixSubject").value.toUpperCase();
    const grade = document.getElementById("mixGrade").value;
    const duration = document.getElementById("mixDuration").value || "90";
    const variantCount = parseInt(document.getElementById("mixVariantCount").value, 10) || 4;
    const examCodes = resolveExamCodes(variantCount, document.getElementById("mixCustomCodes").value);

    const btn = document.getElementById("btnExecuteShuffle");
    btn.disabled = true;
    btn.textContent = "⏳ Đang trộn đề & tạo trọn bộ file...";

    try {
        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun, AlignmentType, PageBreak, BorderStyle } = docx;
        const allAnswerSheets = [];
        const solutionDocChildren = [];
        const hasAnySolution = mixPoolQuestions.some(q => q.solution && q.solution.trim().length > 0);

        const nlPool = mixPoolQuestions.filter(q => q.type === "NL");
        const dsPool = mixPoolQuestions.filter(q => q.type === "DS");
        const tlnPool = mixPoolQuestions.filter(q => q.type === "TLN");
        const tlPool = mixPoolQuestions.filter(q => q.type === "TL");

        const noBorder = {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
        };

        for (let v = 0; v < variantCount; v++) {
            const examCode = examCodes[v];
            const docChildren = [];

            // Header 2 cột chuẩn đề thi Sở / Trường / Tổ / Kiểm tra / Mã đề
            const headerTable = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                borders: noBorder,
                                width: { size: 48, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [
                                            new TextRun({ text: `${deptEdu}\n`, size: 24, font: "Times New Roman" }),
                                            new TextRun({ text: `${schoolName}\n`, bold: true, size: 24, font: "Times New Roman" }),
                                            new TextRun({ text: `TỔ: ${groupName}`, bold: true, size: 24, font: "Times New Roman" })
                                        ]
                                    })
                                ]
                            }),
                            new TableCell({
                                borders: noBorder,
                                width: { size: 52, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [
                                            new TextRun({ text: `${examName}\n`, bold: true, size: 24, font: "Times New Roman" }),
                                            new TextRun({ text: `MÔN: ${subject} – KHỐI ${grade}\n`, bold: true, size: 24, font: "Times New Roman" }),
                                            new TextRun({ text: `Thời gian làm bài: ${duration} phút\n`, italics: true, size: 24, font: "Times New Roman" }),
                                            new TextRun({ text: `MÃ ĐỀ: ${examCode}`, bold: true, size: 26, font: "Times New Roman" })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            });

            docChildren.push(headerTable);
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: "Họ và tên thí sinh: .................................................... Số báo danh: ......................", size: 24, font: "Times New Roman" })],
                spacing: { before: 120, after: 160 }
            }));

            if (v > 0) solutionDocChildren.push(new Paragraph({ children: [new PageBreak()] }));
            solutionDocChildren.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `HƯỚNG DẪN CHẤM & LỜI GIẢI CHI TIẾT – MÃ ĐỀ ${examCode} (${examName})`, bold: true, size: 28, font: "Times New Roman" })],
                spacing: { after: 160 }
            }));

            const variantAns = { code: examCode, nl: [], ds: [], tln: [] };

            // PHẦN I
            if (nlPool.length > 0) {
                docChildren.push(new Paragraph({
                    children: [
                        new TextRun({ text: "Phần I. ", bold: true, size: 26, font: "Times New Roman" }),
                        new TextRun({
                            text: `Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời từ câu 1 đến câu ${nlPool.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`,
                            size: 26,
                            font: "Times New Roman"
                        })
                    ],
                    spacing: { before: 100, after: 100 }
                }));

                solutionDocChildren.push(new Paragraph({
                    children: [new TextRun({ text: `Phần I. Trắc nghiệm nhiều phương án lựa chọn (Từ câu 1 đến câu ${nlPool.length})`, bold: true, size: 26, font: "Times New Roman" })],
                    spacing: { before: 100, after: 80 }
                }));

                const shuffledNL = shuffleArray(nlPool);
                shuffledNL.forEach((q, idx) => {
                    const indexedOpts = (q.options || []).map((text, origIdx) => ({ text, isRight: origIdx === q.correct }));
                    const shuffledOpts = shuffleArray(indexedOpts);
                    const newRightIdx = shuffledOpts.findIndex(o => o.isRight);
                    const newLetter = ["A", "B", "C", "D"][Math.max(0, newRightIdx)];
                    variantAns.nl.push({ num: idx + 1, ans: newLetter });

                    docChildren.push(new Paragraph({
                        children: [
                            new TextRun({ text: `Câu ${idx + 1}. `, bold: true, size: 26, font: "Times New Roman" }),
                            new TextRun({ text: q.content, size: 26, font: "Times New Roman" })
                        ],
                        spacing: { after: 60 }
                    }));

                    (q.images || []).forEach(imgUrl => {
                        docChildren.push(new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new ImageRun({ type: "png", data: base64ToUint8Array(imgUrl), transformation: { width: 240, height: 180 } })],
                            spacing: { after: 60 }
                        }));
                    });

                    const optLine = shuffledOpts.map((o, oi) => `${["A", "B", "C", "D"][oi]}. ${o.text}`).join("\t");
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: optLine, size: 26, font: "Times New Roman" })],
                        spacing: { after: 100 }
                    }));

                    solutionDocChildren.push(new Paragraph({
                        children: [
                            new TextRun({ text: `Câu ${idx + 1}: Chọn ${newLetter}. `, bold: true, size: 24, font: "Times New Roman" }),
                            new TextRun({ text: q.solution || "", size: 24, font: "Times New Roman" })
                        ],
                        spacing: { after: 80 }
                    }));
                });
            }

            // PHẦN II
            if (dsPool.length > 0) {
                docChildren.push(new Paragraph({
                    children: [
                        new TextRun({ text: "Phần II. ", bold: true, size: 26, font: "Times New Roman" }),
                        new TextRun({
                            text: `Câu trắc nghiệm đúng sai. Thí sinh trả lời từ câu 1 đến câu ${dsPool.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.`,
                            size: 26,
                            font: "Times New Roman"
                        })
                    ],
                    spacing: { before: 140, after: 100 }
                }));

                solutionDocChildren.push(new Paragraph({
                    children: [new TextRun({ text: `Phần II. Trắc nghiệm đúng sai (Từ câu 1 đến câu ${dsPool.length})`, bold: true, size: 26, font: "Times New Roman" })],
                    spacing: { before: 100, after: 80 }
                }));

                const shuffledDS = shuffleArray(dsPool);
                shuffledDS.forEach((q, idx) => {
                    const boolArr = Array.isArray(q.dsBool) && q.dsBool.length === 4 ? q.dsBool : [true, true, false, false];
                    const tnmakerCode = boolArr.map(b => b ? "Đ" : "S").join("");
                    const readableDs = boolArr.map((b, bi) => `${["a", "b", "c", "d"][bi]}-${b ? "đúng" : "sai"}`).join(", ");
                    variantAns.ds.push({ num: idx + 1, tnmakerCode, readableDs });

                    docChildren.push(new Paragraph({
                        children: [
                            new TextRun({ text: `Câu ${idx + 1}. `, bold: true, size: 26, font: "Times New Roman" }),
                            new TextRun({ text: q.content, size: 26, font: "Times New Roman" })
                        ],
                        spacing: { after: 60 }
                    }));

                    (q.images || []).forEach(imgUrl => {
                        docChildren.push(new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new ImageRun({ type: "png", data: base64ToUint8Array(imgUrl), transformation: { width: 240, height: 180 } })],
                            spacing: { after: 60 }
                        }));
                    });

                    (q.options || []).forEach((st, si) => {
                        if (!st) return;
                        docChildren.push(new Paragraph({
                            children: [new TextRun({ text: `${["a", "b", "c", "d"][si]}) ${st}`, size: 26, font: "Times New Roman" })],
                            spacing: { after: 40 }
                        }));
                    });

                    solutionDocChildren.push(new Paragraph({
                        children: [
                            new TextRun({ text: `Câu ${idx + 1}: ${readableDs}. `, bold: true, size: 24, font: "Times New Roman" }),
                            new TextRun({ text: q.solution || "", size: 24, font: "Times New Roman" })
                        ],
                        spacing: { after: 80 }
                    }));
                });
            }

            // PHẦN III
            if (tlnPool.length > 0) {
                docChildren.push(new Paragraph({
                    children: [
                        new TextRun({ text: "Phần III. ", bold: true, size: 26, font: "Times New Roman" }),
                        new TextRun({
                            text: `Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời từ câu 1 đến câu ${tlnPool.length}.`,
                            size: 26,
                            font: "Times New Roman"
                        })
                    ],
                    spacing: { before: 140, after: 100 }
                }));

                solutionDocChildren.push(new Paragraph({
                    children: [new TextRun({ text: `Phần III. Trắc nghiệm trả lời ngắn (Từ câu 1 đến câu ${tlnPool.length})`, bold: true, size: 26, font: "Times New Roman" })],
                    spacing: { before: 100, after: 80 }
                }));

                const shuffledTLN = shuffleArray(tlnPool);
                shuffledTLN.forEach((q, idx) => {
                    const cleanShort = String(q.shortAnswer || "").trim();
                    variantAns.tln.push({ num: idx + 1, ans: cleanShort });

                    docChildren.push(new Paragraph({
                        children: [
                            new TextRun({ text: `Câu ${idx + 1}. `, bold: true, size: 26, font: "Times New Roman" }),
                            new TextRun({ text: q.content, size: 26, font: "Times New Roman" })
                        ],
                        spacing: { after: 80 }
                    }));

                    (q.images || []).forEach(imgUrl => {
                        docChildren.push(new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new ImageRun({ type: "png", data: base64ToUint8Array(imgUrl), transformation: { width: 240, height: 180 } })],
                            spacing: { after: 60 }
                        }));
                    });

                    solutionDocChildren.push(new Paragraph({
                        children: [
                            new TextRun({ text: `Câu ${idx + 1}: Đáp án: ${cleanShort}. `, bold: true, size: 24, font: "Times New Roman" }),
                            new TextRun({ text: q.solution || "", size: 24, font: "Times New Roman" })
                        ],
                        spacing: { after: 80 }
                    }));
                });
            }

            // PHẦN IV
            if (tlPool.length > 0) {
                docChildren.push(new Paragraph({
                    children: [
                        new TextRun({ text: "Phần IV. ", bold: true, size: 26, font: "Times New Roman" }),
                        new TextRun({
                            text: "Câu hỏi tự luận. Thí sinh trình bày lời giải vào giấy làm bài.",
                            size: 26,
                            font: "Times New Roman"
                        })
                    ],
                    spacing: { before: 140, after: 100 }
                }));

                solutionDocChildren.push(new Paragraph({
                    children: [new TextRun({ text: "Phần IV. Tự luận", bold: true, size: 26, font: "Times New Roman" })],
                    spacing: { before: 100, after: 80 }
                }));

                tlPool.forEach((q, idx) => {
                    docChildren.push(new Paragraph({
                        children: [
                            new TextRun({ text: `Câu ${idx + 1}. `, bold: true, size: 26, font: "Times New Roman" }),
                            new TextRun({ text: q.content, size: 26, font: "Times New Roman" })
                        ],
                        spacing: { after: 80 }
                    }));

                    solutionDocChildren.push(new Paragraph({
                        children: [
                            new TextRun({ text: `Câu ${idx + 1}: `, bold: true, size: 24, font: "Times New Roman" }),
                            new TextRun({ text: q.solution || "", size: 24, font: "Times New Roman" })
                        ],
                        spacing: { after: 80 }
                    }));
                });
            }

            docChildren.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "-------- HẾT --------", bold: true, size: 26, font: "Times New Roman" })],
                spacing: { before: 160 }
            }));

            allAnswerSheets.push(variantAns);

            // Xuất từng file Word riêng biệt cho từng mã đề
            const singleDoc = new Document({ sections: [{ children: docChildren }] });
            const singleBlob = await Packer.toBlob(singleDoc);
            const link = document.createElement("a");
            link.href = URL.createObjectURL(singleBlob);
            link.download = `De_${subject.replace(/\s+/g, "_")}_K${grade}_MaDe_${examCode}.docx`;
            link.click();
            await new Promise(r => setTimeout(r, 180));
        }

        // Tạo chuỗi và ảnh QR chuẩn TNMaker (giữ nguyên định dạng số như 0,4 ở Phần III)
        const tnmakerPayloadLines = [
            `TNMAKER|${subject}_K${grade}`,
            ...allAnswerSheets.map(s => {
                const p1 = s.nl.map(x => x.ans).join("");
                const p2 = s.ds.map(x => x.tnmakerCode).join("-");
                const p3 = s.tln.map(x => x.ans).join(";");
                return `${s.code}:${p1}${p2 ? "|" + p2 : ""}${p3 ? "|" + p3 : ""}`;
            })
        ];
        const tnmakerQrString = tnmakerPayloadLines.join("\n");
        const tnmakerQrDataUrl = await generateTnmakerQrDataUrl(tnmakerQrString);

        // Nếu đề có lời giải thì xuất thêm file Word Lời giải cho tất cả mã đề kèm QR TNMaker
        if (hasAnySolution) {
            if (tnmakerQrDataUrl && ImageRun) {
                solutionDocChildren.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "MÃ QR NẠP ĐÁP ÁN NHANH CHO ỨNG DỤNG TNMAKER", bold: true, size: 26, font: "Times New Roman" })],
                    spacing: { before: 240, after: 100 }
                }));
                solutionDocChildren.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new ImageRun({ type: "png", data: base64ToUint8Array(tnmakerQrDataUrl), transformation: { width: 220, height: 220 } })],
                    spacing: { after: 120 }
                }));
            }
            const solDoc = new Document({ sections: [{ children: solutionDocChildren }] });
            const solBlob = await Packer.toBlob(solDoc);
            const solLink = document.createElement("a");
            solLink.href = URL.createObjectURL(solBlob);
            solLink.download = `LoiGiai_TatCaMaDe_${subject.replace(/\s+/g, "_")}_K${grade}.docx`;
            solLink.click();
        }

        // Hiển thị ảnh QR trực tiếp và tải file QR.png + Excel TNMaker
        const mixBox = document.getElementById("mixReadyBox");
        if (mixBox && tnmakerQrDataUrl) {
            let qrPreview = document.getElementById("tnmakerLiveQrBox");
            if (!qrPreview) {
                qrPreview = document.createElement("div");
                qrPreview.id = "tnmakerLiveQrBox";
                qrPreview.className = "mt-3 p-4 bg-white border border-emerald-300 rounded-xl flex flex-wrap items-center gap-4";
                mixBox.appendChild(qrPreview);
            }
            qrPreview.innerHTML = `
                <img src="${tnmakerQrDataUrl}" alt="QR TNMaker" class="w-36 h-36 border rounded-lg p-1 bg-white">
                <div class="space-y-1.5 text-xs">
                    <p class="font-extrabold text-emerald-800 text-sm">📱 Mã QR Đáp Án TNMaker (${variantCount} mã đề: ${examCodes.join(", ")})</p>
                    <p class="text-slate-600">• Đã xuất trọn bộ: <strong>${variantCount} file Word từng mã đề</strong>${hasAnySolution ? " + <strong>1 file Word lời giải tổng hợp</strong>" : ""} + <strong>Ảnh QR TNMaker (.png)</strong> + <strong>File Excel TNMaker (.xlsx)</strong>.</p>
                </div>
            `;

            const qrLink = document.createElement("a");
            qrLink.href = tnmakerQrDataUrl;
            qrLink.download = `QR_TNMaker_${subject.replace(/\s+/g, "_")}_K${grade}.png`;
            qrLink.click();
        }

        exportTnmakerExcelFile(subject, grade, allAnswerSheets);
    } finally {
        btn.disabled = false;
        btn.textContent = "⚡ Trộn Đề & Xuất Trọn Bộ File + QR TNMaker";
    }
}

// ==================== SOẠN KHBD 5512 CHUẨN MẪU TRƯỜNG THPT ĐA KIA ====================
function resolveDepartmentSigners() {
    const myDept = (currentLoggedAdmin?.subject || "Toán - Tin học").trim();
    const myName = currentLoggedAdmin?.full_name || "Giáo viên bộ môn";
    const myTitle = currentLoggedAdmin?.role_title || (currentLoggedAdmin?.role === "master" ? "Tổ trưởng" : "Giáo viên");

    const sameDeptTeachers = teacherList.filter(t => String(t.subject || "").toLowerCase() === myDept.toLowerCase());
    if (myDept.toLowerCase().includes("toán")) {
        if (!sameDeptTeachers.some(t => t.full_name === "Võ Văn Bình")) {
            sameDeptTeachers.push({ full_name: "Võ Văn Bình", subject: "Toán - Tin học", role_title: "Tổ trưởng" });
        }
    }

    const head = sameDeptTeachers.find(t => t.role_title === "Tổ trưởng");
    const deputy = sameDeptTeachers.find(t => t.role_title === "Tổ phó");

    let leftSignerName = "";
    if (myTitle === "Tổ trưởng") {
        leftSignerName = deputy ? deputy.full_name : (head ? head.full_name : "");
    } else {
        leftSignerName = head ? head.full_name : (deputy ? deputy.full_name : "");
    }

    return {
        deptName: myDept,
        teacherName: myName,
        leftSignerName: leftSignerName || "........................................"
    };
}

async function generateLessonPlan5512() {
    const subject = document.getElementById("lpSubject").value;
    const grade = document.getElementById("lpGrade").value;
    const periodsRaw = document.getElementById("lpPeriods").value;
    const level = document.getElementById("lpDigitalLevel").value;
    const title = document.getElementById("lpTitle").value.trim();

    if (!title) return alert("Thầy/Cô vui lòng nhập tên Chương và Tên bài học!");

    const signerInfo = resolveDepartmentSigners();
    const parsedNum = parseInt(String(periodsRaw).replace(/\D/g, ""), 10);
    const totalPeriods = (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 15) ? parsedNum : 2;
    const totalSteps = totalPeriods + 3;

    const btn = document.getElementById("btnGen5512");
    const editor = document.getElementById("lpResultEditor");
    btn.disabled = true;
    editor.value = "";
    latestLessonSvg = "";

    const headerTemplate =
`Trường: THPT Đa Kia
Tổ: ${signerInfo.deptName}
Họ và tên giáo viên: ${signerInfo.teacherName}

${title.toUpperCase()}
Môn học/Hoạt động giáo dục: ${subject}; Lớp: ${grade}.
Thời gian thực hiện: (${totalPeriods} tiết).

`;
    editor.value = headerTemplate;

    try {
        btn.textContent = `⏳ Bước 1/${totalSteps}: Đang soạn Mục tiêu (Năng lực số) & Học liệu...`;
        const resIntro = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Soạn đúng mẫu Trường THPT Đa Kia phần I. MỤC TIÊU (gồm 1. Kiến thức; 2. Năng lực: Năng lực chung, Năng lực riêng, Năng lực số với các mã 1.1.NC1b, 2.1.NC1a, 5.2.NC1b, 6.2.NC1a; 3. Phẩm chất) và II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU cho bài "${title}" (Môn ${subject}, Lớp ${grade}, ${totalPeriods} tiết, SGK Kết nối tri thức với cuộc sống). Mức độ: ${level}. Không lặp lại phần tiêu đề Trường/Tổ/Họ tên giáo viên.`,
                grade,
                mode: "teacher_5512_intro"
            })
        });
        for await (const chunk of responseBodyReader(resIntro)) {
            editor.value += chunk;
        }

        let coveredSummary = "";
        for (let p = 1; p <= totalPeriods; p++) {
            btn.textContent = `⏳ Bước ${p + 1}/${totalSteps}: Đang soạn chi tiết Tiết ${p}/${totalPeriods}...`;
            editor.value += "\n\n";

            let periodBuffer = "";
            const periodPrompt = `Soạn chi tiết TIẾT ${p}/${totalPeriods} của bài "${title}" (Môn ${subject} Lớp ${grade} - SGK Kết nối tri thức) đúng cấu trúc mẫu Trường THPT Đa Kia:
- Nếu là Tiết 1: mở đầu bằng "III. TIẾN TRÌNH DẠY HỌC", "1. HOẠT ĐỘNG KHỞI ĐỘNG" (đủ a) Mục tiêu, b) Nội dung, c) Sản phẩm, d) Tổ chức thực hiện 4 bước), sau đó tới "2. HÌNH THÀNH KIẾN THỨC MỚI" -> "TIẾT 1: ...".
- Nếu là Tiết ${p} (>1): bắt đầu bằng "TIẾT ${p}: ...".
- Trong phần d) Tổ chức thực hiện của hoạt động hình thành kiến thức mới, trình bày rõ nội dung cho 2 cột: [HĐ CỦA GV VÀ HS] và [SẢN PHẨM DỰ KIẾN].
- Phần kiến thức đã dạy trước đó (không lặp lại): ${coveredSummary || "Chưa có"}.`;

            const resP = await fetch("/api/tutor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: periodPrompt,
                    grade,
                    mode: "teacher_5512_period"
                })
            });
            for await (const chunk of responseBodyReader(resP)) {
                editor.value += chunk;
                periodBuffer += chunk;
            }
            const headingLine = periodBuffer.split("\n").find(l => l.trim().length > 5) || `Tiết ${p}`;
            coveredSummary += ` | ${headingLine.trim().slice(0, 90)}`;
        }

        btn.textContent = `⏳ Bước ${totalSteps - 1}/${totalSteps}: Đang soạn Luyện tập, Vận dụng & Hướng dẫn về nhà...`;
        editor.value += "\n\n";
        const resOutro = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Soạn tiếp phần "3. HOẠT ĐỘNG LUYỆN TẬP", "4. HOẠT ĐỘNG VẬN DỤNG" (gồm câu hỏi trắc nghiệm củng cố + đáp án và tích hợp mã năng lực số 2.1.NC1a, 1.1.NC1b, 5.2.NC1b) và "* HƯỚNG DẪN VỀ NHÀ" cho bài "${title}" (Môn ${subject} Lớp ${grade} - Kết nối tri thức). Không cần ghi phần chữ ký ở cuối vì hệ thống tự gắn bảng ký duyệt.`,
                grade,
                mode: "teacher_5512_outro"
            })
        });
        for await (const chunk of responseBodyReader(resOutro)) {
            editor.value += chunk;
        }

        editor.value += `\n\n========================================\nTỔ CHUYÊN MÔN: ${signerInfo.leftSignerName}\nGIÁO VIÊN: ${signerInfo.teacherName}`;

        btn.textContent = `⏳ Bước ${totalSteps}/${totalSteps}: Đang vẽ hình minh họa chuẩn SGK...`;
        const resSvg = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Vẽ 1 hình minh họa trực quan chuẩn SGK Kết nối tri thức cho bài học: "${title}" (Môn ${subject} Lớp ${grade}).`,
                grade,
                mode: "teacher_svg"
            })
        });
        let svgOut = "";
        for await (const chunk of responseBodyReader(resSvg)) {
            svgOut += chunk;
        }
        const cleanSvgMatch = svgOut.match(/<svg[\s\S]*?<\/svg>/i);
        latestLessonSvg = cleanSvgMatch ? cleanSvgMatch[0] : buildFallbackSvg(title);

        document.getElementById("lpExportToolbar").classList.remove("hidden");
    } catch (err) {
        alert("Lỗi khi soạn KHBD: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "✨ Soạn KHBD 5512 Bằng AI";
    }
}

function buildFallbackSvg(title) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 260" width="500" height="260">
      <rect width="500" height="260" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <defs><marker id="arr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#1d4ed8"/></marker></defs>
      <line x1="90" y1="200" x2="390" y2="200" stroke="#1d4ed8" stroke-width="3" marker-end="url(#arr)"/>
      <line x1="90" y1="200" x2="290" y2="65" stroke="#dc2626" stroke-width="3" marker-end="url(#arr)"/>
      <path d="M 155 200 A 65 65 0 0 0 143 164" fill="none" stroke="#047857" stroke-width="2.5"/>
      <text x="72" y="218" font-family="Times New Roman" font-size="18" font-weight="bold" fill="#0f172a">O</text>
      <text x="165" y="182" font-family="Times New Roman" font-size="18" font-style="italic" fill="#047857">α</text>
      <text x="250" y="242" font-family="Times New Roman" font-size="15" font-weight="bold" fill="#1e3a8a" text-anchor="middle">Hình minh họa: ${title.slice(0, 45)}</text>
    </svg>`;
}

async function* responseBodyReader(res) {
    if (!res.ok) {
        const errObj = await res.json().catch(() => ({ error: "Không kết nối được máy chủ AI" }));
        throw new Error(errObj.error || "Không kết nối được máy chủ AI");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === "[DONE]") continue;
                try {
                    const parsed = JSON.parse(jsonStr);
                    const text = (parsed.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
                    if (text) yield text;
                } catch (_) {}
            }
        }
    }
}

function formatMathUnicode(str) {
    return String(str || "")
        .replace(/\*/g, "")
        .replace(/\$/g, "")
        .replace(/\\overrightarrow\{([^}]+)\}/g, "$1⃗")
        .replace(/\\vec\{([^}]+)\}/g, "$1⃗")
        .replace(/\\vec\s+([A-Za-z0-9]+)/g, "$1⃗")
        .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
        .replace(/\\cdot/g, " · ")
        .replace(/\\times/g, " × ")
        .replace(/\\perp/g, " ⊥ ")
        .replace(/\\parallel/g, " // ")
        .replace(/\\Leftrightarrow/g, " ⇔ ")
        .replace(/\\Rightarrow/g, " ⇒ ")
        .replace(/\\le/g, " ≤ ")
        .replace(/\\ge/g, " ≥ ")
        .replace(/\\ne/g, " ≠ ")
        .replace(/\\alpha/g, "α")
        .replace(/\\beta/g, "β")
        .replace(/\\gamma/g, "γ")
        .replace(/\\Delta/g, "Δ")
        .replace(/\\pi/g, "π")
        .replace(/\^2/g, "²")
        .replace(/\^3/g, "³")
        .replace(/_1/g, "₁")
        .replace(/_2/g, "₂")
        .replace(/_0/g, "₀")
        .replace(/\\angle\s*/g, "∠")
        .replace(/\\widehat\{([^}]+)\}/g, "∠$1")
        .replace(/\^\\circ/g, "°")
        .replace(/\\/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function svgToPngDataUrl(svgString) {
    return new Promise((resolve) => {
        try {
            let cleanSvg = svgString.trim();
            if (!cleanSvg.includes("xmlns=")) {
                cleanSvg = cleanSvg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            const encoded = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(cleanSvg)));
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = 1000;
                canvas.height = 520;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = function () {
                resolve(null);
            };
            img.src = encoded;
        } catch (_) {
            resolve(null);
        }
    });
}

function base64ToUint8Array(dataUrl) {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function exportLessonPlanToDocx() {
    const rawContent = document.getElementById("lpResultEditor").value.trim();
    const title = document.getElementById("lpTitle").value.trim() || "KeHoachBaiDay_5512";
    if (!rawContent) return alert("Chưa có nội dung KHBD để xuất!");

    const signerInfo = resolveDepartmentSigners();
    let pngDataUrl = await svgToPngDataUrl(latestLessonSvg || buildFallbackSvg(title));
    if (!pngDataUrl) pngDataUrl = await svgToPngDataUrl(buildFallbackSvg(title));

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun, AlignmentType, BorderStyle } = docx;
    const cleanBody = rawContent.split("========================================")[0].trim();
    const lines = cleanBody.split("\n");

    const docChildren = [];

    lines.forEach(line => {
        let cleanLine = line
            .replace(/^\s*[\*\•]+\s+/g, "• ")
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/\*(.*?)\*/g, "$1");

        const trimmed = cleanLine.trim();
        if (!trimmed || trimmed === "---") return;

        const isHeaderInfo = /^(Trường:|Tổ:|Họ và tên giáo viên:)/i.test(trimmed);
        const isMainTitle = /^(CHƯƠNG\s+|BÀI\s+\d+|I+|IV|V)\b/i.test(trimmed);
        const isSubHeader = /^(TIẾT\s+\d+|Hoạt động\s+\d+|[1-4]\.\s+|[a-d]\)\s+|Bước\s+[1-4]:|\*\s*HƯỚNG DẪN)/i.test(trimmed);

        docChildren.push(new Paragraph({
            alignment: /^(CHƯƠNG\s+|BÀI\s+\d+)/i.test(trimmed) ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [new TextRun({
                text: cleanLine,
                bold: isHeaderInfo || isMainTitle || isSubHeader,
                size: /^(CHƯƠNG\s+|BÀI\s+\d+)/i.test(trimmed) ? 28 : 26,
                font: "Times New Roman"
            })],
            spacing: { after: 90 }
        }));
    });

    if (pngDataUrl && ImageRun) {
        docChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "HÌNH VẼ MINH HỌA KIẾN THỨC TRỌNG TÂM (CHUẨN SGK)", bold: true, size: 26, font: "Times New Roman" })],
            spacing: { before: 200, after: 100 }
        }));
        docChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new ImageRun({
                    type: "png",
                    data: base64ToUint8Array(pngDataUrl),
                    transformation: { width: 460, height: 240 }
                })
            ],
            spacing: { after: 200 }
        }));
    }

    // Bảng ký duyệt 2 cột cuối trang chuẩn mẫu Trường THPT Đa Kia
    const noBorder = {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
    };

    const signTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders: noBorder,
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ text: "TỔ CHUYÊN MÔN\n\n\n\n", bold: true, size: 26, font: "Times New Roman" }),
                                    new TextRun({ text: signerInfo.leftSignerName, bold: true, size: 26, font: "Times New Roman" })
                                ]
                            })
                        ]
                    }),
                    new TableCell({
                        borders: noBorder,
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ text: "GIÁO VIÊN\n\n\n\n", bold: true, size: 26, font: "Times New Roman" }),
                                    new TextRun({ text: signerInfo.teacherName, bold: true, size: 26, font: "Times New Roman" })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]
    });

    docChildren.push(signTable);

    const doc = new Document({ sections: [{ children: docChildren }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `KHBD_5512_${title.replace(/\s+/g, "_")}.docx`;
    a.click();
}

async function generateSlidesFromLesson() {
    const rawContent = document.getElementById("lpResultEditor").value.trim();
    const title = document.getElementById("lpTitle").value.trim() || "BaiGiang_THPT_DaKia";
    if (!rawContent) return alert("Vui lòng soạn nội dung bài dạy trước!");

    const btn = document.getElementById("btnGenSlides");
    btn.disabled = true;
    btn.textContent = "⏳ Đang thiết kế PowerPoint 16:9 hiện đại & hiệu ứng...";

    let pngDataUrl = await svgToPngDataUrl(latestLessonSvg || buildFallbackSvg(title));
    if (!pngDataUrl) pngDataUrl = await svgToPngDataUrl(buildFallbackSvg(title));

    try {
        const res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Chuyển giáo án sau thành 5 chủ đề kiến thức + 1 hoạt động luyện tập giơ thẻ màu A/B/C/D bám sát SGK Kết nối tri thức với cuộc sống.
QUY TẮC BẮT BUỘC:
- Mỗi chủ đề có 3 khung thẻ cực kỳ cô đọng (mỗi khung tối đa 15 từ, công thức viết ký hiệu rõ ràng).
- Trả về DUY NHẤT JSON hợp lệ theo mẫu:
{"title":"Tên bài học","topics":[{"heading":"Tiêu đề mục","cards":["Khung 1","Khung 2","Khung 3"],"hasDiagram":true,"note":"Ghi chú giáo viên"}],"quiz":{"question":"Câu hỏi trắc nghiệm củng cố...","options":["A. ...","B. ...","C. ...","D. ..."],"answerText":"Đáp án đúng là ... vì ..."}}
Nội dung:\n${rawContent.slice(0, 5000)}`,
                mode: "teacher_slides"
            })
        });
        let rawJson = "";
        for await (const chunk of responseBodyReader(res)) rawJson += chunk;
        const cleanJson = rawJson.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanJson);

        const pptx = new PptxGenJS();
        pptx.layout = "LAYOUT_16x9";

        const cover = pptx.addSlide();
        cover.transition = { type: "fade", duration: 600 };
        cover.background = { color: "0F172A" };
        cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.4, h: 7.5, fill: { color: "2563EB" } });
        cover.addShape(pptx.ShapeType.rect, { x: 0.9, y: 1.1, w: 11.5, h: 5.3, fill: { color: "1E293B" }, line: { color: "38BDF8", width: 1.5 } });
        cover.addText("TRƯỜNG THPT ĐA KIA • BỘ SÁCH KẾT NỐI TRI THỨC VỚI CUỘC SỐNG", { x: 1.3, y: 1.6, w: 10.7, fontSize: 15, color: "38BDF8", bold: true });
        cover.addText(formatMathUnicode(data.title || title), { x: 1.3, y: 2.35, w: 10.7, fontSize: 32, color: "FFFFFF", bold: true });
        cover.addShape(pptx.ShapeType.rect, { x: 1.3, y: 4.15, w: 3.4, h: 0.06, fill: { color: "FACC15" } });
        cover.addText(`Giáo viên giảng dạy: ${currentLoggedAdmin?.full_name || "Trường THPT Đa Kia"}`, { x: 1.3, y: 4.55, w: 10.7, fontSize: 18, color: "FDE047", bold: true });

        const cardAccents = ["1D4ED8", "047857", "B45309"];
        const cardBgColors = ["EFF6FF", "ECFDF5", "FFFBEB"];
        let slideCounter = 2;

        (data.topics || []).forEach((topic, tIdx) => {
            const cards = (topic.cards || []).slice(0, 3);
            const showImg = (topic.hasDiagram || tIdx === 1) && pngDataUrl;

            for (let step = 1; step <= cards.length; step++) {
                const slide = pptx.addSlide();
                slide.transition = step === 1 ? { type: "push", duration: 400 } : { type: "none" };
                slide.background = { color: "F8FAFC" };

                slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.0, fill: { color: "1E3A8A" } });
                slide.addShape(pptx.ShapeType.rect, { x:
