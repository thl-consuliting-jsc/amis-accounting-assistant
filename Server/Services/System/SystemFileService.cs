using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.MasterData;

namespace AmisAssistant.Server.Services.SystemDomain
{
    public class SystemFileService : ISystemFileService
    {
        private readonly ICompanyRepository _companyRepo;
        private readonly IPartnerAliasRepository _aliasRepo;
        private readonly string _rootAppDir;

        public string RootAppDir => _rootAppDir;

        public SystemFileService(
            ICompanyRepository companyRepo,
            IPartnerAliasRepository aliasRepo)
        {
            _companyRepo = companyRepo;
            _aliasRepo = aliasRepo;

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string parentDir = Path.GetFullPath(Path.Combine(baseDir, ".."));
            string current = Directory.GetCurrentDirectory();
            string candidate = Path.GetFullPath(Path.Combine(current, ".."));

            if (Directory.Exists(@"D:\2026\1.Work\9.PHUONG\6. APP"))
            {
                _rootAppDir = @"D:\2026\1.Work\9.PHUONG";
            }
            else if (Directory.Exists(Path.Combine(baseDir, "6. APP")))
            {
                _rootAppDir = baseDir;
            }
            else if (Directory.Exists(Path.Combine(parentDir, "6. APP")))
            {
                _rootAppDir = parentDir;
            }
            else if (Directory.Exists(Path.Combine(candidate, "6. APP")))
            {
                _rootAppDir = candidate;
            }
            else if (Directory.Exists(Path.Combine(current, "6. APP")))
            {
                _rootAppDir = current;
            }
            else
            {
                _rootAppDir = baseDir;
            }
        }

        public string GetCompanyBaseDir(CompanyDto? comp)
        {
            if (comp == null || string.IsNullOrWhiteSpace(comp.DataFolder))
                return _rootAppDir;

            string folder = comp.DataFolder.Trim();

            // Nếu đường dẫn máy tính cá nhân không tồn tại trên máy chủ hiện tại (VPS), ưu tiên dùng _rootAppDir nếu có 5. DU LIEU
            if (!Directory.Exists(folder) && Directory.Exists(Path.Combine(_rootAppDir, "5. DU LIEU")))
            {
                return _rootAppDir;
            }

            if (folder.EndsWith("5. DU LIEU", StringComparison.OrdinalIgnoreCase) ||
                folder.EndsWith("5. DU LIEU\\", StringComparison.OrdinalIgnoreCase) ||
                folder.EndsWith("5. DU LIEU/", StringComparison.OrdinalIgnoreCase))
            {
                return Directory.GetParent(folder.TrimEnd('\\', '/'))?.FullName ?? folder;
            }
            return folder;
        }

        public async Task<string> GetResultsFolderPathAsync(int companyId, int month, int year, string? overrideBaseDir = null)
        {
            var comp = await _companyRepo.GetByIdAsync(companyId);
            string baseDir = !string.IsNullOrEmpty(overrideBaseDir) ? overrideBaseDir : GetCompanyBaseDir(comp);
            string outDir = Path.Combine(baseDir, "4. UP PHAN MEM", $"THANG {month:D2}.{year}");
            if (!Directory.Exists(outDir))
            {
                outDir = Path.Combine(baseDir, "4. UP PHAN MEM", $"THANG {month:D2}");
            }
            if (!Directory.Exists(outDir) && string.IsNullOrEmpty(overrideBaseDir))
            {
                outDir = Path.Combine(_rootAppDir, "4. UP PHAN MEM", $"THANG {month:D2}.{year}");
            }
            if (!Directory.Exists(outDir) && string.IsNullOrEmpty(overrideBaseDir))
            {
                outDir = Path.Combine(_rootAppDir, "4. UP PHAN MEM", $"THANG {month:D2}");
            }
            if (!Directory.Exists(outDir))
            {
                outDir = Path.Combine(baseDir, "4. UP PHAN MEM");
            }
            return outDir;
        }

        public async Task<string?> GetFilePathAsync(int companyId, string fileName, int month, int year)
        {
            string outDir = await GetResultsFolderPathAsync(companyId, month, year);
            string p1 = Path.Combine(outDir, fileName);
            if (File.Exists(p1)) return p1;

            var comp = await _companyRepo.GetByIdAsync(companyId);
            string baseDir = GetCompanyBaseDir(comp);
            string upMem = Path.Combine(baseDir, "4. UP PHAN MEM");
            if (Directory.Exists(upMem))
            {
                var match = Directory.GetFiles(upMem, fileName, SearchOption.AllDirectories).FirstOrDefault();
                if (match != null) return match;
            }
            string rootUp = Path.Combine(_rootAppDir, "4. UP PHAN MEM");
            if (Directory.Exists(rootUp))
            {
                var match = Directory.GetFiles(rootUp, fileName, SearchOption.AllDirectories).FirstOrDefault();
                if (match != null) return match;
            }
            return null;
        }

        public async Task<string?> GetNoteFilePathAsync(int companyId, int month, int year)
        {
            string outDir = await GetResultsFolderPathAsync(companyId, month, year);
            if (Directory.Exists(outDir))
            {
                var noteFile = Directory.GetFiles(outDir, "*Ghi_chu*.xlsx").FirstOrDefault();
                if (noteFile != null) return noteFile;
                var anyNote = Directory.GetFiles(outDir, "*0.*.xlsx").FirstOrDefault();
                if (anyNote != null) return anyNote;
            }
            return null;
        }

        public async Task<byte[]?> GetResultsZipAsync(int companyId, int month, int year, string? overrideBaseDir = null)
        {
            string outDir = await GetResultsFolderPathAsync(companyId, month, year, overrideBaseDir);
            if (!Directory.Exists(outDir)) return null;

            var files = Directory.GetFiles(outDir, "*.xlsx");
            if (files.Length == 0) files = Directory.GetFiles(outDir);
            if (files.Length == 0) return null;

            using var ms = new MemoryStream();
            using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
            {
                foreach (var f in files)
                {
                    string fn = Path.GetFileName(f);
                    var entry = archive.CreateEntry(fn, CompressionLevel.Optimal);
                    using var entryStream = entry.Open();
                    using var fileStream = File.OpenRead(f);
                    fileStream.CopyTo(entryStream);
                }
            }
            return ms.ToArray();
        }

        public async Task<bool> SaveAliasAsync(int companyId, string rawName, string partnerCode, string? note)
        {
            try
            {
                return await _aliasRepo.UpsertAliasAsync(companyId, rawName, partnerCode, note);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SaveAliasAsync DB Error]: {ex.Message}");
                return false;
            }
        }
    }
}
