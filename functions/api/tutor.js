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
        const apiKey = envKey || bodyKey || headerKey;

        if (!apiKey || apiKey.startsWith("DAN_API")) {
            return new Response(JSON.stringify({
                error: "Chưa tìm thấy biến GEMINI_API_KEY trên Cloudflare Pages. Hãy kiểm tra lại mục Variables and secrets!"
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
- Mọi công thức Toán/Lí/Hóa viết gọn trong dấu $...$ (ví dụ: $y = x^2 + 1$).
- KHI HỌC SINH YÊU CẦU VẼ ĐỒ THỊ HÀM SỐ $y = f(x)$: TUYỆT ĐỐI KHÔNG tự viết thẻ <svg> bằng tay. Thay vào đó, ở phần hình vẽ đồ thị, hãy xuất ĐÚNG cú pháp thẻ lệnh:
[[PLOT: biểu_thức_f(x) | xmin=-4 | xmax=4 | ymin=-2 | ymax=6 | points=(0,1);(-1,2);(1,2);(-2,5);(2,5)]]
Trong đó:
+ biểu_thức_f(x) viết theo cú pháp toán học chuẩn (ví dụ: x^2 + 1, -x^2 + 2*x + 3, x^3 - 3*x, (2*x - 1)/(x - 1), sin(x), 2^x, log(x)).
+ xmin, xmax, ymin, ymax chọn vừa vặn để thấy rõ đỉnh, cực trị, giao điểm trục tọa độ và các điểm đặc biệt (tỷ lệ chia 1 đơn vị bằng nhau trên cả hai trục).
+ points là danh sách các điểm đặc biệt (đỉnh, cực trị, giao trục) cần chấm tròn và ghi tọa độ trên đồ thị.
- Chỉ dùng thẻ <svg> khi vẽ hình học phẳng (tam giác, đường tròn, vectơ) không phải đồ thị hàm số.`;
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
        const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

        const payloadObj = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: {
                temperature: 0.3,
                thinkingConfig: { thinkingBudget: 0 }
            }
        };

        const geminiRes = await fetch(endpointUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadObj)
        });

        if (!geminiRes.ok) {
            const errTxt = await geminiRes.text();
            return new Response(JSON.stringify({
                error: `Lỗi AI (${geminiRes.status}) [${modelName}]: ${errTxt.slice(0, 260)}`
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
