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

        // Chọn ngẫu nhiên 1 key chính và 1 key dự phòng khác nhau để không tốn thời gian thử nhiều vòng
        const primaryIdx = Math.floor(Math.random() * keyList.length);
        const primaryKey = keyList[primaryIdx];
        const backupKey = keyList.length > 1 ? keyList[(primaryIdx + 1) % keyList.length] : primaryKey;

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
                    .slice(0, 500);
                contents.push({
                    role: turn.role === "model" ? "model" : "user",
                    parts: [{ text: compactText }]
                });
            }
        }

        const currentParts = [];
        if (imageBase64) {
            const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
            if (match) {
                currentParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
            }
        }
        if (pdfBase64) {
            currentParts.push({ inlineData: { mimeType: "application/pdf", data: pdfBase64 } });
        }
        currentParts.push({ text: String(message || "Hướng dẫn giúp em bài này.") });
        contents.push({ role: "user", parts: currentParts });

        const isTutorFast = mode === "student_tutor";
        const payloadObj = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: {
                temperature: 0.3,
                ...(isTutorFast ? { maxOutputTokens: 1000 } : {})
            }
        };

        // Lần 1: Gọi trực tiếp mô hình siêu nhanh gemini-3.5-flash-lite
        let geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse&key=${encodeURIComponent(primaryKey)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadObj)
        });

        // Lần 2 (chỉ chạy khi lần 1 gặp lỗi): Đổi sang key dự phòng và mô hình gemini-3.6-flash
        if (!geminiRes.ok) {
            geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse&key=${encodeURIComponent(backupKey)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadObj)
            });
        }

        if (!geminiRes.ok) {
            const errTxt = await geminiRes.text();
            return new Response(JSON.stringify({
                error: `Lỗi AI (${geminiRes.status}): ${errTxt.slice(0, 200)}`
            }), {
                status: 502,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(geminiRes.body, {
            status: 200,
            headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message || "Lỗi xử lý máy chủ" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
