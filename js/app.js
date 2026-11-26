let currentStudent = null;
let allStudentsCache = JSON.parse(localStorage.getItem("dakia_all_students")) || [];
let availableExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
let currentActiveExam = null;
let examTimerInterval = null;
let remainingSeconds = 0;
let isExamSubmitted = false;
let attachedImageBase64 = "";
let tutorChatHistory = [];

// Đáp án học sinh đang làm
let studentAnswers = {
    nl: {},   // { qId: 0..3 }
    ds: {},   // { qId: [true/false/null, ...] }
    tln: {},  // { qId: "0,5" }
    tl: {}    // { qId: "Bài làm tự luận..." }
};

window.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const directExamId = params.get("exam");
    if (directExamId) {
        document.getElementById("directExamNotice").classList.remove("hidden");
    }

    if (typeof syncFromGoogleSheets === "function") {
        syncFromGoogleSheets().then(() => {
            allStudentsCache = JSON.parse(localStorage.getItem("dakia_all_students")) || allStudentsCache;
            availableExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || availableExams;
        }).catch(() => {});
    }
});

function renderMathSafe(el = document.body) {
    if (window.renderMathInElement) {
        renderMathInElement(el, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false }
            ],
            throwOnError: false
        });
    }
}

// ==================== ĐĂNG NHẬP HỌC SINH ====================
async function loginStudent() {
    const code = document.getElementById("stuCodeInput").value.trim().toUpperCase();
    const guestName = document.getElementById("stuGuestName").value.trim();
    const guestClass = document.getElementById("stuGuestClass").value.trim().toUpperCase();
    const errEl = document.getElementById("stuLoginErr");

    allStudentsCache = JSON.parse(localStorage.getItem("dakia_all_students")) || allStudentsCache;

    if (code) {
        let found = allStudentsCache.find(s => String(s.student_code).toUpperCase() === code);
        if (!found && typeof syncFromGoogleSheets === "function") {
            await syncFromGoogleSheets();
            allStudentsCache = JSON.parse(localStorage.getItem("dakia_all_students")) || [];
            found = allStudentsCache.find(s => String(s.student_code).toUpperCase() === code);
        }
        if (found) {
            currentStudent = found;
        } else {
            errEl.textContent = "Không tìm thấy Mã học sinh này! Em kiểm tra lại hoặc nhập Họ tên & Lớp ở bên dưới.";
            errEl.classList.remove("hidden");
            return;
        }
    } else if (guestName && guestClass) {
        currentStudent = {
            student_code: "HS_" + Date.now().toString().slice(-5),
            full_name: guestName,
            class_name: guestClass,
            grade: guestClass.slice(0, 2) || "10",
            is_weak_mode: false
        };
    } else {
        errEl.textContent = "Vui lòng nhập Mã học sinh hoặc nhập đầy đủ Họ tên và Lớp!";
        errEl.classList.remove("hidden");
        return;
    }

    errEl.classList.add("hidden");
    document.getElementById("studentLoginSection").classList.add("hidden");
    document.getElementById("studentWorkspace").classList.remove("hidden");
    document.getElementById("btnStudentLogout").classList.remove("hidden");

    const badge = document.getElementById("studentHeaderBadge");
    badge.textContent = `👤 ${currentStudent.full_name} • Lớp ${currentStudent.class_name}`;
    badge.classList.remove("hidden");

    if (currentStudent.grade) {
        const gSel = document.getElementById("tutorGradeSelect");
        if (gSel && ["10", "11", "12"].includes(String(currentStudent.grade))) {
            gSel.value = String(currentStudent.grade);
        }
    }

    if (currentStudent.is_weak_mode) {
        document.getElementById("weakSupportTag").classList.remove("hidden");
    }

    renderStudentExamList();

    // Kiểm tra nếu học sinh quét mã QR dẫn thẳng vào đề thi (?exam=...)
    const params = new URLSearchParams(window.location.search);
    const directExamId = params.get("exam");
    if (directExamId) {
        switchStudentTab("exam");
        let targetExam = availableExams.find(e => e.id === directExamId);
        if (!targetExam && typeof syncFromGoogleSheets === "function") {
            await syncFromGoogleSheets();
            availableExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
            targetExam = availableExams.find(e => e.id === directExamId);
        }
        if (targetExam) {
            startOnlineExam(targetExam.id);
        } else {
            alert("Đề thi này chưa được đồng bộ hoặc đã đóng!");
        }
    }
}

function logoutStudent() {
    if (examTimerInterval) clearInterval(examTimerInterval);
    currentStudent = null;
    document.getElementById("studentWorkspace").classList.add("hidden");
    document.getElementById("btnStudentLogout").classList.add("hidden");
    document.getElementById("studentHeaderBadge").classList.add("hidden");
    document.getElementById("studentLoginSection").classList.remove("hidden");
}

function switchStudentTab(tabName) {
    const isTutor = tabName === "tutor";
    document.getElementById("ssec-tutor").classList.toggle("hidden", !isTutor);
    document.getElementById("ssec-exam").classList.toggle("hidden", isTutor);

    const btnTutor = document.getElementById("stab-tutor");
    const btnExam = document.getElementById("stab-exam");

    if (isTutor) {
        btnTutor.className = "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-blue-700 text-white transition";
        btnExam.className = "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition";
    } else {
        btnExam.className = "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-blue-700 text-white transition";
        btnTutor.className = "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition";
        renderStudentExamList();
    }
}

// ==================== TAB 1: GIA SƯ AI TỰ HỌC ====================
function handleTutorImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        attachedImageBase64 = e.target.result;
        document.getElementById("chatImagePreview").src = attachedImageBase64;
        document.getElementById("imagePreviewStrip").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}

function removeAttachedImage() {
    attachedImageBase64 = "";
    document.getElementById("tutorImageInput").value = "";
    document.getElementById("imagePreviewStrip").classList.add("hidden");
}

function clearTutorChat() {
    tutorChatHistory = [];
    document.getElementById("tutorChatBox").innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-slate-800 leading-relaxed">
            <p class="font-bold text-blue-900 mb-1">👋 Cuộc trò chuyện mới đã sẵn sàng!</p>
            <p>Em hãy nhập bài tập hoặc tải ảnh đề bài lên để được hướng dẫn nhé.</p>
        </div>
    `;
}

async function sendTutorMessage() {
    const inputEl = document.getElementById("tutorQuestionInput");
    const msg = inputEl.value.trim();
    if (!msg && !attachedImageBase64) return;

    const subject = document.getElementById("tutorSubjectSelect").value;
    const grade = document.getElementById("tutorGradeSelect").value;
    const chatBox = document.getElementById("tutorChatBox");
    const btn = document.getElementById("btnSendTutor");

    const userBubble = document.createElement("div");
    userBubble.className = "flex justify-end";
    userBubble.innerHTML = `
        <div class="max-w-[82%] bg-blue-700 text-white rounded-2xl rounded-tr-xs px-4 py-3 text-sm space-y-2 shadow-xs">
            ${attachedImageBase64 ? `<img src="${attachedImageBase64}" class="max-h-44 rounded-lg border border-blue-400">` : ""}
            <p class="whitespace-pre-wrap">${msg || "Nhờ Thầy/Cô hướng dẫn bài tập trong ảnh này."}</p>
        </div>
    `;
    chatBox.appendChild(userBubble);

    const aiWrapper = document.createElement("div");
    aiWrapper.className = "flex justify-start";
    const aiBubble = document.createElement("div");
    aiBubble.className = "max-w-[88%] bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl rounded-tl-xs px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap shadow-xs";
    aiBubble.textContent = "⏳ Đang phân tích bài tập...";
    aiWrapper.appendChild(aiBubble);
    chatBox.appendChild(aiWrapper);
    chatBox.scrollTop = chatBox.scrollHeight;

    const imgToSend = attachedImageBase64;
    inputEl.value = "";
    removeAttachedImage();
    btn.disabled = true;

    try {
        const res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `[Môn ${subject} - Lớp ${grade}] ${msg || "Hướng dẫn giải chi tiết bài tập trong hình ảnh."}`,
                grade,
                isWeakMode: Boolean(currentStudent?.is_weak_mode),
                imageBase64: imgToSend || undefined,
                history: tutorChatHistory.slice(-6)
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: "Lỗi kết nối máy chủ AI" }));
            throw new Error(errData.error || "Lỗi kết nối máy chủ AI");
        }

        aiBubble.textContent = "";
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let fullReply = "";

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
                        const chunk = (parsed.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
                        if (chunk) {
                            fullReply += chunk;
                            aiBubble.textContent = fullReply;
                            chatBox.scrollTop = chatBox.scrollHeight;
                        }
                    } catch (_) {}
                }
            }
        }

        renderMathSafe(aiBubble);
        tutorChatHistory.push({ role: "user", text: msg });
        tutorChatHistory.push({ role: "model", text: fullReply });
        logStudentActivity(`Hỏi gia sư AI (${subject} ${grade})`, null);
    } catch (err) {
        aiBubble.textContent = "❌ " + err.message;
    } finally {
        btn.disabled = false;
    }
}

// ==================== TAB 2: PHÒNG THI TRỰC TUYẾN & CHẤM ĐIỂM TỰ ĐỘNG ====================
async function refreshStudentExams() {
    if (typeof syncFromGoogleSheets === "function") {
        await syncFromGoogleSheets();
    }
    availableExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
    renderStudentExamList();
}

function renderStudentExamList() {
    const grid = document.getElementById("studentExamListGrid");
    if (!grid) return;
    availableExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || availableExams;

    if (availableExams.length === 0) {
        grid.innerHTML = `<p class="text-xs text-slate-400 col-span-3 py-6 text-center">Hiện chưa có đề thi trực tuyến nào được mở.</p>`;
        return;
    }

    grid.innerHTML = availableExams.map(ex => `
        <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 hover:border-blue-400 transition flex flex-col justify-between space-y-3">
            <div>
                <div class="flex justify-between items-center gap-2">
                    <span class="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">${ex.subject} • Khối ${ex.grade}</span>
                    <span class="text-[11px] font-semibold text-slate-500">⏱️ ${ex.duration || 45} phút</span>
                </div>
                <h4 class="font-bold text-sm text-slate-900 mt-2">${ex.title}</h4>
                <p class="text-xs text-slate-500 mt-1">Giáo viên: ${ex.teacher} • ${(ex.questions || []).length} câu hỏi</p>
            </div>
            <button onclick="startOnlineExam('${ex.id}')" class="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-xl text-xs shadow">✍️ Bắt Đầu Làm Bài</button>
        </div>
    `).join("");
}

function startOnlineExam(examId) {
    const exam = availableExams.find(e => e.id === examId);
    if (!exam) return alert("Không tìm thấy dữ liệu đề thi!");

    currentActiveExam = exam;
    isExamSubmitted = false;
    studentAnswers = { nl: {}, ds: {}, tln: {}, tl: {} };

    document.getElementById("examLobbyView").classList.add("hidden");
    document.getElementById("activeExamView").classList.remove("hidden");
    document.getElementById("examResultBanner").classList.add("hidden");

    const btnSubmit = document.getElementById("btnSubmitExam");
    btnSubmit.disabled = false;
    btnSubmit.classList.remove("hidden");

    document.getElementById("activeExamTitle").textContent = `${exam.title} (${exam.subject} – Khối ${exam.grade})`;
    document.getElementById("activeExamMeta").textContent = `Thí sinh: ${currentStudent.full_name} • Lớp: ${currentStudent.class_name}`;

    // Khởi động đồng hồ đếm ngược
    if (examTimerInterval) clearInterval(examTimerInterval);
    remainingSeconds = (parseInt(exam.duration, 10) || 45) * 60;
    updateTimerDisplay();
    examTimerInterval = setInterval(() => {
        remainingSeconds--;
        updateTimerDisplay();
        if (remainingSeconds <= 0) {
            clearInterval(examTimerInterval);
            alert("Đã hết thời gian làm bài! Hệ thống tự động nộp bài của em.");
            submitOnlineExam(true);
        }
    }, 1000);

    renderExamQuestionsUI();
}

function updateTimerDisplay() {
    const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
    const secs = Math.max(0, remainingSeconds) % 60;
    document.getElementById("examTimerDisplay").textContent =
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function exitExamLobby() {
    if (!isExamSubmitted && !confirm("Bài làm chưa nộp sẽ không được lưu điểm. Em chắc chắn muốn thoát?")) return;
    if (examTimerInterval) clearInterval(examTimerInterval);
    currentActiveExam = null;
    document.getElementById("activeExamView").classList.add("hidden");
    document.getElementById("examLobbyView").classList.remove("hidden");
}

function renderExamQuestionsUI() {
    const container = document.getElementById("activeExamQuestionsContainer");
    const qs = currentActiveExam.questions || [];
    const nlQs = qs.filter(q => q.type === "NL");
    const dsQs = qs.filter(q => q.type === "DS");
    const tlnQs = qs.filter(q => q.type === "TLN");
    const tlQs = qs.filter(q => q.type === "TL");

    let html = "";

    // PHẦN I
    if (nlQs.length > 0) {
        html += `<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h4 class="font-bold text-sm sm:text-base text-blue-900 border-b pb-2">
                Phần I. Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời từ câu 1 đến câu ${nlQs.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.
            </h4>`;
        nlQs.forEach((q, idx) => {
            const imgsHtml = (q.images || []).map(src => `<img src="${src}" class="max-h-56 mx-auto my-2 rounded-lg border">`).join("");
            const optsHtml = (q.options || []).map((opt, oi) => {
                const letter = ["A", "B", "C", "D"][oi];
                return `
                <label id="lbl_nl_${q.id}_${oi}" class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-blue-50/60 cursor-pointer transition">
                    <input type="radio" name="nl_${q.id}" value="${oi}" onchange="studentAnswers.nl['${q.id}'] = ${oi}" class="mt-1 w-4 h-4">
                    <span class="text-sm"><strong>${letter}.</strong> ${opt}</span>
                </label>`;
            }).join("");

            html += `
            <div id="qcard_${q.id}" class="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2.5">
                <p class="text-sm font-semibold text-slate-900"><strong>Câu ${idx + 1}.</strong> ${q.content}</p>
                ${imgsHtml}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${optsHtml}</div>
                <div id="sol_${q.id}" class="hidden mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-slate-800"></div>
            </div>`;
        });
        html += `</div>`;
    }

    // PHẦN II
    if (dsQs.length > 0) {
        html += `<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h4 class="font-bold text-sm sm:text-base text-blue-900 border-b pb-2">
                Phần II. Câu trắc nghiệm đúng sai. Thí sinh trả lời từ câu 1 đến câu ${dsQs.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
            </h4>`;
        dsQs.forEach((q, idx) => {
            studentAnswers.ds[q.id] = [null, null, null, null];
            const imgsHtml = (q.images || []).map(src => `<img src="${src}" class="max-h-56 mx-auto my-2 rounded-lg border">`).join("");
            const rowsHtml = (q.options || []).map((st, si) => {
                if (!st) return "";
                const subChar = ["a", "b", "c", "d"][si];
                return `
                <div id="ds_row_${q.id}_${si}" class="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                    <span class="text-sm flex-1"><strong>${subChar})</strong> ${st}</span>
                    <div class="flex items-center gap-3 shrink-0">
                        <label class="flex items-center gap-1 text-xs font-bold text-emerald-700 cursor-pointer">
                            <input type="radio" name="ds_${q.id}_${si}" value="true" onchange="studentAnswers.ds['${q.id}'][${si}] = true" class="w-4 h-4"> Đúng
                        </label>
                        <label class="flex items-center gap-1 text-xs font-bold text-red-600 cursor-pointer">
                            <input type="radio" name="ds_${q.id}_${si}" value="false" onchange="studentAnswers.ds['${q.id}'][${si}] = false" class="w-4 h-4"> Sai
                        </label>
                    </div>
                </div>`;
            }).join("");

            html += `
            <div id="qcard_${q.id}" class="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2.5">
                <p class="text-sm font-semibold text-slate-900"><strong>Câu ${idx + 1}.</strong> ${q.content}</p>
                ${imgsHtml}
                <div class="space-y-2">${rowsHtml}</div>
                <div id="sol_${q.id}" class="hidden mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-slate-800"></div>
            </div>`;
        });
        html += `</div>`;
    }

    // PHẦN III
    if (tlnQs.length > 0) {
        html += `<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h4 class="font-bold text-sm sm:text-base text-blue-900 border-b pb-2">
                Phần III. Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời từ câu 1 đến câu ${tlnQs.length}.
            </h4>`;
        tlnQs.forEach((q, idx) => {
            const imgsHtml = (q.images || []).map(src => `<img src="${src}" class="max-h-56 mx-auto my-2 rounded-lg border">`).join("");
            html += `
            <div id="qcard_${q.id}" class="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2.5">
                <p class="text-sm font-semibold text-slate-900"><strong>Câu ${idx + 1}.</strong> ${q.content}</p>
                ${imgsHtml}
                <div class="flex items-center gap-2 pt-1">
                    <span class="text-xs font-bold text-slate-700">Đáp số của em:</span>
                    <input type="text" id="inp_tln_${q.id}" oninput="studentAnswers.tln['${q.id}'] = this.value" placeholder="Nhập kết quả (VD: 0,5)..." class="border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-blue-800 w-52 bg-white">
                </div>
                <div id="sol_${q.id}" class="hidden mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-slate-800"></div>
            </div>`;
        });
        html += `</div>`;
    }

    // PHẦN IV
    if (tlQs.length > 0) {
        html += `<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h4 class="font-bold text-sm sm:text-base text-blue-900 border-b pb-2">
                Phần IV. Câu hỏi tự luận.
            </h4>`;
        tlQs.forEach((q, idx) => {
            html += `
            <div id="qcard_${q.id}" class="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2.5">
                <p class="text-sm font-semibold text-slate-900"><strong>Câu ${idx + 1}.</strong> ${q.content}</p>
                <textarea rows="3" oninput="studentAnswers.tl['${q.id}'] = this.value" placeholder="Nhập bài làm hoặc hướng giải của em..." class="w-full border border-slate-300 rounded-xl p-3 text-xs bg-white"></textarea>
                <div id="sol_${q.id}" class="hidden mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-slate-800"></div>
            </div>`;
        });
        html += `</div>`;
    }

    container.innerHTML = html;
    renderMathSafe(container);
}

function normalizeNumberAnswer(val) {
    return String(val || "")
        .trim()
        .replace(/\s+/g, "")
        .replace(",", ".")
        .toLowerCase();
}

async function submitOnlineExam(isAutoTimeout) {
    if (isExamSubmitted || !currentActiveExam) return;
    if (!isAutoTimeout && !confirm("Em chắc chắn muốn nộp bài và xem điểm ngay?")) return;

    isExamSubmitted = true;
    if (examTimerInterval) clearInterval(examTimerInterval);

    const btnSubmit = document.getElementById("btnSubmitExam");
    btnSubmit.disabled = true;
    btnSubmit.classList.add("hidden");

    const qs = currentActiveExam.questions || [];
    const nlQs = qs.filter(q => q.type === "NL");
    const dsQs = qs.filter(q => q.type === "DS");
    const tlnQs = qs.filter(q => q.type === "TLN");
    const tlQs = qs.filter(q => q.type === "TL");

    const cfg = currentActiveExam.scoreConfig || {
        p1Total: 3.0,
        p2_1: 0.1,
        p2_2: 0.25,
        p2_3: 0.5,
        p2_4: 1.0,
        p3Total: 3.0
    };

    // 1. Chấm điểm Phần I (chia đều tổng điểm Phần I cho số câu Phần I)
    let scoreP1 = 0;
    let rightCountP1 = 0;
    const eachP1 = nlQs.length > 0 ? (Number(cfg.p1Total) || 0) / nlQs.length : 0;

    nlQs.forEach(q => {
        const picked = studentAnswers.nl[q.id];
        const isRight = picked !== undefined && Number(picked) === Number(q.correct);
        if (isRight) {
            rightCountP1++;
            scoreP1 += eachP1;
        }
        const rightLbl = document.getElementById(`lbl_nl_${q.id}_${q.correct}`);
        if (rightLbl) rightLbl.classList.add("bg-emerald-100", "border-emerald-500", "font-bold");
        if (picked !== undefined && !isRight) {
            const wrongLbl = document.getElementById(`lbl_nl_${q.id}_${picked}`);
            if (wrongLbl) wrongLbl.classList.add("bg-red-100", "border-red-400");
        }
        const solBox = document.getElementById(`sol_${q.id}`);
        if (solBox) {
            solBox.classList.remove("hidden");
            solBox.innerHTML = `<strong>${isRight ? "✅ Chính xác!" : "❌ Chưa đúng."} Đáp án đúng: ${["A", "B", "C", "D"][q.correct]}</strong>${q.solution ? `<br>${q.solution}` : ""}`;
        }
    });

    // 2. Chấm điểm Phần II (theo số ý đúng 1, 2, 3, 4)
    let scoreP2 = 0;
    dsQs.forEach(q => {
        const ansArr = Array.isArray(q.dsBool) && q.dsBool.length === 4 ? q.dsBool : [true, true, false, false];
        const userArr = studentAnswers.ds[q.id] || [null, null, null, null];
        let matchedSub = 0;
        for (let i = 0; i < 4; i++) {
            const rowEl = document.getElementById(`ds_row_${q.id}_${i}`);
            if (userArr[i] !== null && Boolean(userArr[i]) === Boolean(ansArr[i])) {
                matchedSub++;
                if (rowEl) rowEl.classList.add("border-emerald-500", "bg-emerald-50");
            } else if (rowEl) {
                rowEl.classList.add("border-red-300", "bg-red-50/60");
            }
        }
        if (matchedSub === 1) scoreP2 += Number(cfg.p2_1) || 0;
        else if (matchedSub === 2) scoreP2 += Number(cfg.p2_2) || 0;
        else if (matchedSub === 3) scoreP2 += Number(cfg.p2_3) || 0;
        else if (matchedSub === 4) scoreP2 += Number(cfg.p2_4) || 0;

        const solBox = document.getElementById(`sol_${q.id}`);
        if (solBox) {
            const readable = ansArr.map((b, bi) => `${["a", "b", "c", "d"][bi]}-${b ? "đúng" : "sai"}`).join(", ");
            solBox.classList.remove("hidden");
            solBox.innerHTML = `<strong>Đúng ${matchedSub}/4 ý. Đáp án chuẩn: ${readable}</strong>${q.solution ? `<br>${q.solution}` : ""}`;
        }
    });

    // 3. Chấm điểm Phần III (mỗi câu số điểm bằng nhau = tổng điểm Phần III / số câu)
    let scoreP3 = 0;
    let rightCountP3 = 0;
    const eachP3 = tlnQs.length > 0 ? (Number(cfg.p3Total) || 0) / tlnQs.length : 0;

    tlnQs.forEach(q => {
        const uVal = normalizeNumberAnswer(studentAnswers.tln[q.id]);
        const cVal = normalizeNumberAnswer(q.shortAnswer);
        const isRight = uVal !== "" && uVal === cVal;
        if (isRight) {
            rightCountP3++;
            scoreP3 += eachP3;
        }
        const inp = document.getElementById(`inp_tln_${q.id}`);
        if (inp) {
            inp.disabled = true;
            inp.classList.add(isRight ? "border-emerald-600" : "border-red-500");
        }
        const solBox = document.getElementById(`sol_${q.id}`);
        if (solBox) {
            solBox.classList.remove("hidden");
            solBox.innerHTML = `<strong>${isRight ? "✅ Chính xác!" : "❌ Chưa đúng."} Đáp án: ${q.shortAnswer}</strong>${q.solution ? `<br>${q.solution}` : ""}`;
        }
    });

    // Hiển thị lời giải Phần IV (nếu có)
    tlQs.forEach(q => {
        const solBox = document.getElementById(`sol_${q.id}`);
        if (solBox && q.solution) {
            solBox.classList.remove("hidden");
            solBox.innerHTML = `<strong>Hướng dẫn giải:</strong><br>${q.solution}`;
        }
    });

    const totalScore = Number((scoreP1 + scoreP2 + scoreP3).toFixed(2));
    const banner = document.getElementById("examResultBanner");
    banner.classList.remove("hidden");
    document.getElementById("examTotalScoreText").textContent = `${totalScore} điểm`;
    document.getElementById("examBreakdownText").innerHTML = `
        <div>• Phần I (Trắc nghiệm): <strong>${scoreP1.toFixed(2)} điểm</strong> (${rightCountP1}/${nlQs.length} câu)</div>
        <div>• Phần II (Đúng / Sai): <strong>${scoreP2.toFixed(2)} điểm</strong> (${dsQs.length} câu)</div>
        <div>• Phần III (Trả lời ngắn): <strong>${scoreP3.toFixed(2)} điểm</strong> (${rightCountP3}/${tlnQs.length} câu)</div>
    `;

    renderMathSafe(document.getElementById("activeExamQuestionsContainer"));
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Lưu điểm vào nhật ký học tập & đồng bộ lên Google Sheets cho giáo viên theo dõi
    await logStudentActivity(`Thi online: ${currentActiveExam.title}`, totalScore);
}

async function logStudentActivity(activityName, score) {
    if (!currentStudent) return;
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    const entry = {
        student_code: currentStudent.student_code,
        full_name: currentStudent.full_name,
        class_name: currentStudent.class_name,
        activity: activityName,
        score: score,
        timestamp: new Date().toLocaleString("vi-VN")
    };
    logs.unshift(entry);
    localStorage.setItem("dakia_learning_logs", JSON.stringify(logs));

    if (typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG.googleScriptUrl && !SYSTEM_CONFIG.googleScriptUrl.startsWith("DAN_URL")) {
        try {
            await fetch(SYSTEM_CONFIG.googleScriptUrl, {
                method: "POST",
                body: JSON.stringify({ action: "log_activity", log: entry })
            });
        } catch (_) {}
    }
}
