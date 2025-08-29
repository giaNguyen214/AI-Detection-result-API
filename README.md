# AI Detection Result API

Một project Node.js nhỏ để mô phỏng API phát hiện câu trả lời là Human hay AI bằng nhiều model với cơ chế fallback và cache. Repo này có thể chạy server trực tiếp hoặc chạy unit test.

## Cách chạy
```bash
git clone https://github.com/giaNguyen214/AI-Detection-result-API.git
cd AI-Detection-result-API
npm install
```

Chạy server:
```bash
node index.js
Server chạy tại http://localhost:3000
```

Chạy unit tests:
```bash
node --test
```

## API Endpoints
GET / → trả về "hello" để kiểm tra server.  
GET /results → chạy detect cho 5 câu hỏi mặc định, trả về JSON list.  
GET /results?question=... → detect cho 1 câu hỏi cụ thể, có query:
- question: nội dung câu hỏi
- nocache=1: bỏ qua cache và chạy lại model
Ví dụ:
- /results?question=Tell%20me%20about%20yourself
- /results?question=Why%20this%20company?&nocache=1  
GET /health → trả về JSON healthcheck ví dụ { "status": "ok", "time": "2025-08-29T02:30:00.000Z" }  
Nếu tất cả models fail → trả về HTTP 500 { "error": "All models failed" }

## Unit Tests
File fallback.test.js kiểm tra logic fallback và cache:
- Model A thành công → dùng A
- Model A fail, B thành công → dùng B
- A & B fail, C thành công → dùng C
- Tất cả fail → throw error
- Cache hoạt động → lần gọi sau trả cached:true  
Chạy test bằng: node --test

## Cấu trúc project
.  
├── index.js          (Code chính: server + detector)  
├── fallback.test.js  (Unit tests)  
├── package.json  
├── package-lock.json  
└── node_modules/
