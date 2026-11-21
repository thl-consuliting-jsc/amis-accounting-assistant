using System;
using System.Collections.Concurrent;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.EngineDomain;
using AmisAssistant.Server.Services.SystemDomain;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.SystemDomain
{
    public class SyncAgentHeartbeatInfo
    {
        public string? Machine { get; set; }
        public string? TaxCode { get; set; }
        public string? AgentVersion { get; set; }
        public string? LocalFolder { get; set; }
        public int SyncedFilesCount { get; set; }
        public DateTime LastSeen { get; set; }
        public string? Ip { get; set; }
    }

    [ApiController]
    [Route("api/accounting")]
    public class SyncAgentController : ControllerBase
    {
        private readonly ISystemFileService _fileService;
        private readonly IEngineService _engineService;

        private static readonly ConcurrentDictionary<string, SyncAgentHeartbeatInfo> _syncAgentHeartbeats = new();
        private static readonly ConcurrentDictionary<string, WebJobSession> _activeWebJobs = new();

        public SyncAgentController(ISystemFileService fileService, IEngineService engineService)
        {
            _fileService = fileService;
            _engineService = engineService;
        }

        [HttpPost("sync/upload")]
        [RequestSizeLimit(104857600)] // 100MB
        public async Task<ActionResult> SyncUpload([FromForm] IFormFile file, [FromForm] string relativePath, [FromForm] string? taxCode = null)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "Tệp trống hoặc không hợp lệ." });

            if (string.IsNullOrWhiteSpace(relativePath))
                return BadRequest(new { success = false, message = "Thiếu đường dẫn tương đối (relativePath)." });

            string sanitized = relativePath.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
            if (sanitized.Contains(".."))
                return BadRequest(new { success = false, message = "Đường dẫn không an toàn." });

            try
            {
                string targetDir = Path.Combine(_fileService.RootAppDir, "5. DU LIEU");
                string fullPath = Path.Combine(targetDir, sanitized);

                string? dir = Path.GetDirectoryName(fullPath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                using (var stream = new FileStream(fullPath, FileMode.Create, FileAccess.Write))
                {
                    await file.CopyToAsync(stream);
                }

                return Ok(new
                {
                    success = true,
                    message = $"Đã đồng bộ tệp: {sanitized}",
                    path = fullPath,
                    size = file.Length,
                    syncTime = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Lỗi ghi tệp trên máy chủ: {ex.Message}" });
            }
        }

        [HttpPost("sync/heartbeat")]
        public ActionResult SyncHeartbeat([FromBody] SyncHeartbeatRequest request)
        {
            string key = request.TaxCode ?? request.Machine ?? "default";
            _syncAgentHeartbeats[key] = new SyncAgentHeartbeatInfo
            {
                Machine = request.Machine,
                TaxCode = request.TaxCode,
                AgentVersion = request.AgentVersion,
                LocalFolder = request.LocalFolder,
                SyncedFilesCount = request.SyncedFilesCount,
                LastSeen = DateTime.Now,
                Ip = HttpContext.Connection.RemoteIpAddress?.ToString()
            };

            return Ok(new
            {
                success = true,
                serverTime = DateTime.Now,
                message = "Heartbeat received"
            });
        }

        [HttpGet("sync/status")]
        public ActionResult GetSyncStatus([FromQuery] string? taxCode = null)
        {
            var cutoff = DateTime.Now.AddSeconds(-45);
            var active = _syncAgentHeartbeats.Values.Where(a => a.LastSeen >= cutoff).ToList();

            bool hasAgent = active.Count > 0;
            SyncAgentHeartbeatInfo? matched = null;
            if (!string.IsNullOrEmpty(taxCode))
            {
                matched = active.FirstOrDefault(a => string.Equals(a.TaxCode, taxCode, StringComparison.OrdinalIgnoreCase));
            }

            return Ok(new
            {
                success = true,
                hasActiveAgent = hasAgent,
                matchedTaxCode = matched != null,
                activeCount = active.Count,
                activeAgents = active,
                serverStorage = Path.Combine(_fileService.RootAppDir, "5. DU LIEU")
            });
        }

        [HttpPost("sync/session-fail")]
        public ActionResult SessionFail([FromBody] System.Text.Json.JsonElement body)
        {
            string jobId = body.TryGetProperty("jobId", out var jProp) ? jProp.GetString() ?? "" : "";
            string message = body.TryGetProperty("message", out var mProp) ? mProp.GetString() ?? "" : "Không thể tải tệp từ máy tính.";
            if (_activeWebJobs.TryGetValue(jobId, out var job))
            {
                job.Status = "FAILED";
                job.Message = message;
                return Ok(new { success = true });
            }
            return NotFound(new { success = false, message = "Không tìm thấy phiên làm việc." });
        }

        [HttpPost("web-run-request")]
        public ActionResult RequestWebRun([FromBody] WebRunRequestDto request)
        {
            string jobId = Guid.NewGuid().ToString("N");
            string tempDir = Path.Combine(Path.GetTempPath(), "AmisTempSessions", jobId);
            if (!Directory.Exists(tempDir)) Directory.CreateDirectory(tempDir);

            var job = new WebJobSession
            {
                JobId = jobId,
                CompanyId = request.CompanyId,
                Month = request.Month,
                Year = request.Year,
                TaxCode = request.TaxCode,
                CompanyName = request.CompanyName,
                DataFolder = request.DataFolder,
                TempDir = tempDir,
                Status = "WAITING_FILES",
                Message = $"Đang kết nối tới Trợ lý máy tính để lấy dữ liệu {request.CompanyName}..."
            };

            _activeWebJobs[jobId] = job;

            return Ok(new
            {
                success = true,
                jobId,
                message = "Đã khởi tạo phiên xử lý tạm thời. Đang chờ Trợ lý gửi tệp..."
            });
        }

        [HttpGet("sync/poll-job")]
        public ActionResult PollJob([FromQuery] string? machine = null, [FromQuery] string? taxCode = null)
        {
            var pendingJob = _activeWebJobs.Values
                .Where(j => j.Status == "WAITING_FILES" && j.CreatedAt > DateTime.Now.AddMinutes(-5))
                .OrderBy(j => j.CreatedAt)
                .FirstOrDefault();

            if (pendingJob == null)
            {
                return Ok(new { hasJob = false });
            }

            pendingJob.Status = "RECEIVING_FILES";
            pendingJob.Message = $"Trợ lý máy tính đang đóng gói và gửi dữ liệu Kỳ {pendingJob.Month:D2}/{pendingJob.Year}...";

            return Ok(new
            {
                hasJob = true,
                job = new
                {
                    jobId = pendingJob.JobId,
                    companyId = pendingJob.CompanyId,
                    taxCode = pendingJob.TaxCode,
                    companyName = pendingJob.CompanyName,
                    dataFolder = pendingJob.DataFolder,
                    month = pendingJob.Month,
                    year = pendingJob.Year
                }
            });
        }

        [HttpPost("sync/session-upload")]
        [RequestSizeLimit(104857600)] // 100MB
        public async Task<ActionResult> SessionUpload([FromForm] IFormFile file, [FromForm] string jobId, [FromForm] string relativePath)
        {
            if (!_activeWebJobs.TryGetValue(jobId, out var job))
            {
                return NotFound(new { success = false, message = "Không tìm thấy phiên làm việc." });
            }

            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "Tệp trống." });

            string sep = Path.DirectorySeparatorChar.ToString();
            string sanitized = relativePath.Replace('/', Path.DirectorySeparatorChar)
                                           .Replace('\\', Path.DirectorySeparatorChar)
                                           .TrimStart(Path.DirectorySeparatorChar);
            if (sanitized.Contains(".."))
                return BadRequest(new { success = false, message = "Đường dẫn không hợp lệ." });

            string duLieuPrefix = "5. DU LIEU" + sep;
            while (sanitized.StartsWith(duLieuPrefix, StringComparison.OrdinalIgnoreCase))
            {
                sanitized = sanitized.Substring(duLieuPrefix.Length);
            }
            if (sanitized.Equals("5. DU LIEU", StringComparison.OrdinalIgnoreCase))
            {
                sanitized = "";
            }

            string targetPath;
            if (string.Equals(sanitized, "ANH XA DOI TUONG.xlsx", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(Path.GetFileName(sanitized), "ANH XA DOI TUONG.xlsx", StringComparison.OrdinalIgnoreCase))
            {
                targetPath = Path.Combine(job.TempDir, "5. DU LIEU", "ANH XA DOI TUONG.xlsx");
            }
            else
            {
                string expectedMonth = $"THANG {job.Month:D2}.{job.Year}";
                string shortMonth = $"THANG {job.Month:D2}";

                bool hasMonthFolder = sanitized.StartsWith(shortMonth, StringComparison.OrdinalIgnoreCase) ||
                                     sanitized.Contains(sep + shortMonth, StringComparison.OrdinalIgnoreCase);

                if (!hasMonthFolder)
                {
                    string fileNameUpper = file.FileName.ToUpperInvariant();
                    if (!sanitized.Contains(sep))
                    {
                        if (fileNameUpper.Contains("MB") || fileNameUpper.Contains("VP") || fileNameUpper.Contains("VCB") ||
                            fileNameUpper.Contains("TECHCOM") || fileNameUpper.Contains("TCB") || fileNameUpper.Contains("SAO KE") || fileNameUpper.Contains("SAOKE"))
                        {
                            sanitized = Path.Combine(expectedMonth, "1. SAO KE", sanitized);
                        }
                        else if (fileNameUpper.Contains("MUA") || fileNameUpper.Contains("HDCT_MUA") || fileNameUpper.Contains("PURCHASE"))
                        {
                            sanitized = Path.Combine(expectedMonth, "2. MUA HANG", sanitized);
                        }
                        else if (fileNameUpper.Contains("BAN") || fileNameUpper.Contains("HDCT_BAN") || fileNameUpper.Contains("SOLD"))
                        {
                            sanitized = Path.Combine(expectedMonth, "3. BAN HANG", sanitized);
                        }
                        else
                        {
                            sanitized = Path.Combine(expectedMonth, sanitized);
                        }
                    }
                    else
                    {
                        sanitized = Path.Combine(expectedMonth, sanitized);
                    }
                }

                targetPath = Path.Combine(job.TempDir, "5. DU LIEU", sanitized);
            }

            string? dir = Path.GetDirectoryName(targetPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            using (var stream = new FileStream(targetPath, FileMode.Create, FileAccess.Write))
            {
                await file.CopyToAsync(stream);
            }

            job.FileCount++;
            return Ok(new { success = true, path = sanitized, fileCount = job.FileCount });
        }

        [HttpPost("sync/session-ready")]
        public async Task<ActionResult> SessionReady([FromBody] System.Text.Json.JsonElement body)
        {
            string jobId = body.TryGetProperty("jobId", out var jProp) ? jProp.GetString() ?? "" : "";
            if (!_activeWebJobs.TryGetValue(jobId, out var job))
            {
                return NotFound(new { success = false, message = "Không tìm thấy phiên làm việc." });
            }

            job.Status = "PROCESSING";
            job.Message = "Đang xử lý và lập 9 file AMIS...";

            try
            {
                string serverAlias = Path.Combine(_fileService.RootAppDir, "5. DU LIEU", "ANH XA DOI TUONG.xlsx");
                string tempAlias = Path.Combine(job.TempDir, "5. DU LIEU", "ANH XA DOI TUONG.xlsx");
                if (System.IO.File.Exists(serverAlias) && !System.IO.File.Exists(tempAlias))
                {
                    try
                    {
                        string? d = Path.GetDirectoryName(tempAlias);
                        if (!string.IsNullOrEmpty(d) && !Directory.Exists(d)) Directory.CreateDirectory(d);
                        System.IO.File.Copy(serverAlias, tempAlias, true);
                    }
                    catch { }
                }

                var result = await _engineService.RunEngineAsync(job.CompanyId, job.Month, job.Year, job.TempDir);
                job.Result = result;

                if (result.Success)
                {
                    string outDir = Path.Combine(job.TempDir, "4. UP PHAN MEM", $"THANG {job.Month:D2}.{job.Year}");
                    if (!Directory.Exists(outDir)) outDir = Path.Combine(job.TempDir, "4. UP PHAN MEM", $"THANG {job.Month:D2}");

                    if (Directory.Exists(outDir))
                    {
                        using var ms = new MemoryStream();
                        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
                        {
                            foreach (var f in Directory.GetFiles(outDir, "*.xlsx"))
                            {
                                archive.CreateEntryFromFile(f, Path.GetFileName(f));
                            }
                        }
                        job.ZipBytes = ms.ToArray();
                    }

                    if (job.Result.Files != null)
                    {
                        foreach (var f in job.Result.Files)
                        {
                            f.DownloadUrl = $"/api/accounting/session/{job.JobId}/download-file?fileName={Uri.EscapeDataString(f.FileName)}";
                        }
                    }

                    job.Status = "COMPLETED";
                    job.Message = $"Lập file AMIS thành công! ({result.FileCount} tệp sẵn sàng)";
                }
                else
                {
                    job.Status = "FAILED";
                    job.Message = result.Message ?? "Lập file thất bại.";
                }
            }
            catch (Exception ex)
            {
                job.Status = "FAILED";
                job.Message = $"Lỗi xử lý: {ex.Message}";
            }
            finally
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await Task.Delay(TimeSpan.FromMinutes(15));
                        if (Directory.Exists(job.TempDir))
                        {
                            Directory.Delete(job.TempDir, true);
                        }
                        _activeWebJobs.TryRemove(job.JobId, out _);
                    }
                    catch { }
                });
            }

            return Ok(new { success = true, status = job.Status, message = job.Message });
        }

        [HttpGet("session-status/{jobId}")]
        public ActionResult GetSessionStatus(string jobId)
        {
            if (!_activeWebJobs.TryGetValue(jobId, out var job))
            {
                return NotFound(new { success = false, message = "Phiên làm việc không tồn tại hoặc đã hết hạn." });
            }

            return Ok(new
            {
                success = true,
                status = job.Status,
                message = job.Message,
                fileCount = job.FileCount,
                result = job.Result,
                hasZip = job.ZipBytes != null && job.ZipBytes.Length > 0
            });
        }

        [HttpGet("session/{jobId}/download-zip")]
        public ActionResult DownloadSessionZip(string jobId)
        {
            if (!_activeWebJobs.TryGetValue(jobId, out var job) || job.ZipBytes == null || job.ZipBytes.Length == 0)
            {
                return NotFound("Không tìm thấy tệp kết quả của phiên làm việc này.");
            }

            return File(job.ZipBytes, "application/zip", $"Ket_Qua_AMIS_T{job.Month:D2}_{job.Year}.zip");
        }

        [HttpGet("session/{jobId}/download-file")]
        public ActionResult DownloadSessionFile(string jobId, [FromQuery] string fileName)
        {
            if (!_activeWebJobs.TryGetValue(jobId, out var job) || job.ZipBytes == null || job.ZipBytes.Length == 0)
            {
                return NotFound("Không tìm thấy tệp của phiên làm việc này.");
            }

            try
            {
                using var ms = new MemoryStream(job.ZipBytes);
                using var archive = new ZipArchive(ms, ZipArchiveMode.Read);
                var entry = archive.GetEntry(fileName) ?? archive.Entries.FirstOrDefault(e => e.Name.Equals(fileName, StringComparison.OrdinalIgnoreCase));
                if (entry == null)
                {
                    return NotFound($"Không tìm thấy tệp '{fileName}' trong kết quả.");
                }

                using var entryStream = entry.Open();
                using var outMs = new MemoryStream();
                entryStream.CopyTo(outMs);
                return File(outMs.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi đọc tệp kết quả: {ex.Message}");
            }
        }
    }
}
