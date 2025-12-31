# Hướng dẫn Deploy dự án lên Vercel

Dưới đây là các bước chi tiết để đưa dự án **Lumi Finance Manager** (React + Vite) lên Vercel.

## Bước 1: Chuẩn bị Code (Đã làm)

1.  Đã có file `vercel.json` để cấu hình đường dẫn (routing).
2.  Đảm bảo code không có lỗi (bạn đã xác nhận "oke hết rồi").

## Bước 2: Đẩy code lên GitHub (Khuyên dùng)

Cách dễ nhất để deploy và cập nhật sau này là thông qua GitHub.

1.  **Tạo Repository mới trên GitHub:**
    *   Vào [github.com/new](https://github.com/new).
    *   Đặt tên repo (ví dụ: `lumi-finance-manager`).
    *   Chọn **Private** (nếu muốn bảo mật dữ liệu) hoặc **Public**.
    *   Nhấn **Create repository**.

2.  **Đẩy code từ máy lên GitHub:**
    Mở Terminal tại thư mục dự án (`c:\Users\dungv\lumi-finance-manager-`) và chạy lần lượt các lệnh sau:

    ```bash
    # Khởi tạo git (nếu chưa có)
    git init

    # Thêm tất cả file vào git
    git add .

    # Lưu thay đổi
    git commit -m "Deploy len Vercel"

    # Kết nối với GitHub (thay URL_CUA_BAN bằng link repo bạn vừa tạo)
    # Ví dụ: https://github.com/username/lumi-finance-manager.git
    git remote add origin URL_CUA_BAN

    # Đẩy code lên nhánh main
    git branch -M main
    git push -u origin main
    ```

## Bước 3: Deploy trên Vercel

Sau khi code đã lên GitHub, làm theo các bước sau:

1.  **Đăng nhập Vercel:**
    *   Truy cập [vercel.com](https://vercel.com) và đăng nhập (tốt nhất là đăng nhập bằng tài khoản GitHub của bạn).

2.  **Tạo Project mới:**
    *   Tại giao diện Dashboard, nhấn nút **Add New...** (góc phải) -> Chọn **Project**.

3.  **Import GitHub Repository:**
    *   Vercel sẽ hiện danh sách các repo của bạn bên trái.
    *   Tìm repo `lumi-finance-manager` bạn vừa tạo.
    *   Nhấn nút **Import**.

4.  **Cấu hình Deploy (Configure Project):**
    *   **Project Name:** Để mặc định hoặc đổi tên tùy thích.
    *   **Framework Preset:** Vercel thường tự nhận diện là **Vite**. Nếu không, hãy chọn **Vite**.
    *   **Root Directory:** Để mặc định (`./`).
    *   **Build and Output Settings:** Để mặc định (Build Command: `npm run build`, Output Directory: `dist`).
    *   **Environment Variables:** Nếu dự án không dùng biến môi trường đặc biệt thì bỏ qua.

5.  **Nhấn nút "Deploy":**
    *   Vercel sẽ bắt đầu build dự án. Quá trình mất khoảng 1-2 phút.
    *   Nếu thành công, màn hình sẽ hiện chúc mừng và giao diện website của bạn.

## Bước 4: Hoàn tất

*   Sau khi deploy xong, bạn sẽ có một đường link (domain) dạng `lumi-finance-manager.vercel.app`.
*   Bạn có thể gửi link này cho mọi người truy cập.
*   Sau này, mỗi khi bạn sửa code và chạy `git push` lên GitHub, Vercel sẽ **tự động** cập nhật phiên bản mới nhất.
