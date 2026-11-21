using System.Collections.Generic;
using System.Threading.Tasks;

namespace AmisAssistant.Server.Repositories.Base
{
    public interface IBaseRepository<T, TKey> where T : class
    {
        Task<IEnumerable<T>> GetAllAsync();
        Task<T?> GetByIdAsync(TKey id);
        Task<TKey> InsertAsync(T entity);
        Task<bool> UpdateAsync(T entity);
        Task<bool> DeleteAsync(TKey id);
    }
}
