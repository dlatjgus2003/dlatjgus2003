/* =========================================================
   site.js — Baritone. Dominic Lim (Optimized)
   - Mobile drawer menu
   - Photo lightbox (data-lb-src / data-lightbox)
   - Repeatable reveal animation (.reveal)
   - Photo tiles reveal (fallback if tiles don't have .reveal)
   - Home: Video preview (sync with /assets/data/videos.js)
========================================================= */

function qs(sel, el = document) { return el.querySelector(sel); }
function qsa(sel, el = document) { return Array.from(el.querySelectorAll(sel)); }

function onReady(fn){
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

/* ---------------------------------------------------------
   1) Mobile Drawer Menu
--------------------------------------------------------- */
function initMobileMenu(){
  const btn = qs('[data-hamburger]');
  const drawer = qs('[data-drawer]');
  if(!btn || !drawer) return;

  const open  = () => drawer.classList.add('open');
  const close = () => drawer.classList.remove('open');

  btn.addEventListener('click', open);
  drawer.addEventListener('click', (e)=> { if(e.target === drawer) close(); });
  qsa('[data-close-drawer]', drawer).forEach(a => a.addEventListener('click', close));
}

/* ---------------------------------------------------------
   2) Photo Lightbox
   - expects:
     - Lightbox container: [data-lightbox]
     - close button: [data-lightbox-close]
     - triggers anywhere: [data-lb-src] (button or a)
--------------------------------------------------------- */
function initLightbox(){
  const lb = qs('[data-lightbox]');
  if(!lb) return;

  const img = qs('img', lb);
  const closeBtn = qs('[data-lightbox-close]', lb);
  if(!img) return;

  const open = (src, alt) => {
    if(!src) return;
    img.src = src;
    img.alt = alt || '';
    lb.classList.add('open');
    document.documentElement.style.overflow = "hidden";
  };

  const close = () => {
    lb.classList.remove('open');
    img.src = '';
    img.alt = '';
    document.documentElement.style.overflow = "";
  };

  // Delegate click: works even if photo tiles are rendered later
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-lb-src]');
    if(!t) return;
    e.preventDefault();
    open(t.dataset.lbSrc, t.dataset.lbAlt);
  });

  closeBtn?.addEventListener('click', close);
  lb.addEventListener('click', (e)=> { if(e.target === lb) close(); });
  window.addEventListener('keydown', (e)=> { if(e.key === 'Escape') close(); });
}

/* ---------------------------------------------------------
   3) Global Reveal (repeatable) — .reveal
   - add/remove .is-visible whenever entering/leaving viewport
   - exposes window.refreshReveal() for dynamic pages
--------------------------------------------------------- */
function bindReveal(){
  const els = qsa('.reveal');
  if(els.length === 0) return;

  if(!('IntersectionObserver' in window)){
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting) e.target.classList.add('is-visible');
      else e.target.classList.remove('is-visible');
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  els.forEach(el => io.observe(el));
}

function initReveal(){
  window.refreshReveal = bindReveal;
  bindReveal();
}

/* ---------------------------------------------------------
   4) Mark Photo Pages
   - used by CSS (body.is-photo)
--------------------------------------------------------- */
function markPhotoPage(){
  if (location.pathname.startsWith("/photo/")) {
    document.body.classList.add("is-photo");
  }
}

/* ---------------------------------------------------------
   5) Photo Tiles Reveal (repeatable)
   Problem solved:
   - 이전 버전: :has(img) selector는 브라우저/환경에 따라 동작이 불안정
   - 개선: img 기준으로 상위 요소를 찾아서 직접 .reveal을 부여
   - CSS가 .reveal 기반이면 메인 페이지와 동일한 효과 유지
--------------------------------------------------------- */
function initPhotoTilesReveal(){
  if(!document.body.classList.contains("is-photo")) return;

  const imgs = qsa('main .container img');
  if(imgs.length === 0) return;

  // 각 이미지의 "클릭 가능한 타일"을 추정:
  // 1) button 안에 있으면 button
  // 2) a 안에 있으면 a
  // 3) 둘 다 아니면 img 자체를 reveal 대상으로
  const tiles = imgs.map(img => {
    return img.closest('button') || img.closest('a') || img;
  });

  // reveal 클래스가 없다면 부여
  tiles.forEach(t => t.classList.add('reveal'));

  // 이미 전역 reveal이 바인드되어 있으므로 refresh만 호출
  if(typeof window.refreshReveal === "function"){
    window.refreshReveal();
  }else{
    bindReveal();
  }
}

/* ---------------------------------------------------------
   6) Home — Video Preview (2 cards)
   - Requires:
     - index.html: <div id="homeVideoPreview"></div>
     - videos.js loads BEFORE site.js
   - Picks:
     - featured=true videos first (up to 2)
     - fills 부족분은 최신순(배열 뒤쪽)에서 채움
--------------------------------------------------------- */
function initHomeVideoPreview(){
  const mount = document.getElementById("homeVideoPreview");
  if(!mount) return; // 홈이 아니면 종료

  const db = window.VIDEO_DB;
  if(!db || !Array.isArray(db)) return;

  function parseYouTubeId(input){
    if(!input) return "";
    const s = String(input).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;

    try{
      const u = new URL(s);

      if(u.hostname.includes("youtu.be")){
        return (u.pathname || "").replace("/", "").slice(0, 11);
      }

      const v = u.searchParams.get("v");
      if(v) return v.slice(0, 11);

      const parts = (u.pathname || "").split("/").filter(Boolean);
      const i = parts.findIndex(p => p === "embed" || p === "shorts");
      if(i >= 0 && parts[i+1]) return parts[i+1].slice(0, 11);
    }catch(e){
      return "";
    }
    return "";
  }

  function ytThumbById(id){
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }

  function normalizeVideos(arr){
    return arr.map((x, idx) => {
      const id = parseYouTubeId(x.youtube || x.videoId || "");
      return {
        id,
        youtube: x.youtube || (id ? `https://www.youtube.com/watch?v=${id}` : ""),
        title: (x.title || "").trim() || `Video ${idx+1}`,
        label: (x.label || "Video").trim(),
        featured: !!x.featured
      };
    }).filter(v => v.id);
  }

  const all = normalizeVideos(db);

  // featured 우선 2개
  const picked = all.filter(v => v.featured).slice(0, 2);

  // 부족하면 최신순(배열 뒤쪽)으로 채우기
  if(picked.length < 2){
    const remain = all.slice().reverse().filter(v => !picked.some(p => p.id === v.id));
    picked.push(...remain.slice(0, 2 - picked.length));
  }

  mount.innerHTML = "";

  picked.forEach(v => {
    const a = document.createElement("a");
    a.className = "home-video-card";
    a.href = "video/";

    /* ✅ [수정 1] 홈 카드에 실제 유튜브 링크를 심어둔다 (라이트박스용) */
    a.setAttribute("data-youtube", v.youtube);

    // 썸네일 로드 실패 시 fallback
    const thumb = ytThumbById(v.id);

    a.innerHTML = `
      <div class="home-video-thumb">
        <img src="${thumb}" alt="${escapeHtml(v.title)}" loading="lazy" decoding="async">
        <div class="home-video-play" aria-hidden="true"></div>
      </div>
      <div class="home-video-meta">
        <div class="home-video-label">${escapeHtml(v.label)}</div>
        <div class="home-video-title">${escapeHtml(v.title)}</div>
      </div>
    `;

    // 이미지 fallback 체인 (hq -> mq -> default)
    const img = a.querySelector("img");
    if(img){
      img.referrerPolicy = "no-referrer";
      img.onerror = () => {
        const step = img.dataset.fallback || "0";
        if(step === "0"){
          img.dataset.fallback = "1";
          img.src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
          return;
        }
        img.src = `https://i.ytimg.com/vi/${v.id}/default.jpg`;
      };
    }

    mount.appendChild(a);
  });

  // 홈 비디오 카드도 reveal로 자연스럽게 나타나게
  qsa('#homeVideoPreview .home-video-card').forEach(el => el.classList.add('reveal'));
  if(typeof window.refreshReveal === "function") window.refreshReveal();
}

/* ---------------------------------------------------------
   7) Small helpers
--------------------------------------------------------- */
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* ---------------------------------------------------------
   BOOT
--------------------------------------------------------- */
onReady(() => {
  initMobileMenu();
  initLightbox();

  markPhotoPage();

  initReveal();             // ✅ 전역 reveal 먼저
  initPhotoTilesReveal();   // ✅ 사진 페이지면 타일을 reveal 대상으로 추가

  initHomeVideoPreview();   // ✅ 홈이면 VIDEO_DB 기반으로 2개 미리보기 렌더
});

// ---------------------------------------------------------
// Resume Modal (PDF viewer) — Contact page
// ---------------------------------------------------------
(function initResumeModal(){
  const openBtn = document.querySelector("[data-resume-open]");
  const modal = document.querySelector("[data-resume-modal]");
  const closeBtn = document.querySelector("[data-resume-close]");
  const frame = document.querySelector("[data-resume-frame]");

  if(!openBtn || !modal || !closeBtn || !frame) return;

  const open = (src) => {
    frame.src = src;
    modal.classList.add("open");
    document.documentElement.style.overflow = "hidden";
  };

  const close = () => {
    modal.classList.remove("open");
    frame.src = "";
    document.documentElement.style.overflow = "";
  };

  openBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const src = openBtn.getAttribute("href");
    if(src) open(src);
  });

  closeBtn.addEventListener("click", close);

  modal.addEventListener("click", (e) => {
    if(e.target === modal) close();
  });

  window.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && modal.classList.contains("open")) close();
  });
})();

(function initResumeModal(){
  const openBtn = document.querySelector('[data-resume-open]');
  const modal = document.querySelector('[data-resume-modal]');
  const closeBtn = document.querySelector('[data-resume-close]');
  if(!openBtn || !modal || !closeBtn) return;

  const iframe = modal.querySelector('iframe');
  const pdfUrl = openBtn.getAttribute('href');

  const open = (e) => {
    e.preventDefault();
    iframe.src = pdfUrl;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  };

  const close = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    iframe.src = '';
    document.documentElement.style.overflow = '';
  };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if(e.target === modal) close(); });
  window.addEventListener('keydown', (e) => { if(e.key === 'Escape') close(); });
})();

/* =========================
   HOME VIDEO → LIGHTBOX
   ✅ 메인 비디오 카드 클릭 시 video/로 이동하지 않고 바로 재생
========================= */

(function(){
  const lb = document.querySelector("[data-vlb]");
  const yt = document.querySelector("[data-vlb-yt]");
  const closeBtn = document.querySelector("[data-vlb-close]");
  const mount = document.getElementById("homeVideoPreview");

  /* ✅ [수정 2] closeBtn, mount까지 체크 (다른 페이지에서 오류 방지) */
  if (!lb || !yt || !closeBtn || !mount) return;

  function ytEmbed(url){
    const id =
      url.match(/youtu\.be\/([^?]+)/)?.[1] ||
      url.match(/[?&]v=([^&]+)/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : "";
  }

  function open(url){
    const src = ytEmbed(url);
    if (!src) return;
    yt.src = src;
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close(){
    lb.classList.remove("open");
    yt.src = "";
    document.body.style.overflow = "";
  }

  closeBtn.addEventListener("click", close);
  lb.addEventListener("click", e => {
    if (e.target === lb) close();
  });

  window.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && lb.classList.contains("open")) close();
  });

  /* ✅ [수정 3] 이벤트 위임: 주입된 .home-video-card 클릭을 가로채서 data-youtube로 연다 */
  mount.addEventListener("click", (e) => {
    const card = e.target.closest("[data-youtube]");
    if(!card) return;

    e.preventDefault();     // video/ 이동 막기
    e.stopPropagation();

    const url = card.getAttribute("data-youtube");
    if(url) open(url);
  });
})();

/* =========================================
   Mobile: View Resume open in new tab
========================================= */
(function () {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  if (!isMobile) return;

  const resumeLinks = document.querySelectorAll(".resume-link");
  resumeLinks.forEach(link => {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });
})();
