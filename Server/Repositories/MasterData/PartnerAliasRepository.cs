using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;
using Dapper;
using Microsoft.Extensions.Configuration;

namespace AmisAssistant.Server.Repositories.MasterData
{
    public class PartnerAliasRepository : BaseRepository<PartnerAliasDto, int>, IPartnerAliasRepository
    {
        public PartnerAliasRepository(IConfiguration configuration) : base(configuration) { }

        protected override string CustomTableName => "PartnerAliases";

        public async Task<bool> UpsertAliasAsync(int companyId, string rawName, string partnerCode, string? note)
        {
            using var conn = CreateConnection();
            const string sql = @"
                IF EXISTS (SELECT 1 FROM PartnerAliases WHERE CompanyId = @CompanyId AND RawPartnerName = @RawName)
                BEGIN
                    UPDATE PartnerAliases 
                    SET PartnerCode = @PartnerCode, Note = @Note 
                    WHERE CompanyId = @CompanyId AND RawPartnerName = @RawName;
                END
                ELSE
                BEGIN
                    INSERT INTO PartnerAliases (CompanyId, RawPartnerName, PartnerCode, Note)
                    VALUES (@CompanyId, @RawName, @PartnerCode, @Note);
                END";
            int affected = await conn.ExecuteAsync(sql, new { CompanyId = companyId, RawName = rawName, PartnerCode = partnerCode, Note = note });
            return affected > 0;
        }
    }
}
