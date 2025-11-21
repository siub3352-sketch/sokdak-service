const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// === JSON DB 폴더 및 파일 생성 ===
const dbDir = path.join(__dirname, "database");
const postsFile = path.join(dbDir, "posts.json");
const commentsFile = path.join(dbDir, "comments.json");

// 폴더 자동 생성
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

// 파일 자동 생성 + 비어있을 때 자동 복구
const ensureFile = (file) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]");
  } else {
    const txt = fs.readFileSync(file, "utf8").trim();
    if (!txt) fs.writeFileSync(file, "[]");
    try {
      JSON.parse(txt);
    } catch {
      fs.writeFileSync(file, "[]");
    }
  }
};

ensureFile(postsFile);
ensureFile(commentsFile);

const readJSON = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJSON = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

// === API ===

// 글 목록
app.get("/posts", (req, res) => {
  const posts = readJSON(postsFile).sort((a, b) => b.id - a.id);
  res.json(posts);
});

// 글 작성
app.post("/posts", (req, res) => {
  const { title, content, tags, password, nickname } = req.body;
  const posts = readJSON(postsFile);

  const newPost = {
    id: Date.now(),
    title,
    content,
    tags,
    password,
    nickname,
    created_at: Date.now(),
    likes: 0
  };

  posts.push(newPost);
  writeJSON(postsFile, posts);

  res.json({ success: true });
});

// 글 수정
app.post("/edit", (req, res) => {
  const { id, title, content, tags, password } = req.body;
  const posts = readJSON(postsFile);

  const post = posts.find((p) => p.id == id);
  if (!post) return res.json({ success: false, message: "존재하지 않음" });

  if (post.password !== password)
    return res.json({ success: false, message: "비밀번호 틀림" });

  post.title = title;
  post.content = content;
  post.tags = tags;

  writeJSON(postsFile, posts);
  res.json({ success: true });
});

// 글 삭제
app.post("/delete", (req, res) => {
  const { id, password } = req.body;

  let posts = readJSON(postsFile);
  const post = posts.find((p) => p.id == id);

  if (!post) return res.json({ success: false, message: "존재하지 않음" });
  if (post.password !== password)
    return res.json({ success: false, message: "비밀번호 틀림" });

  posts = posts.filter((p) => p.id != id);
  writeJSON(postsFile, posts);

  res.json({ success: true });
});

// 좋아요
app.post("/like", (req, res) => {
  const { id } = req.body;
  const posts = readJSON(postsFile);

  const post = posts.find((p) => p.id == id);
  if (!post) return res.json({ success: false });

  post.likes++;
  writeJSON(postsFile, posts);

  res.json({ success: true });
});

// 댓글 작성
app.post("/comment", (req, res) => {
  const { post_id, comment, nickname } = req.body;
  const comments = readJSON(commentsFile);

  comments.push({
    id: Date.now(),
    post_id,
    comment,
    nickname,
    created_at: Date.now()
  });

  writeJSON(commentsFile, comments);
  res.json({ success: true });
});

// 댓글 조회
app.get("/comments/:id", (req, res) => {
  const { id } = req.params;
  const comments = readJSON(commentsFile).filter(
    (c) => Number(c.post_id) === Number(id)
  );
  res.json(comments);
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
