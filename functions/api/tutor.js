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

        const envKey = String(context.env.GEMINI_API_KEY || "").trim();
        const headerKey = String(context.request.headers.get("x-gemini-key") || "").trim();
        const bodyKey = String(clientApiKey || "").trim();
        
        // Ưu tiên tuyệt đối biến môi trường bảo mật trên Cloudflare Pages
        const apiKey = envKey || bodyKey || headerKey;

        if (!apiKey || apiKey.startsWith("DAN_API")) {
            return new Response(JSON.stringify({
                error: "Chưa tìm thấy biến GEMINI_API_KEY trên Cloudflare Pages. Hãy kiểm tra lại mục Variables and Secrets!"
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        let systemInstruction = "";
        if (mode === "student_tutor") {
            systemInstruction = `Bạn là Gia sư AI của Trường THPT Đa Kia, xưng hô thân thiện là "Thầy (Cô)" và gọi học sinh là "em".
Bám sát chương trình GDPT 2018 và bộ sách Kết nối tri thức với cuộc sống (Lớp ${grade}).
${isWeakMode ? "Học sinh đang ở chế độ HỖ TRỢ NỀN TẢNG: hãy chia nhỏ từng bước thật dễ hiểu, nhắc lại công thức cơ bản trước khi tính và chỉ gợi mở bước đầu tiên để em tự làm." : "Hướng dẫn từng bước rõ ràng, gợi mở tư duy, không chép hộ bài từ đầu đến cuối."}
QUY TẮC CÔNG THỨC & VẼ ĐỒ THỊ:
- Mọi công thức Toán/Lí/Hóa viết gọn trong dấu $...$ (ví dụ: $y = x^2$).
- KHI HỌC SINH YÊU CẦU VẼ ĐỒ THỊ HÀM SỐ HOẶC HÌNH HỌC TRỰC QUAN: Bắt buộc xuất kèm 1 khối mã <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 320" width="420" height="320">...</svg> hoàn chỉnh, nền trắng, kẻ lưới mờ, trục Ox và Oy màu đậm có mũi tên ở đầu dương, ghi rõ nhãn O, x, y, các điểm đặc biệt và đường cong đồ thị màu xanh dương (#1d4ed8) dày 2.5px. Không đặt SVG trong khối code markdown.`;
        } else if (mode === "teacher_5512_intro" || mode === "teacher_5512_period" || mode === "teacher_5512_outro") {
            systemInstruction = "Bạn là chuyên gia soạn Kế hoạch bài dạy (KHBD) chuẩn Công văn 5512 của Bộ GD&ĐT, bám sát SGK Kết nối tri thức với cuộc sống và mẫu Trường THPT Đa Kia. Trình bày mạch lạc, đúng cấu trúc từng mục, không dùng ký tự thừa.";
        } else if (mode === "teacher_svg") {
            systemInstruction = "Chỉ trả về DUY NHẤT 1 thẻ <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 500 260\" width=\"500\" height=\"260\">...</svg> minh họa hình học/đồ thị chuẩn SGK, có mũi tên trục tọa độ và nhãn rõ ràng. Không giải thích thêm.";
        } else if (mode === "teacher_slides") {
            systemInstruction = "Chỉ trả về DUY NHẤT chuỗi JSON hợp lệ theo đúng cấu trúc yêu cầu, không thêm văn bản ngoài JSON.";
        } else if (mode === "pdf_to_word") {
            systemInstruction = "Trích xuất chính xác toàn bộ nội dung văn bản và công thức Toán/Lí/Hóa dưới dạng $...$ chuẩn MathType. Giữ nguyên cấu trúc câu hỏi và đáp án.";
        }

        const contents = [];
        for (const turn of history) {
            if (turn && turn.text) {
                contents.push({
                    role: turn.role === "model" ? "model" : "user",
                    parts: [{ text: String(turn.text) }]
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

        const modelName = "gemini-3.8-flash";
        const payloadObj = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: {
                temperature: 0.4,
                thinkingConfig: { thinkingBudget: 0 }
            }
        };

        const reqHeaders = {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
        };

        // 1. Thử cổng Vertex AI Express (chuẩn cho khóa AQ...)
        const vertexUrl = `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelName}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
        let geminiRes = await fetch(vertexUrl, {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify(payloadObj)
        });

        // 2. Nếu chưa khớp, thử sang cổng Google AI Studio (v1beta)
        if (!geminiRes.ok) {
            const studioUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
            const studioRes = await fetch(studioUrl, {
                method: "POST",
                headers: reqHeaders,
                body: JSON.stringify(payloadObj)
            });
            if (studioRes.ok) {
                geminiRes = studioRes;
            }
        }

        if (!geminiRes.ok) {
            const errTxt = await geminiRes.text();
            return new Response(JSON.stringify({
                error: `Lỗi xác thực (${geminiRes.status}) [Đầu key: ${apiKey.slice(0, 6)}...]: ${errTxt.slice(0, 220)}`
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
