export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { message, grade = "10", isWeakMode = false, mode = "student_tutor", pdfBase64 = "" } = body;

    if (!message && !pdfBase64) {
      return new Response(JSON.stringify({ error: "Thiếu nội dung yêu cầu" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const rawKeys = (env.GEMINI_API_KEY || "")
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);

    if (rawKeys.length === 0) {
      return new Response(JSON.stringify({ error: "Chưa cấu hình GEMINI_API_KEY trên Cloudflare Pages" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const apiKeys = [...rawKeys].sort(() => Math.random() - 0.5);

    let systemInstruction = "";
    let maxTokens = 4096;
    let temperature = 0.3;

    if (mode === "teacher_5512_part1") {
      maxTokens = 8192;
      temperature = 0.25;
      systemInstruction = `Bạn là Tổ trưởng chuyên môn cấp THPT am hiểu sâu sắc Chương trình GDPT 2018 và bộ sách giáo khoa "Kết nối tri thức với cuộc sống".
Hãy soạn PHẦN ĐẦU của Kế hoạch bài dạy (KHBD) chuẩn Công văn 5512/BGDĐT-GDTrH thật chi tiết:
- Tuyệt đối KHÔNG dùng dấu sao * để liệt kê đầu dòng (chỉ dùng dấu gạch đầu dòng - hoặc số 1., 2., a), b)).
- Tuyệt đối KHÔNG viết chỗ trống "(trang ...)" và KHÔNG nhắc tên công cụ AI ngoài (chỉ ghi "Hệ thống Gia sư AI Trường THPT Đa Kia").
- Công thức Toán/Lí/Hóa đặt trong cặp dấu $...$ chuẩn MathType.
- Viết trọn vẹn 3 phần sau rồi dừng lại để hệ thống viết tiếp Tiết 2 ở lượt sau:
  I. MỤC TIÊU (1. Về kiến thức; 2. Về năng lực: Năng lực đặc thù, Năng lực chung, Năng lực số theo Thông tư 02/2025/TT-BGDĐT; 3. Về phẩm chất).
  II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU.
  III. TIẾN TRÌNH DẠY HỌC – TIẾT 1 (Đầy đủ các hoạt động của Tiết 1: Hoạt động 1. Mở đầu; Hoạt động 2. Hình thành kiến thức mới (phần Tiết 1); Hoạt động luyện tập củng cố Tiết 1. Mỗi hoạt động có đủ: a) Mục tiêu; b) Nội dung; c) Sản phẩm; d) Tổ chức thực hiện 4 bước).`;
    } else if (mode === "teacher_5512_part2") {
      maxTokens = 8192;
      temperature = 0.25;
      systemInstruction = `Bạn là Tổ trưởng chuyên môn cấp THPT (bộ sách Kết nối tri thức với cuộc sống).
Hãy viết tiếp PHẦN CÒN LẠI của Kế hoạch bài dạy (KHBD) chuẩn Công văn 5512 ngay sau Tiết 1 (không lặp lại Phần I, II và Tiết 1):
- Tuyệt đối KHÔNG dùng dấu sao * để liệt kê đầu dòng. Công thức đặt trong cặp dấu $...$ chuẩn MathType.
- Viết trọn vẹn đến hết bài:
  TIẾT 2:
  - Tiếp tục Hoạt động 2. Hình thành kiến thức mới (các nội dung còn lại của bài học).
  - Hoạt động 3. Luyện tập (hệ thống bài tập chuẩn SGK Kết nối tri thức, có hướng dẫn giải chi tiết).
  - Hoạt động 4. Vận dụng (bài toán thực tiễn gắn với đời sống).
  IV. PHIẾU HỌC TẬP & CÂU HỎI TỰ HỌC VỚI HỆ THỐNG GIA SƯ AI TRƯỜNG THPT ĐA KIA.
- BẮT BUỘC ở dòng cuối cùng xuất đúng 1 khối mã hình vẽ minh họa kiến thức trọng tâm của bài học chuẩn SGK bọc trong thẻ <SGK_SVG>...</SGK_SVG> (thẻ <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 240" width="460" height="240">, nền trắng, vẽ hình học/vectơ/tọa độ/đồ thị rõ nét bằng nét đậm màu xanh #1d4ed8 và đỏ #dc2626, có mũi tên, ký hiệu điểm/góc/trục tọa độ đầy đủ).`;
    } else if (mode === "teacher_slides") {
      maxTokens = 8192;
      temperature = 0.25;
      systemInstruction = `Bạn là chuyên gia thiết kế bài giảng PowerPoint 16:9 và học liệu số E-learning cho lớp học phổ thông (dùng 1 máy tính giáo viên chiếu lên TV/máy chiếu, tương tác qua giơ thẻ màu A/B/C/D).
Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ (không bọc trong markdown \`\`\`json, không thêm lời dẫn, không dùng ký tự * trong nội dung).`;
    } else if (mode === "pdf_to_word") {
      maxTokens = 8192;
      temperature = 0.1;
      systemInstruction = `Bạn là công cụ chuyển đổi đề thi PDF sang văn bản Word chuẩn MathType. Trích xuất TOÀN BỘ nội dung từ PDF theo đúng thứ tự, giữ nguyên công thức Toán/Lí/Hóa dưới dạng $...$. Không giải thích thêm.`;
    } else {
      maxTokens = 4096;
      systemInstruction = isWeakMode
        ? `Bạn là Gia sư AI hỗ trợ học sinh lớp ${grade} (Trường THPT Đa Kia, bộ sách Kết nối tri thức). Hãy chia lời giải thành từng bước rất nhỏ, giải thích chậm rãi, nhắc lại công thức cơ bản trước khi thay số. Công thức đặt trong $...$.`
        : `Bạn là Gia sư AI hỗ trợ học sinh lớp ${grade} (Trường THPT Đa Kia, bộ sách Kết nối tri thức). Hãy gợi mở tư duy, trình bày từng bước mạch lạc và có câu hỏi kiểm tra ở cuối. Công thức đặt trong $...$.`;
    }

    const parts = [];
    if (pdfBase64) {
      parts.push({ inlineData: { mimeType: "application/pdf", data: pdfBase64 } });
    }
    parts.push({ text: message || "Thực hiện yêu cầu." });

    const requestBody = JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts }],
      generationConfig: { temperature, maxOutputTokens: maxTokens }
    });

    let lastError = "";
    for (const apiKey of apiKeys) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody
      });

      if (geminiRes.ok) {
        return new Response(geminiRes.body, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      }
      lastError = await geminiRes.text();
    }

    return new Response(JSON.stringify({ error: "Lỗi API Key: " + lastError }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
