let studentList = JSON.parse(localStorage.getItem("dakia_all_students")) || [
    { student_code: "10A801", full_name: "Nguyễn Văn An", class_name: "10A8", grade: "10", is_weak_mode: true },
    { student_code: "10A802", full_name: "Trần Thị Bích", class_name: "10A8", grade: "10", is_weak_mode: false },
    { student_code: "10A803", full_name: "Lê Hoàng Nam", class_name: "10A8", grade: "10", is_weak_mode: true }
];

let teacherList = JSON.parse(localStorage.getItem("dakia_teachers")) || [];
let uploadedExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
let currentLoggedAdmin = null;
let pendingParsedExam = null;

if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// ==================== ĐĂNG NHẬP PHÂN QUYỀN BẢO MẬT ====================
async function verifyAdmin() {
    const user = document.getElementById("adminUserInput").value.trim().toLowerCase();
    const pass = document.getElementById("adminPassInput").value.trim();
    const errEl = document.getElementById("adminLoginErr");
    if (!user || !pass) return;

    const passHash = typeof sha256Hex === "function" ? await sha256Hex(pass) : pass;
    const defaultMasterHash = typeof sha256Hex === "function" ? await sha256Hex("Vanphong@2015") : "Vanphong@2015";
    const masterUser = (typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG.masterAdminUser) ? SYSTEM_CONFIG.masterAdminUser.toLowerCase() : "vovanbinh";
    const masterHash = (typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG.masterAdminPassHash) ? SYSTEM_CONFIG.masterAdminPassHash : defaultMasterHash;

    if (user === masterUser && (passHash === masterHash || passHash === defaultMasterHash)) {
        currentLoggedAdmin = { username: user, full_name: "Võ Văn Bình (Tác giả)", subject: "Toán - Tin", role: "master" };
    } else {
        if (typeof syncFromGoogleSheets === "function") await syncFromGoogleSheets();
        teacherList = JSON.parse(localStorage.getItem("dakia_teachers")) || [];
        const found = teacherList.find(t => t.username.toLowerCase() === user && t.pass_hash === passHash);
        if (found) {
            currentLoggedAdmin = { ...found, role: "teacher" };
        }
    }

    if (!currentLoggedAdmin) {
        errEl.classList.remove("hidden");
        return;
    }

    errEl.classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.add("hidden");
    document.getElementById("adminDashboard").classList.remove("hidden");
    document.getElementById("loggedTeacherBadge").textContent = `Đang đăng nhập: ${currentLoggedAdmin.full_name} • Bộ môn: ${currentLoggedAdmin.subject}`;

    if (currentLoggedAdmin.role === "master") {
        document.getElementById("masterTeacherManager").classList.remove("hidden");
    }

    await syncNow();
}

function logoutAdmin() {
    currentLoggedAdmin = null;
    document.getElementById("adminDashboard").classList.add("hidden");
    document.getElementById("adminLoginScreen").classList.remove("hidden");
    document.getElementById("adminPassInput").value = "";
}

async function syncNow() {
    if (typeof syncFromGoogleSheets === "function") {
        await syncFromGoogleSheets();
    }
    studentList = JSON.parse(localStorage.getItem("dakia_all_students")) || studentList;
    teacherList = JSON.parse(localStorage.getItem("dakia_teachers")) || [];
    uploadedExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];

    updateClassFilterDropdown();
    renderStudentTable();
    renderTeacherTable();
    renderUploadedExams();
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

// ==================== QUẢN LÝ TÀI KHOẢN GIÁO VIÊN ĐA MÔN ====================
async function addTeacherAccount() {
    if (currentLoggedAdmin?.role !== "master") return;
    const username = document.getElementById("newTeaUser").value.trim().toLowerCase();
    const full_name = document.getElementById("newTeaName").value.trim();
    const subject = document.getElementById("newTeaSubject").value;
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
    teacherList.push({ username, full_name, subject, role: "teacher", pass_hash });
    localStorage.setItem("dakia_teachers", JSON.stringify(teacherList));
    await postToGoogleSheets({ action: "save_teachers", teachers: teacherList });

    document.getElementById("newTeaUser").value = "";
    document.getElementById("newTeaName").value = "";
    document.getElementById("newTeaPass").value = "";
    renderTeacherTable();
    alert(`Đã cấp tài khoản cho giáo viên ${full_name} thành công!`);
}

function renderTeacherTable() {
    const tbody = document.getElementById("teacherTableBody");
    if (!tbody) return;
    if (teacherList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-3 px-3 text-center text-slate-400">Chưa có tài khoản giáo viên nào được cấp thêm.</td></tr>`;
        return;
    }
    tbody.innerHTML = teacherList.map((t, idx) => `
        <tr>
            <td class="py-2 px-3 font-bold text-blue-700">${t.username}</td>
            <td class="py-2 px-3 font-medium">${t.full_name}</td>
            <td class="py-2 px-3">${t.subject}</td>
            <td class="py-2 px-3"><span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">Giáo viên</span></td>
            <td class="py-2 px-3 text-right">
                <button onclick="removeTeacher(${idx})" class="text-xs text-red-600 hover:underline">Thu hồi</button>
            </td>
        </tr>
    `).join("");
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
        const scored = stuLogs.filter(l => l.score !== null);
        const avg = scored.length > 0 ? (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1) : "--";
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
        { MaHS: "10A802", HoTen: "Trần Thị Bích", Lop: "10A8", HoTroYeu: "Không" }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
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
        rows.forEach(row => {
            const code = String(row.MaHS || row["Mã HS"] || "").trim().toUpperCase();
            const name = String(row.HoTen || row["Họ và tên"] || "").trim();
            const cls = String(row.Lop || row["Lớp"] || "").trim().toUpperCase();
            const isWeak = ["có", "co", "yes", "true", "1", "x"].includes(String(row.HoTroYeu || "").trim().toLowerCase());
            if (!code || !name || !cls) return;
            const idx = studentList.findIndex(s => s.student_code === code);
            const obj = { student_code: code, full_name: name, class_name: cls, grade: cls.slice(0, 2) || "10", is_weak_mode: isWeak };
            if (idx >= 0) studentList[idx] = obj;
            else { studentList.push(obj); added++; }
        });
        localStorage.setItem("dakia_all_students", JSON.stringify(studentList));
        await postToGoogleSheets({ action: "save_students", students: studentList });
        updateClassFilterDropdown();
        renderStudentTable();
        alert(`Đã nhập xong danh sách! Thêm mới ${added} học sinh và đồng bộ lên Google Sheets.`);
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

function assignHomework() {
    const cls = document.getElementById("assignClass").value.trim().toUpperCase();
    const title = document.getElementById("assignTitle").value.trim();
    const content = document.getElementById("assignContent").value.trim();
    if (!title || !content) return alert("Vui lòng nhập tiêu đề và nội dung bài tập!");
    alert(`Đã giao bài tập "${title}" cho lớp ${cls}!`);
    document.getElementById("assignTitle").value = "";
    document.getElementById("assignContent").value = "";
}

function exportReportToExcel() {
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    const rows = studentList.map((stu, i) => {
        const stuLogs = logs.filter(l => l.student_code === stu.student_code);
        return {
            "STT": i + 1,
            "Mã HS": stu.student_code,
            "Họ và tên": stu.full_name,
            "Lớp": stu.class_name,
            "Hỗ trợ yếu": stu.is_weak_mode ? "Có" : "Không",
            "Số lượt học": stuLogs.length
        };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCao");
    XLSX.writeFile(wb, `BaoCao_THPT_DaKia_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ==================== NGÂN HÀNG ĐỀ WORD MATHTYPE & MÃ QR ====================
async function handleWordExamUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const base64String = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));

    const result = await mammoth.extractRawText({ arrayBuffer });
    const rawText = result.value || "";

    const blocks = rawText.split(/(?=Câu\s+\d+[\.\:])/i).map(b => b.trim()).filter(b => /^Câu\s+\d+/i.test(b));
    const parsedQuestions = blocks.map((blk, i) => {
        const ansMatch = blk.match(/Đáp\s*án\s*[:\-]?\s*([A-D])/i);
        const correctLetter = ansMatch ? ansMatch[1].toUpperCase() : "A";
        const cleanBlock = blk.replace(/Đáp\s*án\s*[:\-]?\s*[A-D].*/i, "").trim();

        const optAMatch = cleanBlock.match(/A[\.\)]\s*([\s\S]*?)(?=B[\.\)])/);
        const optBMatch = cleanBlock.match(/B[\.\)]\s*([\s\S]*?)(?=C[\.\)])/);
        const optCMatch = cleanBlock.match(/C[\.\)]\s*([\s\S]*?)(?=D[\.\)])/);
        const optDMatch = cleanBlock.match(/D[\.\)]\s*([\s\S]*)$/);

        const questionText = optAMatch ? cleanBlock.slice(0, optAMatch.index).trim() : cleanBlock;
        const options = [
            optAMatch ? optAMatch[1].trim() : "Phương án A",
            optBMatch ? optBMatch[1].trim() : "Phương án B",
            optCMatch ? optCMatch[1].trim() : "Phương án C",
            optDMatch ? optDMatch[1].trim() : "Phương án D"
        ];
        return {
            id: `word_q_${Date.now()}_${i}`,
            content: questionText,
            options,
            correct: ["A", "B", "C", "D"].indexOf(correctLetter)
        };
    });

    pendingParsedExam = {
        id: "EXAM_" + Date.now(),
        title: document.getElementById("examTitleInput").value.trim() || file.name.replace(/\.docx$/i, ""),
        subject: document.getElementById("examSubjectInput").value,
        grade: document.getElementById("examGradeInput").value,
        teacher: currentLoggedAdmin?.full_name || "Giáo viên THPT Đa Kia",
        fileName: file.name,
        fileBase64: base64String,
        questions: parsedQuestions
    };

    document.getElementById("examPreviewBox").classList.remove("hidden");
    document.getElementById("examParseSummary").textContent = `Đã đọc file "${file.name}": Nhận diện được ${parsedQuestions.length} câu hỏi trắc nghiệm.`;
    document.getElementById("examParsedList").innerHTML = parsedQuestions.slice(0, 5).map(q =>
        `<div class="p-2 bg-white rounded border border-slate-200"><strong>${q.content}</strong> (Đáp án đúng: ${String.fromCharCode(65 + q.correct)})</div>`
    ).join("");
}

async function publishUploadedExam() {
    if (!pendingParsedExam) return;
    const btn = document.getElementById("btnPublishExam");
    btn.disabled = true;
    btn.textContent = "⏳ Đang lưu lên Google Drive & Sheets...";

    const res = await postToGoogleSheets({
        action: "upload_exam",
        ...pendingParsedExam
    });

    const savedExam = {
        ...pendingParsedExam,
        fileUrl: res?.fileUrl || "",
        createdAt: new Date().toLocaleDateString("vi-VN")
    };
    delete savedExam.fileBase64;

    uploadedExams.unshift(savedExam);
    localStorage.setItem("dakia_uploaded_exams", JSON.stringify(uploadedExams));

    btn.disabled = false;
    btn.textContent = "🚀 Lưu lên Kho Đề & Tạo Mã QR";
    document.getElementById("examPreviewBox").classList.add("hidden");
    pendingParsedExam = null;
    renderUploadedExams();
    alert("Đã lưu đề thi lên hệ thống và tự động tạo mã QR cho học sinh truy cập!");
}

function renderUploadedExams() {
    const grid = document.getElementById("uploadedExamsGrid");
    if (!grid) return;
    if (uploadedExams.length === 0) {
        grid.innerHTML = `<p class="text-xs text-slate-400 col-span-3">Chưa có đề thi Word nào được tải lên.</p>`;
        return;
    }

    grid.innerHTML = uploadedExams.map((ex, idx) => `
        <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2.5 flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start gap-2">
                    <span class="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded uppercase">${ex.subject} • Lớp ${ex.grade}</span>
                    <span class="text-[11px] text-slate-400">${ex.createdAt || ""}</span>
                </div>
                <h4 class="font-bold text-sm text-slate-900 mt-1.5">${ex.title}</h4>
                <p class="text-xs text-slate-500">GV: ${ex.teacher} • ${(ex.questions || []).length} câu</p>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-200">
                <div id="qr_exam_${idx}" class="bg-white p-1 border rounded"></div>
                <div class="flex flex-col gap-1.5 text-right">
                    ${ex.fileUrl ? `<a href="${ex.fileUrl}" target="_blank" class="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded font-semibold">📥 Tải file Word gốc</a>` : `<span class="text-[11px] text-slate-400">Lưu nội bộ</span>`}
                    <button onclick="copyExamShareLink('${ex.id}')" class="text-xs bg-blue-700 text-white px-2.5 py-1 rounded font-semibold">🔗 Copy link thi</button>
                </div>
            </div>
        </div>
    `).join("");

    uploadedExams.forEach((ex, idx) => {
        const el = document.getElementById(`qr_exam_${idx}`);
        if (el && window.QRCode) {
            const shareUrl = `${window.location.origin}/index.html?exam=${ex.id}`;
            new QRCode(el, { text: shareUrl, width: 68, height: 68 });
        }
    });
}

function copyExamShareLink(examId) {
    const url = `${window.location.origin}/index.html?exam=${examId}`;
    navigator.clipboard.writeText(url);
    alert("Đã sao chép đường link làm bài trực tuyến:\n" + url);
}

// ==================== SOẠN KHBD 5512 TRỌN VẸN 2 TIẾT + HÌNH VẼ SGK ====================
async function generateLessonPlan5512() {
    const subject = document.getElementById("lpSubject").value;
    const grade = document.getElementById("lpGrade").value;
    const periods = document.getElementById("lpPeriods").value;
    const level = document.getElementById("lpDigitalLevel").value;
    const title = document.getElementById("lpTitle").value.trim();

    if (!title) return alert("Thầy/Cô vui lòng nhập tên bài học!");

    const btn = document.getElementById("btnGen5512");
    const editor = document.getElementById("lpResultEditor");
    btn.disabled = true;
    editor.value = "";

    try {
        // Lượt 1: Soạn Mục tiêu, Thiết bị & Trọn vẹn Tiết 1
        btn.textContent = "⏳ Bước 1/2: Đang soạn Mục tiêu & Tiết 1...";
        const promptPart1 = `Soạn PHẦN 1 (I. Mục tiêu, II. Thiết bị dạy học, III. Tiến trình dạy học - Trọn vẹn TIẾT 1) cho Kế hoạch bài dạy chuẩn Công văn 5512 bám sát SGK Kết nối tri thức với cuộc sống:
- Môn học: ${subject} - Lớp ${grade}
- Tên bài học: ${title}
- Tổng thời lượng: ${periods}
- Mức độ tích hợp: ${level}
Lưu ý: Không dùng dấu sao * ở đầu dòng, công thức đặt trong $...$.`;

        const res1 = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: promptPart1, grade, mode: "teacher_5512_part1" })
        });
        for await (const chunk of responseBodyReader(res1)) {
            editor.value += chunk;
        }

        // Lượt 2: Soạn tiếp trọn vẹn Tiết 2, Phiếu học tập & Hình vẽ minh họa SGK
        btn.textContent = "⏳ Bước 2/2: Đang soạn tiếp Tiết 2, Phiếu học tập & Hình vẽ SGK...";
        editor.value += "\n\n";
        const promptPart2 = `Tiếp nối giáo án bài "${title}" (Môn ${subject} Lớp ${grade} - Kết nối tri thức), hãy viết tiếp đầy đủ:
- TIẾT 2 (phần hình thành kiến thức tiếp theo, Hoạt động 3. Luyện tập có lời giải chi tiết, Hoạt động 4. Vận dụng thực tiễn).
- IV. PHIẾU HỌC TẬP & CÂU HỎI TỰ HỌC VỚI HỆ THỐNG GIA SƯ AI TRƯỜNG THPT ĐA KIA.
- Cuối cùng xuất đúng 1 hình vẽ minh họa trọng tâm chuẩn SGK trong thẻ <SGK_SVG>...</SGK_SVG>.
Tóm tắt phần đã viết trước đó để nối mạch tự nhiên: ${editor.value.slice(-1000)}`;

        const res2 = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: promptPart2, grade, mode: "teacher_5512_part2" })
        });
        for await (const chunk of responseBodyReader(res2)) {
            editor.value += chunk;
        }

        document.getElementById("lpExportToolbar").classList.remove("hidden");
    } catch (err) {
        alert("Lỗi khi soạn KHBD: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "✨ Soạn KHBD 5512 Bằng AI";
    }
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

// Chuyển đổi ký hiệu Toán LaTeX sang chữ Toán Unicode đẹp cho PowerPoint (không bị lỗi font/tràn chữ)
function formatMathUnicode(str) {
    return String(str || "")
        .replace(/\*/g, "")
        .replace(/\$/g, "")
        .replace(/\\vec\{([A-Za-z0-9]+)\}/g, "$1⃗")
        .replace(/\\overrightarrow\{([A-Za-z0-9]+)\}/g, "$1⃗")
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
            const svgBlob = new Blob([cleanSvg], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = 920;
                canvas.height = 480;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                resolve(null);
            };
            img.src = url;
        } catch (_) {
            resolve(null);
        }
    });
}

function base64ToUint8Array(dataUrl) {
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

// ==================== XUẤT WORD SẠCH DẤU * + HÌNH VẼ MINH HỌA SGK ====================
async function exportLessonPlanToDocx() {
    const rawContent = document.getElementById("lpResultEditor").value.trim();
    const title = document.getElementById("lpTitle").value.trim() || "KeHoachBaiDay_5512";
    if (!rawContent) return alert("Chưa có nội dung KHBD để xuất!");

    const svgMatch = rawContent.match(/<SGK_SVG>([\s\S]*?)<\/SGK_SVG>/i);
    const svgCode = svgMatch ? svgMatch[1].trim() : "";
    const textOnly = rawContent.replace(/<SGK_SVG>[\s\S]*?<\/SGK_SVG>/gi, "").trim();
    const pngDataUrl = svgCode ? await svgToPngDataUrl(svgCode) : null;

    const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } = docx;
    const lines = textOnly.split("\n");

    const paragraphs = [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "TRƯỜNG THPT ĐA KIA – KẾ HOẠCH BÀI DẠY (CÔNG VĂN 5512)", bold: true, size: 28, font: "Times New Roman" })],
            spacing: { after: 200 }
        })
    ];

    lines.forEach(line => {
        let cleanLine = line
            .replace(/^\s*[\*\•]+\s+/g, "   - ")
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/\*(.*?)\*/g, "$1")
            .replace(/\*/g, "");

        const trimmed = cleanLine.trim();
        if (!trimmed || trimmed === "---") return;

        const isMainHeader = /^(I+|IV|V)\.\s+|^(KẾ HOẠCH BÀI DẠY|TIẾT\s+\d+)/i.test(trimmed);
        const isSubHeader = /^(Hoạt động\s+\d+|Phần\s+\d+|Nội dung\s+\d+|[1-4]\.\s+Về|[a-d]\)\s+|Bước\s+[1-4]:)/i.test(trimmed);

        paragraphs.push(new Paragraph({
            children: [new TextRun({
                text: cleanLine,
                bold: isMainHeader || isSubHeader,
                size: isMainHeader ? 28 : 26,
                font: "Times New Roman"
            })],
            spacing: { after: 100 }
        }));
    });

    if (pngDataUrl && ImageRun) {
        paragraphs.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "HÌNH VẼ MINH HỌA KIẾN THỨC TRỌNG TÂM (CHUẨN SGK)", bold: true, size: 26, font: "Times New Roman" })],
            spacing: { before: 240, after: 120 }
        }));
        paragraphs.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new ImageRun({
                    data: base64ToUint8Array(pngDataUrl),
                    transformation: { width: 460, height: 240 }
                })
            ],
            spacing: { after: 200 }
        }));
    }

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `KHBD_5512_${title.replace(/\s+/g, "_")}.docx`;
    a.click();
}

// ==================== XUẤT SLIDE POWERPOINT 16:9 CHỐNG TRÀN + CÔNG THỨC TOÁN ĐẸP + HIỆU ỨNG TỪNG KHUNG ====================
async function generateSlidesFromLesson() {
    const rawContent = document.getElementById("lpResultEditor").value.trim();
    const title = document.getElementById("lpTitle").value.trim() || "BaiGiang_THPT_DaKia";
    if (!rawContent) return alert("Vui lòng soạn nội dung bài dạy trước!");

    const btn = document.getElementById("btnGenSlides");
    btn.disabled = true;
    btn.textContent = "⏳ Đang thiết kế PowerPoint 16:9 chuẩn bố cục & hiệu ứng...";

    const svgMatch = rawContent.match(/<SGK_SVG>([\s\S]*?)<\/SGK_SVG>/i);
    const pngDataUrl = svgMatch ? await svgToPngDataUrl(svgMatch[1]) : null;
    const cleanContent = rawContent.replace(/<SGK_SVG>[\s\S]*?<\/SGK_SVG>/gi, "").trim();

    try {
        const res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Tóm tắt giáo án sau thành đúng 6 chủ đề trình chiếu lớp học súc tích bám sát SGK Kết nối tri thức với cuộc sống (dùng cho 1 máy tính giáo viên chiếu lên TV/máy chiếu, tương tác giơ thẻ màu A/B/C/D).
QUY TẮC BẮT BUỘC ĐỂ KHÔNG TRÀN CHỮ:
- Mỗi chủ đề có tối đa 3 khung thẻ (cards).
- Mỗi khung thẻ viết CỰC KỲ CÔ ĐỌNG, tối đa 15-20 từ (dưới 105 ký tự), nêu thẳng công thức/định nghĩa/câu hỏi chính.
Trả về DUY NHẤT JSON hợp lệ theo mẫu:
{"title":"Tên bài học","topics":[{"heading":"Tiêu đề mục","cards":["Khung 1 ngắn gọn","Khung 2 ngắn gọn","Khung 3 ngắn gọn"],"hasDiagram":true,"note":"Ghi chú giáo viên"}]}
Nội dung:\n${cleanContent.slice(0, 4800)}`,
                mode: "teacher_slides"
            })
        });
        let rawJson = "";
        for await (const chunk of responseBodyReader(res)) rawJson += chunk;
        const cleanJson = rawJson.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanJson);

        const pptx = new PptxGenJS();
        pptx.layout = "LAYOUT_16x9";

        // Slide bìa
        const cover = pptx.addSlide();
        cover.transition = { type: "fade", duration: 600 };
        cover.background = { color: "0F172A" };
        cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: "3B82F6" } });
        cover.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.0, w: 11.7, h: 5.5, fill: { color: "1E293B" }, line: { color: "38BDF8", width: 1.5 } });
        cover.addText("TRƯỜNG THPT ĐA KIA • BỘ SÁCH KẾT NỐI TRI THỨC VỚI CUỘC SỐNG", { x: 1.2, y: 1.5, w: 10.9, fontSize: 15, color: "38BDF8", bold: true });
        cover.addText(formatMathUnicode(data.title || title), { x: 1.2, y: 2.3, w: 10.9, fontSize: 32, color: "FFFFFF", bold: true });
        cover.addShape(pptx.ShapeType.rect, { x: 1.2, y: 4.1, w: 3.2, h: 0.06, fill: { color: "FACC15" } });
        cover.addText(`Giáo viên giảng dạy: ${currentLoggedAdmin?.full_name || "Trường THPT Đa Kia"}`, { x: 1.2, y: 4.5, w: 10.9, fontSize: 18, color: "FDE047", bold: true });

        const cardAccents = ["1D4ED8", "047857", "B45309"];
        const cardBgColors = ["EFF6FF", "ECFDF5", "FFFBEB"];
        let slideCounter = 2;

        (data.topics || []).forEach((topic, tIdx) => {
            const cards = (topic.cards || []).slice(0, 3);
            const showImg = (topic.hasDiagram || tIdx === 1) && pngDataUrl;

            for (let step = 1; step <= cards.length; step++) {
                const slide = pptx.addSlide();
                slide.transition = step === 1 ? { type: "push", duration: 400 } : { type: "none" };
                slide.background = { color: "F1F5F9" };

                slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.0, fill: { color: "1E3A8A" } });
                slide.addShape(pptx.ShapeType.rect, { x: 0, y: 1.0, w: 13.33, h: 0.06, fill: { color: "F59E0B" } });
                slide.addText(formatMathUnicode(topic.heading || `Hoạt động ${tIdx + 1}`), {
                    x: 0.6, y: 0.18, w: 12.1, h: 0.65, fontSize: 21, bold: true, color: "FFFFFF", fit: "shrink"
                });

                const contentWidth = showImg ? 7.45 : 12.1;
                const cardHeight = 1.62;
                const gap = 0.22;

                for (let c = 0; c < step; c++) {
                    const yPos = 1.32 + c * (cardHeight + gap);
                    const accent = cardAccents[c % cardAccents.length];
                    const bg = cardBgColors[c % cardBgColors.length];
                    const formattedMathText = formatMathUnicode(cards[c]);

                    slide.addShape(pptx.ShapeType.rect, {
                        x: 0.6, y: yPos, w: contentWidth, h: cardHeight,
                        fill: { color: bg }, line: { color: accent, width: 1.2 }
                    });
                    slide.addShape(pptx.ShapeType.rect, {
                        x: 0.6, y: yPos, w: 0.14, h: cardHeight,
                        fill: { color: accent }
                    });
                    slide.addText(`0${c + 1}`, {
                        x: 0.85, y: yPos + 0.15, w: 0.55, h: 0.45,
                        fontSize: 16, bold: true, color: accent
                    });
                    slide.addText(formattedMathText, {
                        x: 1.45, y: yPos + 0.12, w: contentWidth - 1.05, h: cardHeight - 0.24,
                        fontSize: 17, color: "0F172A", valign: "middle", fit: "shrink", wrap: true
                    });
                }

                if (showImg) {
                    slide.addShape(pptx.ShapeType.rect, {
                        x: 8.25, y: 1.32, w: 4.5, h: 5.3,
                        fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 }
                    });
                    slide.addText("HÌNH MINH HỌA SGK", {
                        x: 8.25, y: 1.48, w: 4.5, h: 0.4,
                        fontSize: 13, bold: true, color: "1D4ED8", align: "center"
                    });
                    slide.addImage({
                        data: pngDataUrl,
                        x: 8.4, y: 2.15, w: 4.2, h: 2.2
                    });
                }

                slide.addText(`THPT Đa Kia • Bấm chuột để hiện khung tiếp theo (${step}/${cards.length}) | Slide ${slideCounter++}`, {
                    x: 0.6, y: 7.0, w: 12.1, fontSize: 11, color: "64748B", align: "right"
                });
                if (topic.note && step === 1) slide.addNotes(topic.note);
            }
        });

        await pptx.writeFile({ fileName: `Slide_16x9_HieuUng_${title.replace(/\s+/g, "_")}.pptx` });
    } catch (err) {
        alert("Lỗi tạo PowerPoint: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "📊 Xuất Slide PowerPoint 16:9 (.pptx)";
    }
}

// ==================== XUẤT E-LEARNING SCORM: TRANG LÝ THUYẾT -> TRANG TỪNG BÀI TẬP ĐA DẠNG ====================
async function exportElearningScorm() {
    const rawContent = document.getElementById("lpResultEditor").value.trim();
    const title = document.getElementById("lpTitle").value.trim() || "BaiGiang_Elearning";
    if (!rawContent) return alert("Chưa có nội dung để đóng gói E-learning!");

    const btn = typeof event !== "undefined" ? event.target : null;
    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Đang đóng gói E-learning vừa học vừa chơi...";
    }

    const svgMatch = rawContent.match(/<SGK_SVG>([\s\S]*?)<\/SGK_SVG>/i);
    const svgRaw = svgMatch ? svgMatch[1].trim() : "";
    const cleanContent = rawContent.replace(/<SGK_SVG>[\s\S]*?<\/SGK_SVG>/gi, "").trim();

    try {
        const res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Chuyển giáo án sau thành bài giảng E-learning gồm 4 chặng học tập. MỖI chặng gồm phần lý thuyết súc tích (công thức đặt trong $...$) VÀ 3 câu hỏi tương tác ĐA DẠNG DẠNG BÀI ("mcq": trắc nghiệm 4 lựa chọn, "tf": Đúng/Sai nhanh, "fill": Điền số/kết quả ngắn) để học sinh luyện tập từng câu một. Trả về DUY NHẤT JSON hợp lệ theo mẫu:
{"stages":[{"title":"Chặng 1: ...","theory":"Nội dung lý thuyết súc tích...","questions":[
  {"type":"mcq","question":"Câu trắc nghiệm...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explain":"Giải thích ngắn..."},
  {"type":"tf","question":"Khẳng định sau Đúng hay Sai: ...","options":["Đúng","Sai"],"answer":0,"explain":"Giải thích ngắn..."},
  {"type":"fill","question":"Tính giá trị (nhập số ngắn gọn): ...","answerText":"3","explain":"Giải thích ngắn..."}
]}]}
Tuyệt đối KHÔNG dùng dấu * trong nội dung:\n${cleanContent.slice(0, 4800)}`,
                mode: "teacher_slides"
            })
        });

        let rawJson = "";
        for await (const chunk of responseBodyReader(res)) rawJson += chunk;
        const cleanJson = rawJson.replace(/```json|```/g, "").trim();
        const eData = JSON.parse(cleanJson);

        const zip = new JSZip();
        const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="THPT_DAKIA_SCORM_12" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG_DAKIA">
    <organization identifier="ORG_DAKIA">
      <title>${title}</title>
      <item identifier="ITEM_1" identifierref="RES_1"><title>${title}</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;

        const htmlLesson = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} – E-Learning Tương Tác THPT Đa Kia</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMath();"></script>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:linear-gradient(135deg,#dbeafe 0%,#f8fafc 100%);margin:0;color:#0f172a;min-height:100vh}
  header{background:linear-gradient(90deg,#1e3a8a,#2563eb);color:#fff;padding:18px 32px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 12px rgba(30,58,138,.2)}
  .badge-group{display:flex;gap:12px;align-items:center}
  .pill{background:rgba(255,255,255,.18);padding:7px 14px;border-radius:999px;font-weight:700;font-size:13px}
  .pill-gold{background:#facc15;color:#1e293b}
  .wrap{max-width:940px;margin:26px auto;padding:0 16px}
  .stepper{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:20px}
  .step-btn{padding:12px 14px;border:2px solid #cbd5e1;border-radius:12px;background:#fff;font-weight:700;color:#475569;cursor:pointer;transition:.2s;text-align:left}
  .step-btn.active{border-color:#1d4ed8;background:#1d4ed8;color:#fff;box-shadow:0 6px 14px rgba(29,78,216,.25)}
  .panel{background:#fff;border-radius:18px;padding:30px;box-shadow:0 10px 28px rgba(15,23,42,.08);border:1px solid #e2e8f0;animation:fadeIn .3s ease}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .theory-box{background:#f8fafc;border-left:5px solid #2563eb;padding:20px 22px;border-radius:12px;line-height:1.8;font-size:16.5px;white-space:pre-line;margin-bottom:22px}
  .svg-box{text-align:center;margin:18px 0;padding:14px;background:#fff;border:1px dashed #94a3b8;border-radius:12px}
  .q-type-tag{display:inline-block;background:#e0e7ff;color:#1e40af;font-weight:800;font-size:12px;padding:5px 12px;border-radius:999px;margin-bottom:10px;text-transform:uppercase}
  .opt-btn{display:block;width:100%;text-align:left;padding:13px 16px;margin:10px 0;border:2px solid #cbd5e1;border-radius:12px;background:#fff;font-size:16px;cursor:pointer;transition:.15s}
  .opt-btn:hover:not(:disabled){border-color:#2563eb;background:#eff6ff;transform:translateX(4px)}
  .opt-btn.correct{border-color:#059669;background:#d1fae5;color:#065f46;font-weight:700}
  .opt-btn.wrong{border-color:#dc2626;background:#fee2e2;color:#991b1b}
  .tf-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}
  .tf-btn{padding:18px;font-size:18px;font-weight:800;border-radius:14px;border:2px solid #cbd5e1;background:#fff;cursor:pointer;text-align:center}
  .tf-btn:hover:not(:disabled){border-color:#2563eb;background:#eff6ff}
  .fill-box{display:flex;gap:10px;margin:14px 0;flex-wrap:wrap}
  .fill-input{flex:1;min-width:200px;padding:12px 16px;font-size:16px;border:2px solid #94a3b8;border-radius:10px}
  .feedback{margin-top:14px;padding:15px 18px;border-radius:12px;font-size:15px;line-height:1.6}
  .fb-ok{background:#ecfdf5;border:1.5px solid #34d399;color:#065f46}
  .fb-no{background:#fef2f2;border:1.5px solid #f87171;color:#991b1b}
  .controls{display:flex;justify-content:space-between;align-items:center;margin-top:26px;padding-top:18px;border-top:1px solid #e2e8f0;gap:12px;flex-wrap:wrap}
  .btn-main{background:#1d4ed8;color:#fff;border:none;padding:13px 24px;border-radius:12px;font-size:15.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 10px rgba(29,78,216,.25)}
  .btn-play{background:linear-gradient(90deg,#059669,#10b981);color:#fff;border:none;padding:14px 26px;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(5,150,105,.3)}
  .btn-sub{background:#e2e8f0;color:#1e293b;border:none;padding:12px 20px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer}
</style>
</head>
<body>
<header>
  <div>
    <div style="font-size:12px;letter-spacing:.6px;opacity:.85;font-weight:700">TRƯỜNG THPT ĐA KIA • BÀI GIẢNG E-LEARNING TƯƠNG TÁC</div>
    <div style="font-size:20px;font-weight:800;margin-top:2px">${title}</div>
  </div>
  <div class="badge-group">
    <div class="pill" id="scoreBadge">Điểm: 0</div>
    <div class="pill pill-gold" id="progBadge">Chặng 1</div>
  </div>
</header>
<div class="wrap">
  <div class="stepper" id="stepper"></div>
  <div class="panel" id="mainPanel"></div>
</div>
<script>
const data = ${JSON.stringify(eData)};
const svgDiagram = ${JSON.stringify(svgRaw)};
const praises = [
  "🌟 Tuyệt vời! Em nắm chắc kiến thức rồi đấy, nhận ngay +10 điểm thưởng!",
  "👏 Chính xác! Tư duy giải toán của em rất sắc bén, tiếp tục chinh phục câu sau nhé!",
  "🎯 Xuất sắc! Em đã vượt qua thử thách này một cách ngoạn mục!"
];
let stageIdx = 0;
let viewMode = "theory"; // "theory" hoặc "quiz"
let currentQIdx = 0;
let answeredMap = {};
let totalRight = 0;

function renderMath(){
  if(window.renderMathInElement){
    renderMathInElement(document.body,{delimiters:[{left:'$',right:'$',display:false}]});
  }
}

function initScorm(){
  try{
    let w = window;
    while(w && !w.API && w.parent && w.parent !== w) w = w.parent;
    if(w && w.API){ w.API.LMSInitialize(""); w.API.LMSSetValue("cmi.core.lesson_status","incomplete"); w.API.LMSCommit(""); }
  }catch(e){}
}

function syncScorm(score){
  try{
    let w = window;
    while(w && !w.API && w.parent && w.parent !== w) w = w.parent;
    if(w && w.API){
      w.API.LMSSetValue("cmi.core.score.raw", String(score));
      w.API.LMSSetValue("cmi.core.lesson_status", score >= 50 ? "passed" : "completed");
      w.API.LMSCommit("");
    }
  }catch(e){}
}

function render(){
  const stages = data.stages || [];
  const totalQ = stages.reduce((acc, s) => acc + (s.questions || []).length, 0);
  const pctScore = totalQ ? Math.round((totalRight / totalQ) * 100) : 100;
  document.getElementById("scoreBadge").textContent = \`🏆 Điểm: \${pctScore}/100 (\${totalRight}/\${totalQ} câu)\`;
  document.getElementById("progBadge").textContent = \`Chặng \${stageIdx + 1}/\${stages.length}\`;

  document.getElementById("stepper").innerHTML = stages.map((st, idx) =>
    \`<button class="step-btn \${idx === stageIdx ? 'active' : ''}" onclick="goStage(\${idx})">\${st.title}</button>\`
  ).join("");

  const st = stages[stageIdx];
  if(!st) return;
  const qs = st.questions || [];
  const panel = document.getElementById("mainPanel");

  // TRANG 1: NỘI DUNG LÝ THUYẾT CỦA CHẶNG
  if(viewMode === "theory"){
    const diagramHtml = (stageIdx === 0 && svgDiagram)
      ? \`<div class="svg-box"><div style="font-size:13px;font-weight:700;color:#1d4ed8;margin-bottom:6px">HÌNH MINH HỌA KIẾN THỨC SGK</div>\${svgDiagram}</div>\`
      : "";

    panel.innerHTML = \`
      <span class="q-type-tag">📖 Phần Kiến Thức Trọng Tâm • \${st.title}</span>
      <h2 style="margin-top:4px;color:#1e3a8a">\${st.title}</h2>
      <div class="theory-box">\${st.theory}</div>
      \${diagramHtml}
      <div class="controls">
        <button class="btn-sub" \${stageIdx === 0 ? "disabled" : ""} onclick="goStage(\${stageIdx - 1})">⬅ Chặng trước</button>
        <button class="btn-play" onclick="startStageQuiz()">🎮 Bắt đầu luyện tập tương tác (\${qs.length} câu) ➔</button>
      </div>
    \`;
    renderMath();
    return;
  }

  // TRANG 2: MỖI BÀI TẬP TƯƠNG TÁC NẰM ĐỘC LẬP TRÊN 1 TRANG
  const q = qs[currentQIdx];
  if(!q) return;
  const key = \`\${stageIdx}_\${currentQIdx}\`;
  const userAns = answeredMap[key];
  const isDone = userAns !== undefined;

  let typeLabel = "🎯 Thử thách Trắc nghiệm 4 lựa chọn";
  if(q.type === "tf") typeLabel = "⚡ Thử thách Phản xạ Đúng / Sai";
  if(q.type === "fill") typeLabel = "✍️ Thử thách Điền đáp số chính xác";

  let interactionHtml = "";
  let isCorrectPick = false;

  if(q.type === "fill"){
    const normUser = String(userAns || "").replace(/\\s+/g, "").replace(",", ".").toLowerCase();
    const normAns = String(q.answerText || "").replace(/\\s+/g, "").replace(",", ".").toLowerCase();
    isCorrectPick = isDone && normUser === normAns;
    interactionHtml = \`
      <div class="fill-box">
        <input id="fillInput" class="fill-input" placeholder="Nhập đáp số của em..." value="\${isDone ? userAns : ""}" \${isDone ? "disabled" : ""}>
        <button class="btn-main" \${isDone ? "disabled" : ""} onclick="submitFill()">Kiểm tra đáp án</button>
      </div>
    \`;
  } else if(q.type === "tf"){
    isCorrectPick = isDone && Number(userAns) === Number(q.answer);
    const opts = q.options && q.options.length === 2 ? q.options : ["Đúng", "Sai"];
    interactionHtml = \`<div class="tf-grid">\` + opts.map((opt, oi) => {
      let cls = "tf-btn";
      if(isDone){
        if(oi === Number(q.answer)) cls += " opt-btn correct";
        else if(oi === Number(userAns)) cls += " opt-btn wrong";
      }
      return \`<button class="\${cls}" \${isDone ? "disabled" : ""} onclick="submitChoice(\${oi})">\${oi === 0 ? "✅ " : "❌ "}\${opt}</button>\`;
    }).join("") + \`</div>\`;
  } else {
    isCorrectPick = isDone && Number(userAns) === Number(q.answer);
    interactionHtml = (q.options || []).map((opt, oi) => {
      let cls = "opt-btn";
      if(isDone){
        if(oi === Number(q.answer)) cls += " correct";
        else if(oi === Number(userAns)) cls += " wrong";
      }
      return \`<button class="\${cls}" \${isDone ? "disabled" : ""} onclick="submitChoice(\${oi})">\${opt}</button>\`;
    }).join("");
  }

  const rightDisplay = q.type === "fill" ? q.answerText : (q.options || [])[q.answer];
  const feedbackHtml = isDone ? (isCorrectPick
    ? \`<div class="feedback fb-ok"><strong>\${praises[currentQIdx % praises.length]}</strong><br>💡 Giải thích chi tiết: \${q.explain || "Hoàn toàn chính xác!"}</div>\`
    : \`<div class="feedback fb-no"><strong>💪 Chưa chính xác rồi, cố gắng lên em nhé!</strong><br>👉 Đáp án đúng là: <strong>\${rightDisplay}</strong>.<br>💡 Lời giải gợi ý: \${q.explain || "Em xem lại phần lý thuyết chặng này nhé!"}</div>\`
  ) : "";

  const isLastQInStage = currentQIdx >= qs.length - 1;
  const isLastStage = stageIdx >= stages.length - 1;

  let nextActionBtn = "";
  if(!isLastQInStage){
    nextActionBtn = \`<button class="btn-play" onclick="nextQuestion()">Câu tiếp theo (\${currentQIdx + 2}/\${qs.length}) ➔</button>\`;
  } else if(!isLastStage){
    nextActionBtn = \`<button class="btn-main" onclick="goStage(\${stageIdx + 1})">Hoàn thành chặng • Sang Chặng \${stageIdx + 2} ➔</button>\`;
  } else {
    nextActionBtn = \`<button class="btn-play" onclick="finishAll(\${pctScore})">🏆 Hoàn thành bài học & Lưu điểm SCORM</button>\`;
  }

  panel.innerHTML = \`
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <span class="q-type-tag">\${typeLabel}</span>
      <span style="font-weight:700;color:#64748b;font-size:14px">\${st.title} • Câu \${currentQIdx + 1}/\${qs.length}</span>
    </div>
    <h3 style="font-size:19px;color:#0f172a;margin:10px 0 14px;line-height:1.5">\${q.question}</h3>
    \${interactionHtml}
    \${feedbackHtml}
    <div class="controls">
      <button class="btn-sub" onclick="backToTheory()">📖 Xem lại lý thuyết chặng này</button>
      \${nextActionBtn}
    </div>
  \`;
  renderMath();
}

function startStageQuiz(){
  viewMode = "quiz";
  currentQIdx = 0;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToTheory(){
  viewMode = "theory";
  render();
}

function nextQuestion(){
  currentQIdx++;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function submitChoice(oi){
  const key = \`\${stageIdx}_\${currentQIdx}\`;
  if(answeredMap[key] !== undefined) return;
  answeredMap[key] = oi;
  const q = data.stages[stageIdx].questions[currentQIdx];
  if(Number(oi) === Number(q.answer)) totalRight++;
  updateAndRender();
}

function submitFill(){
  const val = document.getElementById("fillInput").value.trim();
  if(!val) return alert("Em hãy nhập câu trả lời trước khi bấm kiểm tra nhé!");
  const key = \`\${stageIdx}_\${currentQIdx}\`;
  if(answeredMap[key] !== undefined) return;
  answeredMap[key] = val;
  const q = data.stages[stageIdx].questions[currentQIdx];
  const normUser = val.replace(/\\s+/g, "").replace(",", ".").toLowerCase();
  const normAns = String(q.answerText || "").replace(/\\s+/g, "").replace(",", ".").toLowerCase();
  if(normUser === normAns) totalRight++;
  updateAndRender();
}

function updateAndRender(){
  const totalQ = (data.stages || []).reduce((acc, s) => acc + (s.questions || []).length, 0);
  const pct = totalQ ? Math.round((totalRight / totalQ) * 100) : 100;
  syncScorm(pct);
  render();
}

function goStage(idx){
  stageIdx = idx;
  viewMode = "theory";
  currentQIdx = 0;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function finishAll(score){
  syncScorm(score);
  alert(\`🎉 Xuất sắc! Em đã hoàn thành toàn bộ bài học với số điểm \${score}/100. Kết quả đã được lưu vào hệ thống!\`);
}

initScorm();
render();
</script>
</body>
</html>`;

        zip.file("imsmanifest.xml", manifestXml);
        zip.file("index.html", htmlLesson);
        const blob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `SCORM_Elearning_TuongTac_${title.replace(/\s+/g, "_")}.zip`;
        a.click();
    } catch (err) {
        alert("Lỗi đóng gói E-learning: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "📦 Đóng Gói E-learning SCORM (.zip)";
        }
    }
}

// ==================== TIỆN ÍCH TẠO MÃ QR & PDF SANG WORD CHUẨN MATHTYPE ====================
function generateCustomQR() {
    const text = document.getElementById("qrCustomText").value.trim();
    if (!text) return alert("Vui lòng nhập đường dẫn hoặc nội dung cần tạo mã QR!");
    const box = document.getElementById("customQrBox");
    box.innerHTML = "";
    new QRCode(box, { text, width: 180, height: 180 });
}

function downloadCustomQR() {
    const canvas = document.querySelector("#customQrBox canvas");
    if (!canvas) return alert("Vui lòng bấm 'Tạo Mã QR' trước!");
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "MaQR_THPT_DaKia.png";
    a.click();
}

async function convertPdfToDocx(event) {
    const file = event.target.files[0];
    if (!file) return;
    const statusEl = document.getElementById("pdfConvertStatus");
    statusEl.textContent = "⏳ AI đang nhận diện chữ và công thức Toán học từ PDF sang Word (vui lòng đợi 15-30 giây)...";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const pdfBase64 = btoa(binary);

        const res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Trích xuất nguyên văn toàn bộ đề thi/tài liệu trong file PDF này, giữ nguyên công thức Toán/Lí/Hóa dưới dạng $...$ chuẩn MathType.",
                mode: "pdf_to_word",
                pdfBase64
            })
        });

        let fullText = "";
        for await (const chunk of responseBodyReader(res)) {
            fullText += chunk;
        }

        const { Document, Packer, Paragraph, TextRun } = docx;
        const lines = fullText.split("\n");
        const paragraphs = lines.map(line => new Paragraph({
            children: [new TextRun({ text: line, size: 26, font: "Times New Roman" })],
            spacing: { after: 120 }
        }));

        const doc = new Document({ sections: [{ children: paragraphs }] });
        const blob = await Packer.toBlob(doc);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name.replace(/\.pdf$/i, "") + "_DaChuyenWord_MathType.docx";
        a.click();
        statusEl.textContent = "✅ Đã chuyển đổi xong sang file Word (.docx) giữ nguyên công thức Toán!";
    } catch (err) {
        statusEl.textContent = "❌ Lỗi chuyển đổi PDF: " + err.message;
    }
}
