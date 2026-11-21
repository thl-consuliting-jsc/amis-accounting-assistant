using System;
using System.IO;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.SystemDomain;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.SystemDomain
{
    [ApiController]
    [Route("api/accounting")]
    public class FileOperationsController : ControllerBase
    {
        private readonly ISystemFileService _fileService;

        public FileOperationsController(ISystemFileService fileService)
        {
            _fileService = fileService;
        }

        [HttpPost("companies/{id}/open-folder")]
        public async Task<ActionResult> OpenResultsFolder(int id, [FromQuery] int? month, [FromQuery] int? year, [FromBody] OpenFolderRequest? body = null)
        {
            int m = month ?? body?.Month ?? 0;
            int y = year ?? body?.Year ?? 0;
            string? customFolder = body?.CustomFolder;

            string folderPath;
            if (!string.IsNullOrWhiteSpace(customFolder) && Directory.Exists(customFolder))
            {
                folderPath = customFolder;
            }
            else
            {
                folderPath = await _fileService.GetResultsFolderPathAsync(id, m, y);
            }

            bool openedOnHost = false;
            try
            {
                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                }

                if (Directory.Exists(folderPath))
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "explorer.exe",
                        Arguments = $"\"{folderPath}\"",
                        UseShellExecute = true
                    });
                    openedOnHost = true;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[OpenFolder Error]: {ex.Message}");
            }

            return Ok(new
            {
                success = true,
                folderPath,
                openedOnHost,
                message = openedOnHost ? $"Đã mở thư mục trên File Explorer: {folderPath}" : $"Đường dẫn thư mục: {folderPath}"
            });
        }

        [HttpPost("open-path")]
        public ActionResult OpenPath([FromBody] OpenPathRequest req)
        {
            if (string.IsNullOrWhiteSpace(req?.Path))
            {
                return BadRequest(new { success = false, message = "Đường dẫn không hợp lệ" });
            }

            string cleanPath = req.Path.Trim('"', ' ');
            try
            {
                if (System.IO.File.Exists(cleanPath))
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "explorer.exe",
                        Arguments = $"/select,\"{cleanPath}\"",
                        UseShellExecute = true
                    });
                    return Ok(new { success = true, message = $"Đã mở và chọn tệp: {cleanPath}" });
                }
                else if (System.IO.Directory.Exists(cleanPath))
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "explorer.exe",
                        Arguments = $"\"{cleanPath}\"",
                        UseShellExecute = true
                    });
                    return Ok(new { success = true, message = $"Đã mở thư mục: {cleanPath}" });
                }
                else
                {
                    Directory.CreateDirectory(cleanPath);
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "explorer.exe",
                        Arguments = $"\"{cleanPath}\"",
                        UseShellExecute = true
                    });
                    return Ok(new { success = true, message = $"Đã tạo và mở thư mục: {cleanPath}" });
                }
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = $"Không thể mở đường dẫn: {ex.Message}" });
            }
        }

        [HttpPost("save-and-open-file")]
        public ActionResult SaveAndOpenFile([FromBody] SaveFileRequest req)
        {
            if (string.IsNullOrWhiteSpace(req?.FileName) || string.IsNullOrWhiteSpace(req?.FileData))
            {
                return BadRequest(new { success = false, message = "Thiếu thông tin tệp hoặc dữ liệu" });
            }

            try
            {
                string cleanFolder = string.IsNullOrWhiteSpace(req.FolderPath)
                    ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads")
                    : req.FolderPath.Trim('"', ' ');

                if (!Directory.Exists(cleanFolder))
                {
                    Directory.CreateDirectory(cleanFolder);
                }

                string fullPath = Path.Combine(cleanFolder, req.FileName);
                byte[] bytes = Convert.FromBase64String(req.FileData);
                System.IO.File.WriteAllBytes(fullPath, bytes);

                if (req.OpenExplorer)
                {
                    try
                    {
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = "explorer.exe",
                            Arguments = $"/select,\"{fullPath}\"",
                            UseShellExecute = true
                        });
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Explorer Open Error]: {ex.Message}");
                    }
                }

                return Ok(new
                {
                    success = true,
                    filePath = fullPath,
                    message = $"Đã lưu tệp thành công vào: {fullPath}"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Lỗi khi lưu tệp: {ex.Message}" });
            }
        }

        [HttpPost("browse-folder")]
        public ActionResult BrowseFolder([FromBody] OpenPathRequest? req = null)
        {
            try
            {
                string init = req?.Path?.Trim('"', ' ') ?? "";
                string script = $"Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Chọn thư mục lưu tệp'; $f.ShowNewFolderButton = $true; if ('{init.Replace("\\", "\\\\")}' -ne '') {{ $f.SelectedPath = '{init.Replace("\\", "\\\\")}' }}; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{ Write-Output $f.SelectedPath }}";

                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoProfile -STA -Command \"{script}\"",
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = System.Diagnostics.Process.Start(psi);
                if (process != null)
                {
                    string output = process.StandardOutput.ReadToEnd().Trim();
                    process.WaitForExit(60000);
                    if (!string.IsNullOrEmpty(output) && Directory.Exists(output))
                    {
                        return Ok(new { success = true, folderPath = output });
                    }
                }
                return Ok(new { success = false, folderPath = "" });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("companies/{id}/results-folder-path")]
        public async Task<ActionResult> GetResultsFolderPath(int id, [FromQuery] int month, [FromQuery] int year)
        {
            string folderPath = await _fileService.GetResultsFolderPathAsync(id, month, year);
            string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string downloads = Path.Combine(userProfile, "Downloads");
            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);

            return Ok(new
            {
                success = true,
                folderPath,
                downloadsFolder = downloads,
                desktopFolder = desktop
            });
        }

        [HttpGet("companies/{id}/download-results-zip")]
        public async Task<IActionResult> DownloadResultsZip(int id, [FromQuery] int month, [FromQuery] int year)
        {
            byte[]? zipBytes = await _fileService.GetResultsZipAsync(id, month, year);
            if (zipBytes == null || zipBytes.Length == 0)
            {
                return NotFound("Thư mục kết quả hiện chưa có tệp Excel nào. Vui lòng bấm LẬP FILE trước!");
            }
            return File(zipBytes, "application/zip", $"Ket_Qua_AMIS_T{month:D2}_{year}.zip");
        }

        [HttpGet("companies/{id}/download-file")]
        public async Task<IActionResult> DownloadFile(int id, [FromQuery] string fileName, [FromQuery] int month, [FromQuery] int year)
        {
            string? filePath = await _fileService.GetFilePathAsync(id, fileName, month, year);
            if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
            {
                return NotFound($"Không tìm thấy tệp '{fileName}' trong thư mục kết quả.");
            }
            byte[] bytes = await System.IO.File.ReadAllBytesAsync(filePath);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        [HttpGet("companies/{id}/download-note-file")]
        public async Task<IActionResult> DownloadNoteFile(int id, [FromQuery] int month, [FromQuery] int year)
        {
            string? noteFile = await _fileService.GetNoteFilePathAsync(id, month, year);
            if (string.IsNullOrEmpty(noteFile) || !System.IO.File.Exists(noteFile))
            {
                return NotFound("Không tìm thấy tệp Bảng ghi chú đối chiếu cho kỳ này. Vui lòng bấm LẬP FILE trước!");
            }
            byte[] bytes = await System.IO.File.ReadAllBytesAsync(noteFile);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Path.GetFileName(noteFile));
        }

        [HttpPost("companies/{id}/save-alias")]
        public async Task<ActionResult> SaveAlias(int id, [FromBody] SaveAliasRequest request)
        {
            bool success = await _fileService.SaveAliasAsync(id, request.RawName, request.PartnerCode, request.Note);
            return Ok(new
            {
                success,
                message = $"Đã lưu khai mã {request.PartnerCode} cho \"{request.RawName}\". Các kỳ sau sẽ tự động nhận diện."
            });
        }
    }
}
