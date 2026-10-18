/**
 * CLASSyCAN Main Application Controller
 * Handles dynamic data rendering from unit1.json, UI interactions,
 * SVG scene hotspot discovery, modal popups, audio playback, and exercises.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const data = window.CLASSYCAN_DATA;
  const audio = window.CLASSYCAN_AUDIO;
  const quiz = window.CLASSYCAN_QUIZ;

  let currentModuleIndex = 0;
  let completedHotspots = new Set();
  let showJyutping = true;
  let isTraditional = true;

  // DOM Elements
  const unitMainTitle = document.getElementById('unit-main-title');
  const unitSubtitle = document.getElementById('unit-subtitle');
  const modulesNav = document.getElementById('modules-nav');
  const hotspotsLayer = document.getElementById('scene-hotspots-layer');
  const svgHotspotsContainer = document.getElementById('svg-hotspots-container');
  const sceneBgImg = document.getElementById('scene-bg-img');
  const learningCard = document.getElementById('floating-learning-card');
  const cardTitle = document.getElementById('card-title');
  const cardBadge = document.getElementById('card-badge');
  const cardImg = document.getElementById('card-img');
  const cardText = document.getElementById('card-text');
  const cardListenBtn = document.getElementById('card-listen-btn');
  const cardJyutpingBtn = document.getElementById('card-jyutping-btn');
  const cardKnowledgeBtn = document.getElementById('card-knowledge-btn');
  const cardCompleteBtn = document.getElementById('card-complete-btn');
  const cardCloseBtn = document.getElementById('card-close-btn');

  // Mobile / Tablet Drawer Elements
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  const btnSidebarClose = document.getElementById('btn-sidebar-close');
  const courseSidebar = document.getElementById('course-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  // Top Nav Toggles
  const btnToggleJyutping = document.getElementById('btn-toggle-jyutping');
  const btnToggleTrad = document.getElementById('btn-toggle-trad');
  const btnToggleSubtitles = document.getElementById('btn-toggle-subtitles');

  // Bottom Status & Modals
  const remainingCounter = document.getElementById('remaining-counter');
  const statusDotsContainer = document.getElementById('status-dots');
  const knowledgeModal = document.getElementById('knowledge-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalBodyContent = document.getElementById('modal-body-content');
  const modalTitle = document.getElementById('modal-title');
  const btnKnowledgeList = document.getElementById('btn-knowledge-list');
  const btnHint = document.getElementById('btn-hint');
  const btnNextStep = document.getElementById('btn-next-step');

  // Current active hotspot
  let activeHotspot = null;

  // ==========================================
  // Load Dynamic Data from src/data/unit1.json
  // ==========================================
  try {
    const dataSrc = document.body.getAttribute('data-unit-src') || 'src/data/unit1.json';
    await data.load(dataSrc);
  } catch (err) {
    console.error('[CLASSyCAN] Critical: Could not load unit1.json data:', err);
    if (modalBodyContent && knowledgeModal) {
      modalTitle.textContent = "資料載入提示";
      modalBodyContent.innerHTML = `
        <div style="padding:16px; background:#fff3cd; color:#856404; border-radius:8px; line-height:1.8;">
          <h4 style="margin-bottom:8px;">⚠️ 無法載入 <code>src/data/unit1.json</code></h4>
          <p>若您是直接在瀏覽器以 <code>file:///</code> 本地協定雙擊打開網頁，現代瀏覽器可能會阻擋本地 Fetch 請求。</p>
          <p><strong>建議啟動方式：</strong> 在終端執行 <code>python3 -m http.server 8000</code>，然後在瀏覽器造訪 <code>http://localhost:8000</code>。</p>
        </div>
      `;
      knowledgeModal.classList.add('active');
    }
    return;
  }

  // Update Unit Titles & Subtitles from dataset
  if (unitMainTitle && data.themeTitle) {
    unitMainTitle.textContent = data.themeTitle;
  }
  if (unitSubtitle && data.themeSubtitle) {
    unitSubtitle.textContent = data.themeSubtitle;
  }

  // ==========================================
  // Render Sidebar Modules Nav
  // ==========================================
  function renderModulesNav() {
    if (!modulesNav) return;
    modulesNav.innerHTML = '';

    data.modules.forEach((mod, idx) => {
      const card = document.createElement('div');
      const isCurrent = idx === currentModuleIndex;
      const isDone = idx < currentModuleIndex;
      card.className = `module-card ${isCurrent ? 'active' : ''}`;
      card.id = `card-mod-${mod.number}`;

      const statusClass = isCurrent ? 'in-progress' : (isDone ? 'completed' : 'locked');
      const statusBadgeText = isCurrent ? '探索中' : (isDone ? '✓ 完成' : (mod.statusLabel || '待探索'));

      card.innerHTML = `
        <div class="module-icon-box">${mod.icon || '🍵'}</div>
        <div class="module-text-info">
          <div class="module-idx">Module ${mod.number}</div>
          <div class="module-heading">${mod.title}</div>
        </div>
        <span class="module-status-badge ${statusClass}">${statusBadgeText}</span>
      `;

      card.addEventListener('click', () => {
        selectModule(idx);
      });

      modulesNav.appendChild(card);
    });

    // Update sidebar progress header (1/4 .. 4/4)
    const progressText = document.getElementById('progress-text');
    if (progressText) {
      progressText.textContent = `${currentModuleIndex + 1} / ${data.modules.length}`;
    }
    for (let i = 0; i < 4; i++) {
      const stepEl = document.getElementById(`step-${i + 1}`);
      if (stepEl) {
        stepEl.className = `step-node ${i < currentModuleIndex ? 'completed' : (i === currentModuleIndex ? 'active' : '')}`;
      }
    }
  }

  function selectModule(idx) {
    currentModuleIndex = idx;
    renderModulesNav();
    closeMobileSidebar();

    const currentMod = data.modules[idx];
    if (sceneBgImg && currentMod && currentMod.sceneBg) {
      sceneBgImg.src = currentMod.sceneBg;
    }

    // Always keep interactive scene hotspots rendered on the main teahouse canvas
    renderHotspots();

    if (idx === 0) {
      knowledgeModal.classList.remove('active');
    } else if (idx === 1) {
      closeLearningCard();
      openTeaGalleryModal();
    } else if (idx === 2) {
      closeLearningCard();
      openDimSumGalleryModal();
    } else if (idx === 3) {
      closeLearningCard();
      openOrderingPaperModal();
    }

    updateProgress();
  }

  // ==========================================
  // Mobile Drawer Toggle Controller
  // ==========================================
  function openMobileSidebar() {
    if (courseSidebar) courseSidebar.classList.add('drawer-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
  }

  function closeMobileSidebar() {
    if (courseSidebar) courseSidebar.classList.remove('drawer-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  }

  if (btnMobileMenu) btnMobileMenu.addEventListener('click', openMobileSidebar);
  if (btnSidebarClose) btnSidebarClose.addEventListener('click', closeMobileSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

  // ==========================================
  // Render Hybrid SVG Hotspots (574x360 Native Image ViewBox)
  // ==========================================
  function renderHotspots() {
    const baseModule = data.modules[0];
    if (svgHotspotsContainer) svgHotspotsContainer.innerHTML = '';
    if (hotspotsLayer) hotspotsLayer.innerHTML = '';

    if (!baseModule || !baseModule.hotspots || baseModule.hotspots.length === 0) {
      return;
    }

    baseModule.hotspots.forEach(hp => {
      const isCompleted = completedHotspots.has(hp.id);

      // Native 574x360 exact pixel coordinates
      const svgX = hp.px_x || (hp.x / 100) * 574;
      const svgY = hp.px_y || (hp.y / 100) * 360;
      const iconHref = isCompleted
        ? 'public/unit1/image/hotspot_complete.png'
        : 'public/unit1/image/hotspot_incomplete.png';
      const labelWidth = Math.max(68, hp.title.length * 8.2 + 14);

      if (svgHotspotsContainer) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', `svg-hotspot-group ${isCompleted ? 'completed' : ''}`);
        g.setAttribute('transform', `translate(${svgX}, ${svgY})`);
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', hp.title);

        g.innerHTML = `
          <title>${hp.title}</title>
          <circle class="svg-hotspot-halo" cx="0" cy="0" r="15" />
          <circle cx="0" cy="0" r="20" fill="transparent" />
          <g class="svg-hotspot-badge">
            <circle class="svg-hotspot-circle" cx="0" cy="0" r="12" />
            <image class="svg-hotspot-img" x="-13" y="-13" width="26" height="26" href="${iconHref}" />
          </g>
          <g class="svg-hotspot-label-group" transform="translate(0, -22)">
            <rect class="svg-hotspot-label-bg" x="${-labelWidth / 2}" y="-8" width="${labelWidth}" height="16" rx="4" />
            <text class="svg-hotspot-label-text" x="0" y="0">${hp.title}</text>
          </g>
        `;

        // Direct Touch & Click support
        g.addEventListener('click', (e) => {
          e.stopPropagation();
          openLearningCard(hp);
        });

        svgHotspotsContainer.appendChild(g);
      }
    });

    updateProgress();
  }

  // ==========================================
  // Open Floating Learning Card / Mobile Bottom Sheet
  // ==========================================
  function openLearningCard(hp) {
    activeHotspot = hp;
    if (!learningCard) return;

    cardTitle.textContent = hp.title;
    cardBadge.textContent = hp.badge || '知識點';
    cardImg.src = hp.image || 'public/unit1/image/菊花茶-T1-Act1-茶葉-gukfaacaa.png';
    cardImg.alt = hp.title;

    // Render Text with Ruby formatting for fallback Jyutping
    cardText.innerHTML = formatCantoneseText(hp.summary);

    const isDone = completedHotspots.has(hp.id);
    cardCompleteBtn.textContent = isDone ? '✓ 已完成探索' : '完成探索';
    cardCompleteBtn.style.background = isDone ? 'var(--c-primary)' : 'var(--c-accent-red)';

    learningCard.style.display = 'flex';
    setTimeout(() => {
      learningCard.style.opacity = '1';
      learningCard.classList.add('sheet-active');
    }, 10);
  }

  function closeLearningCard() {
    if (!learningCard) return;
    learningCard.classList.remove('sheet-active');
    learningCard.style.opacity = '0';
    setTimeout(() => {
      learningCard.style.display = 'none';
    }, 280);
  }

  // Cantonese Text Formatter with phonetic ruby annotations
  function formatCantoneseText(rawText) {
    if (!rawText) return '';
    const vocabularyMap = {
      '茶樓': '<ruby>茶樓<rt>caa4 lau4</rt></ruby>',
      '一盅兩件': '<ruby>一盅兩件<rt>jat1 zung1 loeng5 gin6</rt></ruby>',
      '早茶': '<ruby>早茶<rt>zou2 caa4</rt></ruby>',
      '點心': '<ruby>點心<rt>dim2 sam1</rt></ruby>',
      '點心車': '<ruby>點心車<rt>dim2 sam1 ce1</rt></ruby>',
      '點心紙': '<ruby>點心紙<rt>dim2 sam1 zi2</rt></ruby>',
      '斟茶': '<ruby>斟茶<rt>zam1 caa4</rt></ruby>',
      '叩手': '<ruby>叩手<rt>kau3 sau2</rt></ruby>',
      '叩手指': '<ruby>叩手指<rt>kau3 sau2 zi2</rt></ruby>',
      '禮儀': '<ruby>禮儀<rt>lai5 ji4</rt></ruby>',
      '搭檯': '<ruby>搭檯<rt>daap3 toi2</rt></ruby>',
      '多謝': '<ruby>多謝<rt>do1 ze6</rt></ruby>',
      '普洱': '<ruby>普洱<rt>pou2 lei2</rt></ruby>',
      '壽眉': '<ruby>壽眉<rt>sau6 mei2</rt></ruby>',
      '鐵觀音': '<ruby>鐵觀音<rt>tit3 gun1 jam1</rt></ruby>',
      '燒賣': '<ruby>燒賣<rt>siu1 maai2</rt></ruby>',
      '茶芥': '<ruby>茶芥<rt>caa4 gaai3</rt></ruby>'
    };

    let formatted = rawText;
    for (const [word, rubyHtml] of Object.entries(vocabularyMap)) {
      formatted = formatted.replaceAll(word, rubyHtml);
    }
    return formatted;
  }

  // Card Listen Audio Button
  if (cardListenBtn) {
    cardListenBtn.addEventListener('click', () => {
      if (!activeHotspot) return;
      cardListenBtn.innerHTML = '<span>🔊 播放中</span>';
      const audioFile = activeHotspot.audioFile || (data.story ? data.story.audio : null);
      audio.playSound(audioFile, activeHotspot.audioText || activeHotspot.summary, () => {
        cardListenBtn.innerHTML = '<span>🔊 聽粵語</span>';
      });
    });
  }

  // Card Toggle Jyutping Button
  if (cardJyutpingBtn) {
    cardJyutpingBtn.addEventListener('click', () => {
      showJyutping = !showJyutping;
      document.body.classList.toggle('hide-jyutping', !showJyutping);
      cardJyutpingBtn.classList.toggle('primary', showJyutping);
      if (btnToggleJyutping) {
        btnToggleJyutping.classList.toggle('active', showJyutping);
      }
    });
  }

  // Card Language Knowledge Button
  if (cardKnowledgeBtn) {
    cardKnowledgeBtn.addEventListener('click', () => {
      if (!activeHotspot) return;
      openStoryModal(activeHotspot);
    });
  }

  // Card Complete Button
  if (cardCompleteBtn) {
    cardCompleteBtn.addEventListener('click', () => {
      if (!activeHotspot) return;
      completedHotspots.add(activeHotspot.id);
      renderHotspots();
      cardCompleteBtn.textContent = '✓ 已完成探索';
      cardCompleteBtn.style.background = 'var(--c-primary)';
      closeLearningCard();
    });
  }

  if (cardCloseBtn) {
    cardCloseBtn.addEventListener('click', closeLearningCard);
  }

  // ==========================================
  // Story & Cultural Knowledge Modal (Module 1 / General)
  // ==========================================
  let showTranslation = false;

  function openStoryModal(hp) {
    if (!knowledgeModal) return;
    modalTitle.textContent = hp.title || (data.story ? data.story.title : "茶樓文化嘅故事");
    showTranslation = false;

    renderStoryContent(hp);
    knowledgeModal.classList.add('active');
  }

  function renderStoryContent(hp) {
    const fullStory = hp.fullStory || (data.story ? data.story.cantoneseBody : hp.summary);
    const transText = hp.mandarinTranslation || (data.story ? data.story.mandarinBody : "");
    const audioPath = hp.audioFile || (data.story ? data.story.audio : null);

    modalBodyContent.innerHTML = `
      <div class="audio-player-bar">
        <button class="audio-play-btn" id="modal-audio-btn" aria-label="播放語音">▶</button>
        <div class="audio-info-text">
          <div id="modal-audio-status">純正標準廣東話朗讀（點擊播放）</div>
          <small style="color:var(--c-text-muted);">音訊路徑: ${audioPath || 'Cantonese Speech Engine'}</small>
        </div>
        <button class="card-btn" id="btn-toggle-trans">
          ${showTranslation ? '隱藏粵普對照' : '📖 粵普對照'}
        </button>
      </div>

      <div class="story-text-container" style="font-size:16.5px; line-height:2.2;">
        ${fullStory.split('\n\n').map(p => `
          <p class="story-paragraph">${formatCantoneseText(p)}</p>
        `).join('')}
      </div>

      ${showTranslation && transText ? `
        <div class="translation-box animate-fade-in">
          <strong style="color:var(--c-amber-gold); display:block; margin-bottom:8px;">【普通話/國語 對照譯文】</strong>
          ${transText.split('\n\n').map(p => `<p style="margin-bottom:8px;">${p}</p>`).join('')}
        </div>
      ` : ''}
    `;

    // Hook up modal audio button (keep button icon compact so 40x40 circle never overflows)
    const modalAudioBtn = document.getElementById('modal-audio-btn');
    const modalAudioStatus = document.getElementById('modal-audio-status');
    if (modalAudioBtn) {
      modalAudioBtn.addEventListener('click', () => {
        if (audio.isPlaying()) {
          audio.stop();
          modalAudioBtn.textContent = '▶';
          if (modalAudioStatus) modalAudioStatus.textContent = '純正標準廣東話朗讀（點擊播放）';
        } else {
          modalAudioBtn.textContent = '⏸';
          if (modalAudioStatus) modalAudioStatus.textContent = '🔊 正在播放廣東話錄音...';
          audio.playSound(audioPath, fullStory, () => {
            modalAudioBtn.textContent = '▶';
            if (modalAudioStatus) modalAudioStatus.textContent = '純正標準廣東話朗讀（點擊播放）';
          });
        }
      });
    }

    // Hook up translation toggle
    const btnToggleTrans = document.getElementById('btn-toggle-trans');
    if (btnToggleTrans) {
      btnToggleTrans.addEventListener('click', () => {
        showTranslation = !showTranslation;
        renderStoryContent(hp);
      });
    }
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      audio.stop();
      knowledgeModal.classList.remove('active');
    });
  }

  // ==========================================
  // Progress Tracking
  // ==========================================
  function updateProgress() {
    const baseModule = data.modules[0];
    if (!baseModule) return;

    const total = baseModule.hotspots ? baseModule.hotspots.length : 4;
    const completedCount = baseModule.hotspots
      ? baseModule.hotspots.filter(h => completedHotspots.has(h.id)).length
      : 0;

    const remaining = total - completedCount;
    if (remainingCounter) {
      remainingCounter.textContent = remaining;
    }

    if (statusDotsContainer) {
      statusDotsContainer.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('div');
        dot.className = `dot ${i < completedCount ? 'completed' : (i === completedCount ? 'active' : '')}`;
        statusDotsContainer.appendChild(dot);
      }
    }
  }

  // ==========================================
  // Module 2: Teas Gallery, Staff Titles & Teahouse Requests Modal
  // ==========================================
  function openTeaGalleryModal() {
    modalTitle.textContent = "搵位坐：茶樓名茶、侍應稱謂與實用請求句式";
    modalBodyContent.innerHTML = `
      <div style="background:var(--c-surface-card-subtle); border-radius:var(--radius-md); padding:14px; margin-bottom:16px; border-left:4px solid var(--c-primary);">
        <p style="color:var(--c-text-primary); font-size:14px; margin-bottom:4px;">
          🍵 <strong>茶樓開檯第一步：「飲咩茶？」（Task 2：六種經典茶葉）</strong>
        </p>
        <p style="color:var(--c-text-secondary); font-size:13px; margin:0;">
          點擊 🔊 聆聽真人廣東話錄音並跟讀茶葉名稱，再於輸入框打出粵拼進行自我校對！
        </p>
      </div>

      <div class="tasting-gallery-grid">
        ${data.teaList.map((tea) => `
          <div class="tasting-card" data-tea="${tea.name}">
            <div class="tasting-thumb-box" style="height:120px; background:linear-gradient(135deg, #1b4d3e15, #b8860b15);">
              ${tea.image
                ? `<img src="${tea.image}" alt="${tea.name}" class="tasting-thumb-img">`
                : `<span style="font-size:44px;">🍵</span>`
              }
            </div>
            <div class="tasting-card-body">
              <div class="tasting-food-name">
                <span>${tea.name}</span>
                <span class="tasting-jyutping-tag">${tea.jyutping}</span>
              </div>
              <p style="font-size:12px; color:var(--c-text-muted); min-height:36px;">${tea.note}</p>

              <div class="quiz-input-row">
                <input type="text" class="jyutping-quiz-input" placeholder="輸入粵拼..." data-correct="${tea.jyutping}">
                <button class="quiz-check-btn" onclick="checkDimsumQuiz(this, '${tea.jyutping}')">校對</button>
                <button class="card-btn" style="padding:6px 9px;" onclick="window.CLASSYCAN_AUDIO.playSound('${tea.audio}', '${tea.name}')" title="聽發音">🔊</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Task 7 Part A: Teahouse Staff Titles -->
      <div style="margin-top:28px; background:#faf6f0; border:1px solid #ebdccb; border-radius:var(--radius-md); padding:18px;">
        <h4 style="font-family:var(--font-display); font-size:16px; color:var(--c-text-primary); margin-bottom:6px; display:flex; align-items:center; gap:8px;">
          <span>🙋</span> 茶樓常用稱謂（Task 7：點樣稱呼侍應同點心姐姐？）
        </h4>
        <p style="font-size:13px; color:var(--c-text-secondary); margin-bottom:12px;">
          喺香港茶樓叫人幫手時，可以先用親切有禮嘅稱呼引起注意（點擊 🔊 聽真人發音）：
        </p>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:10px;">
          ${(data.staffTitles || []).map(item => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; background:#ffffff; border:1px solid var(--c-border); border-radius:var(--radius-sm);">
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:14px;">${item.name} <span class="tasting-jyutping-tag">${item.jyutping}</span></div>
                <div style="font-size:11.5px; color:var(--c-text-muted);">${item.role}</div>
              </div>
              <button class="card-btn" style="padding:5px 9px;" onclick="window.CLASSYCAN_AUDIO.playSound('${item.audio}', '${item.name}')" title="聽發音">🔊</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Task 7 Part B: Making Polite Requests in the Teahouse -->
      <div style="margin-top:22px; background:#ffffff; border:1px solid var(--c-border); border-radius:var(--radius-md); padding:18px;">
        <h4 style="font-family:var(--font-display); font-size:16px; color:var(--c-text-primary); margin-bottom:10px; display:flex; align-items:center; gap:8px;">
          <span>🫖</span> 茶樓實用請求句式（Task 7：「麻煩你…」「可唔可以…」「唔該…」）
        </h4>
        <div style="margin-bottom:14px; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--c-border); max-height:260px; display:flex; justify-content:center; background:#faf6f0;">
          <img src="public/unit1/image/request_add_water.jpg" alt="麻煩你幫我加水吖" style="max-width:100%; max-height:260px; object-fit:contain; display:block;">
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:10px;">
          ${(data.requestPhrases || []).map(req => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; background:var(--c-surface-card-subtle); border:1px solid var(--c-border); border-radius:var(--radius-sm);">
              <div style="min-width:0;">
                <span class="tasting-jyutping-tag" style="margin-bottom:4px; display:inline-block;">${req.pattern}</span>
                <div style="font-weight:700; font-size:14px; color:var(--c-text-primary);">${req.text}</div>
                <div style="font-size:12px; color:var(--c-text-secondary);">${req.meaning}</div>
              </div>
              <button class="card-btn primary" style="padding:6px 10px;" onclick="window.CLASSYCAN_AUDIO.playSound('${req.audio}', '${req.text}')" title="聽錄音">🔊 聽錄音</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    knowledgeModal.classList.add('active');
  }

  // ==========================================
  // Module 3: Dim Sum (15 Items), Sauces (8 Items) & Textures (10 Items) Modal
  // ==========================================
  function openDimSumGalleryModal() {
    modalTitle.textContent = `開餐喇：經典點心、茶芥醬料與口感食評`;
    modalBodyContent.innerHTML = `
      <div style="background:var(--c-surface-card-subtle); border-radius:var(--radius-md); padding:14px; margin-bottom:16px; border-left:4px solid var(--c-amber-gold);">
        <p style="color:var(--c-text-primary); font-size:14px; margin-bottom:4px;">
          🥟 <strong>十五款地道香港茶樓點心（Task 3 真人發音與粵拼練習）</strong>
        </p>
        <p style="color:var(--c-text-secondary); font-size:13px; margin:0;">
          點擊點心卡片上的喇叭 🔊 聆聽標準粵語錄音，並在輸入框嘗試打出對應粵拼進行即時自我校對！
        </p>
      </div>

      <div class="tasting-gallery-grid">
        ${data.dimsumList.map(item => `
          <div class="tasting-card" data-id="${item.id}">
            <div class="tasting-thumb-box">
              <img src="${item.image}" alt="${item.name}" class="tasting-thumb-img" onerror="this.src='public/unit1/image/siu1maai2.png'">
              <span style="position:absolute; bottom:6px; right:6px; background:rgba(0,0,0,0.65); color:#fff; font-size:11px; padding:2px 6px; border-radius:3px;">${item.classifier}</span>
            </div>
            <div class="tasting-card-body">
              <div class="tasting-food-name">
                <span>${item.name}</span>
                <span class="tasting-jyutping-tag">${item.jyutping}</span>
              </div>
              <p style="font-size:12px; color:var(--c-text-muted); min-height:36px;">${item.description}</p>

              <div class="quiz-input-row">
                <input type="text" class="jyutping-quiz-input" placeholder="輸入粵拼..." data-correct="${item.jyutping}">
                <button class="quiz-check-btn" onclick="checkDimsumQuiz(this, '${item.jyutping}')">校對</button>
                <button class="card-btn" style="padding:6px 9px;" onclick="window.CLASSYCAN_AUDIO.playSound('${item.audio}', '${item.name}')" title="聽發音">🔊</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Sauces & Tea-Fee Cultural Story (Task 6 with sauce images & audio) -->
      <div style="margin-top:28px; background:#faf6f0; border:1px solid #ebdccb; border-radius:var(--radius-md); padding:18px;">
        <h4 style="font-family:var(--font-display); font-size:16px; color:var(--c-text-primary); margin-bottom:8px; display:flex; align-items:center; gap:8px;">
          <span>🥢</span> 茶樓醬料與「茶芥」文化（Task 6 真人發音與圖片）
        </h4>
        <p style="font-size:13.5px; line-height:1.7; color:var(--c-text-secondary); margin-bottom:14px;">
          ${data.teaFeeStory}
        </p>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:12px;">
          ${data.sauceList.map(sauce => `
            <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:#ffffff; border:1px solid var(--c-border); border-radius:var(--radius-sm);">
              <img src="${sauce.image}" alt="${sauce.name}" style="width:48px; height:48px; object-fit:contain; flex-shrink:0; border-radius:6px; background:#faf6f0;">
              <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:14px;">${sauce.name}</div>
                <span class="tasting-jyutping-tag" style="display:inline-block; margin-top:2px;">${sauce.jyutping}</span>
              </div>
              <button class="card-btn" style="padding:6px 9px;" onclick="window.CLASSYCAN_AUDIO.playSound('${sauce.audio}', '${sauce.name}')" title="聽發音">🔊</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Act 3 / Task 10: Food Review & Texture Vocabulary (10 recorded audio files) -->
      <div style="margin-top:24px; background:#ffffff; border:1px solid var(--c-border); border-radius:var(--radius-md); padding:18px;">
        <h4 style="font-family:var(--font-display); font-size:16px; color:var(--c-text-primary); margin-bottom:6px; display:flex; align-items:center; gap:8px;">
          <span>😋</span> 點心口感與食評詞彙（Act 3：十款道地口感錄音）
        </h4>
        <p style="font-size:13px; color:var(--c-text-secondary); margin-bottom:12px;">
          試下跟住錄音讀出形容點心口感嘅廣東話詞彙（例如：「今日啲牛肉球好彈牙！」）：
        </p>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px;">
          ${(data.textureList || []).map(tex => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; background:var(--c-surface-card-subtle); border:1px solid var(--c-border); border-radius:var(--radius-sm);">
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:14px;">${tex.name} <span class="tasting-jyutping-tag">${tex.jyutping}</span></div>
                <div style="font-size:11.5px; color:var(--c-text-muted); margin-top:2px;">${tex.meaning}</div>
              </div>
              <button class="card-btn" style="padding:6px 9px;" onclick="window.CLASSYCAN_AUDIO.playSound('${tex.audio}', '${tex.name}')" title="聽發音">🔊</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    knowledgeModal.classList.add('active');
  }

  // Global helper for dimsum & tea jyutping input validation (keeps button compact so layout never shifts)
  window.checkDimsumQuiz = function(btnEl, correctAnswer) {
    const input = btnEl.previousElementSibling;
    const isRight = quiz.checkJyutpingInput(input.value, correctAnswer);
    if (isRight) {
      input.classList.remove('wrong');
      input.classList.add('correct');
      btnEl.textContent = '✓ 正確';
      btnEl.style.background = '#2e7d32';
    } else {
      input.classList.remove('correct');
      input.classList.add('wrong');
      input.value = correctAnswer;
      btnEl.textContent = '✗ 已訂正';
      btnEl.style.background = '#c62828';
    }
  };

  // ==========================================
  // Module 4: Real Dim Sum Ordering Paper, Classifiers, Bill Comic & HK Currency
  // ==========================================
  function openOrderingPaperModal() {
    modalTitle.textContent = "點心紙、茶樓量詞與埋單實戰";
    const frontImg = data.orderingPaper ? data.orderingPaper.front : 'public/unit1/image/dim2sum1zi2_a.jpg';
    const backImg = data.orderingPaper ? data.orderingPaper.back : 'public/unit1/image/dim2sum1zi2_b.jpg';

    modalBodyContent.innerHTML = `
      <div class="dimsum-paper-viewer">
        <div class="paper-toggle-bar">
          <button class="card-btn primary" id="btn-show-paper-a">點心紙 正面（蒸點與主食）</button>
          <button class="card-btn" id="btn-show-paper-b">點心紙 背面（特惠套餐與特飲）</button>
        </div>
        <div class="dimsum-paper-img-frame">
          <img id="paper-display-img" src="${frontImg}" alt="點心紙" class="dimsum-paper-img" onerror="this.src='public/unit1/image/T1茶樓背景圖.jpg'">
        </div>
      </div>

      <!-- Classifiers Challenge from Task 5 -->
      <div class="matching-game-container">
        <h4 style="font-family:var(--font-display); font-size:16px; margin-bottom:6px;">
          🎯 粵語茶樓量詞挑戰（Task 5：匹配正確量詞）
        </h4>
        <p style="font-size:13px; color:var(--c-text-secondary); margin-bottom:12px;">
          點擊食物名稱標記已掌握嘅茶樓量詞組合：
        </p>

        <div class="matching-pairs-grid">
          ${data.classifierList.map(p => `
            <div class="matching-item-chip" onclick="this.classList.toggle('matched')">
              <span>${p.example}</span>
              <span class="tasting-jyutping-tag" style="background:#f0e6d6;">${p.classifier}</span>
            </div>
          `).join('')}
        </div>

        <!-- Classifier Reduplication Rules (量詞疊字) -->
        <div style="margin-top:20px; padding:14px; background:#ffffff; border:1px dashed var(--c-amber-gold); border-radius:var(--radius-sm);">
          <strong style="color:var(--c-amber-gold); display:block; margin-bottom:6px;">
            💡 粵語語法秘笈：量詞疊字（表示「每一…都…」）
          </strong>
          <ul style="margin:0; padding-left:20px; font-size:13.5px; line-height:1.9; color:var(--c-text-secondary);">
            ${data.reduplicationPhrases.map(r => `
              <li><strong style="color:var(--c-primary);">${r.reduplication}</strong> ${r.sentence}（${r.meaning}）</li>
            `).join('')}
          </ul>
        </div>
      </div>

      <!-- Act 2 / Task 8 & 9: Settling the Bill Comic & HK Currency Slang -->
      <div style="margin-top:24px; background:#faf6f0; border:1px solid #ebdccb; border-radius:var(--radius-md); padding:18px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <h4 style="font-family:var(--font-display); font-size:16px; color:var(--c-text-primary); margin:0;">
            🧾 茶樓埋單四部曲與港幣俗稱（Act 2：埋單與錢）
          </h4>
          <button class="card-btn primary" onclick="window.CLASSYCAN_AUDIO.playSound('${data.billComics ? data.billComics.audio : ''}', '唔該，想埋單')">
            🔊 聽「唔該，想埋單」
          </button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-bottom:16px;">
          <div style="background:#fff; border:1px solid var(--c-border); border-radius:var(--radius-sm); overflow:hidden;">
            <img src="public/unit1/image/comic_settle_bill.jpg" alt="茶樓埋單漫畫一" style="width:100%; height:auto; display:block;">
          </div>
          <div style="background:#fff; border:1px solid var(--c-border); border-radius:var(--radius-sm); overflow:hidden;">
            <img src="public/unit1/image/bg-act2.jpeg" alt="茶樓埋單漫畫二" style="width:100%; height:auto; display:block;">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:12px;">
          ${(data.currencyList || []).map(curr => `
            <div style="display:flex; align-items:center; gap:12px; padding:10px 12px; background:#ffffff; border:1px solid var(--c-border); border-radius:var(--radius-sm);">
              <img src="${curr.image}" alt="${curr.name}" style="width:56px; height:56px; object-fit:contain; flex-shrink:0;">
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:13.5px;">${curr.name}</div>
                <span class="tasting-jyutping-tag" style="display:inline-block; margin:2px 0;">${curr.slang}</span>
                <div style="font-size:11.5px; color:var(--c-text-muted); line-height:1.4;">${curr.note}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-show-paper-a').addEventListener('click', (e) => {
      document.getElementById('paper-display-img').src = frontImg;
      e.currentTarget.classList.add('primary');
      document.getElementById('btn-show-paper-b').classList.remove('primary');
    });

    document.getElementById('btn-show-paper-b').addEventListener('click', (e) => {
      document.getElementById('paper-display-img').src = backImg;
      e.currentTarget.classList.add('primary');
      document.getElementById('btn-show-paper-a').classList.remove('primary');
    });

    knowledgeModal.classList.add('active');
  }

  // Next Step button in bottom bar
  if (btnNextStep) {
    btnNextStep.addEventListener('click', () => {
      const nextIdx = (currentModuleIndex + 1) % data.modules.length;
      selectModule(nextIdx);
    });
  }

  // Top Nav Toggles
  if (btnToggleJyutping) {
    btnToggleJyutping.addEventListener('click', () => {
      showJyutping = !showJyutping;
      document.body.classList.toggle('hide-jyutping', !showJyutping);
      btnToggleJyutping.classList.toggle('active', showJyutping);
    });
  }

  if (btnToggleTrad) {
    btnToggleTrad.addEventListener('click', () => {
      isTraditional = !isTraditional;
      btnToggleTrad.textContent = isTraditional ? '繁 / 簡' : '簡 / 繁';
    });
  }

  if (btnKnowledgeList) {
    btnKnowledgeList.addEventListener('click', () => {
      if (data.modules && data.modules[0] && data.modules[0].hotspots) {
        openStoryModal(data.modules[0].hotspots[0]);
      }
    });
  }

  if (btnHint) {
    btnHint.addEventListener('click', () => {
      alert('💡 學習提示：點擊蓮香樓畫面上閃爍的金色茶杯圖標，即可深入探索茶樓歷史與飲茶社交禮儀！');
    });
  }

  // Initial UI Render
  renderModulesNav();
  renderHotspots();
});
