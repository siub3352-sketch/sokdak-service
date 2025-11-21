// ===============================
// Supabase 연결
// ===============================
const SUPABASE_URL = "https://effnciiebondujprjhio.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZm5jaWllYm9uZHVqcHJqaGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ5MDYsImV4cCI6MjA3OTMxMDkwNn0.abm_hxGYDTsZjP-5MT93IBo_HoIgHQANJj1PMsKkh3c";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// 전역 상태
// ===============================
let posts = [];

// ===============================
// 시간 포맷
// ===============================
function timeToKoreanString(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;

  const d = new Date(ts);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

// ===============================
// 글 목록 불러오기
// ===============================
async function loadPosts() {
  const { data, error } = await supabaseClient
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert("글 불러오기 오류: " + error.message);
    return;
  }

  posts = data;
  renderPosts();
}

// ===============================
// 글 렌더링
// ===============================
function renderPosts() {
  const postListEl = document.getElementById("postList");
  const listInfoEl = document.getElementById("listInfo");

  postListEl.innerHTML = "";
  listInfoEl.textContent = `(${posts.length}개)`;

  posts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "post-card";

    card.innerHTML = `
      <h3>${post.title}
        ${post.is_premium ? '<span class="premium-badge">프리미엄</span>' : ""}
      </h3>
      <div>${post.content}</div>
      <div class="post-meta">
        ${timeToKoreanString(post.created_at)} · 💗 ${post.likes}
      </div>
    `;

    postListEl.appendChild(card);
  });
}

// ===============================
// 글 작성
// ===============================
document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  const tags = document.getElementById("tags").value.trim().split(",");
  const password = document.getElementById("password").value.trim();
  const isPremium = document.getElementById("isPremium").checked;

  if (!title || !password) {
    alert("제목/비밀번호를 입력하세요");
    return;
  }

  // 랜덤 닉네임
  const nickname = "익명" + Math.floor(Math.random() * 9000 + 1000);

  const { error } = await supabaseClient.from("posts").insert([
    {
      title,
      content,
      tags,
      password,
      is_premium: isPremium,
      nickname,
    },
  ]);

  if (error) {
    alert("등록 오류: " + error.message);
    return;
  }

  alert("등록 완료!");
  e.target.reset();
  loadPosts();
});

// ===============================
// 초기 실행
// ===============================
loadPosts();
