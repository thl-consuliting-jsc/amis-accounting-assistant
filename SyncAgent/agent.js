/**
 * AMIS SYNC AGENT - Trợ lý Đồng bộ Dữ liệu AMIS Assistant
 * Tự động theo dõi thư mục dữ liệu trên máy tính cá nhân và đồng bộ lên Máy chủ VPS.
 * Sử dụng 100% Native Node.js APIs (Không cần cài thêm npm packages).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

const CONFIG_FILE = path.join(__dirname, 'config.json');
const CACHE_FILE = path.join(__dirname, '.sync-cache.json');

// Cấu hình mặc định
let config = {
  serverUrl: 'http://103.107.183.86:9093',
  dataFolder: 'D:\\2026\\1.Work\\9.PHUONG\\5. DU LIEU',
  taxCode: '0111154196',
  autoSync: false,
  syncIntervalSeconds: 5,
  webPort: 4999
};

// Chuẩn hóa địa chỉ API máy chủ (nếu người dùng nhập port 9092 web thì tự chuyển sang 9093 API)
function getApiBaseUrl() {
  let url = (config.serverUrl || '').replace(/\/+$/, '');
  if (url.includes(':9092')) {
    url = url.replace(':9092', ':9093');
  }
  return url;
}

// Đọc cấu hình từ file
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      config = { ...config, ...data };
    } else {
      saveConfig(config);
    }
  } catch (err) {
    console.error('[Config] Lỗi đọc config.json:', err.message);
  }
}

function saveConfig(newConfig) {
  try {
    config = { ...config, ...newConfig };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('[Config] Lỗi lưu config.json:', err.message);
  }
}

// Bộ nhớ đệm tệp đã đồng bộ (để tránh gửi lại tệp không thay đổi)
let syncCache = {};
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      syncCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch {
    syncCache = {};
  }
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(syncCache, null, 2), 'utf8');
  } catch {}
}

// Nhật ký hoạt động gần nhất
const recentLogs = [];
function log(msg, type = 'INFO') {
  const time = new Date().toLocaleTimeString('vi-VN');
  const entry = { time, msg, type };
  recentLogs.unshift(entry);
  if (recentLogs.length > 50) recentLogs.pop();
  console.log(`[${time}] [${type}] ${msg}`);
}

// Quét thư mục đệ quy tìm các tệp kế toán
const ALLOWED_EXTS = ['.xlsx', '.xls', '.xml', '.pdf', '.csv'];
function scanDirectory(dir, rootDir = dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results = results.concat(scanDirectory(fullPath, rootDir));
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (ALLOWED_EXTS.includes(ext) && !item.name.startsWith('~$')) {
          const relPath = path.relative(rootDir, fullPath);
          const stat = fs.statSync(fullPath);
          results.push({
            fullPath,
            relPath,
            size: stat.size,
            mtimeMs: stat.mtimeMs
          });
        }
      }
    }
  } catch (err) {
    log(`Lỗi quét thư mục ${dir}: ${err.message}`, 'ERROR');
  }
  return results;
}

// Upload 1 tệp lên máy chủ VPS qua API
async function uploadFileToServer(fileInfo) {
  const url = `${getApiBaseUrl()}/api/accounting/sync/upload`;

  try {
    const fileBytes = fs.readFileSync(fileInfo.fullPath);
    const blob = new Blob([fileBytes]);
    const formData = new FormData();
    formData.append('file', blob, path.basename(fileInfo.fullPath));
    formData.append('relativePath', fileInfo.relPath);
    formData.append('taxCode', config.taxCode || '');

    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const json = await res.json();
      syncCache[fileInfo.relPath] = {
        size: fileInfo.size,
        mtimeMs: fileInfo.mtimeMs,
        syncedAt: new Date().toISOString()
      };
      saveCache();
      log(`Đã đồng bộ tệp: ${fileInfo.relPath} (${(fileInfo.size / 1024).toFixed(1)} KB)`, 'SUCCESS');
      return true;
    } else {
      const text = await res.text();
      log(`Lỗi tải lên ${fileInfo.relPath} (HTTP ${res.status}): ${text}`, 'WARN');
      return false;
    }
  } catch (err) {
    log(`Không thể gửi tệp tới máy chủ (${url}): ${err.message}`, 'WARN');
    return false;
  }
}

// Gửi heartbeat trạng thái máy lên VPS
async function sendHeartbeat(syncedCount) {
  const url = `${getApiBaseUrl()}/api/accounting/sync/heartbeat`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine: os.hostname(),
        taxCode: config.taxCode,
        agentVersion: '1.0.0',
        localFolder: config.dataFolder,
        syncedFilesCount: syncedCount
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

let isSyncing = false;
let isConnectedToServer = false;

// Tiến trình đồng bộ chính
async function performSync(forceUpload = false) {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const files = fs.existsSync(config.dataFolder) ? scanDirectory(config.dataFolder) : [];
    let uploadedCount = 0;

    if (forceUpload || config.autoSync) {
      for (const file of files) {
        const cached = syncCache[file.relPath];
        if (!cached || cached.size !== file.size || cached.mtimeMs !== file.mtimeMs) {
          const ok = await uploadFileToServer(file);
          if (ok) uploadedCount++;
        }
      }
    }

    isConnectedToServer = await sendHeartbeat(files.length);

    if (uploadedCount > 0) {
      log(`Hoàn tất đồng bộ: ${uploadedCount} tệp mới được cập nhật lên máy chủ VPS.`, 'SUCCESS');
    }
  } catch (err) {
    log(`Lỗi trong chu kỳ đồng bộ: ${err.message}`, 'ERROR');
  } finally {
    isSyncing = false;
  }
}

// Tạo Web UI Dashboard cấu hình tại http://localhost:4999
function startWebDashboard() {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${config.webPort}`);

    // API lưu cấu hình từ Web
    if (req.method === 'POST' && parsedUrl.pathname === '/api/config') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          const newSettings = JSON.parse(body);
          saveConfig(newSettings);
          log('Đã cập nhật cấu hình mới qua Giao diện Web', 'SUCCESS');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Đã lưu cấu hình thành công!' }));
          performSync();
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      });
      return;
    }

    // API kích hoạt đồng bộ ngay lập tức
    if (req.method === 'POST' && parsedUrl.pathname === '/api/sync-now') {
      performSync().then(() => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, message: 'Đã kích hoạt đồng bộ!' }));
      });
      return;
    }

    // API mở thư mục / tệp trên máy tính qua Explorer
    if (req.method === 'POST' && (parsedUrl.pathname === '/api/open-path' || parsedUrl.pathname === '/api/accounting/open-path')) {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          const { path: targetPath } = JSON.parse(body || '{}');
          if (targetPath) {
            const clean = targetPath.trim().replace(/^"|"$/g, '');
            const { exec } = require('child_process');
            if (fs.existsSync(clean)) {
              const stat = fs.statSync(clean);
              const cmd = stat.isFile() ? `explorer.exe /select,"${clean}"` : `explorer.exe "${clean}"`;
              exec(cmd);
            } else {
              fs.mkdirSync(clean, { recursive: true });
              exec(`explorer.exe "${clean}"`);
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      });
      return;
    }

    // API lưu tệp và mở thư mục
    if (req.method === 'POST' && (parsedUrl.pathname === '/api/save-and-open-file' || parsedUrl.pathname === '/api/accounting/save-and-open-file')) {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          const { folderPath, fileName, fileData, openExplorer } = JSON.parse(body || '{}');
          const cleanFolder = (folderPath || '').trim().replace(/^"|"$/g, '');
          if (!fs.existsSync(cleanFolder)) {
            fs.mkdirSync(cleanFolder, { recursive: true });
          }
          const fullPath = path.join(cleanFolder, fileName);
          fs.writeFileSync(fullPath, Buffer.from(fileData, 'base64'));
          if (openExplorer) {
            const { exec } = require('child_process');
            exec(`explorer.exe /select,"${fullPath}"`);
          }
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: true, filePath: fullPath }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      });
      return;
    }

    // API chọn thư mục Windows FolderBrowserDialog
    if (req.method === 'POST' && (parsedUrl.pathname === '/api/browse-folder' || parsedUrl.pathname === '/api/accounting/browse-folder')) {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        const { exec } = require('child_process');
        const script = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Chọn thư mục lưu tệp'; $f.ShowNewFolderButton = $true; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }`;
        exec(`powershell -NoProfile -STA -Command "${script}"`, (err, stdout) => {
          const chosen = (stdout || '').trim();
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: !err && !!chosen, folderPath: chosen }));
        });
      });
      return;
    }

    // API lấy trạng thái cho giao diện
    if (req.method === 'GET' && parsedUrl.pathname === '/api/status') {
      const files = scanDirectory(config.dataFolder);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        config,
        machine: os.hostname(),
        isConnected: isConnectedToServer,
        isSyncing,
        totalLocalFiles: files.length,
        syncedCount: Object.keys(syncCache).length,
        recentLogs
      }));
      return;
    }

    // Phục vụ Giao diện HTML
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderDashboardHtml());
  });

  server.listen(config.webPort, '127.0.0.1', () => {
    log(`Giao diện cấu hình Agent sẵn sàng tại: http://localhost:${config.webPort}`);
  });
}

function renderDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>AMIS Sync Agent - Cấu hình Đồng bộ Dữ liệu</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { background: #f0f2f5; color: #333; padding: 30px; }
    .container { max-width: 850px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: #fff; padding: 25px 30px; }
    .header h1 { font-size: 22px; margin-bottom: 6px; }
    .header p { font-size: 13px; opacity: 0.85; }
    .content { padding: 30px; }
    .status-card { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-radius: 8px; margin-bottom: 25px; background: #e8f5e9; border: 1px solid #c8e6c9; }
    .status-card.disconnected { background: #ffebee; border-color: #ffcdd2; }
    .status-indicator { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 15px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; background: #4caf50; display: inline-block; }
    .dot.red { background: #f44336; }
    .form-group { margin-bottom: 20px; }
    label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 8px; color: #444; }
    input[type="text"] { width: 100%; padding: 12px 14px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; }
    input[type="text"]:focus { outline: none; border-color: #2a5298; }
    .hint { font-size: 12px; color: #777; margin-top: 5px; }
    .actions { display: flex; gap: 12px; margin-top: 25px; }
    button { padding: 12px 24px; border-radius: 6px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .btn-primary { background: #2a5298; color: #fff; }
    .btn-primary:hover { background: #1e3c72; }
    .btn-secondary { background: #4caf50; color: #fff; }
    .btn-secondary:hover { background: #388e3c; }
    .logs-panel { margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
    .logs-title { font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #555; }
    .log-box { background: #1e1e1e; color: #eee; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 12px; height: 180px; overflow-y: auto; line-height: 1.6; }
    .badge { padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 AMIS SYNC AGENT</h1>
      <p>Trợ lý Tự động Đồng bộ Thư mục Dữ liệu Kế toán lên Máy chủ VPS</p>
    </div>
    <div class="content">
      <div id="statusBox" class="status-card">
        <div class="status-indicator">
          <span id="statusDot" class="dot"></span>
          <span id="statusText">Đang kiểm tra kết nối...</span>
        </div>
        <div>
          <span class="badge" id="fileCountBadge">0 tệp</span>
        </div>
      </div>

      <form id="configForm">
        <div class="form-group">
          <label>Đường dẫn Thư mục Dữ liệu trên Máy tính của bạn:</label>
          <input type="text" id="dataFolder" required placeholder="VD: D:\\2026\\1.Work\\9.PHUONG\\5. DU LIEU">
          <div class="hint">Thư mục chứa sao kê ngân hàng và hóa đơn mua/bán (VD: D:\\2026\\...\\5. DU LIEU).</div>
        </div>

        <div class="form-group">
          <label>Địa chỉ Máy chủ Web / VPS:</label>
          <input type="text" id="serverUrl" required placeholder="http://103.107.183.86:9092">
          <div class="hint">Địa chỉ IP hoặc tên miền trang web AMIS Assistant đang chạy.</div>
        </div>

        <div class="form-group">
          <label>Mã số thuế Công ty (Tax Code):</label>
          <input type="text" id="taxCode" required placeholder="0111154196">
          <div class="hint">Mã số thuế của công ty bạn phụ trách hạch toán.</div>
        </div>

        <div class="actions">
          <button type="submit" class="btn-primary">💾 Lưu Cấu Hình</button>
          <button type="button" id="btnSyncNow" class="btn-secondary">⚡ Đồng Bộ Ngay</button>
        </div>
      </form>

      <div class="logs-panel">
        <div class="logs-title">📋 Nhật ký hoạt động gần nhất:</div>
        <div class="log-box" id="logBox">Đang tải nhật ký...</div>
      </div>
    </div>
  </div>

  <script>
    async function fetchStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        document.getElementById('dataFolder').value = data.config.dataFolder;
        document.getElementById('serverUrl').value = data.config.serverUrl;
        document.getElementById('taxCode').value = data.config.taxCode;

        const box = document.getElementById('statusBox');
        const dot = document.getElementById('statusDot');
        const text = document.getElementById('statusText');
        const badge = document.getElementById('fileCountBadge');

        if (data.isConnected) {
          box.className = 'status-card';
          dot.className = 'dot';
          text.innerText = '🟢 Đã kết nối VPS (' + data.config.serverUrl + ') - Tự động đồng bộ';
        } else {
          box.className = 'status-card disconnected';
          dot.className = 'dot red';
          text.innerText = '🔴 Chưa kết nối tới Máy chủ VPS (' + data.config.serverUrl + ')';
        }

        badge.innerText = data.totalLocalFiles + ' tệp trên máy';

        const logs = data.recentLogs.map(l => '[' + l.time + '] [' + l.type + '] ' + l.msg).join('\\n');
        document.getElementById('logBox').innerText = logs || 'Chưa có hoạt động nào.';
      } catch (e) {
        console.error(e);
      }
    }

    document.getElementById('configForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        dataFolder: document.getElementById('dataFolder').value.trim(),
        serverUrl: document.getElementById('serverUrl').value.trim(),
        taxCode: document.getElementById('taxCode').value.trim()
      };
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      alert(json.message);
      fetchStatus();
    });

    document.getElementById('btnSyncNow').addEventListener('click', async () => {
      const res = await fetch('/api/sync-now', { method: 'POST' });
      const json = await res.json();
      alert(json.message);
      fetchStatus();
    });

    fetchStatus();
    setInterval(fetchStatus, 3000);
  </script>
</body>
</html>`;
}

// Bắt đầu ứng dụng
// =======================================================
// LẮNG NGHE LỆNH "LẬP FILE" TỪ WEB (FLEX THEO CÔNG TY ĐANG CHỌN)
// =======================================================
// Báo cáo phiên thất bại về VPS
async function reportJobFailure(jobId, message) {
  try {
    const failUrl = `${getApiBaseUrl()}/api/accounting/sync/session-fail`;
    await fetch(failUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, message })
    });
  } catch (e) {
    console.error('Lỗi báo phiên thất bại:', e.message);
  }
}

let isProcessingJob = false;

async function pollPendingJob() {
  if (isProcessingJob) return;
  const pollUrl = `${getApiBaseUrl()}/api/accounting/sync/poll-job?machine=${encodeURIComponent(os.hostname())}`;

  try {
    const res = await fetch(pollUrl);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.hasJob || !data.job) return;

    isProcessingJob = true;
    const job = data.job;
    log(`[NHẬN LỆNH LẬP FILE] Công ty: ${job.companyName || job.taxCode} - Kỳ: ${job.month}/${job.year}`, 'JOB');

    // Tìm thư mục dữ liệu trên máy tính cho công ty này
    let searchBases = [];
    if (job.dataFolder && fs.existsSync(job.dataFolder)) searchBases.push(job.dataFolder);
    if (config.dataFolder && fs.existsSync(config.dataFolder)) searchBases.push(config.dataFolder);
    searchBases.push('D:\\2026\\1.Work\\9.PHUONG\\5. DU LIEU');
    searchBases.push('D:\\2026\\1.Work\\9.PHUONG');

    let monthFolder = null;
    const mStr = String(job.month).padStart(2, '0');
    const folderCandidates = [
      `THANG ${mStr}.${job.year}`,
      `THANG ${job.month}.${job.year}`,
      `THANG ${mStr}`
    ];

    for (const base of searchBases) {
      for (const sub of folderCandidates) {
        const p1 = path.join(base, sub);
        if (fs.existsSync(p1)) { monthFolder = p1; break; }
        const p2 = path.join(base, '5. DU LIEU', sub);
        if (fs.existsSync(p2)) { monthFolder = p2; break; }
      }
      if (monthFolder) break;
    }

    if (!monthFolder) {
      const errMsg = `Không tìm thấy thư mục 'THANG ${mStr}.${job.year}' trong thư mục dữ liệu trên máy tính (${config.dataFolder}).`;
      log(errMsg, 'ERROR');
      await reportJobFailure(job.jobId, errMsg);
      isProcessingJob = false;
      return;
    }

    log(`Đang quét tệp tại: "${monthFolder}"...`, 'INFO');
    const files = scanDirectory(monthFolder, monthFolder);
    if (files.length === 0) {
      const errMsg = `Thư mục 'THANG ${mStr}.${job.year}' trên máy tính không có tệp sao kê/hóa đơn nào.`;
      log(errMsg, 'ERROR');
      await reportJobFailure(job.jobId, errMsg);
      isProcessingJob = false;
      return;
    }

    log(`Tìm thấy ${files.length} tệp cho Kỳ ${mStr}/${job.year}. Bắt đầu gửi lên phiên tạm...`, 'INFO');

    const monthFolderName = path.basename(monthFolder);
    let uploaded = 0;
    for (const f of files) {
      const uploadUrl = `${getApiBaseUrl()}/api/accounting/sync/session-upload`;
      const fileBytes = fs.readFileSync(f.fullPath);
      const blob = new Blob([fileBytes]);
      const fd = new FormData();
      fd.append('file', blob, path.basename(f.fullPath));
      fd.append('jobId', job.jobId);

      // Cấu trúc chuẩn: 5. DU LIEU/THANG mm.yyyy/... để Trolyketoan.exe đọc chính xác
      const subRel = path.relative(monthFolder, f.fullPath);
      const finalRel = path.join('5. DU LIEU', monthFolderName, subRel);
      fd.append('relativePath', finalRel);

      const uRes = await fetch(uploadUrl, { method: 'POST', body: fd });
      if (uRes.ok) uploaded++;
    }

    log(`Đã nạp xong ${uploaded}/${files.length} tệp vào Phiên tạm ${job.jobId}. Báo máy chủ kích hoạt Engine...`, 'SUCCESS');

    const readyUrl = `${getApiBaseUrl()}/api/accounting/sync/session-ready`;
    const readyRes = await fetch(readyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.jobId })
    });

    if (readyRes.ok) {
      log(`Phiên ${job.jobId} đã xử lý xong và lập 9 file AMIS thành công!`, 'SUCCESS');
    }
  } catch (err) {
    log(`Lỗi thực hiện lệnh lập file: ${err.message}`, 'ERROR');
  } finally {
    isProcessingJob = false;
  }
}

function start() {
  loadConfig();
  loadCache();

  console.log('=================================================================');
  console.log('   AMIS SYNC AGENT - TRỢ LÝ ĐỒNG BỘ DỮ LIỆU KẾ TOÁN (NODE.JS)    ');
  console.log('=================================================================');
  console.log(`[+] Máy chủ VPS  : ${config.serverUrl}`);
  console.log(`[+] Thư mục máy  : ${config.dataFolder}`);
  console.log(`[+] MST Công ty  : ${config.taxCode}`);
  console.log(`[+] Web Cấu hình : http://localhost:${config.webPort}`);
  console.log('=================================================================');

  startWebDashboard();

  // Thực hiện đồng bộ nền
  performSync();

  // Lắng nghe lệnh lập file từ Web VPS mỗi 1.5 giây
  setInterval(pollPendingJob, 1500);

  // Chu kỳ kiểm tra và đồng bộ tự động
  const intervalMs = Math.max(3, config.syncIntervalSeconds || 5) * 1000;
  setInterval(() => {
    if (config.autoSync) {
      performSync();
    }
  }, intervalMs);
}

start();
