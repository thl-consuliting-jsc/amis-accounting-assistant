using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;
using Dapper;
using Microsoft.Extensions.Configuration;

namespace AmisAssistant.Server.Repositories.MasterData
{
    public class PartnerRepository : BaseRepository<PartnerDto, int>, IPartnerRepository
    {
        public PartnerRepository(IConfiguration configuration) : base(configuration) { }

        protected override string CustomTableName => "Partners";

        public async Task<IEnumerable<PartnerDto>> GetByCompanyIdAsync(int companyId, string? type = null, string? search = null)
        {
            using var conn = CreateConnection();
            const string sql = @"
                SELECT Id, CompanyId, PartnerCode, PartnerName, NormalizedName, TaxCode,
                       PartnerType, DefaultDebitAccount, DefaultCreditAccount
                FROM Partners
                WHERE CompanyId = @CompanyId
                  AND (@Type IS NULL OR @Type = '' OR @Type = 'ALL' OR PartnerType = @Type)
                  AND (@Search IS NULL OR @Search = '' OR 
                       PartnerCode LIKE '%' + @Search + '%' OR 
                       PartnerName LIKE '%' + @Search + '%' OR 
                       NormalizedName LIKE '%' + @Search + '%' OR 
                       TaxCode LIKE '%' + @Search + '%')
                ORDER BY PartnerCode ASC;";
            return await conn.QueryAsync<PartnerDto>(sql, new { CompanyId = companyId, Type = type, Search = search });
        }
    }
}
