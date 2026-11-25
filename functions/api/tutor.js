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
    let temperature = 0.35;

    if (mode === "teacher_5512") {
      maxTokens = 8192;
      temperature = 0.3;
      systemInstruction = `Bạn là Tổ trưởng chuyên môn cấp THPT am hiểu sâu sắc Chương trình GDPT 2018 và bộ sách giáo khoa "Kết nối tri thức với cuộc sống" (NXB Giáo dục Việt Nam).
Hãy soạn Kế hoạch bài dạy (KHBD) chuẩn Công văn 5512/BGDĐT-GDTrH bám sát CHÍNH XÁC nội dung, tên bài, ví dụ, luyện tập và thuật ngữ trong SGK Kết nối tri thức với cuộc sống:
- Tuyệt đối KHÔNG dùng ký tự dấu sao * để liệt kê đầu dòng (chỉ dùng dấu gạch đầu dòng - hoặc số 1., 2., a), b)).
- Tuyệt đối KHÔNG viết chỗ trống kiểu "(trang ...)" hay "[Số trang SGK]" và KHÔNG nhắc tên các công cụ AI ngoài (chỉ ghi "Hệ thống Gia sư AI Trường THPT Đa Kia").
- Phải viết trọn vẹn cả 4 phần:
  I. MỤC TIÊU (1. Về kiến thức; 2. Về năng lực: Năng lực đặc thù, Năng lực chung, Năng lực số theo Thông tư 02/2025/TT-BGDĐT; 3. Về phẩm chất).
  II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU.
  III. TIẾN TRÌNH DẠY HỌC (Đủ 4 hoạt động: Hoạt động 1. Mở đầu; Hoạt động 2. Hình thành kiến thức mới; Hoạt động 3. Luyện tập; Hoạt động 4. Vận dụng. Trong MỖI hoạt động bắt buộc trình bày đủ 4 mục: a) Mục tiêu; b) Nội dung; c) Sản phẩm; d) Tổ chức thực hiện theo 4 bước: Chuyển giao nhiệm vụ -> Thực hiện nhiệm vụ -> Báo cáo, thảo luận -> Kết luận, nhận định).
  IV. PHIẾU HỌC TẬP & CÂU HỎI TỰ HỌC VỚI GIA SƯ AI Ở NHÀ.
- Công thức đặt trong cặp dấu $...$ chuẩn MathType.
- Ở cuối giáo án, hãy xuất thêm đúng 1 khối mã hình vẽ minh họa kiến thức trọng tâm của bài học theo chuẩn SGK bọc trong thẻ <SGK_SVG>...</SGK_SVG> (kích thước width="460" height="240", nền trắng, nét vẽ đậm rõ màu xanh #1d4ed8 và đỏ #dc2626, có mũi tên, ký hiệu góc/tọa độ/đại lượng đầy đủ).`;
    } else if (mode === "teacher_slides") {
      maxTokens = 8192;
      temperature = 0.25;
      systemInstruction = `Bạn là chuyên gia thiết kế bài giảng PowerPoint 16:9 và học liệu số E-learning cho lớp học phổ thông sử dụng 1 máy tính giáo viên chiếu lên TV/máy chiếu (học sinh không dùng điện thoại trên lớp, tương tác qua giơ thẻ màu A/B/C/D hoặc bảng con).
Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ (không bọc trong markdown \`\`\`json, không thêm lời dẫn bên ngoài, không dùng ký tự ** trong nội dung).`;
    } else if (mode === "pdf_to_word") {
      maxTokens = 8192;
      temperature = 0.1;
      systemInstruction = `Bạn là công cụ chuyển đổi đề thi và tài liệu PDF sang văn bản Word chuẩn MathType.
Hãy trích xuất TOÀN BỘ nội dung từ tệp PDF được đính kèm theo đúng thứ tự từ trang đầu đến trang cuối:
- Giữ nguyên mọi công thức Toán, Vật lí, Hóa học dưới dạng ký hiệu LaTeX $...$ để phần mềm MathType nhận diện được.
- Không giải thích thêm, chỉ xuất ra nguyên văn nội dung tài liệu đã trích xuất.`;
    } else {
      maxTokens = 4096;
      systemInstruction = isWeakMode
        ? `Bạn là Gia sư AI hỗ trợ học sinh lớp ${grade} (Trường THPT Đa Kia, bộ sách Kết nối tri thức). Học sinh đang bật CHẾ ĐỘ HỖ TRỢ CƠ BẢN: hãy chia lời giải thành từng bước rất nhỏ, giải thích chậm rãi, nhắc lại công thức cơ bản trước khi thay số, dùng ngôn ngữ gần gũi, khích lệ. Công thức đặt trong $...$.`
        : `Bạn là Gia sư AI hỗ trợ học sinh lớp ${grade} (Trường THPT Đa Kia, bộ sách Kết nối tri thức). Hãy gợi mở tư duy, nêu phương pháp giải rõ ràng, trình bày từng bước mạch lạc và có câu hỏi kiểm tra mức độ hiểu bài ở cuối. Công thức đặt trong $...$.`;
    }

    const parts = [];
    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64
        }
      });
    }
    parts.push({ text: message || "Hãy trích xuất toàn bộ nội dung." });

    const requestBody = JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
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

    return new Response(JSON.stringify({ error: "Cả 4 API Key đều gặp lỗi: " + lastError }), {
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
