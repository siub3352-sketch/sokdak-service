// server.js - Supabase 버전
const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---- Supabase 연결 ----
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================================
//                     API ENDPOINTS
// ========================================================

// 📌 1) 모든 글 조회
app.get("/posts", async (req, res) => {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 📌 2) 글 작성
app.post("/posts", async (req, res) => {
  const { title, content, tag, password, nickname, is_premium } = req.body;

  const { data, error } = await supabase.from("posts").insert([
    {
      title,
      content,
      tag,
      password,
      nickname,
      is_premium,
    },
  ]).select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// 📌 3) 글 삭제
app.delete("/posts/:id", async (req, res) => {
  const postId = req.params.id;
  const { password } = req.body;

  // 비밀번호 확인
  const { data: post } = await supabase
    .from("posts")
    .select("password")
    .eq("id", postId)
    .single();

  if (!post) return res.status(404).json({ error: "글을 찾을 수 없습니다." });
  if (post.password !== password)
    return res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });

  const { error } = await supabase.from("posts").delete().eq("id", postId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "삭제 완료" });
});

// 📌 4) 글 수정
app.put("/posts/:id", async (req, res) => {
  const postId = req.params.id;
  const { title, content, tag, password } = req.body;

  const { data: post } = await supabase
    .from("posts")
    .select("password")
    .eq("id", postId)
    .single();

  if (!post) return res.status(404).json({ error: "글을 찾을 수 없습니다." });
  if (post.password !== password)
    return res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });

  const { data, error } = await supabase
    .from("posts")
    .update({ title, content, tag })
    .eq("id", postId)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// 📌 5) 댓글 작성
app.post("/comments", async (req, res) => {
  const { post_id, content, nickname } = req.body;

  const { data, error } = await supabase.from("comments").insert([
    { post_id, content, nickname },
  ]).select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// 📌 6) 게시글 댓글 불러오기
app.get("/comments/:postId", async (req, res) => {
  const postId = req.params.postId;

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 📌 7) 좋아요 +1
app.post("/like/:id", async (req, res) => {
  const id = req.params.id;

  // 현재 좋아요 개수 가져오기
  const { data: post } = await supabase
    .from("posts")
    .select("likes")
    .eq("id", id)
    .single();

  if (!post) return res.status(404).json({ error: "게시글 없음" });

  const newLikes = (post.likes || 0) + 1;

  const { error } = await supabase
    .from("posts")
    .update({ likes: newLikes })
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ likes: newLikes });
});

// ========================================================
//                     서버 실행
// ========================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
