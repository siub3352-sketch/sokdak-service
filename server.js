// server.js
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

// public 폴더를 정적 파일 폴더로 사용
app.use(express.static(path.join(__dirname, "public")));

// SPA 처리를 위해 나머지 모든 요청도 index.html로
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
