# Study Hub — M.Tech Full Stack Development (BITS Pilani)

A single-page, static website that acts as a consolidated, searchable directory
of your course study materials. The actual files (PPTs, recordings, notes,
assignments) live in **Google Drive** — this site just organizes and links to
them.

**🌐 Live site: <https://munnabujjibabu.github.io/bits-study-hub/>**

- **No backend, no build step** — plain HTML/CSS/JS.
- **All content lives in one file:** [`data.json`](data.json). Add a row, push, done.
- **Deploys anywhere static** — currently on GitHub Pages (auto-redeploys on push).

---

## Features

| Feature | Notes |
|---|---|
| Single table view | Every material in one table: **Subject · Semester · Type · Link**. |
| Real-time search | Filters by **subject** as you type; matches are highlighted. |
| Semester & Type filters | Dropdowns are auto-populated from your data. |
| Sorted by subject | Rows are grouped/sorted by subject A→Z, newest-first within a subject. |
| Responsive | On phones each row becomes a stacked, labeled card. |
| Dark mode | Toggle in the header; your choice is remembered. Defaults to dark. |
| Last updated | Auto-derived from the most recent `dateAdded` in your data. |

---

## Project structure

```
.
├── index.html    # Page markup
├── styles.css    # Styling + light/dark themes + responsive rules
├── app.js        # Loads data.json, renders the table, search/filter/theme logic
├── data.json     # ← YOUR DATA lives here (the only file you normally edit)
└── README.md
```

---

## Adding / editing study materials

Open [`data.json`](data.json) and add an object to the `materials` array. Each
entry looks like this:

```json
{
  "subject": "Data Structures & Algorithms",
  "semester": "Sem 1",
  "type": "PPT",
  "driveLink": "https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing",
  "dateAdded": "2026-01-28"
}
```

### Field reference

> **Minimum:** each entry needs a `subject` (or at least a `driveLink`).
> Everything else is optional and falls back to a sensible default.

| Field | Required | Description |
|---|---|---|
| `subject` | ✅ | Shown in the first column; also used to sort/group the table. Falls back to `"Uncategorized"` if omitted. |
| `semester` | recommended | e.g. `"Sem 1"`. Auto-added to the Semester filter. Use `"Sem 1"`…`"Sem 10"` for correct ordering. |
| `type` | recommended | `"PPT"`, `"Recording"`, `"Notes"`, or `"Assignment"` get colored badges. Other values (e.g. `"PPT/Recording"`) still work (neutral or best-match badge). |
| `driveLink` | recommended | A Google Drive share URL (see below). Only `http`/`https` links are shown; without a valid one the row shows a plain **"No link"** instead of a button. |
| `dateAdded` | optional | `YYYY-MM-DD` — must be a **real calendar date** (e.g. `2026-02-30` is ignored). Used for newest-first sorting **and** the "Last updated" stamp. |

### Tips

- **The "Last updated" date updates itself** — it's the newest `dateAdded`, so
  just set today's date on new rows.
- **Commas matter:** every entry needs a comma after it *except the last one*.
  If the page shows a load error, paste `data.json` into
  <https://jsonlint.com> to find the typo.
- **Keep subject names consistent.** `"DBMS"` and `"Database Management Systems"`
  are treated as two separate subjects in the table.

### Getting a shareable Google Drive link

1. In Google Drive, right-click the file (or folder) → **Share**.
2. Under *General access*, choose **Anyone with the link** → *Viewer*.
3. Click **Copy link** and paste it into `driveLink`.

> Files/folders left as *Restricted* will only open for accounts you've shared
> with — set them to *Anyone with the link* if you want one-click access.

---

## Running it locally

Because the page loads `data.json` with `fetch()`, **double-clicking
`index.html` won't work** (browsers block `fetch` on `file://`). Run a tiny
local server from the project folder instead:

```bash
# Python 3 (pre-installed on macOS/Linux)
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Other options: `npx serve` (Node), or the **Live Server** VS Code extension.

---

## Deploying to GitHub Pages

1. **Create a repo** and push these files to the `main` branch:

   ```bash
   git init
   git add .
   git commit -m "Study Hub"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

2. On GitHub: **Settings → Pages**.
3. Under *Build and deployment* → *Source*, pick **Deploy from a branch**.
4. Choose branch **`main`** and folder **`/ (root)`**, then **Save**.
5. Wait ~1 minute. Your site will be live at:

   ```
   https://<your-username>.github.io/<repo-name>/
   ```

To update later, just edit `data.json`, commit, and push — Pages redeploys
automatically.

### Alternative: Netlify (drag-and-drop)

1. Go to <https://app.netlify.com/drop>.
2. Drag the whole project folder onto the page.
3. It's live instantly on a `*.netlify.app` URL. To update, drag the folder again.

---

## Customizing

- **Colors / theme:** edit the CSS variables at the top of [`styles.css`](styles.css)
  (`:root` for light, `[data-theme="dark"]` for dark).
- **Default theme:** change `data-theme="dark"` on the `<html>` tag in
  [`index.html`](index.html) (and the fallback in the inline script) to `"light"`.
- **Title / heading:** edit the `<title>` and `.brand` block in `index.html`.
