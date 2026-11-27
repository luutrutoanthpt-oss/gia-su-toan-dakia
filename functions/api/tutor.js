async function fetchWithTimeout(url, options, timeoutMs = 6500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const {
            message,
            grade = "10",
            isWeakMode = false,
            imageBase64,
            pdfBase64,
            history = [],
            mode = "student_tutor",
            apiKey: clientApiKey
        } = body;

        const envRaw = String(context.env.GEMINI_API_KEY || "");
        const headerRaw = String(context.request.headers.get("x-gemini-key") || "");
        const bodyRaw = String(clientApiKey || "");
        const combinedRaw = [envRaw, bodyRaw, headerRaw].filter(Boolean).join(",");

        const keyList = Array.from(new Set(
            combinedRaw
                .split(/[\s,;]+/)
                .map(k => k.trim())
                .filter(k => k.length > 10 && !k.startsWith("DAN_API"))
        ));

        if (keyList.length === 0) {
            return new Response(JSON.stringify({
                error: "Chưa tìm thấy biến GEMINI_API_KEY trên Cloudflare Pages. Hãy kiểm tra lại mục Variables and secrets!"
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Xáo trộn ngẫu nhiên danh sách key để chia tải đều
        const shuffledKeys = [...keyList];
        for (let i = shuffledKeys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]];
        }

        let systemInstruction = "";
        if (mode === "student_tutor") {
            systemInstruction = `Gia sư AI Trường THPT Đa Kia, xưng "Thầy (Cô)", gọi học sinh "em". Bám sát SGK Kết nối tri thức Lớp ${grade}.
${isWeakMode ? "Chế độ HỖ TRỢ NỀN TẢNG: giải thích cực kỳ ngắn gọn, dễ hiểu, nhắc công thức cơ bản rồi gợi mở bước đầu tiên." : "Trả lời súc tích, rõ từng bước, không dài dòng."}
Quy tắc:
- Công thức đặt trong $...$.
- Khi vẽ đồ thị $y = f(x)$, KHÔNG viết thẻ <svg>, chỉ xuất đúng 1 dòng: [[PLOT: biểu_thức | xmin=-4 | xmax=4 | ymin=-2 | ymax=6 | points=(x1,y1);(x2,y2)]] (ví dụ: [[PLOT: x^2 + 1 | xmin=-4 | xmax=4 | ymin=-1 | ymax=6 | points=(0,1);(-1,2);(1,2)]]).`;
        } else if (mode === "teacher_5512_intro" || mode === "teacher_5512_period" || mode === "teacher_5512_outro") {
            systemInstruction = "Chuyên gia soạn KHBD chuẩn Công văn 5512, bám sát SGK Kết nối tri thức và mẫu Trường THPT Đa Kia. Trình bày mạch lạc, đúng mục.";
        } else if (mode === "teacher_svg") {
            systemInstruction = "Chỉ trả về DUY NHẤT 1 thẻ <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 500 260\" width=\"500\" height=\"260\">...</svg> minh họa hình học chuẩn SGK. Không giải thích thêm.";
        } else if (mode === "teacher_slides") {
            systemInstruction = "Chỉ trả về DUY NHẤT chuỗi JSON hợp lệ theo yêu cầu.";
        } else if (mode === "pdf_to_word") {
            systemInstruction = "Trích xuất chính xác toàn bộ nội dung và công thức dưới dạng $...$ chuẩn MathType.";
        }

        const contents = [];
        for (const turn of history.slice(-2)) {
            if (turn && turn.text) {
                const compactText = String(turn.text)
                    .replace(/\[\[PLOT:[^\]]+\]\]/gi, "[Đã vẽ đồ thị]")
                    .replace(/<svg[\s\S]*?<\/svg>/gi, "[Đã vẽ hình]")
                    .slice(0, 600);
                contents.push({
                    role: turn.role === "model" ? "model" : "user",
                    parts: [{ text: compactText }]
                });
            }
        }

        const currentParts = [];
        if
