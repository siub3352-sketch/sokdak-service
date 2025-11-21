// ===================================
// Supabase 초기화
// ===================================
const client = supabase.createClient(
  "https://jodamftrguxfcoqvxgcv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGFtZnRyZ3V4ZmNvcXZ4Z2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcxNTg0NjcsImV4cCI6MjA1MjczNDQ2N30.FbhKk1pvr2ZvRYOSS8N-Gbgghy2HBML5G8r_BLslx0s"
);

// ===================================
// DOM 요소 가져오기
// ===================================
const postListEl = document.getElementById("post-list");
const postForm = document.getElementById("post-form");

const formTitle = document.getElementById("title");
const formContent = document.getElementById("content");
const formTags = document.getElementById("tags");
const formPassword = document.getElementById("password");
const formPremium = document.getElementById("is-premium");

let editingPost = null;
let posts = [];

// ===================================
// 닉네임 랜덤 생성
// ===================================
function randomNickname() {
  const adj = ["빠른", "용감한", "다정한", "차분한", "똑똑한"];
  const animal = ["호랑이", "여우", "늑대", "곰", "사자", "판다"];
  return adj[Math.floor(Math.random() * adj.length)] + " " + animal[Math.floor(Math.random() * animal.length)];
}

// ===================================
// 게시글 불러오기
// ===================================
async function loadPosts() {
  const { data, error } = await client
    .from("posts")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    alert("로드 오류: " + error.message);
    return;
  }

  posts = data;
  renderPosts();
}

// ===================================
// 게시글 출력
// ===================================
function renderPosts() {
  postListEl.innerHTML = "";

  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "post-card";

    const tagHTML = post.tags.map(t => `<span>${t}</span>`).join("");

    card.innerHTML = `
      <h3>${post.title}</h3>
      <div class="post-meta">작성자: ${post.nickname}</div>
      <div class="post-tags">${tagHTML}</div>

      <div style="margin-top:10px;">
        <span class="btn-small" onclick="toggleDetail(this)">상세보기</span>
        <span class="btn-small" onclick="startEditPost(${post.id})">수정</span>
        <span class="btn-small" onclick="deletePost(${post.id})">삭제</span>
      </div>

      <div class="detail" style="display:none; margin-top:10px;">
        ${post.content}
      </div>
    `;

    postListEl.appendChild(card);
  });
}

// ===================================
// 상세보기 열기/닫기
// ===================================
function toggleDetail(btn) {
  const card = btn.closest(".post-card");
  const detail = card.querySelector(".detail");

  detail.style.display = detail.style.display === "none" ? "block" : "none";
}

// ===================================
// 글 작성 / 수정 제출
// ===================================
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = formTitle.value.trim();
  const content = formContent.value.trim();
  const tags = formTags.value.split(",").map(t => t.trim()).filter(t => t);
  const password = formPassword.value.trim();
  const isPremium = formPremium.checked;

  if (!title || !content || !password) {
    alert("제목/내용/비밀번호는 필수입니다.");
    return;
  }

  // ------------------------------
  // 수정 모드
  // ------------------------------
  if (editingPost !== null) {
    const { data, error } = await client
      .from("posts")
      .update({
        title,
        content,
        tags,
        password,
        is_premium: isPremium,
      })
      .eq("id", editingPost)
      .select("*");  // ★ 최신 데이터 강제 반환

    if (error) {
      alert("수정 오류: " + error.message);
      return;
    }

    alert("수정 완료!");
    editingPost = null;
    postForm.querySelector("button").textContent = "등록";

  } else {
    // ------------------------------
    // 새 글 등록
    // ------------------------------
    const nickname = randomNickname();

    const { error } = await client.from("posts").insert({
      title,
      content,
      tags,
      password,
      is_premium: isPremium,
      nickname
    });

    if (error) {
      alert("등록 오류: " + error.message);
      return;
    }

    alert("등록 완료!");
  }

  formTitle.value = "";
  formContent.value = "";
  formTags.value = "";
  formPassword.value = "";
  formPremium.checked = false;

  loadPosts();
});

// ===================================
// 글 수정 시작
// ===================================
function startEditPost(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;

  const pw = prompt("수정 비밀번호:");
  if (pw === null) return;
  if (pw !== post.password) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  editingPost = id;

  formTitle.value = post.title;
  formContent.value = post.content;
  formTags.value = post.tags.join(", ");
  formPassword.value = post.password;
  formPremium.checked = post.is_premium;

  postForm.querySelector("button").textContent = "수정 완료";
}

// ===================================
// 글 삭제
// ===================================
async function deletePost(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;

  const pw = prompt("삭제 비밀번호:");
  if (pw === null) return;
  if (pw !== post.password) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  if (!confirm("정말 삭제하시겠습니까?")) return;

  const { error } = await client
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) {
    alert("삭제 오류: " + error.message);
    return;
  }

  alert("삭제 완료!");
  loadPosts();
}

// ===================================
// 초기 실행
// ===================================
loadPosts();
