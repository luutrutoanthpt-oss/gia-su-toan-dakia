let currentStudentProfile = JSON.parse(localStorage.getItem("dakia_current_student")) || null;
let cachedStudentList = JSON.parse(localStorage.getItem("dakia_all_students")) || [];
let cachedOnlineExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
let chatConversationHistory = [];
let currentAttachedImage = "";
let activeExamObj = null;
let activeExamTimer = null;
let examTimeLeftSec = 0;
let examAlreadySubmitted = false;
let userExamResponses = { nl: {}, ds: {}, tln: {}, tl: {} };

const KNTT_MATH_TOPICS = {
    "10": [
        { title: "Chương I. Mệnh đề và Tập hợp", desc: "Mệnh đề kéo theo, mệnh đề đảo, kí hiệu ∀, ∃ và các phép toán trên tập hợp." },
        { title: "Chương II. Bất phương trình bậc nhất hai ẩn", desc: "Biểu diễn miền nghiệm trên mặt phẳng tọa độ Oxy và bài toán tối ưu thực tế." },
        { title: "Chương III. Hệ thức lượng trong tam giác", desc: "Định lí côsin, định lí sin, các công thức tính diện tích tam giác và giải tam giác." },
        { title: "Chương IV. Vectơ", desc: "Tổng, hiệu hai vectơ, tích của vectơ với một số, tọa độ vectơ và tích vô hướng." },
        { title: "Chương VI. Hàm số, đồ thị và ứng dụng", desc: "Hàm số bậc hai, đồ thị parabol, dấu của tam thức bậc hai và phương trình quy về bậc hai." }
    ],
    "11": [
        { title: "Chương I. Hàm số lượng giác & Phương trình lượng giác", desc: "Giá trị lượng giác, công thức biến đổi, đồ thị hàm số sin, cos, tan, cot và phương trình lượng giác cơ bản." },
        { title: "Chương II. Dãy số. Cấp số cộng và Cấp số nhân", desc: "Số hạng tổng quát, tính chất và công thức tính tổng n số hạng đầu." },
        { title: "Chương IV. Quan hệ song song trong không gian", desc: "Đường thẳng và mặt phẳng song song, hai mặt phẳng song song, phép chiếu song song." },
        { title: "Chương VI. Hàm số mũ và Hàm số lôgarit", desc: "Lũy thừa, lôgarit, tính chất, đồ thị và phương trình – bất phương trình mũ, lôgarit." },
        { title: "Chương VII. Quan hệ vuông góc trong không gian", desc: "Đường thẳng vuông góc mặt phẳng, hai mặt phẳng vuông góc, góc và khoảng cách." }
    ],
    "12": [
        { title: "Chương I. Ứng dụng đạo hàm để khảo sát hàm số", desc: "Tính đơn điệu, cực trị, giá trị lớn nhất – nhỏ nhất, đường tiệm cận và khảo sát vẽ đồ thị." },
        { title: "Chương II. Vectơ và Hệ trục tọa độ trong không gian", desc: "Tọa độ điểm, tọa độ vectơ trong không gian Oxyz và biểu thức tọa độ các phép toán." },
        { title: "Chương IV. Nguyên hàm và Tích phân", desc: "Bảng nguyên hàm cơ bản, tính chất tích phân và ứng dụng tính diện tích, thể tích." },
        { title: "Chương V. Phương pháp tọa độ trong không gian", desc: "Phương trình mặt phẳng, phương trình đường thẳng và phương trình mặt cầu trong Oxyz." },
        { title: "Chương VI. Xác suất có điều kiện", desc: "Công thức xác suất toàn phần, công thức Bayes và sơ đồ hình cây." }
    ]
};

// Tự động tìm API Key từ mọi tên biến có thể có trong js/config.js hoặc localStorage
function resolveActiveGeminiKey() {
    if (typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG) {
        const candidates = [
            SYSTEM_CONFIG.geminiApiKey,
            SYSTEM_CONFIG.apiKey,
            SYSTEM_CONFIG.GEMINI_API_KEY,
            SYSTEM_CONFIG.geminiKey,
            SYSTEM_CONFIG.key
        ];
        for (const k of candidates) {
            if (k && typeof k === "string" && k.trim().startsWith("AIza")) {
                return k.trim();
            }
        }
    }
    const localKey = localStorage.getItem("dakia_gemini_api_key") || localStorage.getItem("GEMINI_API_KEY") || "";
    if (localKey.trim().startsWith("AIza")) return localKey.trim();
    return "";
}

window.addEventListener("DOMContentLoaded", () => {
    updateStudentHeaderUI();
    renderMathTopics();
    renderOnlineExamsList();
    renderStudentProgressView();

    const promptInput = document.getElementById("tutorPromptInput");
    if (promptInput) {
        promptInput.addEventListener("paste", (e) => {
            const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items || [];
            for (const item of items) {
                if (item.type.indexOf("image") !== -1) {
                    const file = item.getAsFile();
                    if (file) readImageFileToPreview(file);
                }
            }
        });
    }

    const params = new URLSearchParams(window.location.search);
    const directExamId = params.get("exam");
    if (directExamId) {
        switchMainTab("exam");
        setTimeout(() => {
            const found = (JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || []).find(e => e.id === directExamId);
            if (found) openExamRoom(found.id);
        }, 400);
    }

    if (typeof syncFromGoogleSheets === "function") {
        syncFromGoogleSheets().then(() => {
            cachedStudentList = JSON.parse(localStorage.getItem("dakia_all_students")) || cachedStudentList;
            cachedOnlineExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || cachedOnlineExams;
            renderOnlineExamsList();
        }).catch(() => {});
    }
});

function renderKatexInElement(targetEl) {
    if (window.renderMathInElement && targetEl) {
        renderMathInElement(targetEl, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false }
            ],
            throwOnError: false
        });
    }
}

// ==================== CHUYỂN NHÓM & CHÈN KÍ HIỆU TOÁN HỌC ====================
function switchMathToolbar(catId) {
    document.querySelectorAll(".math-cat-bar").forEach(bar => bar.classList.add("hidden"));
    document.querySelectorAll(".math-cat-btn").forEach(btn => {
        btn.className = "math-cat-btn bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-lg text-[11px] transition";
    });
    const targetBar = document.getElementById(`mbar-${catId}`);
    if (targetBar) targetBar.classList.remove("hidden");

    const activeBtn = document.getElementById(`mtab-${catId}`);
    if (activeBtn) {
        activeBtn.className = "math-cat-btn bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] transition";
    }
}

function insertMathSymbol(symbolText) {
    const inp = document.getElementById("tutorPromptInput");
    if (!inp) return;
    const start = inp.selectionStart || inp.value.length;
    const end = inp.selectionEnd || inp.value.length;
    inp.value = inp.value.slice(0, start) + symbolText + inp.value.slice(end);
    inp.focus();
    const bracePos = symbolText.indexOf("{}");
    const newCursor = bracePos !== -1 ? start + bracePos + 1 : start + symbolText.length;
    inp.setSelectionRange(newCursor, newCursor);
}

// ==================== ĐIỀU HƯỚNG 6 TAB CHÍNH ====================
function switchMainTab(tabId) {
    document.querySelectorAll(".main-sec").forEach(sec => sec.classList.add("hidden"));
    document.querySelectorAll(".main-nav-btn").forEach(btn => {
        btn.className = "main-nav-btn text-blue-100 hover:bg-white/10 font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5";
    });

    const target = document.getElementById(`sec-${tabId}`);
    if (target) target.classList.remove("hidden");

    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.className = "main-nav-btn bg-white text-blue-900 font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs";
    }

    if (tabId === "exam") renderOnlineExamsList();
    if (tabId === "progress") renderStudentProgressView();
}

// ==================== ĐĂNG NHẬP MÃ HỌC SINH ====================
function openStudentLoginModal() {
    document.getElementById("modalLoginErr").classList.add("hidden");
    document.getElementById("studentCodeModal").classList.remove("hidden");
}

function closeStudentLoginModal() {
    document.getElementById("studentCodeModal").classList.add("hidden");
}

async function confirmStudentLogin() {
    const code = document.getElementById("modalStuCodeInput").value.trim().toUpperCase();
    const gName = document.getElementById("modalGuestName").value.trim();
    const gClass = document.getElementById("modalGuestClass").value.trim().toUpperCase();
    const errEl = document.getElementById("modalLoginErr");

    cachedStudentList = JSON.parse(localStorage.getItem("dakia_all_students")) || cachedStudentList;

    if (code) {
        let found = cachedStudentList.find(s => String(s.student_code).toUpperCase() === code);
        if (!found && typeof syncFromGoogleSheets === "function") {
            await syncFromGoogleSheets();
            cachedStudentList = JSON.parse(localStorage.getItem("dakia_all_students")) || [];
            found = cachedStudentList.find(s => String(s.student_code).toUpperCase() === code);
        }
        if (found) {
            currentStudentProfile = found;
        } else {
            errEl.textContent = "Không tìm thấy Mã học sinh này trong danh sách lớp! Em kiểm tra lại hoặc nhập Họ tên & Lớp bên dưới.";
            errEl.classList.remove("hidden");
            return;
        }
    } else if (gName && gClass) {
        currentStudentProfile = {
            student_code: "HS_" + Date.now().toString().slice(-4),
            full_name: gName,
            class_name: gClass,
            grade: gClass.slice(0, 2) || "10",
            is_weak_mode: false
        };
    } else {
        errEl.textContent = "Vui lòng nhập Mã HS hoặc nhập Họ tên và Lớp!";
        errEl.classList.remove("hidden");
        return;
    }

    localStorage.setItem("dakia_current_student", JSON.stringify(currentStudentProfile));
    updateStudentHeaderUI();
    closeStudentLoginModal();
    renderStudentProgressView();
}

function updateStudentHeaderUI() {
    const lbl = document.getElementById("headerStudentLabel");
    if (!lbl) return;
    if (currentStudentProfile) {
        lbl.textContent = `${currentStudentProfile.full_name} (${currentStudentProfile.class_name})`;
        const gSel = document.getElementById("tutorGradeSelect");
        if (gSel && ["10", "11", "12"].includes(String(currentStudentProfile.grade))) {
            gSel.value = String(currentStudentProfile.grade);
        }
        const weakChk = document.getElementById("weakModeCheckbox");
        if (weakChk) weakChk.checked = Boolean(currentStudentProfile.is_weak_mode);
    } else {
        lbl.textContent = "Đăng nhập Mã HS";
    }
}

// ==================== GIA SƯ AI SIÊU TỐC & VẼ ĐỒ THỊ SVG TRỰC TIẾP ====================
function onSelectTutorImage(event) {
    const file = event.target.files[0];
    if (file) readImageFileToPreview(file);
}

function readImageFileToPreview(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        currentAttachedImage = e.target.result;
        document.getElementById("attachedImgTag").src = currentAttachedImage;
        document.getElementById("attachedImgPreviewBox").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}

function clearAttachedImg() {
    currentAttachedImage = "";
    const inp = document.getElementById("tutorImgFileInput");
    if (inp) inp.value = "";
    document.getElementById("attachedImgPreviewBox").classList.add("hidden");
}

function resetTutorChat() {
    chatConversationHistory = [];
    document.getElementById("tutorMessagesContainer").innerHTML = `
        <div class="bg-slate-50 border-l-4 border-blue-600 rounded-r-2xl p-4 text-sm text-slate-800 space-y-1.5 max-w-3xl">
            <p class="font-bold text-blue-800">Xin chào em! Thầy (Cô) là Gia sư AI của Trường THPT Đa Kia.</p>
            <p class="leading-relaxed">Em hãy chọn môn học phía trên, nhập đề bài hoặc bấm nút <strong>📷 Chụp/Tải ảnh</strong>. Thầy (Cô) sẽ hướng dẫn em giải từng bước một nhé!</p>
        </div>
    `;
}

function renderAiMessageWithSvg(containerEl, rawText) {
    const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
    const svgs = rawText.match(svgRegex) || [];
    const textWithoutSvg = rawText
        .replace(/```(?:xml|svg|html)?\s*<svg[\s\S]*?<\/svg>\s*```/gi, "")
        .replace(svgRegex, "")
        .trim();

    containerEl.innerHTML = "";

    if (textWithoutSvg) {
        const textDiv = document.createElement("div");
        textDiv.className = "whitespace-pre-wrap leading-relaxed";
        textDiv.textContent = textWithoutSvg;
        containerEl.appendChild(textDiv);
        renderKatexInElement(textDiv);
    }

    svgs.forEach(svgCode => {
        const svgWrap = document.createElement("div");
        svgWrap.className = "my-3 p-3 bg-white border border-blue-200 rounded-xl flex justify-center overflow-x-auto shadow-xs";
        svgWrap.innerHTML = svgCode;
        containerEl.appendChild(svgWrap);
    });
}

async function handleSendTutor() {
    const inputEl = document.getElementById("tutorPromptInput");
    const msg = inputEl.value.trim();
    if (!msg && !currentAttachedImage) return;

    const subject = document.getElementById("tutorSubjectSelect").value;
    const grade = document.getElementById("tutorGradeSelect").value;
    const isWeak = document.getElementById("weakModeCheckbox").checked;
    const box = document.getElementById("tutorMessagesContainer");
    const btn = document.getElementById("btnSendPrompt");

    const userRow = document.createElement("div");
    userRow.className = "flex justify-end";
    const userBubble = document.createElement("div");
    userBubble.className = "max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 text-sm shadow-xs space-y-2";
    if (currentAttachedImage) {
        const img = document.createElement("img");
        img.src = currentAttachedImage;
        img.className = "max-h-44 rounded-lg border border-blue-300";
        userBubble.appendChild(img);
    }
    const pUser = document.createElement("p");
    pUser.className = "whitespace-pre-wrap";
    pUser.textContent = msg || "Em nhờ Thầy (Cô) hướng dẫn bài tập trong ảnh này.";
    userBubble.appendChild(pUser);
    userRow.appendChild(userBubble);
    box.appendChild(userRow);
    renderKatexInElement(pUser);

    const aiRow = document.createElement("div");
    aiRow.className = "flex justify-start";
    const aiBubble = document.createElement("div");
    aiBubble.className = "max-w-[88%] bg-slate-50 border-l-4 border-blue-600 text-slate-800 rounded-r-2xl px-4 py-3.5 text-sm shadow-xs";
    aiBubble.innerHTML = `<div class="dot-pulse"><span></span><span></span><span></span></div>`;
    aiRow.appendChild(aiBubble);
    box.appendChild(aiRow);
    box.scrollTop = box.scrollHeight;

    const imgPayload = currentAttachedImage;
    inputEl.value = "";
    clearAttachedImg();
    btn.disabled = true;

    const activeKey = resolveActiveGeminiKey();

    try {
        const res = await fetch("/api/tutor", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(activeKey ? { "x-gemini-key": activeKey } : {})
            },
            body: JSON.stringify({
                message: `[Môn ${subject} - Lớp ${grade}] ${msg || "Hướng dẫn giải chi tiết bài tập trong ảnh."}`,
                grade,
                isWeakMode: isWeak,
                imageBase64: imgPayload || undefined,
                history: chatConversationHistory.slice(-6),
                mode: "student_tutor",
                apiKey: activeKey
            })
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({ error: "Không kết nối được máy chủ AI" }));
            throw new Error(errJson.error || "Không kết nối được máy chủ AI");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let sseBuffer = "";
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop();
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const dataStr = line.slice(6).trim();
                    if (!dataStr || dataStr === "[DONE]") continue;
                    try {
                        const parsed = JSON.parse(dataStr);
                        const delta = (parsed.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
                        if (delta) {
                            fullText += delta;
                            const previewClean = fullText.replace(/<svg[\s\S]*$/i, "\n⏳ Đang dựng hình đồ thị trực quan...");
                            aiBubble.textContent = previewClean;
                            box.scrollTop = box.scrollHeight;
                        }
                    } catch (_) {}
                }
            }
        }

        renderAiMessageWithSvg(aiBubble, fullText);
        box.scrollTop = box.scrollHeight;

        chatConversationHistory.push({ role: "user", text: msg });
        chatConversationHistory.push({ role: "model", text: fullText });
        recordStudentProgress(`Học với Gia sư AI (${subject} ${grade})`, null);
    } catch (err) {
        aiBubble.textContent = "❌ " + err.message;
    } finally {
        btn.disabled = false;
    }
}

// ==================== CHỦ ĐỀ TOÁN HỌC ====================
function renderMathTopics() {
    const grade = document.getElementById("topicGradeFilter")?.value || "10";
    const grid = document.getElementById("mathTopicsGrid");
    if (!grid) return;

    const list = KNTT_MATH_TOPICS[grade] || [];
    grid.innerHTML = list.map(item => `
        <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 hover:border-blue-400 transition flex flex-col justify-between space-y-3">
            <div>
                <span class="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">Toán ${grade} • KNTT</span>
                <h3 class="font-bold text-sm text-slate-900 mt-2">${item.title}</h3>
                <p class="text-xs text-slate-600 mt-1 leading-relaxed">${item.desc}</p>
            </div>
            <button onclick="askTopicWithTutor('${item.title}', '${grade}')" class="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-xl text-xs">📖 Ôn tập & Luyện bài với Gia sư AI</button>
        </div>
    `).join("");
}

function askTopicWithTutor(topicTitle, grade) {
    switchMainTab("tutor");
    document.getElementById("tutorSubjectSelect").value = "Toán học";
    document.getElementById("tutorGradeSelect").value = grade;
    document.getElementById("tutorPromptInput").value = `Thầy (Cô) tóm tắt giúp em công thức trọng tâm của "${topicTitle}" (Toán ${grade}) và cho em 1 bài tập ví dụ dễ để luyện tập nhé!`;
    handleSendTutor();
}

// ==================== PHÒNG THI TRỰC TUYẾN & CHẤM ĐIỂM TỰ ĐỘNG ====================
async function reloadOnlineExams() {
    if (typeof syncFromGoogleSheets === "function") {
        await syncFromGoogleSheets();
    }
    cachedOnlineExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || [];
    renderOnlineExamsList();
}

function renderOnlineExamsList() {
    const grid = document.getElementById("onlineExamsGrid");
    if (!grid) return;
    cachedOnlineExams = JSON.parse(localStorage.getItem("dakia_uploaded_exams")) || cachedOnlineExams;

    if (cachedOnlineExams.length === 0) {
        grid.innerHTML = `<p class="text-xs text-slate-400 col-span-3 py-8 text-center">Hiện chưa có đề thi trực tuyến nào được giáo viên mở.</p>`;
        return;
    }

    grid.innerHTML = cachedOnlineExams.map(ex => `
        <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 hover:border-blue-400 transition flex flex-col justify-between space-y-3">
            <div>
                <div class="flex justify-between items-center gap-2">
                    <span class="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">${ex.subject} • Lớp ${ex.grade}</span>
                    <span class="text-[11px] font-semibold text-slate-500">⏱️ ${ex.duration || 45} phút</span>
                </div>
                <h4 class="font-bold text-sm text-slate-900 mt-2">${ex.title}</h4>
                <p class="text-xs text-slate-500 mt-1">GV ra đề: ${ex.teacher} • ${(ex.questions || []).length} câu</p>
            </div>
            <button onclick="openExamRoom('${ex.id}')" class="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-xl text-xs shadow">✍️ Vào Làm Bài Thi</button>
        </div>
    `).join("");
}

function openExamRoom(examId) {
    const exam = cachedOnlineExams.find(e => e.id === examId);
    if (!exam) return alert("Không tìm thấy đề thi này!");

    activeExamObj = exam;
    examAlreadySubmitted = false;
    userExamResponses = { nl: {}, ds: {}, tln: {}, tl: {} };

    document.getElementById("examListContainer").classList.add("hidden");
    document.getElementById("examTakingContainer").classList.remove("hidden");
    document.getElementById("examScoreSummaryCard").classList.add("hidden");

    const btnSub = document.getElementById("btnSubmitExamNow");
    btnSub.disabled = false;
    btnSub.classList.remove("hidden");

    const stuLabel = currentStudentProfile ? `${currentStudentProfile.full_name} – Lớp ${currentStudentProfile.class_name}` : "Học sinh tự luyện";
    document.getElementById("takingExamTitle").textContent = `${exam.title} (${exam.subject} – Lớp ${exam.grade})`;
    document.getElementById("takingExamSub").textContent = `Thí sinh: ${stuLabel}`;

    if (activeExamTimer) clearInterval(activeExamTimer);
    examTimeLeftSec = (parseInt(exam.duration, 10) || 45) * 60;
    updateExamCountdownText();
    activeExamTimer = setInterval(() => {
        examTimeLeftSec--;
        updateExamCountdownText();
        if (examTimeLeftSec <= 0) {
            clearInterval(activeExamTimer);
            alert("Đã hết giờ làm bài! Hệ thống tự động nộp bài và chấm điểm.");
            gradeAndSubmitExam(true);
        }
    }, 1000);

    buildExamQuestionsDOM();
}

function updateExamCountdownText() {
    const m = Math.floor(Math.max(0, examTimeLeftSec) / 60);
    const s = Math.max(0, examTimeLeftSec) % 60;
    document.getElementById("takingTimerText").textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function backToExamList() {
    if (!examAlreadySubmitted && !confirm("Em chưa nộp bài, thoát ra sẽ không lưu điểm. Tiếp tục thoát?")) return;
    if (activeExamTimer) clearInterval(activeExamTimer);
    activeExamObj = null;
    document.getElementById("examTakingContainer").classList.add("hidden");
    document.getElementById("examListContainer").classList.remove("hidden");
}

function buildExamQuestionsDOM() {
    const area = document.getElementById("examQuestionsRenderArea");
    const qs = activeExamObj.questions || [];
    const nlQs = qs.filter(q => q.type === "NL");
    const dsQs = qs.filter(q => q.type === "DS");
    const tlnQs = qs.filter(q => q.type === "TLN");
    const tlQs = qs.filter(q => q.type === "TL");

    let html = "";

    if (nlQs.length > 0) {
        html += `<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h4 class="font-bold text-sm sm:text-base text-blue-900 border-b pb-2">
                Phần I. Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời từ câu 1 đến câu ${nlQs.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.
            </h4>`;
        nlQs.forEach((q, idx) => {
            const imgs = (q.images || []).map(src => `<img src="${src}" class="max-h-56 mx-auto my-2 rounded-lg border">`).join("");
            const opts = (q.options || []).map((opt, oi) => {
                const char = ["A", "B", "C", "D"][oi];
                return `<label id="opt_lbl_${q.id}_${oi}" class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-blue-50/60 cursor-pointer">
                    <input type="radio" name="ans_nl_${q.id}" value="${oi}" onchange="userExamResponses.nl['${q.id}'] = ${oi}" class="mt-1 w-4 h-4">
                    <span class="text-sm"><strong>${char}.</strong> ${opt}</span>
                </label>`;
            }).join("");
            html += `<div class="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2.5">
                <p class="text-sm font-semibold text-slate-900"><strong>Câu ${idx + 1}.</strong> ${q.content}</p>
                ${imgs}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${opts}</div>
                <div id="exp_box_${q.id}" class="hidden mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-slate-800"></div>
            </div>`;
        });
        html += `</div>`;
    }

    if (dsQs.length > 0) {
        html += `<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h4 class="font-bold text-sm sm:text-base text-blue-900 border-b pb-2">
                Phần II. Câu trắc nghiệm đúng sai. Thí sinh trả lời từ câu 1 đến câu ${dsQs.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
            </h4>`;
        dsQs.forEach((q, idx) => {
            userExamResponses.ds[q.id] = [null, null, null, null];
            const imgs = (q.images || []).map(src => `<img src="${src}" class="max-h-56 mx-auto my-2 rounded-lg border">`).join("");
            const rows = (q.options || []).map((st, si) => {
                if (!st) return "";
                const sub = ["a", "b", "c", "d"][si];
                return `<div id="ds_item_${q.id}_${si}" class="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                    <span class="text-sm flex-1"><strong>${sub})</strong> ${st}</span>
                    <div class="flex items-center gap-3 shrink-0">
                        <label class="flex items-center gap-1 text-xs font-bold text-emerald-700 cursor-pointer">
                            <input type="radio" name="ans_ds_${q.id}_${si}" onchange="userExamResponses.ds['${q.id}'][${si}] = true" class="w-4 h-4"> Đúng
                        </label>
                        <label class="flex items-center gap-1 text-xs font-bold text-red-600 cursor-pointer">
                            <input type="radio" name="ans_ds_${q.id}_${si}" onchange="userExamResponses.ds['${q.id}'][${si}] = false" class="w-4 h-4"> Sai
                        </label>
                    </div>
                </div>`;
            }).join("");
            html += `<div class="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2.5">
                <p class="text-sm font-semibold text-slate-900"><strong>Câu ${idx + 1}.</strong> ${q.content}</p>
                ${imgs}
                <div class="space-y-2">${rows}</div>
                <div id="exp_box_${q.id}" class="hidden mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-slate-800"></div>
            </div>`;
        });
        html += `</div>`;
    }

    if (tlnQs.length > 0) {
        html += `<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h4 class="font-bold text-sm sm:text-base text-blue-900 border-b pb-2">
                Phần III. Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời từ câu 1 đến câu ${tlnQs.length}.
            </h4>`;
        tlnQs.forEach((q, idx) => {
            const imgs = (q.images || []).map(src => `<img src="${src}" class="max-h-56 mx-auto my-2 rounded-lg border">`).join("");
            html += `<div class="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2.5">
                <p class="text-sm font-semibold text-slate-900"><strong>Câu ${idx + 1}.</strong> ${q.content}</p>
                ${imgs}
                <div class="flex items-center gap-2 pt-1">
                    <span class="text-xs font-bold text-slate-700">Đáp án của em:</span>
                    <input type="text" id="tln_field_${q.id}" oninput="userExamResponses.tln['${q.id}'] = this.value" placeholder="Nhập đáp số (VD: 0,5)..." class="border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-blue-800 w-52 bg-white">
                </div>
                <div id="exp_box_${q.id}" class="hidden mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-slate-800"></div>
            </div>`;
        });
        html += `</div>`;
    }

    if (tlQs.length > 0) {
        html += `<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h4 class="font-bold text-sm sm:text-base text-blue-900 border-b pb-2">Phần IV. Câu hỏi tự luận.</h4>`;
        tlQs.forEach((q, idx) => {
            html += `<div class="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2.5">
                <p class="text-sm font-semibold text-slate-900"><strong>Câu ${idx + 1}.</strong> ${q.content}</p>
                <textarea rows="3" oninput="userExamResponses.tl['${q.id}'] = this.value" placeholder="Trình bày hướng giải của em..." class="w-full border border-slate-300 rounded-xl p-3 text-xs bg-white"></textarea>
                <div id="exp_box_${q.id}" class="hidden mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-slate-800"></div>
            </div>`;
        });
        html += `</div>`;
    }

    area.innerHTML = html;
    renderKatexInElement(area);
}

async function gradeAndSubmitExam(isTimeout) {
    if (examAlreadySubmitted || !activeExamObj) return;
    if (!isTimeout && !confirm("Em xác nhận nộp bài và xem điểm ngay bây giờ?")) return;

    examAlreadySubmitted = true;
    if (activeExamTimer) clearInterval(activeExamTimer);

    const btnSub = document.getElementById("btnSubmitExamNow");
    btnSub.disabled = true;
    btnSub.classList.add("hidden");

    const qs = activeExamObj.questions || [];
    const nlQs = qs.filter(q => q.type === "NL");
    const dsQs = qs.filter(q => q.type === "DS");
    const tlnQs = qs.filter(q => q.type === "TLN");
    const tlQs = qs.filter(q => q.type === "TL");

    const cfg = activeExamObj.scoreConfig || { p1Total: 3.0, p2_1: 0.1, p2_2: 0.25, p2_3: 0.5, p2_4: 1.0, p3Total: 3.0 };

    let ptsP1 = 0;
    let rightP1 = 0;
    const unitP1 = nlQs.length > 0 ? (Number(cfg.p1Total) || 0) / nlQs.length : 0;

    nlQs.forEach(q => {
        const picked = userExamResponses.nl[q.id];
        const ok = picked !== undefined && Number(picked) === Number(q.correct);
        if (ok) {
            rightP1++;
            ptsP1 += unitP1;
        }
        const rightLbl = document.getElementById(`opt_lbl_${q.id}_${q.correct}`);
        if (rightLbl) rightLbl.classList.add("bg-emerald-100", "border-emerald-500", "font-bold");
        if (picked !== undefined && !ok) {
            const wrongLbl = document.getElementById(`opt_lbl_${q.id}_${picked}`);
            if (wrongLbl) wrongLbl.classList.add("bg-red-100", "border-red-400");
        }
        const expBox = document.getElementById(`exp_box_${q.id}`);
        if (expBox) {
            expBox.classList.remove("hidden");
            expBox.innerHTML = `<strong>${ok ? "✅ Đúng!" : "❌ Sai."} Đáp án đúng: ${["A", "B", "C", "D"][q.correct]}</strong>${q.solution ? `<br>${q.solution}` : ""}`;
        }
    });

    let ptsP2 = 0;
    dsQs.forEach(q => {
        const keyArr = Array.isArray(q.dsBool) && q.dsBool.length === 4 ? q.dsBool : [true, true, false, false];
        const uArr = userExamResponses.ds[q.id] || [null, null, null, null];
        let matched = 0;
        for (let i = 0; i < 4; i++) {
            const row = document.getElementById(`ds_item_${q.id}_${i}`);
            if (uArr[i] !== null && Boolean(uArr[i]) === Boolean(keyArr[i])) {
                matched++;
                if (row) row.classList.add("border-emerald-500", "bg-emerald-50");
            } else if (row) {
                row.classList.add("border-red-300", "bg-red-50/60");
            }
        }
        if (matched === 1) ptsP2 += Number(cfg.p2_1) || 0;
        else if (matched === 2) ptsP2 += Number(cfg.p2_2) || 0;
        else if (matched === 3) ptsP2 += Number(cfg.p2_3) || 0;
        else if (matched === 4) ptsP2 += Number(cfg.p2_4) || 0;

        const expBox = document.getElementById(`exp_box_${q.id}`);
        if (expBox) {
            const readable = keyArr.map((b, bi) => `${["a", "b", "c", "d"][bi]}-${b ? "đúng" : "sai"}`).join(", ");
            expBox.classList.remove("hidden");
            expBox.innerHTML = `<strong>Đúng ${matched}/4 ý. Đáp án chuẩn: ${readable}</strong>${q.solution ? `<br>${q.solution}` : ""}`;
        }
    });

    let ptsP3 = 0;
    let rightP3 = 0;
    const unitP3 = tlnQs.length > 0 ? (Number(cfg.p3Total) || 0) / tlnQs.length : 0;

    tlnQs.forEach(q => {
        const uClean = String(userExamResponses.tln[q.id] || "").trim().replace(/\s+/g, "").replace(",", ".").toLowerCase();
        const kClean = String(q.shortAnswer || "").trim().replace(/\s+/g, "").replace(",", ".").toLowerCase();
        const ok = uClean !== "" && uClean === kClean;
        if (ok) {
            rightP3++;
            ptsP3 += unitP3;
        }
        const fld = document.getElementById(`tln_field_${q.id}`);
        if (fld) fld.disabled = true;

        const expBox = document.getElementById(`exp_box_${q.id}`);
        if (expBox) {
            expBox.classList.remove("hidden");
            expBox.innerHTML = `<strong>${ok ? "✅ Đúng!" : "❌ Sai."} Đáp án: ${q.shortAnswer}</strong>${q.solution ? `<br>${q.solution}` : ""}`;
        }
    });

    tlQs.forEach(q => {
        const expBox = document.getElementById(`exp_box_${q.id}`);
        if (expBox && q.solution) {
            expBox.classList.remove("hidden");
            expBox.innerHTML = `<strong>Hướng dẫn giải:</strong><br>${q.solution}`;
        }
    });

    const finalScore = Number((ptsP1 + ptsP2 + ptsP3).toFixed(2));
    document.getElementById("examScoreSummaryCard").classList.remove("hidden");
    document.getElementById("finalExamScoreBig").textContent = `${finalScore} điểm`;
    document.getElementById("finalExamDetailParts").innerHTML = `
        <div>• Phần I (Trắc nghiệm): <strong>${ptsP1.toFixed(2)} điểm</strong> (${rightP1}/${nlQs.length} câu)</div>
        <div>• Phần II (Đúng / Sai): <strong>${ptsP2.toFixed(2)} điểm</strong> (${dsQs.length} câu)</div>
        <div>• Phần III (Trả lời ngắn): <strong>${ptsP3.toFixed(2)} điểm</strong> (${rightP3}/${tlnQs.length} câu)</div>
    `;

    renderKatexInElement(document.getElementById("examQuestionsRenderArea"));
    window.scrollTo({ top: 0, behavior: "smooth" });
    await recordStudentProgress(`Thi online: ${activeExamObj.title}`, finalScore);
}

// ==================== NHẬT KÝ TIẾN ĐỘ HỌC TẬP ====================
async function recordStudentProgress(activityTitle, scoreVal) {
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    const stuCode = currentStudentProfile?.student_code || "KHACH";
    const stuName = currentStudentProfile?.full_name || "Học sinh tự học";
    const stuClass = currentStudentProfile?.class_name || "Tự do";

    const row = {
        student_code: stuCode,
        full_name: stuName,
        class_name: stuClass,
        activity: activityTitle,
        score: scoreVal,
        timestamp: new Date().toLocaleString("vi-VN")
    };
    logs.unshift(row);
    localStorage.setItem("dakia_learning_logs", JSON.stringify(logs));

    if (typeof SYSTEM_CONFIG !== "undefined" && SYSTEM_CONFIG.googleScriptUrl && !SYSTEM_CONFIG.googleScriptUrl.startsWith("DAN_URL")) {
        try {
            await fetch(SYSTEM_CONFIG.googleScriptUrl, {
                method: "POST",
                body: JSON.stringify({ action: "log_activity", log: row })
            });
        } catch (_) {}
    }
}

function renderStudentProgressView() {
    const logs = JSON.parse(localStorage.getItem("dakia_learning_logs")) || [];
    const myCode = currentStudentProfile?.student_code || "KHACH";
    const myLogs = logs.filter(l => l.student_code === myCode);

    const countEl = document.getElementById("progCount");
    const avgEl = document.getElementById("progAvg");
    const statusEl = document.getElementById("progStatus");
    const tbody = document.getElementById("progressLogsTbody");

    if (countEl) countEl.textContent = myLogs.length;
    const scored = myLogs.filter(l => l.score !== null && l.score !== undefined);
    if (avgEl) {
        avgEl.textContent = scored.length > 0
            ? (scored.reduce((acc, item) => acc + Number(item.score), 0) / scored.length).toFixed(2)
            : "--";
    }
    if (statusEl) {
        statusEl.textContent = currentStudentProfile
            ? `Đã xác thực: ${currentStudentProfile.full_name} (${currentStudentProfile.class_name})`
            : "Khách tự học (Bấm 'Đăng nhập Mã HS' ở góc trên)";
    }

    if (tbody) {
        if (myLogs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-slate-400">Chưa có dữ liệu học tập nào được ghi nhận.</td></tr>`;
        } else {
            tbody.innerHTML = myLogs.slice(0, 30).map(item => `
                <tr>
                    <td class="py-2.5 px-4 text-slate-500">${item.timestamp}</td>
                    <td class="py-2.5 px-4 font-semibold text-slate-800">${item.activity}</td>
                    <td class="py-2.5 px-4 font-bold text-emerald-700">${item.score !== null && item.score !== undefined ? item.score + " điểm" : "Hoàn thành"}</td>
                </tr>
            `).join("");
        }
    }
}
