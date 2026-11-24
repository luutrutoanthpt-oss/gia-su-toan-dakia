export async function onRequestPost(context) {
    const { request, env } = context;
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "Chưa cấu hình GEMINI_API_KEY trên Cloudflare" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { message, imageBase64, grade = "10", isWeakMode = false, history = [] } = body;

        const systemInstruction = `Bạn là Gia Sư Toán AI – Trường THPT Đa Kia, hướng dẫn học sinh lớp ${grade} (GDPT 2018, bộ sách Kết nối tri thức) giải Toán từng bước nhỏ, giải thích rõ tại sao làm bước đó và đặt câu hỏi gợi mở, không đưa ngay đáp án cuối. Công thức viết trong dấu $...$. ${isWeakMode ? "Chế độ HS yếu: chia siêu nhỏ từng bước và cho 1 ví dụ tương tự cực dễ trước." : ""}`;

        const contents = (Array.isArray(history) ? history : []).map(t => ({
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

        // Danh sách các model xoay vòng tự động khi có 1 model bị quá tải (503/429)
        const models = [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash"
        ];
        let lastError = "";

        for (const model of models) {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents,
                    generationConfig: { temperature: 0.4, maxOutputTokens: 1500 }
                })
            });

            const data = await res.json();
            if (res.ok) {
                const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Em gửi lại đề bài rõ hơn nhé!";
                return new Response(JSON.stringify({ reply }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            }
            lastError = data.error?.message || `Lỗi ${res.status}`;
        }

        return new Response(JSON.stringify({
            error: `Hệ thống Google AI đang bận tạm thời, em bấm Gửi lại sau vài giây nhé! (${lastError})`
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
