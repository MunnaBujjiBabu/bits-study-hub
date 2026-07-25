/* ============================================================
   Study Hub — app logic (vanilla JS, no build step)
   Loads data.json, renders a single searchable / filterable table
   of materials, and wires up search / filters / dark-mode toggle.
   ============================================================ */

(function () {
  "use strict";

  // ---- App state ----
  const state = {
    all: [],                     // normalized material entries
    filters: { q: "", semester: "", type: "" },
  };

  // ---- DOM references ----
  const el = {
    content: document.getElementById("content"),
    search: document.getElementById("search"),
    semester: document.getElementById("filter-semester"),
    type: document.getElementById("filter-type"),
    clear: document.getElementById("clear-filters"),
    resultsMeta: document.getElementById("results-meta"),
    lastUpdated: document.getElementById("last-updated"),
    themeToggle: document.getElementById("theme-toggle"),
  };

  // ============================================================
  // Theme
  // ============================================================
  function initTheme() {
    updateThemeLabel();
    el.themeToggle.addEventListener("click", function () {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        /* localStorage may be unavailable (private mode) — ignore. */
      }
      updateThemeLabel();
    });
  }

  function updateThemeLabel() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    el.themeToggle.setAttribute("aria-pressed", String(isDark));
    el.themeToggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
  }

  // ============================================================
  // Data loading
  // ============================================================
  function loadData() {
    // Cache-bust so edits to data.json show up without a hard refresh.
    fetch("data.json?_=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        // Accept either a bare array or { "materials": [...] }. Guard against a
        // present-but-non-array "materials" so a shape error doesn't masquerade
        // as a "could not load / invalid JSON" failure.
        const list = Array.isArray(data)
          ? data
          : data && Array.isArray(data.materials)
          ? data.materials
          : [];
        state.all = normalize(list);
        if (state.all.length === 0) {
          showEmptyData();
          return;
        }
        populateFilters(state.all);
        setLastUpdated(state.all);
        render();
      })
      .catch(function (err) {
        showLoadError(err);
      });
  }

  // Keep only usable entries and trim/normalize fields.
  function normalize(list) {
    return list
      .filter(function (m) {
        return m && typeof m === "object" && (m.subject || m.driveLink);
      })
      .map(function (m) {
        return {
          subject: str(m.subject) || "Uncategorized",
          semester: str(m.semester),
          type: str(m.type),
          driveLink: str(m.driveLink),
          dateAdded: str(m.dateAdded),
        };
      });
  }

  function str(v) {
    return v == null ? "" : String(v).trim();
  }

  // ============================================================
  // Filters & "last updated"
  // ============================================================
  function populateFilters(list) {
    const semesters = unique(list.map(function (m) { return m.semester; }));
    const types = unique(list.map(function (m) { return m.type; }));

    semesters.sort(semesterSort);
    types.sort(function (a, b) { return a.localeCompare(b); });

    fillSelect(el.semester, semesters);
    fillSelect(el.type, types);
  }

  function unique(arr) {
    const seen = new Set();
    const out = [];
    arr.forEach(function (v) {
      if (v && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    });
    return out;
  }

  // Natural sort for "Sem 1", "Sem 2" … "Sem 10".
  function semesterSort(a, b) {
    const na = parseInt((a.match(/\d+/) || [])[0], 10);
    const nb = parseInt((b.match(/\d+/) || [])[0], 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  }

  function fillSelect(select, values) {
    // Keep the first "All …" option, append the rest.
    values.forEach(function (v) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  }

  function setLastUpdated(list) {
    let latest = null;
    list.forEach(function (m) {
      const d = parseDate(m.dateAdded);
      if (d && (!latest || d > latest)) latest = d;
    });
    if (latest) {
      el.lastUpdated.textContent = latest.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else {
      el.lastUpdated.textContent = "—";
    }
  }

  // Parse "YYYY-MM-DD" as a LOCAL date to avoid timezone off-by-one.
  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const day = Number(m[3]);
    const d = new Date(y, mo - 1, day);
    // Reject rolled-over values (e.g. "2026-02-30" -> Mar 2). new Date never
    // returns NaN for out-of-range parts, so verify the components round-trip.
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) {
      return null;
    }
    return d;
  }

  // ============================================================
  // Rendering — one flat table for everything
  // ============================================================
  function render() {
    const rows = applyFilters(state.all).slice().sort(sortRows);

    el.content.innerHTML = "";
    updateResultsMeta(rows.length, state.all.length);

    if (rows.length === 0) {
      const p = document.createElement("p");
      p.className = "state-msg";
      p.textContent = "No materials match your search or filters.";
      el.content.appendChild(p);
      return;
    }

    const card = document.createElement("div");
    card.className = "table-card";
    card.appendChild(buildTable(rows));
    el.content.appendChild(card);
  }

  function applyFilters(list) {
    const q = state.filters.q.toLowerCase();
    return list.filter(function (m) {
      if (state.filters.semester && m.semester !== state.filters.semester) return false;
      if (state.filters.type && m.type !== state.filters.type) return false;
      if (q && m.subject.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  // Keep subjects together (A→Z), newest first within each subject.
  function sortRows(a, b) {
    const bySubject = a.subject.localeCompare(b.subject);
    if (bySubject !== 0) return bySubject;
    const da = parseDate(a.dateAdded);
    const db = parseDate(b.dateAdded);
    if (da && db && da.getTime() !== db.getTime()) return db - da;
    if (da && !db) return -1;
    if (!da && db) return 1;
    return 0;
  }

  function updateResultsMeta(shown, total) {
    if (filtersActive()) {
      el.resultsMeta.textContent = "Showing " + shown + " of " + total + " materials.";
    } else {
      el.resultsMeta.textContent = total + (total === 1 ? " material." : " materials.");
    }
  }

  function buildTable(rows) {
    const table = document.createElement("table");
    table.className = "materials";

    const thead = document.createElement("thead");
    thead.innerHTML =
      '<tr><th scope="col">Subject</th><th scope="col">Semester</th>' +
      '<th scope="col">Type</th><th scope="col">Link</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rows.forEach(function (m) {
      tbody.appendChild(buildRow(m));
    });
    table.appendChild(tbody);
    return table;
  }

  function buildRow(m) {
    const q = state.filters.q;
    const tr = document.createElement("tr");

    // Subject
    const subject = cell("Subject", "col-subject");
    subject.value.appendChild(highlight(m.subject, q));
    tr.appendChild(subject.td);

    // Semester
    const sem = cell("Semester", "col-semester");
    sem.value.textContent = m.semester || "—";
    tr.appendChild(sem.td);

    // Type (badge)
    const type = cell("Type", "col-type");
    if (m.type) {
      const badge = document.createElement("span");
      badge.className = "badge " + typeClass(m.type);
      badge.textContent = m.type;
      type.value.appendChild(badge);
    } else {
      type.value.textContent = "—";
    }
    tr.appendChild(type.td);

    // Link
    const link = cell("Link", "cell-link");
    const href = safeHref(m.driveLink);
    if (href) {
      const a = document.createElement("a");
      a.className = "open-link";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", "Open " + m.subject + " materials in a new tab");
      const label = document.createElement("span");
      label.textContent = "Open";
      const arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗"; // ↗
      a.appendChild(label);
      a.appendChild(arrow);
      link.value.appendChild(a);
    } else {
      const span = document.createElement("span");
      span.className = "col-semester";
      span.textContent = "No link";
      link.value.appendChild(span);
    }
    tr.appendChild(link.td);

    return tr;
  }

  // Build a <td> with a real column-name label (hidden on desktop, shown in the
  // mobile stacked layout) plus a value wrapper. Using a real element instead
  // of CSS ::before content means assistive tech actually announces the label.
  function cell(label, className) {
    const td = document.createElement("td");
    if (className) td.className = className;
    const lab = document.createElement("span");
    lab.className = "cell-label";
    lab.textContent = label;
    td.appendChild(lab);
    const value = document.createElement("span");
    value.className = "cell-value";
    td.appendChild(value);
    return { td: td, value: value };
  }

  function typeClass(type) {
    const t = type.toLowerCase();
    if (t.indexOf("ppt") !== -1 || t.indexOf("slide") !== -1) return "ppt";
    if (t.indexOf("record") !== -1 || t.indexOf("video") !== -1) return "recording";
    if (t.indexOf("note") !== -1) return "notes";
    if (t.indexOf("assign") !== -1) return "assignment";
    return "";
  }

  // Only allow http/https links (blocks javascript:, data:, etc.).
  function safeHref(url) {
    if (!url) return null;
    try {
      const u = new URL(url, window.location.href);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch (e) {
      /* invalid URL */
    }
    return null;
  }

  // Build a DocumentFragment with case-insensitive matches wrapped in <mark>.
  // XSS-safe: text goes through text nodes, never innerHTML.
  function highlight(text, query) {
    const frag = document.createDocumentFragment();
    const q = (query || "").trim();
    if (!q) {
      frag.appendChild(document.createTextNode(text));
      return frag;
    }
    const lower = text.toLowerCase();
    const needle = q.toLowerCase();
    let i = 0;
    let idx = lower.indexOf(needle, i);
    if (idx === -1) {
      frag.appendChild(document.createTextNode(text));
      return frag;
    }
    while (idx !== -1) {
      if (idx > i) frag.appendChild(document.createTextNode(text.slice(i, idx)));
      const mark = document.createElement("mark");
      mark.textContent = text.slice(idx, idx + needle.length);
      frag.appendChild(mark);
      i = idx + needle.length;
      idx = lower.indexOf(needle, i);
    }
    if (i < text.length) frag.appendChild(document.createTextNode(text.slice(i)));
    return frag;
  }

  // ============================================================
  // State messages
  // ============================================================
  function showEmptyData() {
    el.content.innerHTML = "";
    const p = document.createElement("p");
    p.className = "state-msg";
    p.textContent = "No study materials yet. Add entries to data.json to get started.";
    el.content.appendChild(p);
    el.resultsMeta.textContent = "";
  }

  function showLoadError(err) {
    el.content.innerHTML = "";
    const p = document.createElement("p");
    p.className = "state-msg error";
    const isFileProtocol = window.location.protocol === "file:";
    if (isFileProtocol) {
      p.innerHTML =
        "Could not load <code>data.json</code> because the page was opened " +
        "directly from disk (<code>file://</code>), which blocks fetch.<br><br>" +
        "Run a local server from this folder and open the shown URL:<br>" +
        "<code>python3 -m http.server 8000</code> &nbsp;then visit&nbsp; " +
        "<code>http://localhost:8000</code><br><br>" +
        "On GitHub Pages / Netlify it works with no extra steps.";
    } else {
      p.textContent =
        "Could not load data.json (" + err.message + "). " +
        "Check that the file exists and contains valid JSON.";
    }
    el.content.appendChild(p);
    el.resultsMeta.textContent = "";
  }

  // ============================================================
  // Events
  // ============================================================
  function initEvents() {
    // Live search (trimmed so whitespace-only input counts as no filter)
    el.search.addEventListener("input", function () {
      state.filters.q = el.search.value.trim();
      render();
    });

    el.semester.addEventListener("change", function () {
      state.filters.semester = el.semester.value;
      render();
    });

    el.type.addEventListener("change", function () {
      state.filters.type = el.type.value;
      render();
    });

    el.clear.addEventListener("click", function () {
      state.filters = { q: "", semester: "", type: "" };
      el.search.value = "";
      el.semester.value = "";
      el.type.value = "";
      render();
    });
  }

  // A search or filter is currently narrowing the list.
  function filtersActive() {
    return Boolean(
      state.filters.q || state.filters.semester || state.filters.type
    );
  }

  // ============================================================
  // Boot
  // ============================================================
  initTheme();
  initEvents();
  loadData();
})();
