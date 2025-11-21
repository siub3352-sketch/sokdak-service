// server.js
const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
// Render 같은 호스팅에서는 PORT가 환경변수로 들어옴
const PORT = process.env.PORT || 4000;

// JSON 요청 바디 파싱
app.use(express.json());

// public 폴더의 정적 파일 제공 (index.html, app.js, style.css)
app.use(express.static(path.join(__dirname, "public")));

// ===== SQLite DB 연결 & 테이블 생성 =====
const db = new sqlite3.Database(path.join(__dirname, "sokdak.db"));

db.serialize(() => {
  // 게시글 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      likes INTEGER NOT NULL DEFAULT 0,
      is_premium INTEGER NOT NULL DEFAULT 0
    )
  `);

  // 댓글 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      nickname TEXT NOT NULL,
      content TEXT NOT NULL,
      votes INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);
});

// ===== 유틸 함수 =====
function rowToPost(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags ? row.tags.split(",").map(t => t.trim()).filter(t => t) : [],
    // 클라이언트로 보낼 때는 비밀번호 빼기
    password: undefined,
    nickname: row.nickname,
    createdAt: row.created_at,
    likes: row.likes,
    isPremium: !!row.is_premium
  };
}

// ===== API: 게시글 목록 조회 =====
// GET /api/posts?tag=&sort=latest|popular
app.get("/api/posts", (req, res) => {
  const { tag, sort } = req.query;
  let orderBy = "created_at DESC";
  if (sort === "popular") {
    orderBy = "likes DESC, created_at DESC";
  }

  let sql = "SELECT * FROM posts";
  const params = [];

  if (tag) {
    sql += " WHERE tags LIKE ?";
    params.push(`%${tag}%`);
  }

  sql += ` ORDER BY ${orderBy}`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "DB error" });
    }
    const posts = rows.map(rowToPost);
    res.json(posts);
  });
});

// ===== API: 게시글 생성 =====
// POST /api/posts  { title, content, tags, password, isPremium }
app.post("/api/posts", (req, res) => {
  const { title, content, tags, password, isPremium } = req.body;

  if (!title || !password || password.length < 4) {
    return res.status(400).json({ error: "제목과 4자리 이상 비밀번호가 필요합니다." });
  }

  const nicknameList = [
    "말랑말랑 곰돌이", "몽글몽글 구름", "수줍은 토끼", "말없는 고양이", "몽실이 햄찌",
    "달콤한 마카롱", "졸린 판다", "반짝이는 별빛", "순둥순둥 강아지", "귤 좋아하는 너구리",
    "밤새는 올빼미", "공부하다 멍 때리는 펭귄", "사과 요정", "초코케이크 요정"
  ];
  const nickname = nicknameList[Math.floor(Math.random() * nicknameList.length)];

  const now = Date.now();
  const tagsStr = (tags || []).join(", ");

  db.run(
    `INSERT INTO posts (title, content, tags, password, nickname, created_at, likes, is_premium)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [title, content || "", tagsStr, password, nickname, now, isPremium ? 1 : 0],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error" });
      }
      const newId = this.lastID;
      db.get("SELECT * FROM posts WHERE id = ?", [newId], (err2, row) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ error: "DB error" });
        }
        res.status(201).json(rowToPost(row));
      });
    }
  );
});

// ===== API: 게시글 수정 =====
// PUT /api/posts/:id  { title, content, tags, password, isPremium }
app.put("/api/posts/:id", (req, res) => {
  const postId = req.params.id;
  const { title, content, tags, password, isPremium } = req.body;

  if (!password) {
    return res.status(400).json({ error: "비밀번호가 필요합니다." });
  }

  db.get("SELECT * FROM posts WHERE id = ?", [postId], (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "글을 찾을 수 없습니다." });
    if (row.password !== password) {
      return res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });
    }

    const tagsStr = (tags || []).join(", ");
    db.run(
      `UPDATE posts
       SET title = ?, content = ?, tags = ?, is_premium = ?
       WHERE id = ?`,
      [title || row.title, content || "", tagsStr, isPremium ? 1 : 0, postId],
      (err2) => {
        if (err2) return res.status(500).json({ error: "DB error" });
        db.get("SELECT * FROM posts WHERE id = ?", [postId], (err3, row2) => {
          if (err3) return res.status(500).json({ error: "DB error" });
          res.json(rowToPost(row2));
        });
      }
    );
  });
});

// ===== API: 게시글 삭제 =====
// DELETE /api/posts/:id  { password }
app.delete("/api/posts/:id", (req, res) => {
  const postId = req.params.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "비밀번호가 필요합니다." });
  }

  db.get("SELECT * FROM posts WHERE id = ?", [postId], (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "글을 찾을 수 없습니다." });
    if (row.password !== password) {
      return res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });
    }

    db.run("DELETE FROM posts WHERE id = ?", [postId], (err2) => {
      if (err2) return res.status(500).json({ error: "DB error" });
      res.json({ success: true });
    });
  });
});

// ===== API: 게시글 좋아요(공감) =====
// POST /api/posts/:id/like
app.post("/api/posts/:id/like", (req, res) => {
  const postId = req.params.id;
  db.run(
    "UPDATE posts SET likes = likes + 1 WHERE id = ?",
    [postId],
    function (err) {
      if (err) return res.status(500).json({ error: "DB error" });
      db.get("SELECT * FROM posts WHERE id = ?", [postId], (err2, row) => {
        if (err2) return res.status(500).json({ error: "DB error" });
        if (!row) return res.status(404).json({ error: "글을 찾을 수 없습니다." });
        res.json(rowToPost(row));
      });
    }
  );
});

// ===== API: 댓글 목록 조회 =====
// GET /api/posts/:id/comments
app.get("/api/posts/:id/comments", (req, res) => {
  const postId = req.params.id;
  db.all(
    "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC",
    [postId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "DB error" });
      const comments = rows.map((r) => ({
        id: r.id,
        postId: r.post_id,
        nickname: r.nickname,
        content: r.content,
        votes: r.votes,
        createdAt: r.created_at
      }));
      res.json(comments);
    }
  );
});

// ===== API: 댓글 작성 =====
// POST /api/posts/:id/comments  { content }
app.post("/api/posts/:id/comments", (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "내용을 입력해 주세요." });

  const commentNames = [
    "익명 친구1", "익명 친구2", "따뜻한 손편지", "몰래 응원중", "공감 요정",
    "속닥 도토리", "작은 위로", "걱정 많은 토끼", "진심 담은 한마디"
  ];
  const nickname = commentNames[Math.floor(Math.random() * commentNames.length)];
  const now = Date.now();

  db.run(
    `INSERT INTO comments (post_id, nickname, content, votes, created_at)
     VALUES (?, ?, ?, 0, ?)`,
    [postId, nickname, content, now],
    function (err) {
      if (err) return res.status(500).json({ error: "DB error" });
      const newId = this.lastID;
      db.get("SELECT * FROM comments WHERE id = ?", [newId], (err2, row) => {
        if (err2) return res.status(500).json({ error: "DB error" });
        res.status(201).json({
          id: row.id,
          postId: row.post_id,
          nickname: row.nickname,
          content: row.content,
          votes: row.votes,
          createdAt: row.created_at
        });
      });
    }
  );
});

// ===== API: 댓글 투표 =====
// POST /api/comments/:id/vote
app.post("/api/comments/:id/vote", (req, res) => {
  const commentId = req.params.id;
  db.run(
    "UPDATE comments SET votes = votes + 1 WHERE id = ?",
    [commentId],
    function (err) {
      if (err) return res.status(500).json({ error: "DB error" });
      db.get("SELECT * FROM comments WHERE id = ?", [commentId], (err2, row) => {
        if (err2) return res.status(500).json({ error: "DB error" });
        if (!row) return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
        res.json({
          id: row.id,
          postId: row.post_id,
          nickname: row.nickname,
          content: row.content,
          votes: row.votes,
          createdAt: row.created_at
        });
      });
    }
  );
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`속닥속닥 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
