
console.log('[MKB] loaded');
(function () {
    const root = document.getElementById('mkb-builder');
    if (!root) return;
  
    // Scope (= Produkt-Section) finden und Klassen dort setzen (nicht body!)
    const scope =
      root.closest('.shopify-section') ||
      root.closest('main') ||
      document.documentElement;
  
    scope.classList.add('mkb-scope');
  
    const errorBox = root.querySelector('#mkb_error');
  
    // ===== Sichere Bild-Upload-Logik (wie in bild.html) =====
    // IMPORTANT:
    //  - `127.0.0.1` / `localhost` works ONLY on *your own* computer.
    //  - Real customers will otherwise try to call THEIR own computer and the upload will fail.
    //  - Therefore provide your real (HTTPS) backend URL via `data-backend-api` on #mkb-builder.
    const BACKEND_API = root.dataset.backendApi || 'https://api.idasstories.com/v1/store/get-signed-upload-url';
    const MAX_UPLOAD_SIZE = 20 * 1024 * 1024; // 20 MB
  
    async function doSecureUpload(file, hiddenInputEl, statusDivEl, onSuccess) {
      if (!file) return;
      if (file.size > MAX_UPLOAD_SIZE) {
        if (statusDivEl) {
          statusDivEl.textContent = 'Datei zu groß (max. 20 MB).';
          statusDivEl.style.color = 'red';
        }
        return;
      }
      if (statusDivEl) {
        statusDivEl.textContent = '🔒 Wird hochgeladen…';
        statusDivEl.style.color = 'blue';
      }
      try {
        const response = await fetch(BACKEND_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, content_type: file.type })
        });
        if (!response.ok) {
          const t = await response.text().catch(()=> '');
          throw new Error('Upload-Autorisierung fehlgeschlagen. ' + (t || ''));
        }
        const { uploadUrl, fields } = await response.json();
        if (!uploadUrl || !fields) throw new Error('Backend-Antwort unvollständig (uploadUrl/fields fehlen).');
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
        formData.append('file', file);
        const s3Response = await fetch(uploadUrl, { method: 'POST', body: formData });
        if (s3Response.ok) {
          if (hiddenInputEl) hiddenInputEl.value = fields['key'] || '';
          if (statusDivEl) {
            statusDivEl.textContent = '✅ Datei sicher hochgeladen!';
            statusDivEl.style.color = 'green';
          }
          if (typeof onSuccess === 'function') onSuccess();
        } else {
          const t = await s3Response.text().catch(()=> '');
          console.log('S3 Fehler-Response:', t);
          throw new Error('S3-Upload fehlgeschlagen. ' + (t || ''));
        }
      } catch (err) {
        console.error('Upload-Fehler:', err);
        if (statusDivEl) {
          statusDivEl.textContent = '❌ Upload fehlgeschlagen. ' + (err?.message || 'Bitte erneut versuchen.');
          statusDivEl.style.color = 'red';
        }
      }
    }
  
    // Reihenfolge / Abhängigkeiten
    const steps = [
      { group: 'age',       input: '#mkb_age' },
      { group: 'theme',     input: '#mkb_theme' },
      { group: 'narrative', input: '#mkb_narrative' },
      { group: 'message',   input: '#mkb_message' },
      { group: 'chars',     input: null },
      { group: 'style',     input: '#mkb_style' },
    ];
  
    // ===== Hauptfigur (magisches-kinderbuch) =====
const charError = root.querySelector('#mkb_char_error');

const mainTypeSeg = root.querySelector('#mkbMainTypeSeg');
const mainNameEl  = root.querySelector('#mkbMainName');
const mainGenderEl = root.querySelector('#mkbMainGender');
const mainAgeEl    = root.querySelector('#mkbMainAge');
const mainPhotoEl  = root.querySelector('#mkbMainPhoto');

const genderWrap = root.querySelector('#mkbMainGenderWrap');
const ageWrap    = root.querySelector('#mkbMainAgeWrap');
const mainLookModeSeg = root.querySelector('#mkbMainLookMode');
const mainPhotoWrap = root.querySelector('#mkbMainPhotoWrap');
const mainDescWrap = root.querySelector('#mkbMainDescWrap');
const mainDescEl = root.querySelector('#mkbMainDesc');
const mainPhotoHint = root.querySelector('#mkbMainPhotoHint');
const mainInterestsEl = root.querySelector('#mkbMainInterests');
const mainSubtypeWrap = root.querySelector('#mkbMainSubtypeWrap');
const mainSubtypeLabel = root.querySelector('#mkbMainSubtypeLabel');
const mainSubtypeEl = root.querySelector('#mkbMainSubtype');

const SUBTYPE_CONFIG = {
  Tier:   { label: 'Um was für ein Tier handelt es sich?', placeholder: 'z.B. Hund, Katze, Löwe…' },
  Objekt: { label: 'Um was für ein Objekt handelt es sich?', placeholder: 'z.B. Teddy, Auto, Zauberstab…' },
};

function enforceDigits(el) {
  if (!el) return;
  el.addEventListener('input', () => {
    const v = el.value || '';
    const digits = v.replace(/\D+/g, '');
    if (v !== digits) el.value = digits;
  });
}
enforceDigits(mainAgeEl);

function setMainType(type){
  // UI
  mainTypeSeg?.querySelectorAll('.mkb-segBtn').forEach(b=>{
    b.classList.toggle('selected', b.getAttribute('data-type') === type);
  });

  // Hidden Inputs -> Charakter 1
  const typeHidden = q('#mkb_char_1_type');
  if (typeHidden) typeHidden.value = type;

  // Gender/Age nur für Person
  const isPerson = type === 'Person';
  if (genderWrap) genderWrap.style.display = isPerson ? '' : 'none';
  if (ageWrap) ageWrap.style.display = isPerson ? '' : 'none';
  if (!isPerson) {
    if (mainGenderEl) mainGenderEl.value = '';
    if (mainAgeEl) mainAgeEl.value = '';
  }

  // Subtype-Feld für Tier / Objekt
  const subtypeCfg = SUBTYPE_CONFIG[type];
  if (mainSubtypeWrap) mainSubtypeWrap.style.display = subtypeCfg ? '' : 'none';
  if (subtypeCfg) {
    if (mainSubtypeLabel) mainSubtypeLabel.textContent = subtypeCfg.label;
    if (mainSubtypeEl) mainSubtypeEl.placeholder = subtypeCfg.placeholder;
  } else {
    if (mainSubtypeEl) mainSubtypeEl.value = '';
  }

  // in properties schreiben
  const likesHidden = q('#mkb_char_1_likes');
  const roleHidden  = q('#mkb_char_1_role');

  // Du kannst hier entscheiden, wie du Gender/Age speichern willst:
  // Variante A: in "Rolle" packen
  // Variante B: zusätzlich eigene hidden inputs anlegen
  if (likesHidden && !likesHidden.value) likesHidden.value = ''; // bleibt frei
  if (roleHidden && !roleHidden.value) roleHidden.value = '';    // bleibt frei

  charError?.classList.remove('show');
  const newGroup = unlockGroups();
  if (newGroup) scrollToGroup(newGroup);
  applyCompleteState();
}

function syncMainFieldsToHidden(){
  const nameHidden = q('#mkb_char_1_name');
  if (nameHidden) nameHidden.value = (mainNameEl?.value || '').trim();

  // interests
  const likesHidden = q('#mkb_char_1_likes');
  if (likesHidden) likesHidden.value = (mainInterestsEl?.value || '').trim();

  // description (text appearance)
  const lookHidden = q('#mkb_char_1_look');
  const mode = mainLookModeSeg?.querySelector('.mkb-segBtn.selected')?.getAttribute('data-mode') || 'photo';
  if (lookHidden) {
    lookHidden.value = mode === 'desc' ? (mainDescEl?.value || '').trim() : '';
  }

  // char 1 role is always Hauptcharakter — no hidden input needed

  if ((mainNameEl?.value || '').trim()) clearFieldError(mainNameEl);
  if ((mainAgeEl?.value || '').trim()) clearFieldError(mainAgeEl);
  const _mode = mainLookModeSeg?.querySelector('.mkb-segBtn.selected')?.getAttribute('data-mode') || 'photo';
  if (_mode === 'desc' && (mainDescEl?.value || '').trim()) clearFieldError(mainDescEl);
  charError?.classList.remove('show');
  unlockGroups();
  applyCompleteState();
}

// charsComplete: mind. ein Charakter mit Typ ODER Name. Typ aus UI in Hidden syncen (Hauptfigur).
function charsComplete() {
  const mainTypeBtn = mainTypeSeg?.querySelector('.mkb-segBtn.selected');
  const mainType = mainTypeBtn?.getAttribute('data-type') || '';
  const typeH = q('#mkb_char_1_type');
  if (typeH && mainType && !typeH.value.trim()) typeH.value = mainType;
  for (let i = 1; i <= 5; i++) {
    const t = q(`#mkb_char_${i}_type`)?.value?.trim();
    const n = q(`#mkb_char_${i}_name`)?.value?.trim();
    if (t || n) return true;
  }
  return false;
}

// Events für Segment-Buttons
mainTypeSeg?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.mkb-segBtn');
  if(!btn) return;

  const groupEl = btn.closest('.group');
  if(groupEl && groupEl.classList.contains('locked')){
    errorBox?.classList.add('show');
    return;
  }
  setMainType(btn.getAttribute('data-type'));
});

// Foto vs. Beschreibung (Hauptfigur)
mainLookModeSeg?.addEventListener('click', (e) => {
  const btn = e.target.closest('.mkb-segBtn');
  if (!btn) return;
  mainLookModeSeg.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const mode = btn.getAttribute('data-mode');
  const isDesc = mode === 'desc';
  if (mainPhotoWrap) mainPhotoWrap.style.display = isDesc ? 'none' : '';
  if (mainPhotoHint) mainPhotoHint.style.display = isDesc ? 'none' : '';
  if (mainDescWrap) mainDescWrap.style.display = isDesc ? '' : 'none';
  if (isDesc) {
    if (mainPhotoEl) mainPhotoEl.value = '';
    const hid = q('#mkb_char_1_securefileid');
    if (hid) hid.value = '';
    const st = root.querySelector('#mkbUploadStatus1');
    if (st) st.textContent = '';
    clearFieldError(mainPhotoWrap);
  } else {
    if (mainDescEl) mainDescEl.value = '';
    clearFieldError(mainDescEl);
  }
  syncMainFieldsToHidden();
});
mainDescEl?.addEventListener('input', syncMainFieldsToHidden);
mainDescEl?.addEventListener('change', syncMainFieldsToHidden);

// Inputs synchronisieren
[mainNameEl, mainGenderEl, mainAgeEl, mainInterestsEl, mainSubtypeEl].forEach(el=>{
  el?.addEventListener('input', syncMainFieldsToHidden);
  el?.addEventListener('change', syncMainFieldsToHidden);
});
mainPhotoEl?.addEventListener('change', () => {
  const file = mainPhotoEl.files?.[0];
  if (!file) {
    const hid = q('#mkb_char_1_securefileid');
    if (hid) hid.value = '';
    const likesH = q('#mkb_char_1_likes');
    if (likesH) likesH.value = '';
    const st = root.querySelector('#mkbUploadStatus1');
    if (st) st.textContent = '';
    syncMainFieldsToHidden();
    return;
  }
  clearFieldError(mainPhotoWrap);
  doSecureUpload(file, q('#mkb_char_1_securefileid'), root.querySelector('#mkbUploadStatus1'), syncMainFieldsToHidden);
});
  
    // ===== Helpers =====
    function q(sel){ return root.querySelector(sel); }
    function qa(sel){ return Array.from(root.querySelectorAll(sel)); }

    // ---- Thema-Sync & Vorschläge ----
    const themeTextEl = q('#mkbThemeText');
    const exploreThemesBtn = q('#mkbExploreThemes');
    const themeSuggestWrap = q('#mkbThemeSuggestWrap');
    const themeSuggestGrid = q('#mkbThemeSuggestGrid');

    function syncThemeToHidden() {
      const textPart = (themeTextEl?.value || '').trim();
      const selectedChips = themeSuggestGrid ? Array.from(themeSuggestGrid.querySelectorAll('.mkb-suggestChip.selected')).map(b => b.getAttribute('data-theme') || b.textContent || '').filter(Boolean) : [];
      const parts = textPart ? [textPart, ...selectedChips] : selectedChips;
      const hid = q('#mkb_theme');
      if (hid) hid.value = parts.join(' | ');
      errorBox?.classList.remove('show');
      const newGroup = unlockGroups();
      if (newGroup) scrollToGroup(newGroup);
      applyCompleteState();
    }

    themeTextEl?.addEventListener('input', syncThemeToHidden);
    themeTextEl?.addEventListener('change', syncThemeToHidden);

    // ---- Sonstige Wünsche Sync ----
    const wishesTextEl = q('#mkbWishesText');
    function syncWishesToHidden() {
      const hid = q('#mkb_wishes');
      if (hid) hid.value = (wishesTextEl?.value || '').trim();
    }
    wishesTextEl?.addEventListener('input', syncWishesToHidden);
    wishesTextEl?.addEventListener('change', syncWishesToHidden);

    exploreThemesBtn?.addEventListener('click', () => {
      themeSuggestWrap?.classList.toggle('show');
    });

    themeSuggestGrid?.addEventListener('click', (e) => {
      const btn = e.target.closest('.mkb-suggestChip');
      if (!btn) return;
      const wasSelected = btn.classList.contains('selected');
      themeSuggestGrid.querySelectorAll('.mkb-suggestChip').forEach(b => b.classList.remove('selected'));
      if (!wasSelected) btn.classList.add('selected');
      syncThemeToHidden();
    });
  
    function isChosen(inputSel) {
      if (!inputSel) return false;
      const el = q(inputSel);
      return !!(el && el.value && el.value.trim().length);
    }
  
    function isCharBlockComplete(index) {
      if (index === 1) {
        if (!mainNameEl?.value?.trim()) return false;
        const type = mainTypeSeg?.querySelector('.mkb-segBtn.selected')?.getAttribute('data-type') || 'Person';
        if (type === 'Person' && !mainAgeEl?.value?.trim()) return false;
        const mode = mainLookModeSeg?.querySelector('.mkb-segBtn.selected')?.getAttribute('data-mode') || 'photo';
        if (mode === 'photo') {
          if (!mainPhotoEl?.files?.[0] && !q('#mkb_char_1_securefileid')?.value?.trim()) return false;
        } else {
          if (!mainDescEl?.value?.trim()) return false;
        }
        return true;
      } else {
        const block = getCharBlock(index);
        if (!block) return true;
        const nameEl = block.querySelector('.mkb-char-name');
        if (!nameEl?.value?.trim()) return false;
        const type = block.querySelector('.mkb-char-type-seg .mkb-segBtn.selected')?.getAttribute('data-type') || 'Person';
        if (type === 'Person') {
          const ageEl = block.querySelector('.mkb-char-age');
          if (!ageEl?.value?.trim()) return false;
        }
        const mode = block.querySelector('.mkb-look-mode .mkb-segBtn.selected')?.getAttribute('data-mode') || 'photo';
        if (mode === 'photo') {
          if (!block.querySelector('.mkb-char-photo')?.files?.[0] && !q(`#mkb_char_${index}_securefileid`)?.value?.trim()) return false;
        } else {
          const descEl = block.querySelector('.mkb-char-desc');
          if (!descEl?.value?.trim()) return false;
        }
        return true;
      }
    }

    function allComplete() {
      if (!(isChosen('#mkb_age') && isChosen('#mkb_theme') && isChosen('#mkb_narrative') && isChosen('#mkb_message') && charsComplete() && isChosen('#mkb_style') && isChosen('#mkb_font'))) return false;
      for (let i = 1; i <= visibleCharBlocks; i++) {
        if (!isCharBlockComplete(i)) return false;
      }
      return true;
    }
  
    const finishWrap = q('#mkbFinishWrap');
    const finishBtn  = q('#mkbFinishBtn');
    const summaryEl  = q('#mkbSummary');
    const summaryContent = q('#mkbSummaryContent');
    const editBtn    = q('#mkbEditBtn');
    const panelEl    = q('.panel');

    const GROUP_ORDER = ['age', 'theme', 'narrative', 'message', 'chars', 'style', 'font', 'wishes'];

    function restoreGroupToPanel(groupEl) {
      if (!panelEl) return;
      const idx = GROUP_ORDER.indexOf(groupEl.dataset.group);
      // Find the next sibling group already in the panel to insert before
      let insertBefore = null;
      for (let i = idx + 1; i < GROUP_ORDER.length; i++) {
        const next = panelEl.querySelector(`.group[data-group="${GROUP_ORDER[i]}"]`);
        if (next) { insertBefore = next; break; }
      }
      if (insertBefore) panelEl.insertBefore(groupEl, insertBefore);
      else panelEl.insertBefore(groupEl, finishWrap || null);
    }

    function closeSummaryRows() {
      summaryContent?.querySelectorAll('.mkb-summary-row.mkb-row-open').forEach(row => {
        const editArea = row.querySelector('.mkb-summary-inline-edit');
        const groupEl = editArea?.querySelector('.group');
        if (groupEl) restoreGroupToPanel(groupEl);
        row.classList.remove('mkb-row-open');
      });
    }

    function refreshSummaryValues() {
      if (!summaryContent || !panelEl?.classList.contains('mkb-panel-summary')) return;
      const ageLabels = { 'bis 2': 'bis 2 Jahre', '3-5': '3–5 Jahre', '6-8': '6–8 Jahre', '8+': '8+ Jahre' };
      const valMap = {
        age:       ageLabels[q('#mkb_age')?.value] || q('#mkb_age')?.value || '',
        theme:     q('#mkb_theme')?.value || '',
        narrative: q('#mkb_narrative')?.value || '',
        message:   q('#mkb_message')?.value || '',
        style:     q('#mkb_style')?.value || '',
        font:      q('#mkb_font')?.value || '',
        wishes:    q('#mkb_wishes')?.value || '',
      };
      summaryContent.querySelectorAll('.mkb-summary-row:not([data-group="chars"])').forEach(row => {
        const v = valMap[row.dataset.group];
        if (v != null) { const el = row.querySelector('.mkb-summary-val'); if (el) el.textContent = v; }
      });
      // Chars: update the single grouped chars row
      const charsRow = summaryContent.querySelector('.mkb-summary-row[data-group="chars"]');
      if (charsRow) {
        const charsValEl = charsRow.querySelector('.mkb-summary-chars-val');
        if (charsValEl) {
          const items = [];
          for (let i = 1; i <= 5; i++) {
            const name = (q(`#mkb_char_${i}_name`)?.value || '').trim();
            const type = (q(`#mkb_char_${i}_type`)?.value || '').trim();
            const relation = i > 1 ? (q(`#mkb_char_${i}_relation`)?.value || '').trim() : '';
            if (!name) continue;
            items.push({ name, type: type || 'Person', isMain: i === 1, relation });
          }
          charsValEl.innerHTML = items.map(c =>
            `<span class="mkb-summary-char-item${c.isMain ? ' mkb-char-main' : ' mkb-char-secondary'}">` +
              (c.isMain ? '' : '↳ ') + c.name +
              ` <span class="mkb-char-type">(${c.type})</span>` +
            `</span>`
          ).join('');
        }
      }
    }

    function findFirstIncompleteGroup() {
      const checks = [
        { group: 'age',       ok: () => isChosen('#mkb_age') },
        { group: 'theme',     ok: () => isChosen('#mkb_theme') },
        { group: 'narrative', ok: () => isChosen('#mkb_narrative') },
        { group: 'message',   ok: () => isChosen('#mkb_message') },
        { group: 'chars',     ok: () => charsComplete() },
        { group: 'style',     ok: () => isChosen('#mkb_style') },
        { group: 'font',      ok: () => isChosen('#mkb_font') },
      ];
      for (const { group, ok } of checks) {
        if (!ok()) return panelEl?.querySelector(`.group[data-group="${group}"]`);
      }
      return null;
    }

    function applyCompleteState() {
      const mainName = (mainNameEl?.value || '').trim();
      const narrative = (q('#mkb_narrative')?.value || '').trim();
      const buchtitelEl = q('#mkb_buchtitel');
      if (buchtitelEl) buchtitelEl.value = (mainName && narrative) ? mainName + 's ' + narrative : '';

      const complete = allComplete();
      if (finishWrap) finishWrap.style.display = '';
      if (finishBtn) finishBtn.classList.toggle('mkb-btn-incomplete', !complete);
      refreshSummaryValues();
      // Falls nach Abschluss etwas geändert wird: Übersicht wieder ausblenden
      if (!complete && scope.classList.contains('mkb-complete')) {
        closeSummaryRows();
        scope.classList.remove('mkb-complete');
        if (summaryEl) summaryEl.style.display = 'none';
        panelEl?.classList.remove('mkb-panel-summary');
      }
      // Sync JSON into the single output input (submitted via form= attribute)
      const outputInput = document.getElementById('mkb_output');
      if (outputInput) {
        const props = complete ? collectProperties() : {};
        outputInput.value = complete ? JSON.stringify(props) : '';
      }
    }

    function toggleSummaryRow(row) {
      const isOpen = row.classList.contains('mkb-row-open');
      closeSummaryRows();
      if (!isOpen) {
        const groupEl = panelEl?.querySelector(`.group[data-group="${row.dataset.group}"]`);
        if (groupEl) {
          row.querySelector('.mkb-summary-inline-edit').appendChild(groupEl);
          row.classList.add('mkb-row-open');
          setTimeout(() => row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
        }
      }
    }

    function buildCharItemsHtml(items) {
      return `<span class="mkb-summary-chars-val">${
        items.map(c => {
          const meta = c.isMain
            ? `(${c.type})`
            : `(${c.type})${c.relation ? ' – ' + c.relation : ''}`;
          return `<span class="mkb-summary-char-item${c.isMain ? ' mkb-char-main' : ' mkb-char-secondary'}">` +
            (c.isMain ? '' : '↳ ') + c.name +
            ` <span class="mkb-char-type">${meta}</span>` +
          `</span>`;
        }).join('')
      }</span>`;
    }

    function buildSummary() {
      const ageLabels = { 'bis 2': 'bis 2 Jahre', '3-5': '3–5 Jahre', '6-8': '6–8 Jahre', '8+': '8+ Jahre' };

      const charItems = [];
      for (let i = 1; i <= 5; i++) {
        const name = (q(`#mkb_char_${i}_name`)?.value || '').trim();
        const type = (q(`#mkb_char_${i}_type`)?.value || '').trim();
        const relation = i > 1 ? (q(`#mkb_char_${i}_relation`)?.value || '').trim() : '';
        if (!name) continue;
        charItems.push({ name, type: type || 'Person', isMain: i === 1, relation });
      }

      const rows = [
        { key: 'Altersgruppe',      val: ageLabels[q('#mkb_age')?.value] || q('#mkb_age')?.value,  group: 'age' },
        { key: 'Thema',             val: q('#mkb_theme')?.value,                                    group: 'theme' },
        { key: 'Erzählstil',        val: q('#mkb_narrative')?.value,                               group: 'narrative' },
        { key: 'Botschaft / Werte', val: q('#mkb_message')?.value,                                 group: 'message' },
        { key: 'Figuren',           val: null, charItems,                                           group: 'chars' },
        { key: 'Illustrationsstil', val: q('#mkb_style')?.value,                                   group: 'style' },
        { key: 'Schriftart',        val: q('#mkb_font')?.value,                                    group: 'font' },
        { key: 'Sonstige Wünsche',  val: q('#mkb_wishes')?.value,                                  group: 'wishes' },
      ];

      if (summaryContent) {
        summaryContent.innerHTML = rows
          .filter(({ val, charItems }) => charItems?.length || val?.trim())
          .map(({ key, val, group, charItems }) => {
            const valHtml = charItems
              ? buildCharItemsHtml(charItems)
              : `<span class="mkb-summary-val">${val}</span>`;
            return `<div class="mkb-summary-row" data-group="${group}">` +
              `<div class="mkb-summary-row-header">` +
                `<span class="mkb-summary-key">${key}</span>` +
                valHtml +
                `<span class="mkb-summary-edit-icon">✎</span>` +
              `</div>` +
              `<div class="mkb-summary-inline-edit"></div>` +
            `</div>`;
          }).join('');
        summaryContent.querySelectorAll('.mkb-summary-row').forEach(row => {
          row.querySelector('.mkb-summary-row-header').addEventListener('click', () => toggleSummaryRow(row));
        });
      }
    }

    finishBtn?.addEventListener('click', () => {
      const incompleteGroup = findFirstIncompleteGroup();
      if (incompleteGroup) {
        incompleteGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        incompleteGroup.classList.add('mkb-group-highlight');
        setTimeout(() => incompleteGroup.classList.remove('mkb-group-highlight'), 900);
        return;
      }
      let allCharsValid = true;
      for (let i = 1; i <= visibleCharBlocks; i++) {
        if (!highlightEmptyCharFields(i)) allCharsValid = false;
      }
      if (!allCharsValid) return;
      buildSummary();
      if (finishWrap) finishWrap.style.display = 'none';
      if (summaryEl) summaryEl.style.display = '';
      panelEl?.classList.add('mkb-panel-summary');
      scope.classList.add('mkb-complete');
      setTimeout(() => summaryEl?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    });

    editBtn?.addEventListener('click', () => {
      closeSummaryRows();
      if (summaryEl) summaryEl.style.display = 'none';
      panelEl?.classList.remove('mkb-panel-summary');
      scope.classList.remove('mkb-complete');
      if (finishWrap) finishWrap.style.display = '';
    });
  
    // locked Gruppen sollen komplett weg sein
    function scrollToGroup(g) {
      setTimeout(() => g.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    }

    function unlockGroups() {
      let firstNewlyUnlocked = null;
      qa('.group[data-unlock-when]').forEach(g => {
        const wasLocked = g.classList.contains('locked');
        const dep = g.getAttribute('data-unlock-when'); // age / theme / narrative / message / chars / mainchar-name
        let unlocked = false;
        if (dep === 'age') unlocked = isChosen('#mkb_age');
        if (dep === 'theme') unlocked = isChosen('#mkb_theme');
        if (dep === 'narrative') unlocked = isChosen('#mkb_narrative');
        if (dep === 'message') unlocked = isChosen('#mkb_message');
        if (dep === 'chars') unlocked = charsComplete();
        if (dep === 'style') unlocked = isChosen('#mkb_style');
        if (dep === 'font') unlocked = isChosen('#mkb_font');
        if (dep === 'mainchar-name') {
          const hiddenName = (q('#mkb_char_1_name')?.value?.trim() || '');
          const uiName = (mainNameEl?.value?.trim() || '');
          unlocked = (hiddenName.length > 0) || (uiName.length > 0);
        }
        if (wasLocked && unlocked && !firstNewlyUnlocked) firstNewlyUnlocked = g;
        g.classList.toggle('locked', !unlocked);
      });
      return firstNewlyUnlocked;
    }
  
    // Wenn man oben etwas ändert: downstream leeren + wieder verstecken
    function clearSelectionsAfter(groupName) {
      const order = ['age','theme','narrative','message','chars','style','font','wishes'];
      const idx = order.indexOf(groupName);
      if (idx === -1) return;

      const toClear = order.slice(idx+1);

      // Clear hidden inputs (theme/narrative/message/style etc.)
      if (toClear.includes('theme')) {
        const el = q('#mkb_theme'); if (el) el.value = '';
        qa('[data-group="theme"] .card').forEach(c => c.classList.remove('selected'));
        if (themeTextEl) themeTextEl.value = '';
        themeSuggestGrid?.querySelectorAll('.mkb-suggestChip').forEach(b => b.classList.remove('selected'));
      }
      if (toClear.includes('narrative')) {
        const el = q('#mkb_narrative'); if (el) el.value = '';
        qa('[data-group="narrative"] .card').forEach(c => c.classList.remove('selected'));
      }
      if (toClear.includes('message')) {
        const el = q('#mkb_message'); if (el) el.value = '';
        qa('[data-group="message"] .card').forEach(c => c.classList.remove('selected'));
      }
      if (toClear.includes('style')) {
        const el = q('#mkb_style'); if (el) el.value = '';
        qa('[data-group="style"] .card').forEach(c => c.classList.remove('selected'));
      }
      if (toClear.includes('font')) {
        const el = q('#mkb_font'); if (el) el.value = '';
        qa('[data-group="font"] .card').forEach(c => c.classList.remove('selected'));
      }
      if (toClear.includes('wishes')) {
        const el = q('#mkb_wishes'); if (el) el.value = '';
        const ta = q('#mkbWishesText'); if (ta) ta.value = '';
      }
      if (toClear.includes('chars')) {
        for (let i=1;i<=5;i++){
          ['type','name','likes','role','look','securefileid'].forEach(k=>{
            const el = q(`#mkb_char_${i}_${k}`);
            if(el) el.value = '';
          });
        }
        qa('.mkb-upload-status').forEach(el => { if (el) el.textContent = ''; });
        if (mainNameEl) mainNameEl.value = '';
        if (mainGenderEl) mainGenderEl.value = '';
        if (mainAgeEl) mainAgeEl.value = '';
        if (mainPhotoEl) mainPhotoEl.value = '';
        if (mainDescEl) mainDescEl.value = '';
        mainTypeSeg?.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.remove('selected'));
        if (mainLookModeSeg) {
          mainLookModeSeg.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.remove('selected'));
          const photoBtn = mainLookModeSeg.querySelector('.mkb-segBtn[data-mode="photo"]');
          if (photoBtn) photoBtn.classList.add('selected');
        }
        if (mainPhotoWrap) mainPhotoWrap.style.display = '';
        if (mainDescWrap) mainDescWrap.style.display = 'none';
        if (mainPhotoHint) mainPhotoHint.style.display = '';
        if (mainSubtypeEl) mainSubtypeEl.value = '';
        if (mainSubtypeWrap) mainSubtypeWrap.style.display = 'none';
        clearCharBlocks2to5();
        updateCharBlocksVisibility();
      }
    }
  
    function setSelected(card) {
      const targetSel = card.getAttribute('data-target');
      const val = card.getAttribute('data-value');
      const input = q(targetSel);
      if (!input) return;
  
      const groupEl = card.closest('.group');
  
      input.value = val;
  
      // Selected-Style nur in dieser Gruppe
      groupEl.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
  
      errorBox?.classList.remove('show');

      const newGroup = unlockGroups();
      if (newGroup) scrollToGroup(newGroup);
      applyCompleteState();
    }
  
    function showMultiHint(groupEl, text) {
      let hintEl = groupEl.querySelector('.mkb-multi-hint');
      if (!hintEl) {
        hintEl = document.createElement('div');
        hintEl.className = 'mkb-multi-hint';
        groupEl.appendChild(hintEl);
      }
      hintEl.textContent = text;
      hintEl.classList.add('show');
    }

    function hideMultiHint(groupEl) {
      groupEl.querySelector('.mkb-multi-hint')?.classList.remove('show');
    }

    function setSelectedMulti(card, maxCount) {
      const targetSel = card.getAttribute('data-target');
      const input = q(targetSel);
      if (!input) return;
      const groupEl = card.closest('.group');
      const isSelected = card.classList.contains('selected');

      if (!isSelected && groupEl.querySelectorAll('.card.selected').length >= maxCount) {
        showMultiHint(groupEl, `Du kannst nur ${maxCount} Werte auswählen.`);
        return;
      }

      if (isSelected) {
        card.classList.remove('selected');
      } else {
        card.classList.add('selected');
      }

      const selectedVals = Array.from(groupEl.querySelectorAll('.card.selected'))
        .map(c => c.getAttribute('data-value')).filter(Boolean);
      input.value = selectedVals.join(', ');
      errorBox?.classList.remove('show');
      if (selectedVals.length < maxCount) hideMultiHint(groupEl);

      unlockGroups();
      if (selectedVals.length >= maxCount) {
        const allGroups = Array.from(qa('.group'));
        const idx = allGroups.indexOf(groupEl);
        for (let i = idx + 1; i < allGroups.length; i++) {
          if (!allGroups[i].classList.contains('locked')) { scrollToGroup(allGroups[i]); break; }
        }
      }
      applyCompleteState();
    }

    // ===== Weitere Charaktere (Blöcke 2–5, gleiches Design wie Hauptfigur) =====
    const charBlocksContainer = root.querySelector('#mkbCharBlocksContainer');
    const addBtn = root.querySelector('#mkbAddChar');
    let visibleCharBlocks = 1;
  
    function getCharBlock(index) {
      return root.querySelector(`.mkb-charBlock[data-char-index="${index}"]`);
    }
  
    function syncCharBlockToHidden(index) {
      const block = getCharBlock(index);
      if (!block) return;
      const typeSeg = block.querySelector('.mkb-char-type-seg');
      const typeBtn = typeSeg?.querySelector('.mkb-segBtn.selected');
      const type = typeBtn?.getAttribute('data-type') || '';
      const nameEl = block.querySelector('.mkb-char-name');
      const genderEl = block.querySelector('.mkb-char-gender');
      const ageEl = block.querySelector('.mkb-char-age');
      const photoEl = block.querySelector('.mkb-char-photo');
      const name = (nameEl?.value || '').trim();
      if (name) clearFieldError(nameEl);
      const gender = (genderEl?.value || '').trim();
      const age = (ageEl?.value || '').trim();
      if (age) clearFieldError(ageEl);
      const roleParts = [];
      if (gender) roleParts.push(`Geschlecht: ${gender}`);
      if (age) roleParts.push(`Alter: ${age}`);
      const relation = block.querySelector('.mkb-relationChip.selected')?.getAttribute('data-relation') || '';
      const typeH = q(`#mkb_char_${index}_type`);
      const nameH = q(`#mkb_char_${index}_name`);
      const roleH = q(`#mkb_char_${index}_role`);
      const likesH = q(`#mkb_char_${index}_likes`);
      const lookH = q(`#mkb_char_${index}_look`);
      const relationH = q(`#mkb_char_${index}_relation`);
      if (typeH) typeH.value = type;
      if (nameH) nameH.value = name;
      if (roleH) roleH.value = '';
      if (relationH) relationH.value = relation;
      // interests
      const interestsEl = block.querySelector('.mkb-char-interests');
      if (likesH) likesH.value = (interestsEl?.value || '').trim();
      // description (text appearance)
      const mode = block.querySelector('.mkb-look-mode .mkb-segBtn.selected')?.getAttribute('data-mode') || 'photo';
      const desc = (block.querySelector('.mkb-char-desc')?.value || '').trim();
      if (mode === 'desc' && desc) clearFieldError(block.querySelector('.mkb-char-desc'));
      if (mode === 'photo' && (photoEl?.files?.[0] || q(`#mkb_char_${index}_securefileid`)?.value?.trim()))
        clearFieldError(block.querySelector('.mkb-photo-wrap'));
      if (lookH) lookH.value = mode === 'desc' ? desc : '';
      const newGroup = unlockGroups();
      if (newGroup) scrollToGroup(newGroup);
      applyCompleteState();
    }
  
    function loadCharBlockFromHidden(index) {
      const block = getCharBlock(index);
      if (!block) return;
      const type = (q(`#mkb_char_${index}_type`)?.value || '').trim();
      const name = (q(`#mkb_char_${index}_name`)?.value || '').trim();
      const role = (q(`#mkb_char_${index}_role`)?.value || '').trim();
      const interests = (q(`#mkb_char_${index}_likes`)?.value || '').trim();
      const description = (q(`#mkb_char_${index}_look`)?.value || '').trim();
      const nameEl = block.querySelector('.mkb-char-name');
      const interestsEl = block.querySelector('.mkb-char-interests');
      const genderEl = block.querySelector('.mkb-char-gender');
      const ageEl = block.querySelector('.mkb-char-age');
      const typeSeg = block.querySelector('.mkb-char-type-seg');
      const descEl = block.querySelector('.mkb-char-desc');
      const lookModeSeg = block.querySelector('.mkb-look-mode');
      const photoWrap = block.querySelector('.mkb-photo-wrap');
      const descWrap = block.querySelector('.mkb-desc-wrap');
      if (nameEl) nameEl.value = name;
      if (interestsEl) interestsEl.value = interests;
      if (typeSeg) {
        typeSeg.querySelectorAll('.mkb-segBtn').forEach(b => {
          b.classList.toggle('selected', b.getAttribute('data-type') === type);
        });
      }
      const isPerson = type === 'Person' || type === '';
      const genderWrapEl = block.querySelector('.mkb-char-gender-wrap');
      const ageWrapEl = block.querySelector('.mkb-char-age-wrap');
      const relationWrapEl = block.querySelector('.mkb-relation-wrap');
      if (genderWrapEl) genderWrapEl.style.display = isPerson ? '' : 'none';
      if (ageWrapEl) ageWrapEl.style.display = isPerson ? '' : 'none';
      if (relationWrapEl) relationWrapEl.style.display = isPerson ? '' : 'none';
      const relation = (q(`#mkb_char_${index}_relation`)?.value || '').trim();
      block.querySelectorAll('.mkb-relationChip').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-relation') === relation);
      });
      if (description) {
        if (descEl) descEl.value = description;
        lookModeSeg?.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.toggle('selected', b.getAttribute('data-mode') === 'desc'));
        if (photoWrap) photoWrap.style.display = 'none';
        if (descWrap) descWrap.style.display = '';
      } else {
        lookModeSeg?.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.toggle('selected', b.getAttribute('data-mode') === 'photo'));
        if (photoWrap) photoWrap.style.display = '';
        if (descWrap) descWrap.style.display = 'none';
      }
    }
  
    function clearCharBlocks2to5() {
      for (let i = 2; i <= 5; i++) {
        ['type','name','likes','role','look','securefileid','relation'].forEach(k => {
          const el = q(`#mkb_char_${i}_${k}`);
          if (el) el.value = '';
        });
        const block = getCharBlock(i);
        if (block) {
          const nameEl = block.querySelector('.mkb-char-name');
          const interestsEl = block.querySelector('.mkb-char-interests');
          const genderEl = block.querySelector('.mkb-char-gender');
          const ageEl = block.querySelector('.mkb-char-age');
          const photoEl = block.querySelector('.mkb-char-photo');
          const descEl = block.querySelector('.mkb-char-desc');
          const typeSeg = block.querySelector('.mkb-char-type-seg');
          const lookModeSeg = block.querySelector('.mkb-look-mode');
          const photoWrap = block.querySelector('.mkb-photo-wrap');
          const descWrap = block.querySelector('.mkb-desc-wrap');
          if (nameEl) nameEl.value = '';
          if (interestsEl) interestsEl.value = '';
          const subtypeWrapEl = block.querySelector('.mkb-char-subtype-wrap');
          const subtypeInputEl = block.querySelector('.mkb-char-subtype');
          if (subtypeInputEl) subtypeInputEl.value = '';
          if (subtypeWrapEl) subtypeWrapEl.style.display = 'none';
          if (genderEl) genderEl.value = '';
          if (ageEl) ageEl.value = '';
          if (photoEl) photoEl.value = '';
          if (descEl) descEl.value = '';
          typeSeg?.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.remove('selected'));
          lookModeSeg?.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.remove('selected'));
          const photoBtn = lookModeSeg?.querySelector('.mkb-segBtn[data-mode="photo"]');
          if (photoBtn) photoBtn.classList.add('selected');
          if (photoWrap) photoWrap.style.display = '';
          if (descWrap) descWrap.style.display = 'none';
          const statusEl = root.querySelector(`#mkbUploadStatus${i}`);
          if (statusEl) statusEl.textContent = '';
        }
      }
      visibleCharBlocks = 1;
    }
  
    function updateCharBlocksVisibility() {
      qa('.mkb-charBlock').forEach(block => {
        const idx = parseInt(block.getAttribute('data-char-index'), 10);
        block.classList.toggle('mkb-charBlock-hidden', idx > visibleCharBlocks);
      });
      if (addBtn) addBtn.style.display = visibleCharBlocks >= 5 ? 'none' : '';
    }

    function clearOneCharBlock(index) {
      ['type','name','likes','role','look','securefileid','relation'].forEach(k => {
        const el = q(`#mkb_char_${index}_${k}`);
        if (el) el.value = '';
      });
      const block = getCharBlock(index);
      if (!block) return;
      const nameEl = block.querySelector('.mkb-char-name');
      const interestsEl = block.querySelector('.mkb-char-interests');
      const genderEl = block.querySelector('.mkb-char-gender');
      const ageEl = block.querySelector('.mkb-char-age');
      const photoEl = block.querySelector('.mkb-char-photo');
      const descEl = block.querySelector('.mkb-char-desc');
      const typeSeg = block.querySelector('.mkb-char-type-seg');
      const lookModeSeg = block.querySelector('.mkb-look-mode');
      const photoWrap = block.querySelector('.mkb-photo-wrap');
      const descWrap = block.querySelector('.mkb-desc-wrap');
      if (nameEl) nameEl.value = '';
      if (interestsEl) interestsEl.value = '';
      const subtypeWrapEl = block.querySelector('.mkb-char-subtype-wrap');
      const subtypeInputEl = block.querySelector('.mkb-char-subtype');
      if (subtypeInputEl) subtypeInputEl.value = '';
      if (subtypeWrapEl) subtypeWrapEl.style.display = 'none';
      if (genderEl) genderEl.value = '';
      if (ageEl) ageEl.value = '';
      if (photoEl) photoEl.value = '';
      if (descEl) descEl.value = '';
      typeSeg?.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.toggle('selected', b.dataset.type === 'Person'));
      lookModeSeg?.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.toggle('selected', b.dataset.mode === 'photo'));
      if (photoWrap) photoWrap.style.display = '';
      if (descWrap) descWrap.style.display = 'none';
      const statusEl = root.querySelector(`#mkbUploadStatus${index}`);
      if (statusEl) statusEl.textContent = '';
      block.querySelectorAll('.mkb-relationChip').forEach(btn => btn.classList.remove('selected'));
      block.querySelectorAll('.mkb-field-error').forEach(el => clearFieldError(el));
    }

    function removeCharBlock(removeIndex) {
      // Shift hidden inputs and UI down from removeIndex+1 onwards
      for (let i = removeIndex; i < visibleCharBlocks; i++) {
        const keys = ['type','name','likes','role','look','securefileid','relation'];
        keys.forEach(k => {
          const from = q(`#mkb_char_${i + 1}_${k}`);
          const to   = q(`#mkb_char_${i}_${k}`);
          if (from && to) to.value = from.value;
        });
        loadCharBlockFromHidden(i);
      }
      clearOneCharBlock(visibleCharBlocks);
      visibleCharBlocks--;
      updateCharBlocksVisibility();
      unlockGroups();
      applyCompleteState();
    }
  
    function bindCharBlock(index) {
      const block = getCharBlock(index);
      if (!block) return;
      const removeBtn = block.querySelector('.mkb-removeChar');
      removeBtn?.addEventListener('click', () => removeCharBlock(index));
      block.querySelector('.mkb-relation-chips')?.addEventListener('click', e => {
        const chip = e.target.closest('.mkb-relationChip');
        if (!chip) return;
        const wasSelected = chip.classList.contains('selected');
        block.querySelectorAll('.mkb-relationChip').forEach(b => b.classList.remove('selected'));
        if (!wasSelected) chip.classList.add('selected');
        syncCharBlockToHidden(index);
      });
      const typeSeg = block.querySelector('.mkb-char-type-seg');
      const nameEl = block.querySelector('.mkb-char-name');
      const interestsEl = block.querySelector('.mkb-char-interests');
      const genderEl = block.querySelector('.mkb-char-gender');
      const ageEl = block.querySelector('.mkb-char-age');
      const photoEl = block.querySelector('.mkb-char-photo');
      const descEl = block.querySelector('.mkb-char-desc');
      const lookModeSeg = block.querySelector('.mkb-look-mode');
      const photoWrap = block.querySelector('.mkb-photo-wrap');
      const descWrap = block.querySelector('.mkb-desc-wrap');
      enforceDigits(ageEl);
      typeSeg?.addEventListener('click', (e) => {
        const btn = e.target.closest('.mkb-segBtn');
        if (!btn) return;
        typeSeg.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const type = btn.getAttribute('data-type');
        const isPerson = type === 'Person';
        const genderWrapEl = block.querySelector('.mkb-char-gender-wrap');
        const ageWrapEl = block.querySelector('.mkb-char-age-wrap');
        const relationWrapEl = block.querySelector('.mkb-relation-wrap');
        if (genderWrapEl) genderWrapEl.style.display = isPerson ? '' : 'none';
        if (ageWrapEl) ageWrapEl.style.display = isPerson ? '' : 'none';
        if (relationWrapEl) relationWrapEl.style.display = isPerson ? '' : 'none';
        if (!isPerson) {
          if (genderEl) genderEl.value = '';
          if (ageEl) ageEl.value = '';
          block.querySelectorAll('.mkb-relationChip').forEach(b => b.classList.remove('selected'));
        }
        // Subtype-Feld
        const subtypeWrap = block.querySelector('.mkb-char-subtype-wrap');
        const subtypeLabel = block.querySelector('.mkb-char-subtype-label');
        const subtypeInput = block.querySelector('.mkb-char-subtype');
        const subtypeCfg = SUBTYPE_CONFIG[type];
        if (subtypeWrap) subtypeWrap.style.display = subtypeCfg ? '' : 'none';
        if (subtypeCfg) {
          if (subtypeLabel) subtypeLabel.textContent = subtypeCfg.label;
          if (subtypeInput) subtypeInput.placeholder = subtypeCfg.placeholder;
        } else {
          if (subtypeInput) subtypeInput.value = '';
        }
        syncCharBlockToHidden(index);
      });
      const subtypeEl = block.querySelector('.mkb-char-subtype');
      [nameEl, interestsEl, subtypeEl, genderEl, ageEl].forEach(el => {
        el?.addEventListener('input', () => syncCharBlockToHidden(index));
        el?.addEventListener('change', () => syncCharBlockToHidden(index));
      });
      photoEl?.addEventListener('change', () => {
        const file = photoEl.files?.[0];
        if (!file) {
          const hid = q(`#mkb_char_${index}_securefileid`);
          if (hid) hid.value = '';
          const likesEl = q(`#mkb_char_${index}_likes`);
          if (likesEl) likesEl.value = '';
          const statusEl = root.querySelector(`#mkbUploadStatus${index}`);
          if (statusEl) statusEl.textContent = '';
          syncCharBlockToHidden(index);
          return;
        }
        clearFieldError(block.querySelector('.mkb-photo-wrap'));
        doSecureUpload(file, q(`#mkb_char_${index}_securefileid`), root.querySelector(`#mkbUploadStatus${index}`), () => syncCharBlockToHidden(index));
      });
      lookModeSeg?.addEventListener('click', (e) => {
        const btn = e.target.closest('.mkb-segBtn');
        if (!btn) return;
        lookModeSeg.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const mode = btn.getAttribute('data-mode');
        const isDesc = mode === 'desc';
        if (photoWrap) photoWrap.style.display = isDesc ? 'none' : '';
        if (descWrap) descWrap.style.display = isDesc ? '' : 'none';
        if (isDesc) {
          if (photoEl) photoEl.value = '';
          const hid = q(`#mkb_char_${index}_securefileid`);
          if (hid) hid.value = '';
          const statusEl = root.querySelector(`#mkbUploadStatus${index}`);
          if (statusEl) statusEl.textContent = '';
          clearFieldError(photoWrap);
        } else {
          if (descEl) descEl.value = '';
          clearFieldError(descEl);
        }
        syncCharBlockToHidden(index);
      });
      descEl?.addEventListener('input', () => syncCharBlockToHidden(index));
      descEl?.addEventListener('change', () => syncCharBlockToHidden(index));
    }
  
    function markFieldError(el, message) {
      if (!el) return;
      el.classList.add('mkb-field-error');
      let hint = el.nextElementSibling;
      if (!hint || !hint.classList.contains('mkb-field-hint')) {
        hint = document.createElement('div');
        hint.className = 'mkb-field-hint';
        el.insertAdjacentElement('afterend', hint);
      }
      hint.textContent = message;
      hint.style.display = '';
    }

    function clearFieldError(el) {
      if (!el) return;
      el.classList.remove('mkb-field-error');
      const hint = el.nextElementSibling;
      if (hint?.classList?.contains('mkb-field-hint')) hint.style.display = 'none';
    }

    function highlightEmptyCharFields(index) {
      let valid = true;
      let firstErrorEl = null;

      function flag(el, message) {
        if (!el) return;
        markFieldError(el, message);
        if (!firstErrorEl) firstErrorEl = el;
        valid = false;
      }

      if (index === 1) {
        if (!mainNameEl?.value?.trim()) flag(mainNameEl, 'Bitte gib einen Namen ein.');
        const type = mainTypeSeg?.querySelector('.mkb-segBtn.selected')?.getAttribute('data-type') || 'Person';
        if (type === 'Person' && !mainAgeEl?.value?.trim()) flag(mainAgeEl, 'Bitte gib ein Alter ein.');
        const mode = mainLookModeSeg?.querySelector('.mkb-segBtn.selected')?.getAttribute('data-mode') || 'photo';
        if (mode === 'photo') {
          if (!mainPhotoEl?.files?.[0] && !q('#mkb_char_1_securefileid')?.value?.trim())
            flag(mainPhotoWrap, 'Bitte lade ein Foto hoch.');
        } else {
          if (!mainDescEl?.value?.trim()) flag(mainDescEl, 'Bitte beschreibe das Aussehen.');
        }
      } else {
        const block = getCharBlock(index);
        if (!block) return false;
        const nameEl = block.querySelector('.mkb-char-name');
        if (!nameEl?.value?.trim()) flag(nameEl, 'Bitte gib einen Namen ein.');
        const type = block.querySelector('.mkb-char-type-seg .mkb-segBtn.selected')?.getAttribute('data-type') || 'Person';
        if (type === 'Person') {
          const ageEl = block.querySelector('.mkb-char-age');
          if (!ageEl?.value?.trim()) flag(ageEl, 'Bitte gib ein Alter ein.');
        }
        const mode = block.querySelector('.mkb-look-mode .mkb-segBtn.selected')?.getAttribute('data-mode') || 'photo';
        if (mode === 'photo') {
          const photoWrapEl = block.querySelector('.mkb-photo-wrap');
          if (!block.querySelector('.mkb-char-photo')?.files?.[0] && !q(`#mkb_char_${index}_securefileid`)?.value?.trim())
            flag(photoWrapEl, 'Bitte lade ein Foto hoch.');
        } else {
          const descEl = block.querySelector('.mkb-char-desc');
          if (!descEl?.value?.trim()) flag(descEl, 'Bitte beschreibe das Aussehen.');
        }
      }

      if (!valid && firstErrorEl)
        setTimeout(() => firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return valid;
    }

    addBtn?.addEventListener('click', () => {
      const groupEl = addBtn.closest('.group');
      if (groupEl && groupEl.classList.contains('locked')) {
        errorBox?.classList.add('show');
        return;
      }
      if (visibleCharBlocks >= 5) return;
      if (!highlightEmptyCharFields(visibleCharBlocks)) return;
      visibleCharBlocks++;
      const newBlock = getCharBlock(visibleCharBlocks);
      const newTypeSeg = newBlock?.querySelector('.mkb-char-type-seg');
      if (newTypeSeg) {
        newTypeSeg.querySelectorAll('.mkb-segBtn').forEach(b => b.classList.remove('selected'));
        const personBtn = newTypeSeg.querySelector('.mkb-segBtn[data-type="Person"]');
        if (personBtn) personBtn.classList.add('selected');
      }
      const typeH = q(`#mkb_char_${visibleCharBlocks}_type`);
      if (typeH && !typeH.value.trim()) typeH.value = 'Person';
      updateCharBlocksVisibility();
      unlockGroups();
      applyCompleteState();
    });
  
    for (let i = 2; i <= 5; i++) bindCharBlock(i);
  
    // ===== Events (Karten für Alter, Thema, Style) =====
    root.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card) {
        const groupEl = card.closest('.group');
        if (groupEl && groupEl.classList.contains('locked')) {
          errorBox?.classList.add('show');
          return;
        }
        if (groupEl && groupEl.getAttribute('data-group') === 'message') {
          setSelectedMulti(card, 3);
        } else {
          setSelected(card);
        }
      }
    });
  
    // ===== Label-Fit: nur betroffene Labels verkleinern =====
    function fitLabel(labelEl) {
      labelEl.style.fontSize = '';
      const card = labelEl.closest('.card');
      if (!card) return;
      const style = getComputedStyle(card);
      const padH = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const maxW = card.clientWidth - padH;
      if (labelEl.scrollWidth <= maxW) return;
      let size = parseFloat(getComputedStyle(labelEl).fontSize);
      while (labelEl.scrollWidth > maxW && size > 8) {
        size -= 0.5;
        labelEl.style.fontSize = size + 'px';
      }
    }
    function fitAllLabels() {
      qa('.card .label').forEach(fitLabel);
    }
    const labelRO = new ResizeObserver(fitAllLabels);
    labelRO.observe(scope);
    fitAllLabels();

    // ===== Shopify Cart Integration =====
    // Injects mkb-builder properties into the product form BEFORE Dawn's own
    // AJAX handler runs. Dawn then includes them automatically via FormData(form).
    // This avoids double-fetch and keeps the native cart drawer working.

    function collectProperties() {
      const get = (id) => (q(id)?.value || '').trim();
      const props = {};

      const age       = get('#mkb_age');
      const theme     = get('#mkb_theme');
      const narrative = get('#mkb_narrative');
      const values    = get('#mkb_message');
      const style     = get('#mkb_style');
      const font      = get('#mkb_font');
      const preface   = get('#mkb_wishes');

      if (age)       props['age_group']        = age;
      if (theme)     props['theme']            = theme;
      if (narrative) props['narrative_style']  = narrative;
      if (values)    props['important_values'] = values;
      if (style)     props['art_style']        = style;
      if (font)      props['font']             = font;
      if (preface)   props['preface']          = preface;


      // Characters as array with keys: name, interests, description, photo_s3_key
      const characters = [];
      for (let i = 1; i <= 5; i++) {
        const name = get(`#mkb_char_${i}_name`);
        if (!name) continue;
        const char = { name };
        char['role'] = i === 1 ? 'Hauptcharakter' : (get(`#mkb_char_${i}_role`) || 'Nebencharakter');
        const character_type = get(`#mkb_char_${i}_type`);
        const interests      = get(`#mkb_char_${i}_likes`);
        const description    = get(`#mkb_char_${i}_look`);
        const photo_s3_key   = get(`#mkb_char_${i}_securefileid`);
        // subtype from UI (Tier/Objekt only)
        const subtypeEl = i === 1
          ? root.querySelector('#mkbMainSubtype')
          : root.querySelector(`.mkb-charBlock[data-char-index="${i}"] .mkb-char-subtype`);
        const character_subtype = (subtypeEl?.value || '').trim();
        if (character_type)    char['character_type']    = character_type;
        if (character_subtype) char['character_subtype'] = character_subtype;
        if (interests)         char['interests']         = interests;
        if (description)       char['description']       = description;
        if (photo_s3_key)      char['photo_s3_key']      = photo_s3_key;
        characters.push(char);
      }
      if (characters.length) props['characters'] = characters;

      return props;
    }

    function hookProductForm() {
      const productForm =
        document.getElementById('product-form-template--27316906033536__main') ||
        document.querySelector('form[action*="cart/add"]') ||
        document.querySelector('product-form form');

      console.log('[MKB] hookProductForm – form found:', productForm ? productForm.getAttribute('action') : 'NOT FOUND');

      if (!productForm) return;

      // Log only – data is submitted via #mkb_output with form= attribute
      productForm.addEventListener('submit', () => {
        const isComplete = scope.classList.contains('mkb-complete');
        console.log('[MKB] submit fired – mkb-complete:', isComplete);
        console.log('[MKB] properties[Konfiguration]:', document.getElementById('mkb_output')?.value || '(empty)');
      }, true /* capture phase */);
    }

    hookProductForm();

    // ===== Initial =====
    if (!q('#mkb_char_1_type')?.value?.trim()) setMainType('Person');
    for (let i = 2; i <= 5; i++) {
      const t = q(`#mkb_char_${i}_type`)?.value?.trim();
      const n = q(`#mkb_char_${i}_name`)?.value?.trim();
      if (t || n) visibleCharBlocks = Math.max(visibleCharBlocks, i);
    }
    for (let i = 2; i <= 5; i++) loadCharBlockFromHidden(i);
    updateCharBlocksVisibility();
    unlockGroups();
    applyCompleteState();
  
  })();
  document.addEventListener('DOMContentLoaded', function () {
  // dein IIFE Inhalt hier rein
});
