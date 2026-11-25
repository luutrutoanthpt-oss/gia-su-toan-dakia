let cachedFlashModels = null;

async function getAvailableFlashModels(apiKey) {
    if (cachedFlashModels && cachedFlashModels.length > 0) return cachedFlashModels;
    const fallbackModels = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.8-flash-lite", "gemini-3.8-flash"];
    try {
        const isUnifiedKey = apiKey.startsWith("AQ.");
        const url = isUnifiedKey
            ? "https://generativelanguage.googleapis.com/v1beta/models"
            : `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const headers = isUnifiedKey ? { "x-goog-api-key": apiKey } : {};
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(3500) });
        if (!res.ok) return fallbackModels;
        const data = await res.json();
        const valid = (data.models || [])
            .filter(m =>
                Array.isArray(m.supportedGenerationMethods) &&
                m.supportedGenerationMethods.includes("generateContent") &&
                m.name.includes("gemini-") &&
                m.name.includes("flash") &&
                !m.name.includes("2.0") && !m.name.includes("1.5") &&
                !m.name.includes("tts") && !m.name.includes("audio") && !m.name.includes("image")
            )
            .map(m => m.name.replace("models/", ""))
            .sort((a, b) => (b.includes("lite") ? 10 : 0) - (a.includes("lite") ? 10 : 0));
        if (valid.length > 0) {
            cachedFlashModels = valid;
            return valid;
        }
    } catch (_) {}
    return fallbackModels;
}

function buildSubjectPrompt(subject, grade, isWeakMode, mode) {
    if (mode === "teacher_5512") {
        return `Bạn là Chuyên gia Sư phạm THPT (Chương trình GDPT 2018 - bộ sách Kết nối tri thức với cuộc sống). Hãy soạn Kế hoạch bài dạy (KHBD) chuẩn Công văn 5512/BGDĐT-GDTrH có tích hợp Năng lực số (Thông tư 02/2025/TT-BGDĐT) và ứng dụng AI/học liệu số rõ ràng, mạch lạc, đúng thể thức hành chính để giáo viên xuất ra file Word.`;
    }
    if (mode === "teacher_slides") {
        return `Bạn là Chuyên gia thiết kế bài giảng điện tử THPT. Hãy chuyển nội dung bài học thành kịch bản Slide PowerPoint 16:9 theo tiến trình 4 hoạt động Công văn 5512 (Khởi động - Hình thành kiến thức - Luyện tập - Vận dụng). Trả về JSON thuần theo cấu trúc: {"title":"...","slides":[{"heading":"...","bullets":["..."],"note":"..."}]}. Không bọc markdown thừa nếu không cần thiết.`;
    }

    const subjectGuides = {
        toan: `Gia Sư Toán AI – THPT Đa Kia. Hướng dẫn HS lớp ${grade} giải từng bước nhỏ, ngắn gọn, gợi mở, không đưa ngay đáp án cuối. Công thức đặt trong $...$. Nếu bài có đồ thị parabol, đường thẳng, miền nghiệm hoặc tam giác, chèn 1 khối \`\`\`mathplot ở cuối dòng đầu tiên.`,
        vatli: `Gia Sư Vật lí AI – THPT Đa Kia. Hướng dẫn HS lớp ${grade} tóm tắt dữ kiện, đổi đơn vị chuẩn SI, chọn công thức Vật lí (đặt trong $...$) và dẫn dắt từng bước tính, không giải thay hoàn toàn.`,
        hoahoc: `Gia Sư Hóa học AI – THPT Đa Kia. Hướng dẫn HS lớp ${grade} lập phương trình hóa học (dùng LaTeX/KaTeX trong $...$), tính số mol và phân tích từng bước phản ứng, gợi mở để HS tự tính kết quả.`,
        sinhhoc: `Gia Sư Sinh học AI – THPT Đa Kia. Hướng dẫn HS lớp ${grade} phân tích cơ chế di truyền, sinh thái hoặc giải bài tập quy luật di truyền từng bước dễ hiểu.`,
        tinhoc: `Gia Sư Tin học AI – THPT Đa Kia. Hướng dẫn HS lớp ${grade} phân tích thuật toán, giải thích từng dòng lệnh Python/C++ hoặc cơ sở dữ liệu, gợi ý sửa lỗi thay vì viết hộ toàn bộ code.`,
        nguvan: `Gia Sư Ngữ văn AI – THPT Đa Kia. Hướng dẫn HS lớp ${grade} lập dàn ý (Mở bài - Thân bài - Kết bài), phân tích dẫn chứng nghệ thuật, góp ý đoạn văn của HS thay vì viết hộ bài văn mẫu.`,
        tienganh: `Gia Sư Tiếng Anh AI – THPT Đa Kia. Giải thích ngữ pháp, từ vựng theo ngữ cảnh lớp ${grade}, sửa lỗi câu của HS bằng tiếng Việt dễ hiểu kèm ví dụ minh họa.`,
        lichsu: `Gia Sư Lịch sử AI – THPT Đa Kia. Gợi mở sự kiện theo trục thời gian, phân tích nguyên nhân - diễn biến - ý nghĩa lịch sử lớp ${grade} bằng sơ đồ ý rõ ràng.`,
        diali: `Gia Sư Địa lí AI – THPT Đa Kia. Hướng dẫn HS lớp ${grade} cách đọc Atlat, phân tích bảng số liệu, nhận xét biểu đồ và giải thích hiện tượng tự nhiên/kinh tế.`,
        gdktpl: `Gia Sư GDKT & Pháp luật AI – THPT Đa Kia. Phân tích tình huống kinh tế và pháp luật thực tiễn lớp ${grade}, gợi mở để HS tự rút ra hành vi đúng pháp luật.`
    };

    const base = subjectGuides[subject] || subjectGuides.toan;
    return `${base} ${isWeakMode ? "Chế độ hỗ trợ HS mất gốc/yếu: chia siêu nhỏ từng bước và cho 1 ví dụ cực dễ trước." : ""}`;
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const rawKeys = (env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
    if (rawKeys.length === 0) {
        return new Response(JSON.stringify({ error: "Chưa cấu hình GEMINI_API_KEY trên Cloudflare" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { message, imageBase64, grade = "10", subject = "toan", isWeakMode = false, mode = "tutor", history = [] } = body;
        const systemInstruction = buildSubjectPrompt(subject, grade, isWeakMode, mode);

        const contents = (Array.isArray(history) ? history : []).slice(-4).map(t => ({
            role: t.role === "model" ? "model" : "user",
            parts: [{ text: t.text }]
        }));

        const currentParts = [{ text: message || "Thầy hướng dẫn giúp em nội dung này từng bước ạ!" }];
        if (imageBase64 && imageBase64.startsWith("data:image")) {
            const [meta, base64Data] = imageBase64.split(",");
            const mimeType = (meta.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/) || [])[1] || "image/jpeg";
            currentParts.push({ inlineData: { mimeType, data: base64Data } });
        }
        contents.push({ role: "user", parts: currentParts });

        const pickedKeys = [...rawKeys].sort(() => Math.random() - 0.5).slice(0, 2);
        const models = await getAvailableFlashModels(pickedKeys[0]);
        const logs = [];

        for (const apiKey of pickedKeys) {
            const isUnifiedKey = apiKey.startsWith("AQ.");
            const headers = { "Content-Type": "application/json" };
            if (isUnifiedKey) headers["x-goog-api-key"] = apiKey;

            for (const model of models) {
                const generationConfig = {
                    temperature: mode === "teacher_slides" ? 0.2 : 0.35,
                    maxOutputTokens: mode === "tutor" ? 2000 : 4096
                };
                if (model.includes("2.5")) {
                    generationConfig.thinkingConfig = { thinkingBudget: 0 };
                }

                const url = isUnifiedKey
                    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`
                    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 8000);

                try {
                    const res = await fetch(url, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            systemInstruction: { parts: [{ text: systemInstruction }] },
                            contents,
                            generationConfig
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timer);

                    if (res.ok && res.body) {
                        return new Response(res.body, {
                            status: 200,
                            headers: {
                                "Content-Type": "text/event-stream; charset=utf-8",
                                "Cache-Control": "no-cache"
                            }
                        });
                    }

                    const errData = await res.json().catch(() => ({}));
                    logs.push(`${model}(${res.status}): ${errData.error?.message || "Lỗi"}`);
                    if (res.status === 429 || res.status === 400 || res.status === 403) break;
                } catch (_) {
                    clearTimeout(timer);
                    logs.push(`${model}(timeout)`);
                }
            }
        }

        return new Response(JSON.stringify({
            error: `Máy chủ Google đang bận. Chi tiết: ${logs.slice(0, 3).join(" | ")}`
        }), { status: 502, headers: { "Content-Type": "application/json" } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
