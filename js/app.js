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

const CURRICULUM_TOPICS_DB = {
    "Toán học": {
        "10": [
            { title: "Chương I. Mệnh đề và Tập hợp", desc: "Mệnh đề toán học, mệnh đề kéo theo, mệnh đề đảo, kí hiệu ∀, ∃ và các phép toán trên tập hợp." },
            { title: "Chương II. Bất phương trình và hệ bất phương trình bậc nhất hai ẩn", desc: "Biểu diễn miền nghiệm trên mặt phẳng tọa độ Oxy và bài toán tối ưu thực tế." },
            { title: "Chương III. Hệ thức lượng trong tam giác", desc: "Giá trị lượng giác của góc từ 0° đến 180°, định lí côsin, định lí sin và giải tam giác." },
            { title: "Chương IV. Vectơ", desc: "Khái niệm vectơ, tổng và hiệu hai vectơ, tích của vectơ với một số, tọa độ vectơ và tích vô hướng." },
            { title: "Chương V. Các số đặc trưng của mẫu số liệu không ghép nhóm", desc: "Số gần đúng và sai số, số trung bình, trung vị, tứ phân vị, mốt và các số đặc trưng đo độ phân tán." },
            { title: "Chương VI. Hàm số, đồ thị và ứng dụng", desc: "Hàm số, hàm số bậc hai, đồ thị parabol, dấu của tam thức bậc hai và phương trình quy về bậc hai." },
            { title: "Chương VII. Phương pháp tọa độ trong mặt phẳng", desc: "Phương trình đường thẳng, vị trí tương đối, góc và khoảng cách, phương trình đường tròn và ba đường conic." },
            { title: "Chương VIII. Đại số tổ hợp", desc: "Quy tắc cộng, quy tắc nhân, hoán vị, chỉnh hợp, tổ hợp và công thức nhị thức Newton." },
            { title: "Chương IX. Tính xác suất theo định nghĩa cổ điển", desc: "Biến cố, không gian mẫu và phương pháp tính xác suất của biến cố theo định nghĩa cổ điển." }
        ],
        "11": [
            { title: "Chương I. Hàm số lượng giác và Phương trình lượng giác", desc: "Góc lượng giác, công thức lượng giác, hàm số lượng giác và phương trình lượng giác cơ bản." },
            { title: "Chương II. Dãy số. Cấp số cộng và Cấp số nhân", desc: "Dãy số tăng – giảm – bị chặn, cấp số cộng, cấp số nhân và công thức tính tổng n số hạng đầu." },
            { title: "Chương III. Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm", desc: "Mẫu số liệu ghép nhóm, số trung bình, trung vị, tứ phân vị và mốt của mẫu số liệu ghép nhóm." },
            { title: "Chương IV. Quan hệ song song trong không gian", desc: "Đường thẳng và mặt phẳng trong không gian, hai đường thẳng song song, đường thẳng song song mặt phẳng, hai mặt phẳng song song và phép chiếu song song." },
            { title: "Chương V. Giới hạn. Hàm số liên tục", desc: "Giới hạn của dãy số, giới hạn của hàm số và hàm số liên tục tại một điểm, trên một khoảng." },
            { title: "Chương VI. Hàm số mũ và Hàm số lôgarit", desc: "Lũy thừa với số mũ thực, lôgarit, hàm số mũ – lôgarit và phương trình, bất phương trình mũ – lôgarit." },
            { title: "Chương VII. Quan hệ vuông góc trong không gian", desc: "Hai đường thẳng vuông góc, đường thẳng vuông góc mặt phẳng, phép chiếu vuông góc, góc nhị diện và khoảng cách, thể tích khối chóp – lăng trụ." },
            { title: "Chương VIII. Các quy tắc tính xác suất", desc: "Biến cố hợp, biến cố giao, biến cố độc lập, công thức cộng xác suất và công thức nhân xác suất." },
            { title: "Chương IX. Đạo hàm", desc: "Định nghĩa và ý nghĩa hình học – vật lí của đạo hàm, quy tắc tính đạo hàm và đạo hàm cấp hai." }
        ],
        "12": [
            { title: "Chương I. Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số", desc: "Tính đơn điệu, cực trị, giá trị lớn nhất – nhỏ nhất, đường tiệm cận và khảo sát sự biến thiên, vẽ đồ thị hàm số." },
            { title: "Chương II. Vectơ và Hệ trục tọa độ trong không gian", desc: "Vectơ trong không gian, hệ trục tọa độ Oxyz, tọa độ điểm và biểu thức tọa độ các phép toán vectơ." },
            { title: "Chương III. Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm", desc: "Khoảng biến thiên, khoảng tứ phân vị, phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm." },
            { title: "Chương IV. Nguyên hàm và Tích phân", desc: "Nguyên hàm, bảng nguyên hàm cơ bản, tích phân và ứng dụng hình học tính diện tích, thể tích." },
            { title: "Chương V. Phương pháp tọa độ trong không gian", desc: "Phương trình mặt phẳng, phương trình đường thẳng, góc – khoảng cách và phương trình mặt cầu trong Oxyz." },
            { title: "Chương VI. Xác suất có điều kiện", desc: "Xác suất có điều kiện, công thức xác suất toàn phần, công thức Bayes và sơ đồ hình cây." }
        ]
    },
    "Vật lí": {
        "10": [
            { title: "Chương I. Mở đầu", desc: "Đối tượng nghiên cứu của Vật lí, quy tắc an toàn trong phòng thực hành và sai số phép đo." },
            { title: "Chương II. Động học", desc: "Độ dịch chuyển, vận tốc, chuyển động thẳng biến đổi đều, sự rơi tự do và chuyển động ném." },
            { title: "Chương III. Động lực học", desc: "Tổng hợp và phân tích lực, ba định luật Newton, trọng lực, lực ma sát, lực cản và lực nâng." },
            { title: "Chương IV. Năng lượng, Công, Công suất", desc: "Công cơ học, công suất, động năng, thế năng, cơ năng và định luật bảo toàn cơ năng, hiệu suất." },
            { title: "Chương V. Động lượng", desc: "Động lượng, định luật bảo toàn động lượng và các loại va chạm đàn hồi, va chạm mềm." },
            { title: "Chương VI. Chuyển động tròn đều", desc: "Động học chuyển động tròn đều, tốc độ góc, gia tốc hướng tâm và lực hướng tâm." },
            { title: "Chương VII. Biến dạng của vật rắn. Áp suất chất lỏng", desc: "Biến dạng đàn hồi, định luật Hooke, khối lượng riêng và áp suất chất lỏng." }
        ],
        "11": [
            { title: "Chương I. Dao động", desc: "Dao động điều hòa, li độ – vận tốc – gia tốc, năng lượng trong dao động điều hòa, dao động tắt dần và cộng hưởng." },
            { title: "Chương II. Sóng", desc: "Mô tả sóng, sóng ngang – sóng dọc, sóng điện từ, giao thoa sóng, sóng dừng và tốc độ truyền âm." },
            { title: "Chương III. Điện trường", desc: "Lực tương tác giữa hai điện tích (Định luật Coulomb), cường độ điện trường, điện thế, thế năng điện và tụ điện." },
            { title: "Chương IV. Dòng điện. Mạch điện", desc: "Cường độ dòng điện, điện trở, định luật Ohm, nguồn điện, suất điện động, năng lượng và công suất điện." }
        ],
        "12": [
            { title: "Chương I. Vật lí nhiệt", desc: "Cấu trúc chất, nội năng, định luật I nhiệt động lực học, nhiệt dung riêng, nhiệt nóng chảy riêng và nhiệt hóa hơi riêng." },
            { title: "Chương II. Khí lí tưởng", desc: "Mô hình động học phân tử chất khí, định luật Boyle, định luật Charles, phương trình trạng thái khí lí tưởng và áp suất khí." },
            { title: "Chương III. Từ trường", desc: "Từ trường, cảm ứng từ, lực từ tác dụng lên đoạn dây dẫn mang dòng điện, hiện tượng cảm ứng điện từ và sóng điện từ." },
            { title: "Chương IV. Vật lí hạt nhân", desc: "Cấu trúc hạt nhân, độ hụt khối, năng lượng liên kết, phản ứng hạt nhân, phóng xạ và ứng dụng công nghệ hạt nhân." }
        ]
    },
    "Hóa học": {
        "10": [
            { title: "Chương 1. Cấu tạo nguyên tử", desc: "Thành phần nguyên tử, nguyên tố hóa học, đồng vị, cấu trúc lớp vỏ electron và cấu hình electron." },
            { title: "Chương 2. Bảng tuần hoàn các nguyên tố hóa học", desc: "Cấu tạo bảng tuần hoàn, xu hướng biến đổi bán kính, độ âm điện, tính kim loại – phi kim và định luật tuần hoàn." },
            { title: "Chương 3. Liên kết hóa học", desc: "Quy tắc octet, liên kết ion, liên kết cộng hóa trị, liên kết hydrogen và tương tác van der Waals." },
            { title: "Chương 4. Phản ứng oxi hóa – khử", desc: "Số oxi hóa, chất oxi hóa – chất khử và lập phương trình hóa học phản ứng oxi hóa – khử theo phương pháp thăng bằng electron." },
            { title: "Chương 5. Năng lượng hóa học", desc: "Phản ứng tỏa nhiệt, phản ứng thu nhiệt, biến thiên enthalpy chuẩn và cách tính biến thiên enthalpy của phản ứng." },
            { title: "Chương 6. Tốc độ phản ứng hóa học", desc: "Tốc độ phản ứng trung bình, tốc độ tức thời và các yếu tố ảnh hưởng đến tốc độ phản ứng." },
            { title: "Chương 7. Nguyên tố nhóm VIIA (Halogen)", desc: "Tính chất vật lí, tính chất hóa học của đơn chất halogen, hydrogen halide và các muối halide." }
        ],
        "11": [
            { title: "Chương 1. Cân bằng hóa học", desc: "Phản ứng thuận nghịch, cân bằng hóa học, nguyên lí chuyển dịch cân bằng Le Chatelier, sự điện li, thuyết Brønsted – Lowry và pH." },
            { title: "Chương 2. Nitrogen – Sulfur", desc: "Đơn chất nitrogen, ammonia, muối ammonium, nitric acid, hiện tượng phú dưỡng, sulfur và sulfuric acid." },
            { title: "Chương 3. Đại cương về hóa học hữu cơ", desc: "Hợp chất hữu cơ, phổ hồng ngoại IR, tách biệt và tinh chế, công thức phân tử, cấu tạo hóa học và đồng đẳng – đồng phân." },
            { title: "Chương 4. Hydrocarbon", desc: "Alkane, hydrocarbon không no (alkene, alkyne), phản ứng cộng – trùng hợp và arene (hydrocarbon thơm)." },
            { title: "Chương 5. Dẫn xuất halogen – Alcohol – Phenol", desc: "Tính chất hóa học và ứng dụng của dẫn xuất halogen, alcohol và phenol." },
            { title: "Chương 6. Hợp chất carbonyl – Carboxylic acid", desc: "Aldehyde, ketone và carboxylic acid: cấu tạo, danh pháp, tính chất hóa học và điều chế." }
        ],
        "12": [
            { title: "Chương 1. Ester – Lipid", desc: "Ester, phản ứng xà phòng hóa, lipid, chất béo, xà phòng và chất giặt rửa tổng hợp." },
            { title: "Chương 2. Carbohydrate", desc: "Glucose, fructose, saccharose, maltose, tinh bột và cellulose." },
            { title: "Chương 3. Hợp chất chứa nitrogen", desc: "Amine, amino acid, tính chất lưỡng tính, peptide, protein và enzyme." },
            { title: "Chương 4. Polymer", desc: "Đại cương về polymer, chất dẻo, vật liệu composite, tơ, cao su và keo dán tổng hợp." },
            { title: "Chương 5. Pin điện và điện phân", desc: "Thế điện cực chuẩn, pin điện hóa (pin Galvani) và nguyên tắc, ứng dụng của điện phân." },
            { title: "Chương 6. Đại cương về kim loại", desc: "Cấu tạo, tính chất vật lí – hóa học của kim loại, tách kim loại, hợp kim và ăn mòn kim loại." },
            { title: "Chương 7. Nguyên tố nhóm IA và nhóm IIA", desc: "Kim loại kiềm (nhóm IA), kim loại kiềm thổ (nhóm IIA) và nước cứng." },
            { title: "Chương 8. Sơ lược về dãy kim loại chuyển tiếp thứ nhất và phức chất", desc: "Đặc điểm kim loại chuyển tiếp dãy thứ nhất và cấu tạo, tính chất cơ bản của phức chất." }
        ]
    },
    "Sinh học": {
        "10": [
            { title: "Phần 1. Giới thiệu chung về chương trình môn Sinh học", desc: "Đối tượng, phương pháp nghiên cứu sinh học và các cấp độ tổ chức của thế giới sống." },
            { title: "Phần 2. Sinh học tế bào – Thành phần hóa học và cấu trúc tế bào", desc: "Các nguyên tố hóa học, nước, phân tử sinh học (carbohydrate, lipid, protein, nucleic acid), tế bào nhân sơ và nhân thực." },
            { title: "Phần 3. Trao đổi chất và chuyển hóa năng lượng ở tế bào", desc: "Vận chuyển các chất qua màng sinh chất, enzyme, hô hấp tế bào và quang hợp." },
            { title: "Phần 4. Chu kì tế bào, phân bào và công nghệ tế bào", desc: "Chu kì tế bào, nguyên phân, giảm phân và công nghệ tế bào thực vật, động vật." },
            { title: "Phần 5. Sinh học vi sinh vật và virus", desc: "Dinh dưỡng, chuyển hóa, sinh trưởng ở vi sinh vật, ứng dụng vi sinh vật và cấu trúc, chu trình nhân lên của virus." }
        ],
        "11": [
            { title: "Chương 1. Trao đổi chất và chuyển hóa năng lượng ở sinh vật", desc: "Trao đổi nước – khoáng, quang hợp, hô hấp ở thực vật; dinh dưỡng – tiêu hóa, hô hấp, tuần hoàn, bài tiết và miễn dịch ở động vật." },
            { title: "Chương 2. Cảm ứng ở sinh vật", desc: "Cảm ứng ở thực vật, hệ thần kinh, truyền tin qua synapse, phản xạ và tập tính ở động vật." },
            { title: "Chương 3. Sinh trưởng và phát triển ở sinh vật", desc: "Mô phân sinh, hormone thực vật, sinh trưởng – phát triển ở động vật và các nhân tố ảnh hưởng." },
            { title: "Chương 4. Sinh sản ở sinh vật", desc: "Sinh sản vô tính, sinh sản hữu tính ở thực vật và động vật, điều hòa sinh sản và sinh đẻ có kế hoạch." },
            { title: "Chương 5. Mối quan hệ giữa các quá trình sinh lí trong cơ thể", desc: "Cơ thể sinh vật là một hệ thống mở và tự điều chỉnh thống nhất." }
        ],
        "12": [
            { title: "Chương 1. Cơ sở phân tử của sự di truyền và biến dị", desc: "DNA, cơ chế tái bản, phiên mã, dịch mã, điều hòa biểu hiện gene, đột biến gene và công nghệ gene." },
            { title: "Chương 2. Nhiễm sắc thể và các quy luật di truyền", desc: "Cấu trúc nhiễm sắc thể, đột biến NST, quy luật Mendel, tương tác gene, liên kết – hoán vị gene và di truyền liên kết giới tính." },
            { title: "Chương 3. Di truyền quần thể và Di truyền học người", desc: "Cấu trúc di truyền quần thể (định luật Hardy – Weinberg), di truyền học người và liệu pháp gene." },
            { title: "Chương 4. Bằng chứng và cơ chế tiến hóa", desc: "Các bằng chứng tiến hóa, học thuyết Darwin, thuyết tiến hóa tổng hợp hiện đại và quá trình hình thành loài." },
            { title: "Chương 5. Sinh thái học quần thể và quần xã", desc: "Môi trường, nhân tố sinh thái, đặc trưng quần thể, quần xã sinh vật, diễn thế sinh thái, hệ sinh thái và sinh quyển." }
        ]
    },
    "Tin học": {
        "10": [
            { title: "Chủ đề 1. Máy tính và xã hội tri thức", desc: "Thông tin và xử lí thông tin, hệ nhị phân, dữ liệu văn bản – hình ảnh – âm thanh và điện toán đám mây." },
            { title: "Chủ đề 2. Mạng máy tính và Internet", desc: "Mạng LAN, Internet, dịch vụ đám mây, IoT và an toàn trên không gian mạng." },
            { title: "Chủ đề 3. Đạo đức, pháp luật và văn hóa trong môi trường số", desc: "Bản quyền phần mềm, ứng xử văn minh và phòng chống lừa đảo trực tuyến." },
            { title: "Chủ đề 4. Ứng dụng tin học (Thiết kế đồ họa)", desc: "Tạo và chỉnh sửa hình ảnh đồ họa vectơ với Inkscape hoặc công cụ thiết kế số." },
            { title: "Chủ đề 5. Giải quyết vấn đề với sự trợ giúp của máy tính (Python)", desc: "Ngôn ngữ lập trình Python: biến, biểu thức, câu lệnh rẽ nhánh if, vòng lặp for – while, kiểu danh sách (list) và hàm." },
            { title: "Chủ đề 6. Hướng nghiệp với tin học", desc: "Nhóm nghề thiết kế đồ họa và lập trình phát triển phần mềm." }
        ],
        "11": [
            { title: "Chủ đề 1. Hệ điều hành và phần mềm nguồn mở", desc: "Chức năng hệ điều hành, quản lí tệp, phần mềm nguồn mở và phần mềm chạy trên Internet." },
            { title: "Chủ đề 2. Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin", desc: "Tìm kiếm thông tin nâng cao, quản lí thư điện tử và lưu trữ trực tuyến." },
            { title: "Chủ đề 3. Đạo đức, pháp luật và văn hóa trong môi trường số", desc: "Giao tiếp an toàn, phòng tránh nguy cơ trên mạng xã hội." },
            { title: "Chủ đề 4. Giới thiệu các hệ cơ sở dữ liệu", desc: "Cơ sở dữ liệu, hệ quản trị CSDL, CSDL quan hệ, khóa chính, khóa ngoài và truy vấn SQL cơ bản." },
            { title: "Chủ đề 5. Thực hành tạo và khai thác cơ sở dữ liệu", desc: "Tạo bảng, thiết lập liên kết, biểu mẫu nhập liệu và truy vấn báo cáo." },
            { title: "Chủ đề 6. Kĩ thuật lập trình (Định hướng Khoa học máy tính)", desc: "Mảng hai chiều, thuật toán tìm kiếm, sắp xếp và đánh giá độ phức tạp thuật toán." }
        ],
        "12": [
            { title: "Chủ đề 1. Máy tính và xã hội tri thức (Trí tuệ nhân tạo)", desc: "Khái niệm Trí tuệ nhân tạo (AI), ứng dụng của AI trong đời sống và cảnh báo rủi ro AI." },
            { title: "Chủ đề 2. Mạng máy tính và Internet", desc: "Thiết bị mạng (Switch, Router, Access Point), giao thức TCP/IP và chia sẻ tài nguyên mạng." },
            { title: "Chủ đề 3. Đạo đức, pháp luật và văn hóa trong môi trường số", desc: "Tính nhân văn trong ứng xử và bảo vệ dữ liệu cá nhân." },
            { title: "Chủ đề 4. Giải quyết vấn đề với sự trợ giúp của máy tính (HTML & CSS)", desc: "Cấu trúc trang web HTML, thẻ văn bản – liên kết – bảng – biểu mẫu và định dạng giao diện bằng CSS." },
            { title: "Chủ đề 5. Hướng nghiệp với tin học", desc: "Nhóm nghề quản trị mạng, bảo mật thông tin và phát triển ứng dụng Web." }
        ]
    },
    "Ngữ văn": {
        "10": [
            { title: "Bài 1. Sức hấp dẫn của truyện kể", desc: "Đọc hiểu thần thoại, truyện ngắn hiện đại; phân tích cốt truyện, nhân vật, người kể chuyện." },
            { title: "Bài 2. Vẻ đẹp của thơ ca", desc: "Cảm nhận tứ thơ, hình ảnh, nhịp điệu và biện pháp tu từ trong thơ." },
            { title: "Bài 3. Kịch bản văn học và sân khấu", desc: "Đặc trưng của chèo, tuồng dân gian; xung đột kịch và ngôn ngữ đối thoại." },
            { title: "Bài 4. Văn bản thông tin tổng hợp", desc: "Đọc hiểu văn bản thông tin kết hợp phương tiện phi ngôn ngữ, viết báo cáo nghiên cứu." },
            { title: "Bài 5. Nghị luận xã hội và Nghị luận văn học", desc: "Cách lập luận chặt chẽ, dẫn chứng thuyết phục và viết bài văn nghị luận phân tích tác phẩm." }
        ],
        "11": [
            { title: "Bài 1. Câu chuyện và điểm nhìn trong truyện kể", desc: "Phân tích điểm nhìn trần thuật, lời người kể chuyện và lời nhân vật." },
            { title: "Bài 2. Cấu tứ và hình ảnh trong thơ trữ tình", desc: "Khám phá cấu tứ độc đáo và yếu tố tượng trưng trong thơ hiện đại." },
            { title: "Bài 3. Cấu trúc của văn bản nghị luận", desc: "Mối quan hệ giữa luận đề, luận điểm, lí lẽ và bằng chứng." },
            { title: "Bài 4. Tự sự trong truyện thơ dân gian và thơ trữ tình", desc: "Đọc hiểu truyện thơ Nôm và các tác phẩm tự sự giàu chất thơ." },
            { title: "Bài 5. Nhân vật và xung đột trong bi kịch", desc: "Đặc trưng thể loại bi kịch, xung đột cao trào và hiệu ứng thanh lọc." }
        ],
        "12": [
            { title: "Bài 1. Khả năng lớn lao của tiểu thuyết", desc: "Đặc trưng tiểu thuyết hiện đại, nghệ thuật xây dựng nhân vật và dòng ý thức." },
            { title: "Bài 2. Những thế giới thơ", desc: "Phong cách sáng tác thơ hiện đại, yếu tố siêu thực và giọng điệu trữ tình." },
            { title: "Bài 3. Lập luận trong văn bản nghị luận", desc: "Nghị luận văn học và nghị luận về một vấn đề liên quan đến tuổi trẻ." },
            { title: "Bài 4. Yếu tố kì ảo trong truyện kể", desc: "Vai trò của yếu tố kì ảo trong truyền kì trung đại và truyện ngắn hiện đại." },
            { title: "Bài 5. Tiếng cười của hài kịch và Phóng sự – Hồi kí", desc: "Thủ pháp trào phúng trong hài kịch và tính chân thực trong kí văn học." }
        ]
    },
    "Tiếng Anh": {
        "10": [
            { title: "Unit 1 – 2. Family Life & Humans and the Environment", desc: "Present Simple vs. Present Continuous, Future with Will and Be going to, Passive Voice." },
            { title: "Unit 3 – 4. Music & For a Better Community", desc: "Compound sentences, To-infinitives and bare infinitives, Past Simple vs. Past Continuous." },
            { title: "Unit 5 – 6. Inventions & Gender Equality", desc: "Present Perfect, Gerunds and to-infinitives, Passive voice with modal verbs." },
            { title: "Unit 7 – 8. Viet Nam and International Organisations & New Ways to Learn", desc: "Comparative and superlative adjectives, Defining and non-defining relative clauses." },
            { title: "Unit 9 – 10. Protecting the Environment & Ecotourism", desc: "Reported speech, Conditional sentences Type 1 and Type 2." }
        ],
        "11": [
            { title: "Unit 1 – 2. A Long and Healthy Life & The Generation Gap", desc: "Past Simple vs. Present Perfect, Modal verbs (must, have to, should)." },
            { title: "Unit 3 – 4. Cities of the Future & ASEAN and Viet Nam", desc: "Stative verbs in the continuous form, Linking verbs, Gerunds as subjects and objects." },
            { title: "Unit 5 – 6. Global Warming & Preserving Our Heritage", desc: "Present participle and past participle clauses, To-infinitive clauses." },
            { title: "Unit 7 – 8. Education Options & Becoming Independent", desc: "Perfect gerunds and perfect participles, Cleft sentences with It is/was... that/who..." },
            { title: "Unit 9 – 10. Social Issues & The Ecosystem", desc: "Linking words and phrases, Compound nouns." }
        ],
        "12": [
            { title: "Unit 1 – 2. Life Stories We Admire & A Multicultural World", desc: "Past Simple vs. Past Continuous, Articles (a, an, the, zero article)." },
            { title: "Unit 3 – 4. Green Living & Urbanisation", desc: "Verbs with prepositions, Relative clauses referring to a whole sentence, Present perfect & Double comparatives." },
            { title: "Unit 5 – 6. The World of Work & Artificial Intelligence", desc: "Simple, compound, and complex sentences, Active and passive causatives (have/get something done)." },
            { title: "Unit 7 – 8. The World of Mass Media & Wildlife Conservation", desc: "Adverbial clauses of manner and result, Adverbial clauses of condition and comparison." },
            { title: "Unit 9 – 10. Career Paths & Lifelong Learning", desc: "Three-word phrasal verbs, Reported speech: reporting orders, requests, offers, and advice." }
        ]
    },
    "Lịch sử": {
        "10": [
            { title: "Chủ đề 1. Lịch sử và Sử học", desc: "Hiện thực lịch sử, nhận thức lịch sử, tri thức lịch sử và vai trò của Sử học." },
            { title: "Chủ đề 2. Vai trò của Sử học", desc: "Sử học với công tác bảo tồn di sản văn hóa và phát triển du lịch bền vững." },
            { title: "Chủ đề 3. Một số nền văn minh thế giới thời kì cổ – trung đại", desc: "Văn minh Ai Cập, Trung Hoa, Ấn Độ, Hy Lạp – La Mã cổ đại và văn minh thời Phục hưng." },
            { title: "Chủ đề 4. Các cuộc cách mạng công nghiệp trong lịch sử thế giới", desc: "Cách mạng công nghiệp lần thứ nhất, thứ hai, thứ ba và thứ tư (4.0)." },
            { title: "Chủ đề 5. Văn minh Đông Nam Á cổ – trung đại", desc: "Cơ sở hình thành, hành trình phát triển và thành tựu tiêu biểu của văn minh Đông Nam Á." },
            { title: "Chủ đề 6. Một số nền văn minh trên đất nước Việt Nam (trước năm 1858)", desc: "Văn minh Văn Lang – Âu Lạc, văn minh Chăm-pa, văn minh Phù Nam và văn minh Đại Việt." },
            { title: "Chủ đề 7. Cộng đồng các dân tộc Việt Nam", desc: "Đời sống vật chất, tinh thần và khối đại đoàn kết các dân tộc Việt Nam." }
        ],
        "11": [
            { title: "Chủ đề 1. Cách mạng tư sản và sự phát triển của chủ nghĩa tư bản", desc: "Một số vấn đề chung về cách mạng tư sản và sự xác lập, phát triển của chủ nghĩa tư bản hiện đại." },
            { title: "Chủ đề 2. Chủ nghĩa xã hội từ năm 1917 đến nay", desc: "Sự hình thành Liên bang Cộng hòa xã hội chủ nghĩa Xô viết và sự phát triển của chủ nghĩa xã hội sau Thế chiến II." },
            { title: "Chủ đề 3. Quá trình giành độc lập dân tộc của các quốc gia Đông Nam Á", desc: "Quá trình xâm lược của thực dân phương Tây và hành trình đi đến độc lập ở Đông Nam Á." },
            { title: "Chủ đề 4. Chiến tranh bảo vệ Tổ quốc và chiến tranh giải phóng dân tộc (trước 1945)", desc: "Các cuộc kháng chiến thắng lợi tiêu biểu và các cuộc khởi nghĩa, chiến tranh giải phóng dân tộc." },
            { title: "Chủ đề 5. Một số cuộc cải cách lớn trong lịch sử Việt Nam (trước năm 1858)", desc: "Cải cách của Hồ Quý Ly, Lê Thánh Tông và Minh Mạng." },
            { title: "Chủ đề 6. Lịch sử bảo vệ chủ quyền, các quyền và lợi ích hợp pháp của Việt Nam ở Biển Đông", desc: "Vị trí chiến lược của Biển Đông và quá trình xác lập, thực thi chủ quyền đối với Hoàng Sa, Trường Sa." }
        ],
        "12": [
            { title: "Chủ đề 1. Thế giới trong và sau Chiến tranh lạnh", desc: "Liên hợp quốc, Trật tự thế giới hai cực Ianta và xu thế đa cực sau Chiến tranh lạnh." },
            { title: "Chủ đề 2. ASEAN: Những chặng đường lịch sử", desc: "Sự ra đời, phát triển của ASEAN và Cộng đồng ASEAN từ năm 2015 đến nay." },
            { title: "Chủ đề 3. Cách mạng tháng Tám năm 1945, chiến tranh giải phóng dân tộc và bảo vệ Tổ quốc (1945 – 1975)", desc: "Cách mạng tháng Tám 1945, kháng chiến chống thực dân Pháp (1945–1954) và kháng chiến chống Mỹ, cứu nước (1954–1975)." },
            { title: "Chủ đề 4. Công cuộc Đổi mới ở Việt Nam từ năm 1986 đến nay", desc: "Bối cảnh, nội dung đường lối Đổi mới và thành tựu cơ bản của Việt Nam." },
            { title: "Chủ đề 5. Lịch sử đối ngoại của Việt Nam thời cận – hiện đại", desc: "Hoạt động đối ngoại của Việt Nam trong đấu tranh giành độc lập và hội nhập quốc tế." },
            { title: "Chủ đề 6. Hồ Chí Minh trong lịch sử Việt Nam", desc: "Khái quát cuộc đời, sự nghiệp cách mạng của Chủ tịch Hồ Chí Minh và dấu ấn trong lòng nhân dân thế giới." }
        ]
    },
    "Địa lí": {
        "10": [
            { title: "Chương 1. Sử dụng bản đồ", desc: "Một số phương pháp biểu hiện các đối tượng địa lí trên bản đồ, GPS và bản đồ số." },
            { title: "Chương 2. Trái Đất", desc: "Nguồn gốc hình thành Trái Đất, vỏ Trái Đất, hệ quả địa lí các chuyển động của Trái Đất." },
            { title: "Chương 3. Thạch quyển", desc: "Nội lực, ngoại lực và tác động đến sự hình thành địa hình bề mặt Trái Đất." },
            { title: "Chương 4. Khí quyển", desc: "Nhiệt độ không khí, khí áp, gió, mưa và các đới khí hậu trên Trái Đất." },
            { title: "Chương 5. Thủy quyển", desc: "Nước trên lục địa, nước biển và đại dương, sóng, thủy triều và dòng biển." },
            { title: "Chương 6. Sinh quyển", desc: "Đất, các nhân tố hình thành đất và sinh quyển." },
            { title: "Chương 7. Một số quy luật của vỏ địa lí", desc: "Quy luật thống nhất và hoàn chỉnh, quy luật địa đới và phi địa đới." },
            { title: "Chương 8 – 13. Địa lí kinh tế – xã hội đại cương", desc: "Địa lí dân cư, nguồn lực phát triển kinh tế, địa lí nông nghiệp, công nghiệp, dịch vụ và phát triển bền vững." }
        ],
        "11": [
            { title: "Phần 1. Một số vấn đề về kinh tế – xã hội thế giới", desc: "Sự khác biệt trình độ phát triển, toàn cầu hóa, khu vực hóa kinh tế và an ninh toàn cầu." },
            { title: "Phần 2. Địa lí khu vực và quốc gia", desc: "Khu vực Mỹ Latinh, Liên minh châu Âu (EU), khu vực Đông Nam Á, khu vực Tây Nam Á." },
            { title: "Phần 3. Địa lí các quốc gia tiêu biểu", desc: "Hợp chúng quốc Hoa Kỳ, Liên bang Nga, Nhật Bản, Cộng hòa Nhân dân Trung Hoa và Ô-xtrây-li-a." }
        ],
        "12": [
            { title: "Chương 1. Địa lí tự nhiên Việt Nam", desc: "Vị trí địa lí, phạm vi lãnh thổ, thiên nhiên nhiệt đới ẩm gió mùa, sự phân hóa đa dạng của thiên nhiên và vấn đề sử dụng hợp lí tài nguyên, bảo vệ môi trường." },
            { title: "Chương 2. Địa lí dân cư Việt Nam", desc: "Dân số, lao động và việc làm, đô thị hóa ở Việt Nam." },
            { title: "Chương 3. Địa lí các ngành kinh tế Việt Nam", desc: "Chuyển dịch cơ cấu kinh tế, nông nghiệp – lâm nghiệp – thủy sản, công nghiệp và dịch vụ (giao thông, thương mại, du lịch)." },
            { title: "Chương 4. Sự phân hóa lãnh thổ (7 vùng kinh tế)", desc: "Trung du và miền núi Bắc Bộ, Đồng bằng sông Hồng, Bắc Trung Bộ, Duyên hải Nam Trung Bộ, Tây Nguyên, Đông Nam Bộ và Đồng bằng sông Cửu Long." }
        ]
    },
    "GDKT & PL": {
        "10": [
            { title: "Phần 1. Giáo dục kinh tế (Nền kinh tế và các chủ thể)", desc: "Các hoạt động kinh tế cơ bản, các chủ thể của nền kinh tế, thị trường, cơ chế thị trường, ngân sách nhà nước, thuế, sản xuất kinh doanh và tín dụng." },
            { title: "Phần 2. Giáo dục pháp luật (Hệ thống chính trị và Pháp luật)", desc: "Hệ thống chính trị nước CHXHCN Việt Nam, pháp luật nước CHXHCN Việt Nam, thực hiện pháp luật và Hiến pháp nước CHXHCN Việt Nam." }
        ],
        "11": [
            { title: "Phần 1. Giáo dục kinh tế (Cạnh tranh, cung – cầu và lạm phát)", desc: "Cạnh tranh trong nền kinh tế thị trường, cung – cầu, lạm phát, thất nghiệp, thị trường lao động – việc làm, ý tưởng kinh doanh và đạo đức kinh doanh." },
            { title: "Phần 2. Giáo dục pháp luật (Quyền bình đẳng và quyền dân chủ)", desc: "Quyền bình đẳng của công dân trước pháp luật, bình đẳng giới, quyền bình đẳng giữa các dân tộc – tôn giáo và quyền tham gia quản lí nhà nước và xã hội." }
        ],
        "12": [
            { title: "Phần 1. Giáo dục kinh tế (Tăng trưởng, hội nhập và bảo hiểm)", desc: "Tăng trưởng và phát triển kinh tế, hội nhập kinh tế quốc tế, bảo hiểm và an sinh xã hội, lập kế hoạch kinh doanh và trách nhiệm xã hội của doanh nghiệp." },
            { title: "Phần 2. Giáo dục pháp luật (Quyền tự do cơ bản và pháp luật quốc tế)", desc: "Quyền và nghĩa vụ của công dân trong học tập, bảo vệ chăm sóc sức khỏe, đảm bảo an sinh xã hội, bảo vệ di sản văn hóa, môi trường và một số vấn đề cơ bản của pháp luật quốc tế." }
        ]
    }
};

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
            if (k && typeof k === "string" && k.trim().length > 10 && !k.trim().startsWith("DAN_API")) {
                return k.trim();
            }
        }
    }
    const localKey = localStorage.getItem("dakia_gemini_api_key") || localStorage.getItem("GEMINI_API_KEY") || "";
    if (localKey.trim().length > 10 && !localKey.trim().startsWith("DAN_API")) return localKey.trim();
    return "";
}

window.addEventListener("DOMContentLoaded", () => {
    updateStudentHeaderUI();
    renderSubjectTopics();
    renderOnlineExamsList();
    renderStudentProgressView();

    document.addEventListener("click", (e) => {
        const wrapper = document.getElementById("topicsNavDropdownWrapper");
        const menu = document.getElementById("topicsNavDropdownMenu");
        if (wrapper && menu && !wrapper.contains(e.target)) {
            menu.classList.add("hidden");
        }
    });

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

// ==================== MENU XỔ XUỐNG CHỦ ĐỀ 10 MÔN HỌC ====================
function toggleTopicsNavDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById("topicsNavDropdownMenu");
    if (menu) menu.classList.toggle("hidden");
}

function selectTopicSubjectFromNav(subjectName) {
    const menu = document.getElementById("topicsNavDropdownMenu");
    if (menu) menu.classList.add("hidden");

    const subSel = document.getElementById("topicSubjectFilter");
    if (subSel) subSel.value = subjectName;

    const lbl = document.getElementById("navTopicsLabel");
    if (lbl) lbl.textContent = `Chủ đề: ${subjectName}`;

    switchMainTab("topics");
    renderSubjectTopics();
}

function renderSubjectTopics() {
    const subject = document.getElementById("topicSubjectFilter")?.value || "Toán học";
    const grade = document.getElementById("topicGradeFilter")?.value || "10";
    const grid = document.getElementById("mathTopicsGrid");
    const heading = document.getElementById("topicSectionHeading");
    const navLbl = document.getElementById("navTopicsLabel");

    if (heading) {
        heading.textContent = `📚 Hệ Thống Chủ Đề ${subject} (Khối ${grade}) – Kết Nối Tri Thức Với Cuộc Sống`;
    }
    if (navLbl && document.getElementById("nav-topics")?.classList.contains("bg-white")) {
        navLbl.textContent = `Chủ đề: ${subject}`;
    }
    if (!grid) return;

    const subjectData = CURRICULUM_TOPICS_DB[subject] || {};
    const list = subjectData[grade] || [];

    grid.innerHTML = list.map(item => `
        <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 hover:border-blue-400 transition flex flex-col justify-between space-y-3">
            <div>
                <span class="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">${subject} ${grade} • KNTT</span>
                <h3 class="font-bold text-sm text-slate-900 mt-2">${item.title}</h3>
                <p class="text-xs text-slate-600 mt-1 leading-relaxed">${item.desc}</p>
            </div>
            <button onclick="askTopicWithTutor('${subject.replace(/'/g, "\\'")}', '${item.title.replace(/'/g, "\\'")}', '${grade}')" class="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-xl text-xs">📖 Ôn tập & Luyện bài với Gia sư AI</button>
        </div>
    `).join("");
}

function askTopicWithTutor(subject, topicTitle, grade) {
    switchMainTab("tutor");
    const subSel = document.getElementById("tutorSubjectSelect");
    if (subSel) subSel.value = subject;
    document.getElementById("tutorGradeSelect").value = grade;
    document.getElementById("tutorPromptInput").value = `Thầy (Cô) tóm tắt giúp em kiến thức trọng tâm của "${topicTitle}" (Môn ${subject} - Lớp ${grade}) và cho em 1 câu hỏi/bài tập ví dụ dễ để luyện tập nhé!`;
    handleSendTutor();
}

// ==================== BỘ VẼ ĐỒ THỊ TOÁN HỌC CHÍNH XÁC TỪNG PIXEL ====================
function buildMathEvaluator(exprRaw) {
    let jsExpr = String(exprRaw || "")
        .replace(/\$/g, "")
        .replace(/^y\s*=\s*/i, "")
        .replace(/\^/g, "**")
        .replace(/(\d)([a-zA-Z(])/g, "$1*$2")
        .replace(/(\))(\()/g, "$1*$2")
        .replace(/(\))([a-zA-Z0-9])/g, "$1*$2")
        .replace(/\bsin\b/gi, "Math.sin")
        .replace(/\bcos\b/gi, "Math.cos")
        .replace(/\btan\b/gi, "Math.tan")
        .replace(/\bsqrt\b/gi, "Math.sqrt")
        .replace(/\babs\b/gi, "Math.abs")
        .replace(/\bln\b/gi, "Math.log")
        .replace(/\blog\b/gi, "Math.log10")
        .replace(/\bexp\b/gi, "Math.exp")
        .replace(/\bpi\b/gi, "Math.PI")
        .replace(/\be\b/g, "Math.E");

    try {
        const fn = new Function("x", `try { const v = (${jsExpr}); return Number.isFinite(v) ? v : NaN; } catch(e) { return NaN; }`);
        fn(0);
        return fn;
    } catch (_) {
        return null;
    }
}

function generateExactFunctionSvg(plotSpec) {
    const cleanSpec = String(plotSpec || "").replace(/\s+/g, " ").trim();
    const parts = cleanSpec.split("|").map(s => s.trim());
    const expr = (parts[0] || "x^2").replace(/\$/g, "").replace(/^y\s*=\s*/i, "");
    let xmin = -4, xmax = 4, ymin = -2, ymax = 6;
    const specialPts = [];

    for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (/^xmin\s*=/i.test(p)) xmin = parseFloat(p.split("=")[1]);
        else if (/^xmax\s*=/i.test(p)) xmax = parseFloat(p.split("=")[1]);
        else if (/^ymin\s*=/i.test(p)) ymin = parseFloat(p.split("=")[1]);
        else if (/^ymax\s*=/i.test(p)) ymax = parseFloat(p.split("=")[1]);
        else if (/^points\s*=/i.test(p)) {
            const rawPts = p.split("=")[1] || "";
            const matches = rawPts.match(/\(\s*[-+0-9.]+\s*[,;]\s*[-+0-9.]+\s*\)/g) || [];
            matches.forEach(m => {
                const nums = m.replace(/[()]/g, "").split(/[,;]/).map(Number);
                if (nums.length === 2 && Number.isFinite(nums[0]) && Number.isFinite(nums[1])) {
                    specialPts.push({ x: nums[0], y: nums[1] });
                }
            });
        }
    }

    if (!Number.isFinite(xmin) || xmin >= 0) xmin = -3;
    if (!Number.isFinite(xmax) || xmax <= 0) xmax = 3;
    if (!Number.isFinite(ymin) || ymin >= 0) ymin = -2;
    if (!Number.isFinite(ymax) || ymax <= 0) ymax = 6;

    const fn = buildMathEvaluator(expr);
    if (!fn) return "";

    const spanX = xmax - xmin;
    const spanY = ymax - ymin;
    const targetMaxPx = 380;
    const unitPx = Math.max(24, Math.min(48, Math.floor(targetMaxPx / Math.max(spanX, spanY))));
    const pad = 34;
    const plotW = spanX * unitPx;
    const plotH = spanY * unitPx;
    const svgW = plotW + pad * 2;
    const svgH = plotH + pad * 2;

    const toPxX = (x) => pad + (x - xmin) * unitPx;
    const toPxY = (y) => pad + (ymax - y) * unitPx;
    const originX = toPxX(0);
    const originY = toPxY(0);

    let gridSvg = "";
    const stepX = spanX > 12 ? 2 : 1;
    const stepY = spanY > 12 ? 2 : 1;

    for (let gx = Math.ceil(xmin); gx <= Math.floor(xmax); gx++) {
        const px = toPxX(gx);
        gridSvg += `<line x1="${px}" y1="${pad}" x2="${px}" y2="${pad + plotH}" stroke="#e2e8f0" stroke-width="1"/>`;
        if (gx !== 0 && gx % stepX === 0) {
            gridSvg += `<line x1="${px}" y1="${originY - 3}" x2="${px}" y2="${originY + 3}" stroke="#334155" stroke-width="1.3"/>`;
            gridSvg += `<text x="${px}" y="${originY + 15}" font-size="11" font-family="Arial, sans-serif" fill="#334155" text-anchor="middle">${gx}</text>`;
        }
    }

    for (let gy = Math.ceil(ymin); gy <= Math.floor(ymax); gy++) {
        const py = toPxY(gy);
        gridSvg += `<line x1="${pad}" y1="${py}" x2="${pad + plotW}" y2="${py}" stroke="#e2e8f0" stroke-width="1"/>`;
        if (gy !== 0 && gy % stepY === 0) {
            gridSvg += `<line x1="${originX - 3}" y1="${py}" x2="${originX + 3}" y2="${py}" stroke="#334155" stroke-width="1.3"/>`;
            gridSvg += `<text x="${originX - 8}" y="${py + 4}" font-size="11" font-family="Arial, sans-serif" fill="#334155" text-anchor="end">${gy}</text>`;
        }
    }

    let curvePaths = "";
    let dSeg = "";
    let prevY = null;
    const samples = 400;
    const dx = spanX / samples;

    for (let i = 0; i <= samples; i++) {
        const x = xmin + i * dx;
        const y = fn(x);
        if (!Number.isFinite(y) || y < ymin - 0.3 || y > ymax + 0.3 || (prevY !== null && Math.abs(y - prevY) > spanY * 0.6)) {
            if (dSeg) {
                curvePaths += `<path d="${dSeg}" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round"/>`;
                dSeg = "";
            }
            prevY = Number.isFinite(y) ? y : null;
            continue;
        }
        const px = toPxX(x).toFixed(1);
        const py = toPxY(y).toFixed(1);
        dSeg += dSeg === "" ? `M ${px} ${py}` : ` L ${px} ${py}`;
        prevY = y;
    }
    if (dSeg) {
        curvePaths += `<path d="${dSeg}" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round"/>`;
    }

    let ptsSvg = "";
    specialPts.forEach((pt, idx) => {
        if (pt.x < xmin || pt.x > xmax || pt.y < ymin || pt.y > ymax) return;
        const px = toPxX(pt.x);
        const py = toPxY(pt.y);
        if (pt.x !== 0 && pt.y !== 0) {
            ptsSvg += `<line x1="${px}" y1="${py}" x2="${px}" y2="${originY}" stroke="#94a3b8" stroke-width="1.1" stroke-dasharray="4,3"/>`;
            ptsSvg += `<line x1="${px}" y1="${py}" x2="${originX}" y2="${py}" stroke="#94a3b8" stroke-width="1.1" stroke-dasharray="4,3"/>`;
        }
        const isVertex = idx === 0;
        const dotColor = isVertex ? "#dc2626" : "#1d4ed8";
        ptsSvg += `<circle cx="${px}" cy="${py}" r="${isVertex ? 4.5 : 3.5}" fill="${dotColor}" stroke="#ffffff" stroke-width="1.2"/>`;
        if (isVertex) {
            ptsSvg += `<text x="${px + 8}" y="${py - 8}" font-size="11.5" font-weight="bold" font-family="Arial, sans-serif" fill="#dc2626">I(${pt.x}; ${pt.y})</text>`;
        }
    });

    const uid = "ax_" + Math.random().toString(36).slice(2, 7);
    return `
    <div class="my-3 p-3 bg-white border border-blue-200 rounded-xl flex flex-col items-center overflow-x-auto shadow-xs">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" class="max-w-full h-auto">
            <defs>
                <marker id="${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0f172a"/>
                </marker>
            </defs>
            <rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#ffffff"/>
            ${gridSvg}
            <line x1="${pad - 12}" y1="${originY}" x2="${pad + plotW + 16}" y2="${originY}" stroke="#0f172a" stroke-width="1.8" marker-end="url(#${uid})"/>
            <text x="${pad + plotW + 18}" y="${originY + 15}" font-size="13" font-style="italic" font-weight="bold" font-family="Times New Roman, serif" fill="#0f172a">x</text>
            <line x1="${originX}" y1="${pad + plotH + 12}" x2="${originX}" y2="${pad - 16}" stroke="#0f172a" stroke-width="1.8" marker-end="url(#${uid})"/>
            <text x="${originX - 15}" y="${pad - 12}" font-size="13" font-style="italic" font-weight="bold" font-family="Times New Roman, serif" fill="#0f172a">y</text>
            <text x="${originX - 12}" y="${originY + 15}" font-size="12" font-family="Arial, sans-serif" fill="#0f172a">O</text>
            ${curvePaths}
            ${ptsSvg}
        </svg>
        <span class="text-xs font-semibold text-blue-900 mt-1">Đồ thị hàm số y = ${expr}</span>
    </div>`;
}

// ==================== BỘ DỰNG HÌNH HỌC KHÔNG GIAN 3D CHUẨN PHÉP CHIẾU SONG SONG ====================
function generateExact3DShapeSvg(shapeSpec) {
    const cleanSpec = String(shapeSpec || "").replace(/\s+/g, " ").trim();
    const parts = cleanSpec.split("|").map(s => s.trim());
    const shapeType = (parts[0] || "pyramid_quad").toLowerCase();
    let customLabels = [];
    let altitudeType = "";
    let extraSpecs = [];

    for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (/^labels\s*=/i.test(p)) {
            customLabels = p.split("=")[1].split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        } else if (/^altitude\s*=/i.test(p)) {
            altitudeType = p.split("=")[1].trim().toUpperCase();
        } else if (/^extra\s*=/i.test(p)) {
            extraSpecs = p.split("=")[1].split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        }
    }

    const vertices = {};
    const edges = [];
    let caption = "Hình minh họa hình học không gian";

    const addEdge = (u, v, style = "solid", color = "#0f172a") => {
        if (vertices[u] && vertices[v]) {
            edges.push({ u, v, style, color });
        }
    };

    const isBoxShape = /box|cube|hop|hộp|lap_phuong|lập phương|chu_nhat|chữ nhật/i.test(shapeType) || customLabels.length >= 8;
    const isPrismTriShape = !isBoxShape && (/prism|lang_tru|lăng trụ/i.test(shapeType) || customLabels.length === 6);
    const isPyramidTriShape = !isBoxShape && !isPrismTriShape && (/pyramid_tri|chop_tam_giac|tu_dien|tứ diện/i.test(shapeType) || customLabels.length === 4);

    if (shapeType.includes("oxyz")) {
        const uid = "xyz_" + Math.random().toString(36).slice(2, 7);
        return `
        <div class="my-3 p-3 bg-white border border-blue-200 rounded-xl flex flex-col items-center overflow-x-auto shadow-xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 260" width="360" height="260" class="max-w-full h-auto">
                <defs>
                    <marker id="${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0f172a"/>
                    </marker>
                </defs>
                <rect x="0" y="0" width="360" height="260" fill="#ffffff"/>
                <line x1="150" y1="150" x2="70" y2="230" stroke="#0f172a" stroke-width="1.8" marker-end="url(#${uid})"/>
                <text x="56" y="238" font-size="14" font-style="italic" font-weight="bold" font-family="Times New Roman, serif">x</text>
                <line x1="150" y1="150" x2="310" y2="150" stroke="#0f172a" stroke-width="1.8" marker-end="url(#${uid})"/>
                <text x="318" y="155" font-size="14" font-style="italic" font-weight="bold" font-family="Times New Roman, serif">y</text>
                <line x1="150" y1="150" x2="150" y2="30" stroke="#0f172a" stroke-width="1.8" marker-end="url(#${uid})"/>
                <text x="158" y="34" font-size="14" font-style="italic" font-weight="bold" font-family="Times New Roman, serif">z</text>
                <text x="132" y="146" font-size="13" font-weight="bold" font-family="Arial, sans-serif">O</text>
                <line x1="150" y1="150" x2="123" y2="177" stroke="#dc2626" stroke-width="2.2" marker-end="url(#${uid})"/>
                <text x="115" y="166" font-size="12" font-weight="bold" fill="#dc2626">i</text>
                <line x1="150" y1="150" x2="195" y2="150" stroke="#1d4ed8" stroke-width="2.2" marker-end="url(#${uid})"/>
                <text x="185" y="142" font-size="12" font-weight="bold" fill="#1d4ed8">j</text>
                <line x1="150" y1="150" x2="150" y2="105" stroke="#059669" stroke-width="2.2" marker-end="url(#${uid})"/>
                <text x="158" y="112" font-size="12" font-weight="bold" fill="#059669">k</text>
            </svg>
            <span class="text-xs font-semibold text-blue-900 mt-1">Hệ trục tọa độ Oxyz trong không gian</span>
        </div>`;
    } else if (isBoxShape) {
        const L = customLabels.length >= 8 ? customLabels : ["A", "B", "C", "D", "A'", "B'", "C'", "D'"];
        const isCube = /cube|lap_phuong|lập phương/i.test(shapeType);
        vertices[L[0]] = { x: 125, y: 185, dx: -15, dy: -4 };
        vertices[L[1]] = { x: 75, y: 235, dx: -16, dy: 8 };
        vertices[L[2]] = { x: isCube ? 215 : 245, y: 235, dx: 8, dy: 8 };
        vertices[L[3]] = { x: isCube ? 265 : 295, y: 185, dx: 8, dy: 4 };

        const h = isCube ? 135 : 120;
        vertices[L[4]] = { x: 125, y: 185 - h, dx: -16, dy: -6 };
        vertices[L[5]] = { x: 75, y: 235 - h, dx: -16, dy: -4 };
        vertices[L[6]] = { x: (isCube ? 215 : 245), y: 235 - h, dx: 8, dy: -4 };
        vertices[L[7]] = { x: (isCube ? 265 : 295), y: 185 - h, dx: 8, dy: -6 };

        addEdge(L[0], L[1], "dashed");
        addEdge(L[0], L[3], "dashed");
        addEdge(L[0], L[4], "dashed");
        addEdge(L[1], L[2], "solid");
        addEdge(L[2], L[3], "solid");
        addEdge(L[4], L[5], "solid");
        addEdge(L[5], L[6], "solid");
        addEdge(L[6], L[7], "solid");
        addEdge(L[7], L[4], "solid");
        addEdge(L[1], L[5], "solid");
        addEdge(L[2], L[6], "solid");
        addEdge(L[3], L[7], "solid");
        caption = `${isCube ? "Hình lập phương" : "Hình hộp"} ${L[0]}${L[1]}${L[2]}${L[3]}.${L[4]}${L[5]}${L[6]}${L[7]}`;
    } else if (isPyramidTriShape) {
        const L = customLabels.length >= 4 ? customLabels : ["S", "A", "B", "C"];
        vertices[L[1]] = { x: 85, y: 195, dx: -16, dy: 5 };
        vertices[L[2]] = { x: 185, y: 238, dx: -4, dy: 16 };
        vertices[L[3]] = { x: 305, y: 195, dx: 8, dy: 5 };

        let sx = 175, sy = 42;
        if (altitudeType === "A" || altitudeType === L[1]) {
            sx = vertices[L[1]].x;
            sy = 42;
        } else if (altitudeType === "H") {
            const hx = (vertices[L[1]].x + vertices[L[2]].x) / 2;
            const hy = (vertices[L[1]].y + vertices[L[2]].y) / 2;
            vertices["H"] = { x: hx, y: hy, dx: -14, dy: 12 };
            sx = hx;
            sy = 42;
            addEdge(L[0], "H", "dashed", "#dc2626");
        } else if (altitudeType === "O" || altitudeType === "G") {
            const gx = (vertices[L[1]].x + vertices[L[2]].x + vertices[L[3]].x) / 3;
            const gy = (vertices[L[1]].y + vertices[L[2]].y + vertices[L[3]].y) / 3;
            const foot = altitudeType === "O" ? "O" : "G";
            vertices[foot] = { x: gx, y: gy, dx: 6, dy: 12 };
            sx = gx;
            sy = 42;
            addEdge(L[0], foot, "dashed", "#dc2626");
        }
        vertices[L[0]] = { x: sx, y: sy, dx: -4, dy: -8 };

        addEdge(L[1], L[2], "solid");
        addEdge(L[2], L[3], "solid");
        addEdge(L[1], L[3], "dashed");
        addEdge(L[0], L[1], "solid");
        addEdge(L[0], L[2], "solid");
        addEdge(L[0], L[3], "solid");
        caption = `Hình chóp ${L[0]}.${L[1]}${L[2]}${L[3]}`;
    } else if (isPrismTriShape) {
        const L = customLabels.length >= 6 ? customLabels : ["A", "B", "C", "A'", "B'", "C'"];
        vertices[L[0]] = { x: 95, y: 205, dx: -16, dy: 5 };
        vertices[L[1]] = { x: 185, y: 242, dx: -4, dy: 16 };
        vertices[L[2]] = { x: 295, y: 205, dx: 8, dy: 5 };
        const shiftX = altitudeType === "SLANT" ? 28 : 0;
        const shiftY = -145;
        vertices[L[3]] = { x: 95 + shiftX, y: 205 + shiftY, dx: -18, dy: -4 };
        vertices[L[4]] = { x: 185 + shiftX, y: 242 + shiftY, dx: -4, dy: -8 };
        vertices[L[5]] = { x: 295 + shiftX, y: 205 + shiftY, dx: 8, dy: -4 };

        addEdge(L[0], L[1], "solid");
        addEdge(L[1], L[2], "solid");
        addEdge(L[0], L[2], "dashed");
        addEdge(L[3], L[4], "solid");
        addEdge(L[4], L[5], "solid");
        addEdge(L[3], L[5], "solid");
        addEdge(L[0], L[3], "solid");
        addEdge(L[1], L[4], "solid");
        addEdge(L[2], L[5], "solid");
        caption = `Hình lăng trụ ${L[0]}${L[1]}${L[2]}.${L[3]}${L[4]}${L[5]}`;
    } else {
        const L = customLabels.length >= 5 ? customLabels : ["S", "A", "B", "C", "D"];
        vertices[L[1]] = { x: 125, y: 185, dx: -15, dy: -3 };
        vertices[L[2]] = { x: 68, y: 238, dx: -16, dy: 8 };
        vertices[L[3]] = { x: 252, y: 238, dx: 8, dy: 8 };
        vertices[L[4]] = { x: 308, y: 185, dx: 8, dy: 4 };

        let sx = 175, sy = 40;
        if (altitudeType === "A" || altitudeType === L[1]) {
            sx = vertices[L[1]].x;
            sy = 40;
        } else if (altitudeType === "O") {
            const ox = (vertices[L[1]].x + vertices[L[3]].x) / 2;
            const oy = (vertices[L[1]].y + vertices[L[3]].y) / 2;
            vertices["O"] = { x: ox, y: oy, dx: 5, dy: 12 };
            sx = ox;
            sy = 40;
            addEdge(L[1], L[3], "dashed", "#64748b");
            addEdge(L[2], L[4], "dashed", "#64748b");
            addEdge(L[0], "O", "dashed", "#dc2626");
        } else if (altitudeType === "H") {
            const hx = (vertices[L[1]].x + vertices[L[2]].x) / 2;
            const hy = (vertices[L[1]].y + vertices[L[2]].y) / 2;
            vertices["H"] = { x: hx, y: hy, dx: -15, dy: 10 };
            sx = hx;
            sy = 40;
            addEdge(L[0], "H", "dashed", "#dc2626");
        }
        vertices[L[0]] = { x: sx, y: sy, dx: -4, dy: -8 };

        addEdge(L[1], L[2], "dashed");
        addEdge(L[1], L[4], "dashed");
        addEdge(L[0], L[1], "dashed");
        addEdge(L[2], L[3], "solid");
        addEdge(L[3], L[4], "solid");
        addEdge(L[0], L[2], "solid");
        addEdge(L[0], L[3], "solid");
        addEdge(L[0], L[4], "solid");
        caption = `Hình chóp ${L[0]}.${L[1]}${L[2]}${L[3]}${L[4]}`;
    }

    extraSpecs.forEach(item => {
        const m = item.match(/^(solid|dashed)\s*:\s*([A-Z0-9']+)\s*-\s*([A-Z0-9']+)$/i);
        if (m) {
            const style = m[1].toLowerCase();
            const u = m[2];
            const v = m[3];
            const already = edges.some(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
            if (!already) addEdge(u, v, style, "#1d4ed8");
        }
    });

    const linesSvg = edges.map(e => {
        const p1 = vertices[e.u];
        const p2 = vertices[e.v];
        const dashAttr = e.style === "dashed" ? `stroke-dasharray="5,4"` : "";
        return `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${e.color}" stroke-width="1.8" ${dashAttr}/>`;
    }).join("");

    const ptsSvg = Object.entries(vertices).map(([name, pt]) => `
        <circle cx="${pt.x}" cy="${pt.y}" r="2.6" fill="#0f172a"/>
        <text x="${pt.x + pt.dx}" y="${pt.y + pt.dy}" font-size="13" font-weight="bold" font-family="Times New Roman, serif" fill="#0f172a">${name}</text>
    `).join("");

    return `
    <div class="my-3 p-3 bg-white border border-blue-200 rounded-xl flex flex-col items-center overflow-x-auto shadow-xs">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 270" width="380" height="270" class="max-w-full h-auto">
            <rect x="0" y="0" width="380" height="270" fill="#ffffff"/>
            ${linesSvg}
            ${ptsSvg}
        </svg>
        <span class="text-xs font-semibold text-blue-900 mt-1">${caption} (Nét đứt là đường khuất)</span>
    </div>`;
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

// ==================== ĐIỀU HƯỚNG CÁC TAB CHÍNH ====================
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

    if (tabId === "topics") renderSubjectTopics();
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
        const tGradeSel = document.getElementById("topicGradeFilter");
        if (tGradeSel && ["10", "11", "12"].includes(String(currentStudentProfile.grade))) {
            tGradeSel.value = String(currentStudentProfile.grade);
        }
        const weakChk = document.getElementById("weakModeCheckbox");
        if (weakChk) weakChk.checked = Boolean(currentStudentProfile.is_weak_mode);
    } else {
        lbl.textContent = "Đăng nhập Mã HS";
    }
}

// ==================== GIA SƯ AI & HIỂN THỊ MARKDOWN + KATEX + ĐỒ THỊ + HÌNH 3D ====================
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

function markdownTextToHtml(mdText) {
    const mathTokens = [];
    let safeText = mdText.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (m) => {
        const idx = mathTokens.length;
        mathTokens.push(m);
        return `@@MATH_${idx}@@`;
    });

    const lines = safeText.split("\n");
    const out = [];
    let tableRows = [];

    const flushTable = () => {
        if (tableRows.length === 0) return;
        const parsedRows = tableRows
            .filter(r => !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(r))
            .map(r => r.replace(/^\||\|$/g, "").split("|").map(c => c.trim()));

        if (parsedRows.length > 0) {
            let tblHtml = `<div class="overflow-x-auto my-3"><table class="min-w-full border-collapse border border-slate-300 text-xs sm:text-sm bg-white rounded-lg">`;
            parsedRows.forEach((cells, rIdx) => {
                tblHtml += `<tr>`;
                cells.forEach(cell => {
                    const tag = rIdx === 0 ? "th" : "td";
                    const cls = rIdx === 0
                        ? "border border-slate-300 px-3 py-1.5 bg-blue-50 text-blue-950 font-bold text-center"
                        : "border border-slate-300 px-3 py-1.5 text-slate-800 text-center font-medium";
                    tblHtml += `<${tag} class="${cls}">${cell}</${tag}>`;
                });
                tblHtml += `</tr>`;
            });
            tblHtml += `</table></div>`;
            out.push(tblHtml);
        }
        tableRows = [];
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (/^\s*\|.+\|\s*$/.test(line)) {
            tableRows.push(line.trim());
            continue;
        }
        flushTable();

        if (/^\s*---+\s*$/.test(line)) {
            out.push(`<hr class="my-3 border-slate-200">`);
        } else if (/^###\s+(.+)$/.test(line)) {
            const hTxt = line.replace(/^###\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1");
            out.push(`<h4 class="font-bold text-sm sm:text-base text-blue-900 mt-3 mb-1">${hTxt}</h4>`);
        } else if (/^##\s+(.+)$/.test(line)) {
            const hTxt = line.replace(/^##\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1");
            out.push(`<h3 class="font-bold text-base text-blue-950 mt-3 mb-1">${hTxt}</h3>`);
        } else if (/^\s*[-*]\s+(.+)$/.test(line)) {
            const itemTxt = line.replace(/^\s*[-*]\s+/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
            out.push(`<div class="flex items-start gap-2 my-1 pl-2"><span class="text-blue-700 font-bold">•</span><span class="flex-1">${itemTxt}</span></div>`);
        } else if (line.trim() === "") {
            out.push(`<div class="h-1.5"></div>`);
        } else {
            const formatted = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
            out.push(`<p class="leading-relaxed my-0.5">${formatted}</p>`);
        }
    }
    flushTable();

    let finalHtml = out.join("");
    finalHtml = finalHtml.replace(/@@MATH_(\d+)@@/g, (_, idx) => mathTokens[Number(idx)] || "");
    return finalHtml;
}

function renderAiMessageWithSvg(containerEl, rawText) {
    const plotBlocks = [];
    let cleanedText = String(rawText || "")
        .replace(/`*\[\[\s*PLOT\s*:([\s\S]*?)\]\]`*/gi, (_, spec) => {
            const idx = plotBlocks.length;
            plotBlocks.push(generateExactFunctionSvg(spec));
            return `\n@@PLOT_BLOCK_${idx}@@\n`;
        });

    const shape3DBlocks = [];
    cleanedText = cleanedText.replace(/`*\[\[\s*SHAPE3D\s*:([\s\S]*?)\]\]`*/gi, (_, spec) => {
        const idx = shape3DBlocks.length;
        shape3DBlocks.push(generateExact3DShapeSvg(spec));
        return `\n@@SHAPE3D_BLOCK_${idx}@@\n`;
    });

    const svgBlocks = [];
    cleanedText = cleanedText
        .replace(/```(?:xml|svg|html)?\s*(<svg[\s\S]*?<\/svg>)\s*```/gi, "$1")
        .replace(/<svg[\s\S]*?<\/svg>/gi, (svgStr) => {
            const idx = svgBlocks.length;
            svgBlocks.push(`<div class="my-3 p-3 bg-white border border-blue-200 rounded-xl flex justify-center overflow-x-auto shadow-xs">${svgStr}</div>`);
            return `\n@@SVG_BLOCK_${idx}@@\n`;
        });

    let htmlContent = markdownTextToHtml(cleanedText);
    htmlContent = htmlContent
        .replace(/@@PLOT_BLOCK_(\d+)@@/g, (_, idx) => plotBlocks[Number(idx)] || "")
        .replace(/@@SHAPE3D_BLOCK_(\d+)@@/g, (_, idx) => shape3DBlocks[Number(idx)] || "")
        .replace(/@@SVG_BLOCK_(\d+)@@/g, (_, idx) => svgBlocks[Number(idx)] || "");

    containerEl.innerHTML = `<div class="space-y-1 text-slate-800">${htmlContent}</div>`;
    renderKatexInElement(containerEl);
}

async function streamDirectFromVietnamClient(keyList, payloadObj, onDeltaText) {
    const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];
    let lastErr = "Không thể kết nối trực tiếp tới Google AI.";

    for (let i = 0; i < keyList.length; i++) {
        const key = keyList[i];
        const model = models[i % models.length];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
        const directRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadObj)
        });

        if (directRes.ok && directRes.body) {
            const reader = directRes.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buf = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop();
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.slice(6).trim();
                        if (!dataStr || dataStr === "[DONE]") continue;
                        try {
                            const parsed = JSON.parse(dataStr);
                            const delta = (parsed.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
                            if (delta) onDeltaText(delta);
                        } catch (_) {}
                    }
                }
            }
            return;
        }
        lastErr = `Lỗi AI (${directRes.status}): ${(await directRes.text()).slice(0, 200)}`;
    }
    throw new Error(lastErr);
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
    aiBubble.className = "max-w-[92%] bg-slate-50 border-l-4 border-blue-600 text-slate-800 rounded-r-2xl px-4 py-3.5 text-sm shadow-xs";
    aiBubble.innerHTML = `<div class="dot-pulse"><span></span><span></span><span></span></div>`;
    aiRow.appendChild(aiBubble);
    box.appendChild(aiRow);
    box.scrollTop = box.scrollHeight;

    const imgPayload = currentAttachedImage;
    inputEl.value = "";
    clearAttachedImg();
    btn.disabled = true;

    const activeKey = resolveActiveGeminiKey();
    let fullText = "";
    let lastRenderTime = 0;

    const handleDelta = (delta) => {
        fullText += delta;
        const now = Date.now();
        if (now - lastRenderTime > 160) {
            lastRenderTime = now;
            const streamPreview = fullText
                .replace(/\[\[\s*(?:PLOT|SHAPE3D):[\s\S]*$/i, "\n⏳ Đang dựng hình minh họa...")
                .replace(/<svg[\s\S]*$/i, "\n⏳ Đang dựng hình...");
            aiBubble.innerHTML = `<div class="space-y-1 text-slate-800">${markdownTextToHtml(streamPreview)}</div>`;
            box.scrollTop = box.scrollHeight;
        }
    };

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
                history: chatConversationHistory.slice(-2),
                mode: "student_tutor",
                apiKey: activeKey
            })
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({ error: "Không kết nối được máy chủ AI" }));
            const serverKeys = Array.isArray(errJson.keys) && errJson.keys.length > 0
                ? errJson.keys
                : (activeKey ? [activeKey] : []);

            if ((errJson.locationBlocked || String(errJson.error || "").includes("User location is not supported")) && serverKeys.length > 0) {
                const sysPrompt = `Gia sư AI Trường THPT Đa Kia, xưng "Thầy (Cô)", gọi học sinh "em". Bám sát SGK Kết nối tri thức Lớp ${grade}.
${isWeak ? "Chế độ HỖ TRỢ NỀN TẢNG: giải thích cực kỳ ngắn gọn, dễ hiểu, nhắc công thức cơ bản rồi gợi mở bước đầu tiên." : "Trả lời súc tích, rõ từng bước, không dài dòng."}
Quy tắc công thức & hình vẽ:
- Công thức đặt trong $...$.
- KHÔNG tự viết thẻ <svg> bằng tay.
- Khi vẽ ĐỒ THỊ HÀM SỐ $y = f(x)$, xuất đúng 1 dòng: [[PLOT: biểu_thức | xmin=-4 | xmax=4 | ymin=-2 | ymax=6 | points=(x1,y1);(x2,y2)]]
- Khi vẽ HÌNH HỌC KHÔNG GIAN 3D, xuất đúng 1 dòng theo cú pháp:
  [[SHAPE3D: loại_hình | labels=tên_đỉnh | altitude=chân_đường_cao | extra=nét_thêm]]
  Trong đó loại_hình BẮT BUỘC chọn 1 trong 5 mã tiếng Anh sau:
  + pyramid_tri (chóp tam giác, VD: [[SHAPE3D: pyramid_tri | labels=S,A,B,C | altitude=A]])
  + pyramid_quad (chóp tứ giác, VD: [[SHAPE3D: pyramid_quad | labels=S,A,B,C,D | altitude=O]])
  + prism_tri (lăng trụ tam giác, VD: [[SHAPE3D: prism_tri | labels=A,B,C,A',B',C']])
  + box (hình hộp chữ nhật hoặc hình lập phương, VD: [[SHAPE3D: box | labels=A,B,C,D,A',B',C',D']])
  + oxyz (hệ trục tọa độ không gian Oxyz, VD: [[SHAPE3D: oxyz]])`;

                const directParts = [];
                if (imgPayload) {
                    const m = imgPayload.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
                    if (m) directParts.push({ inlineData: { mimeType: m[1], data: m[2] } });
                }
                directParts.push({ text: `[Môn ${subject} - Lớp ${grade}] ${msg || "Hướng dẫn giải chi tiết bài tập trong ảnh."}` });

                const shuffled = [...serverKeys].sort(() => Math.random() - 0.5);
                await streamDirectFromVietnamClient(shuffled, {
                    systemInstruction: { parts: [{ text: sysPrompt }] },
                    contents: [{ role: "user", parts: directParts }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
                }, handleDelta);
            } else {
                throw new Error(errJson.error || "Không kết nối được máy chủ AI");
            }
        } else {
            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let sseBuffer = "";

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
                            if (delta) handleDelta(delta);
                        } catch (_) {}
                    }
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
