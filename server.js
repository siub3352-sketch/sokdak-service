// server.js
const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

// ==== DB 연결 ====
const db = new Database(path.join(__dirname, "sokdak.db"));

// 게시판 테이블 생성
db.prepare(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    password TEXT NOT NULL,
    nickname TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    likes INTEGER DEFAULT 0
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    nickname TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`).run();

// ==== Express 서버 설정 ====
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==== API ====

// 글 목록 조회
app.get("/posts", (req, res) => {
  const rows = db.prepare("SELECT * FROM posts ORDER BY id DESC").all();
  res.json(rows);
});

// 글 작성
app.post("/posts", (req, res) => {
  const { title, content, tags, password, nickname } = req.body;

  const stmt = db.prepare(`
    INSERT INTO posts (title, content, tags, password, nickname, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(title, content, tags, password, nickname, Date.now());
  res.json({ success: true });
});

// 글 삭제
app.post("/delete", (req, res) => {
  const { id, password } = req.body;

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(id);

  if (!post) return res.json({ success: false, message: "존재하지 않는 게시물" });
  if (post.password !== password)
    return res.json({ success: false, message: "비밀번호 불일치" });

  db.prepare("DELETE FROM posts WHERE id = ?").run(id);
  res.json({ success: true });
});

// 글 수정
app.post("/edit", (req, res) => {
  const { id, title, content, tags, password } = req.body;

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(id);

  if (!post) return res.json({ success: false, message: "존재하지 않는 게시물" });
  if (post.password !== password)
    return res.json({ success: false, message: "비밀번호 불일치" });

  db.prepare(`
    UPDATE posts SET title=?, content=?, tags=? WHERE id=?
  `).run(title, content, tags, id);

  res.json({ success: true });
});

// 좋아요
app.post("/like", (req, res) => {
  const { id } = req.body;
  db.prepare("UPDATE posts SET likes = likes + 1 WHERE id = ?").run(id);
  res.json({ success: true });
});

// 댓글 작성
app.post("/comment", (req, res) => {
  const { post_id, comment, nickname } = req.body;

  db.prepare(`
    INSERT INTO comments (post_id, comment, nickname, created_at)
    VALUES (?, ?, ?, ?)
  `).run(post_id, comment, nickname, Date.now());

  res.json({ success: true });
});

// 댓글 조회
app.get("/comments/:id", (req, res) => {
  const rows = db.prepare("SELECT * FROM comments WHERE post_id = ? ORDER BY id").all(req.params.id);
  res.json(rows);
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port:", PORT);
});
