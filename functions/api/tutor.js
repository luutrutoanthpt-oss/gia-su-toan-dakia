export async function onRequestPost(context) {
    const { request, env } = context;
    const apiKey = env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "Chưa cấu hình GEMINI_API_KEY trên Cloudflare" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { message, imageBase64, grade = "10", isWeakMode = false, history = [] } = body;

        const systemInstruction = `Bạn là Gia Sư Toán AI – Trường THPT Đa Kia, hướng dẫn học sinh lớp ${grade} (GDPT 2018, Kết nối tri thức) giải Toán từng bước nhỏ, ngắn gọn, giải thích rõ lý do và đặt câu hỏi gợi mở, không đưa ngay đáp án cuối. Công thức viết trong dấu $...$. ${isWeakMode ? "Chế độ HS yếu: chia siêu nhỏ từng bước và cho 1 ví dụ tương tự cực dễ trước." : ""}
QUY TẮC VẼ HÌNH & ĐỒ THỊ: Khi bài toán liên quan đến đồ thị hàm số (đường thẳng, parabol), miền nghiệm bất phương trình bậc nhất hai ẩn, tam giác, hoặc vectơ cần hình minh họa trực quan, hãy chèn thêm một khối mã SVG chuẩn xác đặt trong thẻ \`\`\`svg ... \`\`\` (viewBox="0 0 320 240", nền trắng, hệ trục tọa độ Oxy phải có mũi tên ở đầu trục Ox, Oy, ghi rõ nhãn x, y, O, nét vẽ sắc nét, nhãn không chồng lấn).`;

        const contents = (Array.isArray(history) ? history : []).slice(-4).map(t => ({
            role: t.role === "model" ? "model" : "user",
            parts: [{ text: t.text }]
        }));

        const currentParts = [{ text: message || "Thầy hướng dẫn giúp em bài này từng bước ạ!" }];
        if (imageBase64 && imageBase64.startsWith("data:image")) {
            const [meta, base64Data] = imageBase64.split(",");
            const mimeType = (meta.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/) || [])[1] || "image/jpeg";
            currentParts.push({ inlineData: { mimeType, data: base64Data } });
        }
        contents.push({ role: "user", parts: currentParts });

        // Danh sách các model Gemini mới nhất (3.8, 3.7, 3.6, 2.5) hỗ trợ Streaming & Vision siêu nhanh
        const fastModels = [
            "gemini-3.8-flash-lite",
            "gemini-3.8-flash",
            "gemini-3.7-flash",
            "gemini-3.6-flash",
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite"
        ];
        let lastError = "";

        for (let round = 0; round < 2; round++) {
            for (const model of fastModels) {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemInstruction }] },
                        contents,
                        generationConfig: {
                            temperature: 0.35,
                            maxOutputTokens: 1500
                        }
                    })
                });

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
                lastError = `[${model}]: ${errData.error?.message || res.status}`;
                if (res.status === 503 || res.status === 429) {
                    await new Promise(r => setTimeout(r, 400));
                }
            }
        }

        return new Response(JSON.stringify({
            error: `Hệ thống AI đang bận, em bấm Gửi lại nhé! (${lastError})`
        }), {
            status: 502,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
