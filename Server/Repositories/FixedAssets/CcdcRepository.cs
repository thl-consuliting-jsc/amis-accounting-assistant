using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;
using Dapper;
using Microsoft.Extensions.Configuration;

namespace AmisAssistant.Server.Repositories.FixedAssets
{
    public class CcdcRepository : BaseRepository<CcdcDto, int>, ICcdcRepository
    {
        public CcdcRepository(IConfiguration configuration) : base(configuration) { }

        protected override string CustomTableName => "Ccdc";

        public async Task<IEnumerable<CcdcDto>> GetByCompanyIdAsync(int companyId, int? month = null, int? year = null)
        {
            using var conn = CreateConnection();
            const string sql = @"
                SELECT Id, CompanyId, Code, Name, OriginalPrice, AllocationPeriods, InvoiceRef, Unit, Month, Year
                FROM Ccdc
                WHERE CompanyId = @CompanyId
                  AND (@Month IS NULL OR Month = @Month)
                  AND (@Year IS NULL OR Year = @Year)
                ORDER BY Id ASC;";
            return await conn.QueryAsync<CcdcDto>(sql, new { CompanyId = companyId, Month = month, Year = year });
        }
    }
}
