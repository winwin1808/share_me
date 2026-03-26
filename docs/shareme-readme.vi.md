# Shareme

![Giao diện Shareme](./assets/shareme-hero.png)

## Shareme là gì?

Shareme là ứng dụng desktop chạy trên macOS, được xây để ghi lại màn hình theo hướng browser/window-first và biến bản ghi thô thành video demo gọn, rõ trọng tâm, có thể xuất file ngay trên máy.

Thay vì chỉ quay màn hình, Shareme tập trung vào việc giúp người dùng nhấn mạnh đúng vùng nội dung quan trọng bằng zoom tự động, chỉnh timeline trực tiếp, chọn khung hình phù hợp và export offline sang MP4.

## App dùng để làm gì?

Shareme phù hợp cho các nhu cầu như:

- Quay demo sản phẩm, walkthrough tính năng, video onboarding.
- Tạo video hướng dẫn thao tác trên web app hoặc dashboard.
- Chuẩn bị clip ngắn cho đội Product, CS, Sales hoặc nội bộ training.
- Xuất cùng một nội dung sang nhiều tỉ lệ khung hình cho nhiều kênh sử dụng khác nhau.

## Luồng sử dụng chính

1. Chọn tab, window hoặc màn hình muốn ghi.
2. Bắt đầu record ngay trong app.
3. Click trong preview để tạo các điểm zoom/focus.
4. Chỉnh lại segment trên timeline: thời gian, scale, vị trí, easing, follow cursor.
5. Tuỳ chỉnh khung hình, crop, background và browser frame.
6. Export video MP4 ngay trên máy với nhiều aspect ratio.

## Có gì hay?

### 1. Ghi màn hình nhưng vẫn giữ được “ý đồ kể chuyện”

Shareme không dừng ở việc capture. App cho phép người dùng tạo và chỉnh các zoom segment để video luôn tập trung vào vùng đang cần giải thích. Đây là điểm quan trọng nếu mục tiêu là làm demo sản phẩm rõ ràng thay vì chỉ “quay lại mọi thứ”.

### 2. Preview và timeline gắn chặt với nhau

Người dùng xem trước nội dung ngay trên preview và chỉnh cùng một hệ timeline phía dưới. Điều này giúp workflow ngắn, ít phải nhảy qua nhiều màn hình hay mở editor phức tạp.

### 3. Export hoàn toàn local, không phụ thuộc cloud

App dùng pipeline export offline bằng `ffmpeg`, nên dữ liệu và video có thể được xử lý ngay trên máy. Điều này phù hợp với các team cần tốc độ, sự riêng tư hoặc muốn làm việc ổn định ngay cả khi không có network.

### 4. Một project, nhiều đầu ra

Từ cùng một project, người dùng có thể xuất các tỉ lệ như `16:9`, `9:16`, `1:1` hoặc native ratio mà không phải dựng lại từ đầu.

### 5. Có nền tảng để mở rộng

Project file được lưu local và có versioning, nên app không chỉ là một công cụ record nhanh mà còn có nền tốt để phát triển tiếp thành editor/workflow desktop hoàn chỉnh.

## Điểm nổi bật của phiên bản hiện tại

- Chọn nguồn capture từ browser/window trên macOS.
- Record và lưu metadata cục bộ.
- Tạo zoom segment từ thao tác trên preview.
- Chỉnh sửa zoom với `start`, `end`, `scale`, `targetX`, `targetY`, `easing`, `follow cursor`.
- Hỗ trợ crop region, browser frame on/off, background preset hoặc ảnh custom.
- Export MP4 offline với nhiều tỉ lệ.
- Lưu/mở lại local project file để tiếp tục chỉnh sửa.

## Tầm nhìn sản phẩm

Tầm nhìn của Shareme là trở thành công cụ desktop nhẹ nhưng đủ mạnh để biến việc quay demo màn hình thành một workflow có chủ đích: ghi nhanh, làm rõ trọng tâm, chỉnh ít, xuất nhanh và giữ toàn bộ dữ liệu dưới quyền kiểm soát của người dùng.

Về dài hạn, Shareme có thể phát triển theo 3 hướng:

- **Từ recorder sang storytelling editor**: không chỉ zoom, mà còn hỗ trợ framing, emphasis, highlight và các lớp chỉnh sửa giúp video dễ hiểu hơn.
- **Từ local MVP sang hệ thống phát hành nội dung hoàn chỉnh**: thêm các lựa chọn export, preset, packaging và chia sẻ thuận tiện hơn.
- **Từ utility tool sang sản phẩm cho team**: giữ local-first làm lõi, nhưng sẵn sàng mở rộng sang các nhu cầu cộng tác, template hoá và workflow lặp lại.

## Vì sao app này đáng làm?

Khoảng trống của nhiều công cụ record hiện nay là: quay thì dễ, nhưng để thành một video demo “đủ rõ” lại cần thêm nhiều bước hậu kỳ. Shareme đi vào đúng đoạn chuyển đổi đó: rút ngắn khoảng cách giữa bản ghi thô và bản demo có thể dùng được.

Nếu làm tốt, đây là một sản phẩm có giá trị rõ cho:

- Team sản phẩm cần demo nhanh.
- Team CS/Sales cần clip giải thích ngắn.
- Founder hoặc marketer cần video showcase tính năng.
- Internal team cần workflow local, đơn giản, ít phụ thuộc dịch vụ ngoài.

## Trạng thái hiện tại

Shareme hiện là một Electron MVP theo hướng macOS-first. Phần lõi đã có: capture, preview, timeline zoom, local project storage và offline export. Đây là nền đủ tốt để tiếp tục polish UX, nâng chất lượng output và mở rộng workflow trong các bản sau.
