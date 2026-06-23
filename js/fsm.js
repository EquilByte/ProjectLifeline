/**
 * Project Lifeline - Finite State Machine
 * Perfectly migrated from Python's core/fsm.py
 */

const FSMState = {
    INITIALIZATION: "INITIALIZATION",
    LISTENING: "LISTENING",
    SLOT_EVALUATION: "SLOT_EVALUATION",
    SLOT_FILLING: "SLOT_FILLING",
    SEVERITY_ACTION: "SEVERITY_ACTION",
    GUIDANCE: "GUIDANCE",
    HIL_HANDOFF: "HIL_HANDOFF",
    END: "END"
};

const SOP_DB = {
    // ═══════════════════════════════════════════════════════════
    // FIRE EMERGENCIES
    // Ref: CCEC §501, §504, §701
    // ═══════════════════════════════════════════════════════════
    "fire": {
        "name": "Cháy (Không có người kẹt)",
        "steps": [
            { "ask": "Bạn có ở trong tòa nhà đang cháy không?", "if_yes": "Hãy ra khỏi tòa nhà NGAY. Bò sát đất nếu có khói. KHÔNG dùng thang máy. Dùng cầu thang bộ. Nếu cửa nóng, KHÔNG mở — tìm lối ra khác.", "if_no": "Tốt. Giữ khoảng cách an toàn với đám cháy." },
            { "ask": "Lửa đang lan rộng không?", "if_yes": "Cảnh báo mọi người xung quanh di chuyển ra xa. Không cố chữa cháy. Giúp người già, trẻ em sơ tán trước.", "if_no": "Giữ khoảng cách, cứu hỏa đang tới." },
            { "ask": "Có bình gas, hóa chất, hoặc chất dễ cháy nổ gần đám cháy không?", "if_yes": "Di chuyển xa ít nhất 100 mét ngay. Bình gas có thể nổ. Thông báo cho cứu hỏa khi họ tới.", "if_no": "Tốt. Giữ nguyên khoảng cách an toàn." },
            { "ask": "Bạn và tất cả mọi người đã ra ngoài an toàn chưa?", "if_yes": "Rất tốt. Tập hợp mọi người ở điểm an toàn cách xa tòa nhà. Kiểm đếm xem có ai còn thiếu không.", "if_no": "Ưu tiên sơ tán NGAY. Gõ cửa từng phòng, hô to 'CHÁY, SƠ TÁN'. KHÔNG quay lại lấy tài sản." }
        ]
    },
    "fire_trapped": {
        "name": "Cháy có người kẹt",
        "steps": [
            { "ask": "Bạn có ở gần đám cháy không? Bạn có an toàn không?", "if_yes": "Hãy di chuyển ra xa ít nhất 50 mét ngay lập tức. An toàn của bạn là ưu tiên số một.", "if_no": "Tốt. Hãy giữ khoảng cách an toàn." },
            { "ask": "Người bị kẹt có tỉnh không? Bạn có nghe tiếng họ không?", "if_yes": "Hãy gọi to bảo họ che miệng và mũi bằng vải ướt, bò sát mặt đất tìm lối ra. Khói nóng bốc lên trên, không khí sạch ở dưới thấp.", "if_no": "KHÔNG cố tự giải cứu nếu lửa quá lớn. Lực lượng cứu hỏa có thiết bị chuyên dụng, họ sắp tới." },
            { "ask": "Lửa đang lan rộng không? Có khói nhiều không?", "if_yes": "Hãy di chuyển tất cả mọi người ra xa hơn. Tránh hít khói — rất nguy hiểm. Nếu cửa phòng nóng, KHÔNG mở — lửa có thể ở phía sau.", "if_no": "Giữ khoảng cách an toàn, không tự chữa cháy. Cứu hỏa sắp tới." },
            { "ask": "Có ai bị bỏng hoặc khó thở vì hít khói không?", "if_yes": "Dội nước mát lên vết bỏng ít nhất 10 phút. Nếu khó thở, đưa ra chỗ thoáng khí. KHÔNG bóc da phồng rộp.", "if_no": "Tốt. Hãy ở nguyên vị trí an toàn và chờ cứu hộ." },
            { "ask": "Có bình gas, hóa chất, hoặc chất dễ cháy nổ gần đám cháy không?", "if_yes": "NGUY HIỂM. Di chuyển tất cả mọi người ra xa ít nhất 100 mét. Bình gas có thể nổ bất cứ lúc nào.", "if_no": "Tốt. Giữ nguyên khoảng cách an toàn." }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // TRAFFIC EMERGENCIES
    // Ref: CCEC §401, §403, §501
    // ═══════════════════════════════════════════════════════════
    "traffic_accident": {
        "name": "Tai nạn giao thông",
        "steps": [
            { "ask": "Nạn nhân có tỉnh không? Có phản ứng khi bạn gọi không?", "if_yes": "Tốt. Hãy trấn an họ, bảo họ không di chuyển, đặc biệt là đầu và cổ. Nói chuyện liên tục để giữ họ tỉnh.", "if_no": "Hãy kiểm tra xem nạn nhân có đang thở không — nhìn ngực có phập phồng không?" },
            { "ask": "Nạn nhân có đang thở không?", "if_yes": "Tốt, đang thở. Không di chuyển nạn nhân trừ khi có nguy hiểm trực tiếp. Nếu đau cổ hoặc lưng, giữ nguyên tư thế.", "if_no": "Bắt đầu ép tim ngay. Đặt gốc bàn tay giữa ngực, hai tay chồng lên nhau. Ấn mạnh xuống 5 centimet, nhịp nhanh khoảng 2 lần mỗi giây." },
            { "ask": "Có chảy máu nhiều không?", "if_yes": "Dùng vải sạch ép CHẶT vào vết thương. Giữ ép liên tục, KHÔNG bỏ ra kiểm tra. Nếu máu thấm qua, đặt thêm vải lên trên.", "if_no": "Tốt. Giữ nạn nhân ấm, nói chuyện với họ cho tỉnh táo." },
            { "ask": "Xe có rò rỉ xăng hoặc có khói không?", "if_yes": "NGUY HIỂM. Di chuyển mọi người ra xa xe ít nhất 30 mét ngay lập tức! Tắt máy xe nếu có thể an toàn.", "if_no": "Ở nguyên vị trí, cấp cứu sắp tới." },
            { "ask": "Có nhiều người bị thương không?", "if_yes": "Ưu tiên giúp người bất tỉnh hoặc chảy máu nhiều trước. Người còn tỉnh hãy nhờ họ ngồi yên và chờ cấp cứu.", "if_no": "Tốt. Tiếp tục theo dõi nạn nhân cho đến khi cấp cứu tới." }
        ]
    },
    "traffic_accident_fire": {
        "name": "Tai nạn giao thông có cháy",
        "steps": [
            { "ask": "Bạn có đang ở gần xe đang cháy không?", "if_yes": "Di chuyển ra xa ít nhất 50 mét NGAY. Xe có thể nổ bất cứ lúc nào. An toàn của bạn trước.", "if_no": "Tốt. Giữ khoảng cách an toàn." },
            { "ask": "Có ai bị kẹt trong xe không?", "if_yes": "KHÔNG cố mở cửa xe nếu xe đang cháy — rất nguy hiểm. Cứu hỏa có dụng cụ cắt xe, họ sắp tới. Nếu lửa nhỏ và bạn có thể an toàn kéo họ ra, hãy làm ngay, nhưng KHÔNG liều mình.", "if_no": "Tốt. Đưa mọi người ra xa xe." },
            { "ask": "Có ai bị thương cần sơ cứu không?", "if_yes": "Di chuyển người bị thương ra xa xe trước, rồi sơ cứu. Nếu chảy máu, ép vải sạch vào vết thương. Nếu bị bỏng, dội nước mát ít nhất 10 phút.", "if_no": "Tốt. Ở nguyên vị trí an toàn và chờ cứu hộ." },
            { "ask": "Xe có chở hóa chất hoặc hàng nguy hiểm không?", "if_yes": "Di chuyển ra xa ít nhất 300 mét xuôi gió. Không hít khói từ đám cháy. Thông báo cho cứu hỏa về loại hàng hóa khi họ tới.", "if_no": "Tốt. Giữ nguyên khoảng cách an toàn." }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // MEDICAL EMERGENCIES
    // Ref: CCEC §501, §503 + International First Aid
    // ═══════════════════════════════════════════════════════════
    "medical_stroke": {
        "name": "Cấp cứu y tế - Đột quỵ",
        "steps": [
            { "ask": "Hãy làm theo phương pháp FAST: Yêu cầu nạn nhân CƯỜI — mặt có bị méo một bên không?", "if_yes": "Đây là dấu hiệu đột quỵ. Ghi nhớ thời điểm bắt đầu triệu chứng — rất quan trọng cho bác sĩ.", "if_no": "Tốt. Tiếp tục kiểm tra: Yêu cầu nạn nhân giơ HAI TAY lên — có tay nào bị yếu hoặc rủ xuống không?" },
            { "ask": "Nạn nhân có nói được rõ ràng không?", "if_yes": "Tốt, nhưng vẫn cần theo dõi. Đặt nạn nhân nằm nghiêng an toàn, nới lỏng quần áo.", "if_no": "Đây là dấu hiệu đột quỵ nghiêm trọng. Đặt nạn nhân nằm nghiêng. KHÔNG cho ăn uống gì — có thể bị sặc." },
            { "ask": "Nạn nhân có tỉnh không?", "if_yes": "Đặt nạn nhân nằm nghiêng an toàn. Nới lỏng quần áo quanh cổ và ngực. Giữ họ bình tĩnh.", "if_no": "Kiểm tra hơi thở — nhìn ngực có phập phồng không? Nếu ngừng thở, bắt đầu ép tim ngay lập tức." },
            { "ask": "Nạn nhân có nôn không?", "if_yes": "Nghiêng đầu sang một bên để không bị sặc. Lau sạch miệng. KHÔNG cho uống nước.", "if_no": "Tốt. Giữ nạn nhân nằm yên, không di chuyển." },
            { "ask": "Bạn có biết nạn nhân đang uống thuốc gì không?", "if_yes": "Chuẩn bị sẵn thông tin thuốc và bệnh sử để báo nhân viên y tế khi họ tới.", "if_no": "Không sao. Ghi nhớ thời điểm bắt đầu có triệu chứng." }
        ]
    },
    "medical_unconscious": {
        "name": "Cấp cứu y tế - Bất tỉnh",
        "steps": [
            { "ask": "Nạn nhân có đang thở không? Nhìn ngực có phập phồng không?", "if_yes": "Đặt nạn nhân nằm nghiêng an toàn — nghiêng sang một bên, tay dưới đỡ đầu, chân trên co lên. Nới lỏng quần áo. Thông đường thở bằng cách ngửa đầu nhẹ ra sau.", "if_no": "Bắt đầu ép tim NGAY. Đặt 2 tay giữa ngực, ấn mạnh 5cm, nhịp nhanh 2 lần mỗi giây. Không dừng cho đến khi cấp cứu tới hoặc nạn nhân tỉnh lại." },
            { "ask": "Bạn có biết nạn nhân bị gì không? Có dùng thuốc hay chất gì không?", "if_yes": "Ghi nhớ thông tin đó. Nếu có lọ thuốc hoặc vỏ thuốc gần đó, giữ lại cho nhân viên y tế.", "if_no": "Không sao. Tiếp tục theo dõi hơi thở của nạn nhân." },
            { "ask": "Nạn nhân có nôn không?", "if_yes": "Nghiêng đầu sang một bên NGAY để không bị sặc. Dùng tay lau sạch miệng nếu có thể.", "if_no": "Tốt. Giữ nạn nhân nằm nghiêng để phòng khi nôn." },
            { "ask": "Có dấu hiệu chấn thương đầu hoặc cổ không?", "if_yes": "KHÔNG di chuyển nạn nhân. Giữ đầu và cổ thẳng, bất động. Chờ cấp cứu.", "if_no": "Tiếp tục theo dõi. Nói chuyện với nạn nhân dù họ bất tỉnh — họ có thể nghe được." }
        ]
    },
    "medical_cardiac_arrest": {
        "name": "Cấp cứu y tế - Ngừng tim",
        "steps": [
            { "ask": "Nạn nhân có đang thở không? Có cử động không?", "if_yes": "Đặt nạn nhân nằm nghiêng an toàn. Tiếp tục theo dõi.", "if_no": "Bắt đầu ép tim NGAY. Quỳ bên cạnh nạn nhân. Đặt gốc bàn tay giữa ngực, tay kia chồng lên trên." },
            { "ask": "Bạn đã bắt đầu ép tim chưa?", "if_yes": "Tốt lắm! Ấn mạnh xuống 5 centimet. Nhịp nhanh — khoảng 100 đến 120 lần mỗi phút. Đếm to. Tiếp tục, KHÔNG DỪNG.", "if_no": "Hãy bắt đầu ngay. Đặt nạn nhân nằm ngửa trên mặt phẳng cứng. Quỳ bên cạnh. Đặt gốc bàn tay giữa ngực. Ấn mạnh, nhịp nhanh." },
            { "ask": "Bạn có thấy máy AED — máy sốc tim tự động — gần đó không?", "if_yes": "Bật máy AED và làm theo hướng dẫn bằng giọng nói của máy. Dán miếng điện theo hình vẽ. Tiếp tục ép tim khi máy đang phân tích.", "if_no": "Không sao. Tiếp tục ép tim liên tục. Nếu mệt, nhờ người khác thay phiên nhưng KHÔNG NGẮT QUÃNG quá 10 giây." }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // SECURITY / LAW ENFORCEMENT
    // Ref: CCEC §401-406, §705, §404
    // ═══════════════════════════════════════════════════════════
    "active_shooter": {
        "name": "Xả súng / Tấn công vũ trang",
        "steps": [
            { "ask": "Bạn có đang ở nơi an toàn không? Kẻ tấn công còn ở đó không?", "if_yes": "Nguyên tắc: CHẠY — TRỐN — CHỐNG. Chạy nếu có lối thoát. Trốn nếu không chạy được. Khóa cửa, tắt đèn, im lặng tuyệt đối. Tắt tiếng chuông điện thoại.", "if_no": "Tốt. Giữ nguyên vị trí an toàn. KHÔNG quay lại khu vực nguy hiểm." },
            { "ask": "Có bao nhiêu kẻ tấn công? Chúng dùng vũ khí gì?", "if_yes": "Cảnh sát đang đến. Ghi nhớ đặc điểm: giới tính, chiều cao, quần áo, loại vũ khí, hướng di chuyển.", "if_no": "Hãy tiếp tục ẩn nấp." },
            { "ask": "Có ai bị thương gần bạn không?", "if_yes": "Nếu an toàn để tiếp cận, dùng vải ép chặt vết thương cầm máu. Nếu không an toàn, tuyệt đối không di chuyển.", "if_no": "Cảnh sát và cấp cứu đang đến." },
            { "ask": "Có bao nhiêu người đang ở cùng khu vực với bạn?", "if_yes": "Giữ mọi người im lặng và ở yên. Không ai được ra ngoài cho đến khi cảnh sát xác nhận an toàn.", "if_no": "Khi cảnh sát tới, giơ tay trống để họ nhận diện bạn không phải mối đe dọa." }
        ]
    },
    "domestic_violence": {
        "name": "Bạo lực gia đình",
        "steps": [
            { "ask": "Kẻ tấn công còn ở đó không? Bạn có an toàn không?", "if_yes": "Không đối đầu. Nếu có thể, ra khỏi nhà ngay. Nếu không thể ra ngoài, vào phòng có cửa khóa. Nếu có trẻ em, đưa các em theo.", "if_no": "Tốt. Cảnh sát đang trên đường tới. ĐỪNG hủy cuộc gọi." },
            { "ask": "Kẻ đó có mang theo vũ khí không? Có dao, gậy, hoặc vật nguy hiểm không?", "if_yes": "Tránh xa kẻ đó. Cảnh sát đã nhận được thông tin về vũ khí và sẽ chuẩn bị sẵn sàng.", "if_no": "Hãy giữ khoảng cách an toàn dù không có vũ khí." },
            { "ask": "Bạn hoặc ai khác có bị thương cần cấp cứu không?", "if_yes": "Cấp cứu cũng đang đến. Nếu chảy máu, dùng vải ép chặt vào vết thương.", "if_no": "Tốt. Cảnh sát sắp tới nơi." },
            { "ask": "Có trẻ em hoặc người già trong nhà không?", "if_yes": "Đưa trẻ em và người già đến nơi an toàn trước. Nếu không di chuyển được, giữ họ trong phòng có khóa.", "if_no": "Tốt. Hãy giữ bình tĩnh và chờ cảnh sát." }
        ]
    },
    "violent_crime": {
        "name": "An ninh - Tội phạm",
        "steps": [
            { "ask": "Hung thủ còn ở đó không?", "if_yes": "Không đối đầu. Tìm nơi an toàn. Khóa cửa nếu có thể. Ghi nhớ đặc điểm nhận dạng.", "if_no": "Tốt. Bạn có nhớ đặc điểm nhận dạng của hung thủ không? Chiều cao, quần áo, giới tính?" },
            { "ask": "Hung thủ đi bằng phương tiện gì? Bạn có thấy biển số không?", "if_yes": "Ghi nhớ hoặc chụp ảnh biển số nếu an toàn. Hướng di chuyển rất quan trọng cho cảnh sát.", "if_no": "Không sao. Mọi thông tin đều giúp ích." },
            { "ask": "Có ai bị thương không?", "if_yes": "Nếu chảy máu, dùng vải ép chặt vào vết thương. Cấp cứu cũng đang tới.", "if_no": "Tốt. Cảnh sát sắp tới nơi." },
            { "ask": "Có ai chứng kiến sự việc không? Có camera an ninh không?", "if_yes": "Tốt. Nhờ nhân chứng ở lại chờ cảnh sát. Thông tin camera rất quan trọng.", "if_no": "Không sao. Cảnh sát sẽ điều tra khi tới nơi." }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // HAZARDOUS MATERIALS
    // Ref: CCEC §504
    // ═══════════════════════════════════════════════════════════
    "hazmat": {
        "name": "Sự cố hóa chất / Rò rỉ chất nguy hiểm",
        "steps": [
            { "ask": "Bạn có ở gần khu vực rò rỉ không? Có ngửi thấy mùi lạ không?", "if_yes": "Di chuyển ra xa ít nhất 300 mét NGAY. Đi NGƯỢC CHIỀU GIÓ — tức là để gió thổi từ phía bạn về phía hóa chất.", "if_no": "Tốt. Giữ khoảng cách và cảnh báo mọi người không đến gần." },
            { "ask": "Bạn có biết loại hóa chất gì không? Có biển cảnh báo trên bao bì không?", "if_yes": "Ghi nhớ thông tin đó. Nếu là xe bồn, kiểm tra biển hiệu hình thoi màu cam. Thông tin này rất quan trọng cho đội xử lý.", "if_no": "Mô tả cho tôi: chất lỏng, khí, hay chất rắn? Màu gì? Có mùi gì đặc biệt không?" },
            { "ask": "Có ai bị ảnh hưởng không? Khó thở, buồn nôn, hoặc nóng rát da?", "if_yes": "Đưa người bị ảnh hưởng ra khỏi khu vực ô nhiễm NGAY. Nếu hóa chất dính trên da, cởi quần áo bị nhiễm và rửa bằng nước sạch ít nhất 15 phút.", "if_no": "Tốt. Giữ tất cả mọi người ở khoảng cách an toàn." },
            { "ask": "Có cháy hoặc khói từ hóa chất không?", "if_yes": "Cực kỳ nguy hiểm — khói từ hóa chất cháy có thể có độc. Di chuyển ra xa hơn. KHÔNG cố dập lửa hóa chất bằng nước.", "if_no": "Tốt. Vẫn giữ khoảng cách an toàn." },
            { "ask": "Hóa chất có đang chảy vào nguồn nước hoặc khu vực dân cư không?", "if_yes": "Cảnh báo mọi người dân. Không sử dụng nước từ nguồn bị ô nhiễm. Đội xử lý sẽ kiểm soát.", "if_no": "Tốt. Giữ nguyên khoảng cách an toàn." }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // TRANSPORTATION EMERGENCIES
    // Ref: CCEC §702, §703
    // ═══════════════════════════════════════════════════════════
    "train_derailment": {
        "name": "Tai nạn đường sắt",
        "steps": [
            { "ask": "Bạn có ở gần hiện trường không? Tàu có còn đang di chuyển không?", "if_yes": "Ra xa ít nhất 500 mét NGAY. Đường ray có thể có dây điện cao thế. KHÔNG chạm vào ray hoặc dây điện.", "if_no": "Tốt. Giữ khoảng cách an toàn và cảnh báo mọi người." },
            { "ask": "Tàu có chở hành khách không? Có người bị thương không?", "if_yes": "Nếu AN TOÀN tiếp cận, giúp người bị thương ra khỏi toa. Ưu tiên người chảy máu nhiều và bất tỉnh. Cẩn thận dây điện rơi.", "if_no": "Đội cứu hộ đang tới." },
            { "ask": "Có khói, mùi lạ, hoặc chất lỏng rò rỉ không?", "if_yes": "Cực kỳ NGUY HIỂM. Di chuyển xa ít nhất 500 mét xuôi gió. Thông báo cho lực lượng cứu hộ khi họ tới.", "if_no": "Tốt. Vẫn giữ khoảng cách an toàn với đường ray." },
            { "ask": "Có bao nhiều toa tàu bị ảnh hưởng?", "if_yes": "Ghi nhớ thông tin đó cho lực lượng cứu hộ.", "if_no": "Mô tả vị trí gần nhất mà bạn biết." }
        ]
    },
    "aircraft_emergency": {
        "name": "Sự cố máy bay / Tai nạn hàng không",
        "steps": [
            { "ask": "Máy bay đã rơi xuống hay đang trong tình trạng khẩn cấp trên trời?", "if_yes": "Giữ khoảng cách ít nhất 500 mét. Nhiên liệu máy bay cực kỳ dễ cháy nổ. KHÔNG đến gần.", "if_no": "Nếu máy bay đang bay, ghi nhớ hướng bay và vị trí." },
            { "ask": "Có cháy hoặc khói từ máy bay không?", "if_yes": "Giữ khoảng cách xa hơn — ít nhất 1 kilomet. Nhiên liệu có thể gây nổ lớn. Di chuyển ngược chiều gió.", "if_no": "Vẫn giữ khoảng cách an toàn. Nhiên liệu có thể rò rỉ và bốc cháy bất cứ lúc nào." },
            { "ask": "Bạn có thấy người sống sót không?", "if_yes": "Nếu AN TOÀN — không có lửa hoặc rò rỉ nhiên liệu — hãy giúp họ ra xa khu vực nguy hiểm.", "if_no": "Đội cứu hộ chuyên dụng sắp tới." },
            { "ask": "Đây là loại máy bay gì?", "if_yes": "Thông tin này giúp xác định số hành khách. Ghi nhớ để báo cứu hộ.", "if_no": "Mô tả kích thước máy bay nếu có thể." }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // MISSING PERSONS
    // Ref: CCEC §706, §707
    // ═══════════════════════════════════════════════════════════
    "missing_child": {
        "name": "Trẻ em mất tích / Bắt cóc trẻ em",
        "steps": [
            { "ask": "Bạn có tin rằng trẻ bị bắt cóc không, hay bị lạc?", "if_yes": "Đây là tình huống rất khẩn cấp. Cảnh sát sẽ kích hoạt cảnh báo tìm kiếm. Bạn có thấy ai dẫn trẻ đi không?", "if_no": "Hãy kiểm tra tất cả các phòng, tủ, dưới giường, sau rèm. Kiểm tra bể bơi, ao hồ, giếng gần nhà." },
            { "ask": "Trẻ bao nhiêu tuổi? Mặc quần áo gì? Có đặc điểm nhận dạng gì?", "guidance": "Mô tả chi tiết: tuổi, giới tính, chiều cao, màu áo, kiểu tóc." },
            { "ask": "Trẻ mất tích ở đâu và khi nào?", "guidance": "Thời gian và địa điểm cuối cùng nhìn thấy trẻ rất quan trọng cho phạm vi tìm kiếm." },
            { "ask": "Trẻ có bệnh gì hoặc cần thuốc thường xuyên không?", "if_yes": "Ghi nhớ thông tin y tế. Thông báo cho cảnh sát khi họ tới.", "if_no": "Tốt. Cảnh sát sắp tới để bắt đầu tìm kiếm." }
        ]
    },
    "missing_person": {
        "name": "Người mất tích",
        "steps": [
            { "ask": "Người mất tích là ai? Tuổi bao nhiêu?", "guidance": "Thông tin về tuổi, giới tính, và mối quan hệ giúp xác định mức độ nguy cấp." },
            { "ask": "Người đó có bệnh gì không? Có vấn đề về trí nhớ không?", "if_yes": "Đây là trường hợp nguy cấp hơn. Cảnh sát sẽ ưu tiên tìm kiếm.", "if_no": "Tốt. Tiếp tục cung cấp thông tin." },
            { "ask": "Lần cuối bạn thấy người đó là khi nào? Ở đâu?", "guidance": "Thời gian và địa điểm cuối cùng rất quan trọng." },
            { "ask": "Người đó mặc quần áo gì? Có mang theo điện thoại không?", "guidance": "Mô tả chi tiết: quần áo, phương tiện, biển số xe nếu có." }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // VIETNAM-SPECIFIC EMERGENCIES
    // ═══════════════════════════════════════════════════════════
    "drowning": {
        "name": "Đuối nước",
        "steps": [
            { "ask": "Nạn nhân đã được kéo lên bờ chưa?", "if_yes": "Tốt. Đặt nạn nhân nằm ngửa. Kiểm tra xem họ có thở không.", "if_no": "KHÔNG nhảy xuống nước nếu bạn không biết bơi giỏi. Ném vật nổi — phao, chai nhựa rỗng, dây thừng. Gọi người xung quanh giúp." },
            { "ask": "Nạn nhân có đang thở không?", "if_yes": "Đặt nạn nhân nằm nghiêng — tư thế hồi phục — để nước chảy ra. KHÔNG ấn bụng hoặc dốc ngược. Giữ ấm bằng chăn.", "if_no": "Bắt đầu hô hấp nhân tạo NGAY. Ngửa đầu nạn nhân, nâng cằm. Bịt mũi, thổi 2 hơi vào miệng. Rồi ép tim 30 lần. Lặp lại." },
            { "ask": "Nạn nhân là trẻ em hay người lớn?", "if_yes": "Với trẻ nhỏ, dùng 1 tay ép tim nhẹ hơn. Thổi nhẹ hơn. Tiếp tục cho đến khi trẻ thở lại.", "if_no": "Với người lớn, ép tim mạnh 5cm, nhịp nhanh 2 lần mỗi giây." },
            { "ask": "Nạn nhân có nôn nước không?", "if_yes": "Nghiêng đầu sang bên để nước chảy ra. Lau sạch miệng. Tiếp tục theo dõi hơi thở.", "if_no": "Tiếp tục sơ cứu. Giữ nạn nhân ấm." }
        ]
    },
    "building_collapse": {
        "name": "Sập công trình / Sập nhà",
        "steps": [
            { "ask": "Bạn có ở trong khu vực sập không?", "if_yes": "Nếu bạn BỊ KẸT: giữ bình tĩnh, tiết kiệm sức lực. Gõ vào tường hoặc ống nước để cứu hộ nghe thấy. CHE miệng mũi bằng vải tránh bụi. KHÔNG đốt lửa.", "if_no": "Tốt. Giữ khoảng cách an toàn. Tòa nhà có thể tiếp tục sập." },
            { "ask": "Có bao nhiêu người ở trong tòa nhà khi sập?", "if_yes": "Ghi nhớ vị trí họ ở tầng mấy, phòng nào. Thông tin này rất quan trọng cho đội cứu hộ.", "if_no": "Tốt. Kiểm tra xem có ai bị ảnh hưởng bởi mảnh vỡ không." },
            { "ask": "Có ngửi thấy mùi gas hoặc thấy dây điện đứt không?", "if_yes": "Cực kỳ NGUY HIỂM. Ra xa ngay. KHÔNG bật công tắc điện, KHÔNG đốt lửa, KHÔNG hút thuốc.", "if_no": "Tốt. Vẫn giữ khoảng cách an toàn." },
            { "ask": "Có ai bị thương xung quanh không?", "if_yes": "Nếu AN TOÀN, sơ cứu cầm máu. KHÔNG di chuyển người bị kẹt dưới đống đổ. Chờ đội cứu hộ chuyên dụng.", "if_no": "Tốt. Cảnh báo mọi người giữ khoảng cách." }
        ]
    },
    "electrocution": {
        "name": "Điện giật",
        "steps": [
            { "ask": "Nạn nhân có còn đang chạm vào nguồn điện không?", "if_yes": "KHÔNG CHẠM VÀO NẠN NHÂN. Cắt nguồn điện TRƯỚC — tìm cầu dao hoặc rút phích cắm. Nếu không cắt được, dùng vật KHÔ cách điện như gậy gỗ khô để đẩy nạn nhân ra.", "if_no": "Tốt. Kiểm tra xem nạn nhân có tỉnh và có thở không." },
            { "ask": "Nạn nhân có tỉnh và có thở không?", "if_yes": "Đặt nạn nhân nằm nghiêng. Kiểm tra vết bỏng — điện giật thường gây bỏng ở điểm vào và điểm ra.", "if_no": "Bắt đầu ép tim NGAY. Điện giật có thể gây ngừng tim. Ép mạnh 5cm, nhịp nhanh 2 lần mỗi giây." },
            { "ask": "Đây là điện cao thế hay điện sinh hoạt? Có dây điện đứt rơi không?", "if_yes": "Điện cao thế CỰC KỲ NGUY HIỂM. Giữ khoảng cách ít nhất 10 mét. KHÔNG bước vào vùng dây điện rơi — điện lan qua mặt đất ướt.", "if_no": "Đảm bảo nguồn điện đã được cắt hoàn toàn." },
            { "ask": "Có ai khác gần khu vực nguy hiểm không?", "if_yes": "Cảnh báo mọi người tránh xa. Đặc biệt nếu mặt đất ướt.", "if_no": "Tốt. Tiếp tục sơ cứu nếu an toàn." }
        ]
    },
    "natural_disaster": {
        "name": "Thiên tai (Bão, Lũ, Sạt lở)",
        "steps": [
            { "ask": "Bạn đang gặp thiên tai loại gì? Bão, lũ lụt, sạt lở đất, hay động đất?", "guidance": "Mô tả tình huống cụ thể để tôi hướng dẫn chính xác hơn." },
            { "ask": "Bạn có đang ở nơi an toàn không? Nước có đang dâng lên không?", "if_yes": "Nếu nước đang dâng: Leo lên tầng cao hoặc mái nhà NGAY. KHÔNG đi qua nước lũ. KHÔNG lái xe qua đường ngập.", "if_no": "Ở nguyên trong nhà. Tránh xa cửa sổ. Nếu có bão, vào phòng trong nhất." },
            { "ask": "Có ai bị kẹt hoặc bị thương không?", "if_yes": "Nếu AN TOÀN giúp được, hãy giúp. Nếu không, cho biết vị trí chính xác. Nếu bị kẹt trong nước lũ, bám chặt vật cố định cao.", "if_no": "Tốt. Ở nguyên nơi an toàn." },
            { "ask": "Bạn có nhu yếu phẩm không? Nước uống, thuốc, đèn pin?", "if_yes": "Tốt. Tiết kiệm sử dụng. Cứu hộ đang trên đường.", "if_no": "Cứu hộ sẽ mang theo nhu yếu phẩm. Nếu cần nước, thu nước mưa bằng vật sạch." },
            { "ask": "Có nguy cơ sạt lở đất ở khu vực bạn không?", "if_yes": "Rời khỏi khu vực NGAY. Di chuyển về phía cao, tránh thung lũng và lòng suối.", "if_no": "Tốt. Vẫn theo dõi tình hình và sẵn sàng sơ tán." }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // SPECIAL SITUATIONS
    // Ref: CCEC §506, §304
    // ═══════════════════════════════════════════════════════════
    "responder_distress": {
        "name": "Nhân viên cứu hộ gặp nạn",
        "steps": [
            { "ask": "Bạn có an toàn không? Bạn có bị thương không?", "if_yes": "Cho biết vị trí chính xác và tình trạng thương tích. Lực lượng hỗ trợ đang tới.", "if_no": "Tốt. Mô tả tình huống bạn đang gặp." },
            { "ask": "Bạn có bị kẹt hoặc mắc kẹt không?", "if_yes": "Giữ bình tĩnh, tiết kiệm oxy và sức lực. Bật tín hiệu định vị nếu có.", "if_no": "Di chuyển về nơi an toàn nếu có thể. Giữ liên lạc liên tục." },
            { "ask": "Có đồng nghiệp nào cũng cần hỗ trợ không?", "if_yes": "Cho biết số lượng và vị trí của họ. Tất cả sẽ được hỗ trợ.", "if_no": "Tiếp tục giữ liên lạc. Lực lượng hỗ trợ sắp tới." }
        ]
    },
    "covert_silent": {
        "name": "Cuộc gọi im lặng / Tín hiệu cầu cứu kín",
        "steps": [
            { "ask": "Bạn có thể nói không? Nếu không thể nói, gõ vào điện thoại: một lần = CÓ, hai lần = KHÔNG.", "if_yes": "Tôi hiểu bạn cần giúp. Tôi đang chuyển bạn đến điều phối viên.", "if_no": "Tôi sẽ giữ đường dây mở. Cảnh sát đã được điều đến vị trí cuộc gọi." },
            { "ask": "Bạn có đang gặp nguy hiểm không? Gõ một lần nếu CÓ.", "if_yes": "Cảnh sát đang tới. Giữ yên, không kích động kẻ đe dọa.", "if_no": "Nếu đây là nhầm máy, tôi xin lỗi. Nếu bạn cần hỗ trợ sau này, hãy gọi lại." }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // GENERIC FALLBACK
    // ═══════════════════════════════════════════════════════════
    "generic": {
        "name": "Sự cố chung",
        "steps": [
            { "ask": "Có ai bị thương không?", "if_yes": "Nếu chảy máu, dùng vải sạch ép chặt vào vết thương. Nếu bất tỉnh, kiểm tra hơi thở. Nếu không thở, bắt đầu ép tim ngay.", "if_no": "Tốt. Hãy đảm bảo an toàn cho mọi người xung quanh." },
            { "ask": "Bạn có an toàn không?", "if_yes": "Tốt. Ở nguyên vị trí và chờ cứu hộ.", "if_no": "Hãy di chuyển đến nơi an toàn ngay lập tức. Giúp người già và trẻ em trước." },
            { "ask": "Có bao nhiêu người bị ảnh hưởng?", "if_yes": "Ưu tiên giúp người bất tỉnh hoặc chảy máu nhiều trước.", "if_no": "Tốt. Cứu hộ sắp tới." }
        ]
    }
};

const MAX_RETRY_COUNT = 6; // Increased to allow complex multi-turn slot filling

class FSMEngine {
    constructor(llm, audio, uiCallbacks) {
        this.llm = llm;
        this.audio = audio;
        this.audio.llm = llm; // Inject LLM for ML-based STT
        this.ui = uiCallbacks;

        this.state = FSMState.INITIALIZATION;
        this.session = {
            transcript: "",
            slots: {
                location: { house_number: null, street: null, intersection: null, landmark: null, ward_district: null, confidence: 0.0 },
                incident_type: { value: null, confidence: 0.0 },
                casualties: { value: null, confidence: 0.0, is_critical: false },
                dispatch: { police: false, fire: false, ems: false },
                requires_human_dispatcher: false,
                is_non_emergency: false
            },
            severity: "UNKNOWN",
            is_running: false,
            retry_count: 0,
            silence_count: 0,
            returnState: FSMState.SLOT_EVALUATION, // Added to fix Python logic loop
            lastInteractionId: null,
            lastCallerMessage: ""
        };
    }

    _mergeSlots(current, extracted) {
        if (!extracted) return current;

        const merge = (target, source) => {
            for (const key in source) {
                let val = source[key];
                
                // Coerce string representations of null/NaN/undefined
                if (val === "null" || val === "NaN" || val === "undefined") {
                    val = null;
                }

                if (val !== null && val !== undefined) {
                    if (typeof val === 'object' && !Array.isArray(val)) {
                        if (!target[key]) target[key] = {};
                        merge(target[key], val);
                    } else {
                        target[key] = val;
                    }
                }
            }
        };

        const updated = JSON.parse(JSON.stringify(current));
        merge(updated, extracted);
        return updated;
    }

    async start() {
        this.session.is_running = true;
        this.session.transcript = "";
        this.session.retry_count = 0;
        this.session.silence_count = 0;
        this.session.lastInteractionId = null;
        this.session.lastCallerMessage = "";

        this.state = FSMState.INITIALIZATION;
        this.ui.onStateChange(this.state);
        await this._loop();
    }

    stop() {
        this.session.is_running = false;
        this.audio.stopListening(true);
        this.audio.stopSpeaking();
        this.state = FSMState.END;
        this.ui.onStateChange(this.state);
    }

    async _loop() {
        while (this.session.is_running && this.state !== FSMState.END) {
            switch (this.state) {
                case FSMState.INITIALIZATION:
                    await this._stateInit();
                    break;
                case FSMState.LISTENING:
                    await this._stateListening();
                    break;
                case FSMState.SLOT_EVALUATION:
                    await this._stateEvaluation();
                    break;
                case FSMState.SLOT_FILLING:
                    await this._stateSlotFilling();
                    break;
                case FSMState.SEVERITY_ACTION:
                    await this._stateSeverityAction();
                    break;
                case FSMState.GUIDANCE:
                    await this._stateGuidance();
                    break;
                case FSMState.HIL_HANDOFF:
                    await this._stateHandoff();
                    break;
            }
        }

        // Generate Automated Report when call concludes (only if it ended naturally via AI)
        if (this.state === FSMState.END) {
            await this.generateFinalReport();
        }
    }

    async generateFinalReport() {
        this.audio.stopListening(true);
        this.audio.stopSpeaking();

        if (this.ui.onReportStart) {
            this.ui.onReportStart();
        }

        try {
            if (window.updateLogicCanvas) window.updateLogicCanvas('llm', 'active');
            const report = await this.llm.generateEmergencyReport(this.session.transcript, this.session.slots);
            if (window.updateLogicCanvas) window.updateLogicCanvas('llm', 'completed');
            if (this.ui.onReportGenerated) {
                this.ui.onReportGenerated(report);
            }
        } catch (e) {
            console.error("Report generation failed:", e);
            if (this.ui.onReportGenerated) {
                this.ui.onReportGenerated("Lỗi: Không thể tự động tạo báo cáo sự cố do lỗi kết nối AI.");
            }
        }
    }

    async _stateInit() {
        const greeting = "Tổng đài khẩn cấp AI. Bạn gặp sự cố gì, ở đâu?";
        this.ui.addAiMessage(greeting);
        await this.audio.speak(greeting);
        this.session.returnState = FSMState.SLOT_EVALUATION;
        this.state = FSMState.LISTENING;
        this.ui.onStateChange(this.state);
    }

    async _stateListening() {
        return new Promise((resolve) => {
            let handled = false;

            this.audio.onSpeechResult = (text) => {
                if (handled) return;
                handled = true;
                this.audio.stopListening();

                this.session.silence_count = 0;
                this.ui.addCallerMessage(text);
                this.session.transcript += `\n[NGƯỜI GỌI]: ${text}`;
                this.session.lastCallerMessage = text;

                // Always route to SLOT_EVALUATION first to process new slots from caller speech
                this.state = FSMState.SLOT_EVALUATION;
                this.ui.onStateChange(this.state);
                resolve();
            };

            this.audio.onSilenceTimeout = async () => {
                if (handled) return;
                handled = true;

                this.session.silence_count++;

                const isGuidance = (this.session.returnState === FSMState.GUIDANCE);
                const maxSilence = isGuidance ? 3 : 2;

                if (this.session.silence_count >= maxSilence) {
                    console.warn("Caller silent too long. Escalating to HIL.");
                    this.state = FSMState.HIL_HANDOFF;
                } else {
                    let msg = "Xin lỗi, tôi không nghe rõ. Bạn có thể nói lại không?";
                    if (isGuidance) {
                        msg = "Bạn có đang nghe máy không? Nếu bạn đang bận sơ cứu hoặc xử lý sự cố, hãy cứ tiếp tục. Nhớ để điện thoại trên loa ngoài và lên tiếng khi bạn cần tôi hỗ trợ.";
                    }
                    this.ui.addAiMessage(msg);
                    await this.audio.speak(msg);
                    this.state = FSMState.LISTENING;
                }
                this.ui.onStateChange(this.state);
                resolve();
            };

            const timeout = (this.session.returnState === FSMState.GUIDANCE) ? 45000 : 15000;
            if (window.updateLogicCanvas) window.updateLogicCanvas('vad', 'active');
            this.audio.startListening(timeout);
        });
    }

    async _stateEvaluation() {
        try {
            // Always clear returnState so it doesn't accidentally trigger a bypass
            this.session.returnState = null;

            if (this.session.transcript !== this.session.last_transcript_eval) {
                if (window.updateLogicCanvas) window.updateLogicCanvas('nlp', 'active');
                const extracted = await this.llm.extractSlots(this.session.transcript, this.session.slots);
                if (window.updateLogicCanvas) window.updateLogicCanvas('nlp', 'completed');
                this.session.slots = this._mergeSlots(this.session.slots, extracted);
                console.log("FSM: slots updated from LLM:", JSON.stringify(this.session.slots));
                if (this.session.slots) {
                    if (this.ui.onSlotsUpdated) {
                        await this.ui.onSlotsUpdated(this.session.slots);
                    }
                }
                this.session.last_transcript_eval = this.session.transcript;
            }

            if (window.updateLogicCanvas) window.updateLogicCanvas('fsm', 'active');

            // Only trigger covert handoff if the AI is extremely confident
            const requiresHandoff = this.session.slots &&
                (this.session.slots.requires_human_dispatcher === true ||
                    this.session.slots.requires_human_dispatcher === "true" ||
                    String(this.session.slots.requires_human_dispatcher).toLowerCase() === "true");

            if (requiresHandoff) {
                console.warn("Covert call detected! Triggering HIL.");
                this.state = FSMState.HIL_HANDOFF;
                this.ui.onStateChange(this.state);
                return;
            }

            // Check for prank/spam/non-emergency calls
            const isNonEmergency = this.session.slots &&
                (this.session.slots.is_non_emergency === true ||
                    this.session.slots.is_non_emergency === "true" ||
                    String(this.session.slots.is_non_emergency).toLowerCase() === "true");

            if (isNonEmergency) {
                console.warn("Non-emergency/spam call detected! Terminating call.");
                this.state = FSMState.END;
                const warningMsg = "Đây là đường dây nóng khẩn cấp. Vui lòng không thực hiện cuộc gọi nếu không có sự cố thực sự. Tôi xin phép gác máy.";
                this.ui.addAiMessage(warningMsg);
                await this.audio.speak(warningMsg);
                this.session.transcript += `\n[AI]: ${warningMsg}`;
                this.ui.onStateChange(this.state);
                return;
            }

            // Check sufficiency
            const loc = this.session.slots.location || {};
            const type = this.session.slots.incident_type || {};
            const cas = this.session.slots.casualties || {};

            const hasAnyLocation = loc.street || loc.ward_district || loc.landmark || loc.intersection || loc.osm_query || loc.plus_code || loc.w3w || loc.latitude;
            const hasAbsoluteLoc = loc.house_number && loc.street;
            const hasRelativeLoc = loc.intersection || (loc.landmark && loc.street) || (loc.street && loc.ward_district) || loc.osm_query;
            const hasLocationSufficiency = hasAbsoluteLoc || hasRelativeLoc || loc.plus_code || loc.w3w || (loc.latitude && loc.longitude);

            const hasType = !!type.value;
            const hasCas = !!cas.value;

            // Route based on call stage and slot sufficiency
            if (this.session.severity !== "UNKNOWN" && this.session.severity !== "LOW") {
                this.state = FSMState.GUIDANCE;
            } else if (!hasAnyLocation || !hasLocationSufficiency || !hasType || !hasCas) {
                this.state = FSMState.SLOT_FILLING;
            } else {
                this.state = FSMState.SEVERITY_ACTION;
            }
            if (window.updateLogicCanvas) window.updateLogicCanvas('fsm', 'completed');
            this.ui.onStateChange(this.state);
        } catch (e) {
            console.error("Evaluation error:", e);
            this.state = FSMState.HIL_HANDOFF;
            this.ui.onStateChange(this.state);
        }
    }

    async _stateSlotFilling() {
        try {
            if (this.session.retry_count >= MAX_RETRY_COUNT) {
                console.warn("Max retries reached. HIL Handoff.");
                this.state = FSMState.HIL_HANDOFF;
                this.ui.onStateChange(this.state);
                return;
            }

            this.session.retry_count++;

            const loc = this.session.slots.location || {};
            const type = this.session.slots.incident_type || {};
            const cas = this.session.slots.casualties || {};

            const hasAnyLocation = loc.street || loc.ward_district || loc.landmark || loc.intersection || loc.osm_query || loc.plus_code || loc.w3w || loc.latitude;
            const hasAbsoluteLoc = loc.house_number && loc.street;
            const hasRelativeLoc = loc.intersection || (loc.landmark && loc.street) || (loc.street && loc.ward_district) || loc.osm_query;
            const hasLocationSufficiency = hasAbsoluteLoc || hasRelativeLoc || loc.plus_code || loc.w3w || (loc.latitude && loc.longitude);

            const hasType = !!type.value;
            const hasCas = !!cas.value;

            let missingType = "thông tin";
            if (!hasAnyLocation) missingType = "location";
            else if (!hasLocationSufficiency) missingType = "location_detail";
            else if (!hasType) missingType = "incident_type";
            else if (!hasCas) missingType = "casualties";

            if (window.updateLogicCanvas) window.updateLogicCanvas('llm', 'active');
            const result = await this.llm.generateQuestion(
                missingType,
                this.session.slots,
                this.session.transcript
            );
            if (window.updateLogicCanvas) window.updateLogicCanvas('llm', 'completed');

            const q = result.text;
            this.session.lastInteractionId = result.interactionId;

            this.ui.addAiMessage(q);
            await this.audio.speak(q);
            this.session.transcript += `\n[AI]: ${q}`;

            this.session.returnState = FSMState.SLOT_EVALUATION;
            this.state = FSMState.LISTENING;
            this.ui.onStateChange(this.state);
        } catch (e) {
            console.error("Slot filling error:", e);
            this.state = FSMState.HIL_HANDOFF;
            this.ui.onStateChange(this.state);
        }
    }

    async _stateSeverityAction() {
        try {
            const sev = await this.llm.classifySeverity(this.session.slots);
            this.session.severity = sev;
            this.ui.onSeverityUpdated(sev);

            // Pass slots and transcript to determine which services are dispatched
            const dispatch = this.ui.triggerDispatch(this.session.slots, this.session.transcript, sev);

            if (sev === "LOW") {
                const msg = "Sự cố của bạn không quá nguy cấp. Lực lượng chức năng sẽ ghi nhận.";
                this.ui.addAiMessage(msg);
                await this.audio.speak(msg);
                this.state = FSMState.END;
            } else {
                // Confirm the dispatch verbally to the caller
                const dispatchedNames = [];
                if (dispatch.police) dispatchedNames.push("Cảnh sát");
                if (dispatch.fire) dispatchedNames.push("Cứu hỏa");
                if (dispatch.ems) dispatchedNames.push("Cấp cứu");

                if (dispatchedNames.length > 0) {
                    const confirmMsg = `Chúng tôi đã điều động lực lượng ${dispatchedNames.join(" và ")} đến hỗ trợ bạn.`;
                    this.ui.addAiMessage(confirmMsg);
                    await this.audio.speak(confirmMsg);
                    this.session.transcript += `\n[AI]: ${confirmMsg}`;
                }

                this.state = FSMState.GUIDANCE;
            }

            this.ui.onStateChange(this.state);
        } catch (e) {
            console.error("Severity action error:", e);
            this.state = FSMState.HIL_HANDOFF;
            this.ui.onStateChange(this.state);
        }
    }

    async _stateGuidance() {
        try {
            let typeValue = this.session.slots.incident_type.value || "";
            let transcriptText = this.session.transcript || "";
            typeValue = typeValue.toLowerCase();
            transcriptText = transcriptText.toLowerCase();

            // Advanced SOP Selection mirroring Python's select_sop_flow
            // Keyword groups for multi-hazard detection
            const hasFire = ["cháy", "lửa", "khói", "bốc cháy", "ngọn lửa"].some(kw => transcriptText.includes(kw)) || typeValue.includes("cháy");
            const hasTrapped = ["kẹt", "mắc kẹt", "không ra được", "bị nhốt"].some(kw => transcriptText.includes(kw));
            const hasAccident = ["tai nạn", "tông", "đâm xe", "va chạm", "lật xe", "xe đâm", "xe lao"].some(kw => transcriptText.includes(kw)) || typeValue.includes("tai nạn");

            // Medical
            const hasStroke = transcriptText.includes("đột quỵ") || transcriptText.includes("tai biến");
            const hasCardiac = ["ngừng tim", "tim ngừng đập", "không có mạch"].some(kw => transcriptText.includes(kw));
            const hasUnconscious = ["bất tỉnh", "ngất", "không tỉnh", "không phản ứng", "hôn mê"].some(kw => transcriptText.includes(kw));

            // Security
            const hasWeapon = ["súng", "dao", "vũ khí", "bắn", "đâm người", "chém", "xả súng", "tấn công", "mã tấu"].some(kw => transcriptText.includes(kw));
            const hasDomestic = ["bạo lực gia đình", "chồng đánh", "vợ đánh", "bạo hành", "cha đánh", "mẹ đánh"].some(kw => transcriptText.includes(kw));
            const hasCrime = ["cướp", "trộm", "giết", "tấn công", "gây rối"].some(kw => transcriptText.includes(kw));

            // Hazmat
            const hasHazmat = ["hóa chất", "rò rỉ", "khí độc", "axit", "amoniac", "clo", "chất độc", "thuốc trừ sâu", "xăng dầu tràn"].some(kw => transcriptText.includes(kw));

            // Transportation
            const hasTrain = ["tàu hỏa", "tàu lửa", "đường sắt", "đường ray", "trật bánh"].some(kw => transcriptText.includes(kw));
            const hasAircraft = ["máy bay", "hàng không", "rơi máy bay", "trực thăng", "phi cơ"].some(kw => transcriptText.includes(kw));

            // Missing persons
            const hasMissingChild = ["trẻ mất tích", "con mất tích", "bắt cóc trẻ", "bé mất tích", "cháu mất tích", "bắt cóc"].some(kw => transcriptText.includes(kw));
            const hasMissingPerson = ["mất tích", "tìm người", "không liên lạc được", "biến mất", "đi lạc"].some(kw => transcriptText.includes(kw));

            // Vietnam-specific
            const hasDrowning = ["đuối nước", "chết đuối", "rơi xuống nước", "trôi sông", "bị cuốn", "chìm", "rơi xuống ao", "rơi xuống giếng"].some(kw => transcriptText.includes(kw));
            const hasCollapse = ["sập", "đổ sập", "sập nhà", "sập công trình", "sập tường", "đổ tường"].some(kw => transcriptText.includes(kw));
            const hasElectrocution = ["điện giật", "bị giật điện", "chạm điện", "dây điện", "rò điện", "cột điện đổ"].some(kw => transcriptText.includes(kw));
            const hasDisaster = ["bão", "lũ", "lụt", "sạt lở", "động đất", "sóng thần", "ngập", "nước dâng", "thiên tai"].some(kw => transcriptText.includes(kw));

            // Responder distress
            const hasResponder = ["mayday", "lính cứu hỏa", "cứu hộ viên", "công an bị", "chiến sĩ"].some(kw => transcriptText.includes(kw));

            // Priority-ordered matching (most specific / dangerous first)
            let flowKey = "generic";
            if (hasResponder) flowKey = "responder_distress";
            else if (hasAircraft) flowKey = "aircraft_emergency";
            else if (hasWeapon) flowKey = "active_shooter";
            else if (hasDomestic) flowKey = "domestic_violence";
            else if (hasHazmat && hasFire) flowKey = "hazmat";
            else if (hasAccident && hasFire) flowKey = "traffic_accident_fire";
            else if (hasFire && hasTrapped) flowKey = "fire_trapped";
            else if (hasTrain) flowKey = "train_derailment";
            else if (hasHazmat) flowKey = "hazmat";
            else if (hasFire) flowKey = "fire";
            else if (hasCollapse) flowKey = "building_collapse";
            else if (hasDrowning) flowKey = "drowning";
            else if (hasElectrocution) flowKey = "electrocution";
            else if (hasCardiac) flowKey = "medical_cardiac_arrest";
            else if (hasStroke) flowKey = "medical_stroke";
            else if (hasUnconscious) flowKey = "medical_unconscious";
            else if (hasAccident) flowKey = "traffic_accident";
            else if (hasMissingChild) flowKey = "missing_child";
            else if (hasMissingPerson) flowKey = "missing_person";
            else if (hasDisaster) flowKey = "natural_disaster";
            else if (hasCrime) flowKey = "violent_crime";

            let sopFlow = SOP_DB[flowKey];

            const agenticResponse = await this.llm.generateAgenticResponse(
                sopFlow.name,
                sopFlow.steps,
                this.session.transcript,
                this.session.slots
            );

            if (agenticResponse && agenticResponse.speak) {
                this.session.lastInteractionId = agenticResponse.interactionId;
                this.ui.addAiMessage(agenticResponse.speak);
                await this.audio.speak(agenticResponse.speak);
                this.session.transcript += `\n[AI]: ${agenticResponse.speak}`;

                if (agenticResponse.action === "END") {
                    this.state = FSMState.END;
                } else {
                    this.session.returnState = FSMState.GUIDANCE;
                    this.state = FSMState.LISTENING; // Re-listen for caller's answer to guidance
                }
            } else {
                this.state = FSMState.END;
            }
            this.ui.onStateChange(this.state);
        } catch (e) {
            console.error("Guidance error:", e);
            this.state = FSMState.END;
            this.ui.onStateChange(this.state);
        }
    }

    async _stateHandoff() {
        const msg = "Tôi đang chuyển bạn đến điều phối viên con người. Xin giữ máy.";
        this.ui.addAiMessage(msg);
        await this.audio.speak(msg);

        // Pause the AI autonomous loop. The state remains HIL_HANDOFF.
        this.session.is_running = false;

        if (this.ui.onHandoff) {
            this.ui.onHandoff(this.session, SOP_DB);
        }

        this.ui.onStateChange(this.state);
    }
}
