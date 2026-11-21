using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace AmisAssistant.Server.Repositories.Base
{
    public abstract class BaseRepository<T, TKey> : IBaseRepository<T, TKey> where T : class
    {
        protected readonly string _connectionString;
        private static readonly ConcurrentDictionary<Type, QueryCache> _queryCache = new();

        protected class QueryCache
        {
            public string TableName { get; set; } = string.Empty;
            public string KeyProperty { get; set; } = "Id";
            public List<string> AllProperties { get; set; } = new();
            public List<string> InsertProperties { get; set; } = new();
            public string SelectAllSql { get; set; } = string.Empty;
            public string SelectByIdSql { get; set; } = string.Empty;
            public string InsertSql { get; set; } = string.Empty;
            public string UpdateSql { get; set; } = string.Empty;
            public string DeleteSql { get; set; } = string.Empty;
        }

        protected BaseRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection") 
                ?? "Data Source=103.107.183.86,1234;Initial Catalog=HUNG_DB2;User ID=sa;Password=amaTECH2026@;TrustServerCertificate=True;Command Timeout=120;";
        }

        protected virtual string CustomTableName => string.Empty;
        protected virtual string CustomKeyProperty => "Id";
        protected virtual IEnumerable<string> IgnoredProperties => Enumerable.Empty<string>();

        protected IDbConnection CreateConnection()
        {
            try
            {
                var conn = new SqlConnection(_connectionString);
                conn.Open();
                return conn;
            }
            catch (Exception)
            {
                if (_connectionString.Contains("103.107.183.86"))
                {
                    try
                    {
                        var localCs = _connectionString.Replace("103.107.183.86,1234", "127.0.0.1,1234");
                        var localConn = new SqlConnection(localCs);
                        localConn.Open();
                        return localConn;
                    }
                    catch { }
                }
                throw;
            }
        }

        protected QueryCache Cache => _queryCache.GetOrAdd(typeof(T), _ => BuildQueryCache());

        private QueryCache BuildQueryCache()
        {
            var type = typeof(T);
            string table = !string.IsNullOrEmpty(CustomTableName) ? CustomTableName : ResolveTableName(type.Name);
            string keyProp = CustomKeyProperty;
            var ignored = new HashSet<string>(IgnoredProperties, StringComparer.OrdinalIgnoreCase);

            var props = type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => p.CanRead && p.CanWrite && !ignored.Contains(p.Name))
                .Select(p => p.Name)
                .ToList();

            var insertProps = props.Where(p => !p.Equals(keyProp, StringComparison.OrdinalIgnoreCase)).ToList();

            string cols = string.Join(", ", props.Select(p => $"[{p}]"));
            string insertCols = string.Join(", ", insertProps.Select(p => $"[{p}]"));
            string insertParams = string.Join(", ", insertProps.Select(p => $"@{p}"));
            string updateSet = string.Join(", ", insertProps.Select(p => $"[{p}] = @{p}"));

            return new QueryCache
            {
                TableName = table,
                KeyProperty = keyProp,
                AllProperties = props,
                InsertProperties = insertProps,
                SelectAllSql = $"SELECT {cols} FROM [{table}];",
                SelectByIdSql = $"SELECT {cols} FROM [{table}] WHERE [{keyProp}] = @Id;",
                InsertSql = $"INSERT INTO [{table}] ({insertCols}) VALUES ({insertParams}); SELECT CAST(SCOPE_IDENTITY() AS INT);",
                UpdateSql = $"UPDATE [{table}] SET {updateSet} WHERE [{keyProp}] = @{keyProp};",
                DeleteSql = $"DELETE FROM [{table}] WHERE [{keyProp}] = @Id;"
            };
        }

        private static string ResolveTableName(string typeName)
        {
            if (typeName.EndsWith("Dto", StringComparison.OrdinalIgnoreCase))
                typeName = typeName[..^3];

            if (typeName.Equals("Company", StringComparison.OrdinalIgnoreCase)) return "Companies";
            if (typeName.Equals("AccountingRule", StringComparison.OrdinalIgnoreCase)) return "AccountingRules";
            if (typeName.Equals("Partner", StringComparison.OrdinalIgnoreCase)) return "Partners";
            if (typeName.Equals("BankAccount", StringComparison.OrdinalIgnoreCase)) return "BankAccounts";
            if (typeName.Equals("BankTransaction", StringComparison.OrdinalIgnoreCase)) return "BankTransactions";
            if (typeName.Equals("Invoice", StringComparison.OrdinalIgnoreCase)) return "Invoices";
            if (typeName.Equals("Ccdc", StringComparison.OrdinalIgnoreCase)) return "Ccdc";
            if (typeName.Equals("PartnerAlias", StringComparison.OrdinalIgnoreCase)) return "PartnerAliases";

            return typeName.EndsWith("s") ? typeName : typeName + "s";
        }

        public virtual async Task<IEnumerable<T>> GetAllAsync()
        {
            using var conn = CreateConnection();
            return await conn.QueryAsync<T>(Cache.SelectAllSql);
        }

        public virtual async Task<T?> GetByIdAsync(TKey id)
        {
            using var conn = CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<T>(Cache.SelectByIdSql, new { Id = id });
        }

        public virtual async Task<TKey> InsertAsync(T entity)
        {
            using var conn = CreateConnection();
            var newId = await conn.ExecuteScalarAsync<object>(Cache.InsertSql, entity);
            if (newId != null && typeof(TKey) == typeof(int))
            {
                return (TKey)(object)Convert.ToInt32(newId);
            }
            return default!;
        }

        public virtual async Task<bool> UpdateAsync(T entity)
        {
            using var conn = CreateConnection();
            int affected = await conn.ExecuteAsync(Cache.UpdateSql, entity);
            return affected > 0;
        }

        public virtual async Task<bool> DeleteAsync(TKey id)
        {
            using var conn = CreateConnection();
            int affected = await conn.ExecuteAsync(Cache.DeleteSql, new { Id = id });
            return affected > 0;
        }
    }
}
