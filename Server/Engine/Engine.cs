#nullable disable
// TRO LY KE TOAN - Engine: chuyen nguyen logic tu zfund_app.py sang C#.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace Zf
{
    public class Txn
    {
        public string Bank;
        public DateTime Date;
        public DateTime Time;
        public double Out;
        public double In;
        public string Who;
        public string Nd;
        public string Ft;
        public double Bal;
        public string Kind = "";   // "" | "PHI" | "THUE_PHI"
    }

    public class Stmt
    {
        public string Bank;
        public List<Txn> Rows = new List<Txn>();
        public double? Open;
        public double? Close;
        public DateTime? Period;
        public string File;
    }

    public class VRow
    {
        public string Date, Bank, Code, Name, Tk, Dg, Ft, Nd, Note, So, LyDo, Who;
        public double Amt;
        public VRow Copy()
        {
            var v = new VRow();
            v.Date = Date; v.Bank = Bank; v.Code = Code; v.Name = Name; v.Tk = Tk; v.Dg = Dg;
            v.Ft = Ft; v.Nd = Nd; v.Note = Note; v.So = So; v.LyDo = LyDo; v.Amt = Amt; v.Who = Who;
            return v;
        }
    }

    public class CtnbRow
    {
        public string Date, Bank, Nd, Ft;
        public double Amt, In, Out;
    }

    public class BankRec
    {
        public string Bank, Tk, SoTk;
        public double Open, Thu, CIn, Chi, COut, Calc;
        public double? Close;
        public bool Ok;
        public string Label { get { return Bank + " " + SoTk + " (TK " + Tk + ")"; } }
        public string KetQua { get { return Ok ? "KHỚP" : "LỆCH – KIỂM TRA"; } }
        public string OpenS { get { return U.Money(Open); } }
        public string ThuS { get { return U.Money(Thu); } }
        public string ChiS { get { return U.Money(Chi); } }
        public string CInS { get { return U.Money(CIn); } }
        public string COutS { get { return U.Money(COut); } }
        public string CalcS { get { return U.Money(Calc); } }
        public string CloseS { get { return Close.HasValue ? U.Money(Close.Value) : "?"; } }
    }

    public class NoteRow
    {
        public string So, Date, Bank, Note;
        public double Amt;
        public string AmtS { get { return U.Money(Amt); } }
    }

    /// <summary>Mot dong chung tu day du - de xem chi tiet tren giao dien.</summary>
    public class VoucherInfo
    {
        public string So = "", Date = "", Bank = "", Kind = "", Code = "", Name = "", Tk = "", TkNh = "";
        public string Dg = "", LyDo = "", Nd = "", Ft = "", Who = "", Note = "";
        public double Amt;
        public string AmtS { get { return U.Money(Amt); } }
    }

    public class RunResult
    {
        public int Code = 3;
        public int Month, Year;
        public string OutDir = "";
        public List<string> Files = new List<string>();
        public List<string> Log = new List<string>();
        public List<BankRec> Rec = new List<BankRec>();
        public List<NoteRow> Notes = new List<NoteRow>();
        public int NThu, NChiLines, NChiVouchers, NCtnb, NMuaDv, NCcdc, NNvk, NMuaHd, NBanHd;
        public int NMuaIt, NBanIt, NDanhMuc, NSupp, NVatIn, NVatOut;
        public List<string[]> MuaNotes = new List<string[]>();
        public List<string[]> BanNotes = new List<string[]>();
        public List<object[]> MissObj = new List<object[]>();
        public List<object[]> VatSum = new List<object[]>();   // {chi tieu, dien giai, so tien}
        public List<object[]> Ccdc = new List<object[]>();     // {ma, ten, nguyen gia, so ky}
        public List<VoucherInfo> Vouchers = new List<VoucherInfo>();
        public string NextNcc = "", NextKh = "", NextNv = "";   // ma trong tiep theo cua tung day so
        public string Error = "";
        public string CongTy = "";
    }

    public static class Engine
    {
        // ---------------------------------------------------------------- doc sao ke
        static Stmt ReadMb(string path, string bankKey)
        {
            var st = new Stmt(); st.Bank = bankKey; st.File = Path.GetFileName(path);
            XlsxRead.Sheet ws = XlsxRead.Read(path).Active;
            if (ws == null) return st;
            foreach (object[] r in ws.Rows)
            {
                string joined = Join(r);
                if ((joined.Contains("Opening Balance") || joined.Contains("Số dư đầu kỳ")) && !st.Open.HasValue) st.Open = U.MoneyInText(joined);
                if ((joined.Contains("Closing Balance") || joined.Contains("Số dư cuối kỳ")) && !st.Close.HasValue) st.Close = U.MoneyInText(joined);
                Match m = Regex.Match(joined, @"From:\s*(\d{2}/\d{2}/\d{4})");
                if (m.Success) st.Period = U.ParseDate(m.Groups[1].Value);
                if (!IsDataRow(r)) continue;
                var t = new Txn();
                t.Bank = bankKey;
                t.Date = U.ParseDate(At(r, 2));
                t.Time = U.ParseDate(At(r, 1));
                t.Out = U.Num(At(r, 3));
                t.In = U.Num(At(r, 4));
                t.Bal = U.Num(At(r, 5));
                t.Who = U.Clean(At(r, 6));
                t.Nd = U.Clean(At(r, 7));
                t.Ft = U.Clean(At(r, 8));
                st.Rows.Add(t);
            }
            return st;
        }

        static Stmt ReadVp(string path, string bankKey)
        {
            var st = new Stmt(); st.Bank = bankKey; st.File = Path.GetFileName(path);
            XlsxRead.Book book = XlsxRead.Read(path);
            XlsxRead.Sheet ws = book.ByName("Tổng hợp") ?? book.Active;
            if (ws == null) return st;
            foreach (object[] r in ws.Rows)
            {
                string joined = Join(r);
                if (joined.Contains("Opening balance") && !st.Open.HasValue) st.Open = U.MoneyInText(joined);
                if (joined.Contains("Closing balance") && !st.Close.HasValue) st.Close = U.MoneyInText(joined);
                Match m = Regex.Match(joined, @"\[(\d{2}/\d{2}/\d{4})-");
                if (m.Success) st.Period = U.ParseDate(m.Groups[1].Value);
                if (!IsDataRow(r)) continue;
                var t = new Txn();
                t.Bank = bankKey;
                t.Ft = U.Clean(At(r, 1));
                t.Date = U.ParseDate(At(r, 2));
                t.In = U.Num(At(r, 3));
                t.Out = U.Num(At(r, 4));
                t.Nd = U.Clean(At(r, 5));
                t.Bal = U.Num(At(r, 6));
                string tg = U.PyStr(At(r, 7));
                t.Time = U.ParseDate(tg.Length > 16 ? tg.Substring(0, 16) : tg);
                t.Who = "";
                st.Rows.Add(t);
            }
            return st;
        }


        // ---------------------------------------------------------------- doc sao ke TONG QUAT (AUTO)
        // Tu do tim dong tieu de + tung cot theo tu khoa -> dung duoc cho moi ngan hang
        // (Techcombank, BIDV, Vietcombank, ACB...) ma khong can viet them code.
        // Co the chi dinh tay trong quy_tac.json:  "doc_sao_ke": { "sheet": "...", "cot": { "ngay": "...", ... } }
        class ColMap
        {
            public int Date = -1, Time = -1, In = -1, Out = -1, Nd = -1, Who = -1, Ft = -1, Bal = -1, Fee = -1, Vat = -1;
            public int Score;
        }

        static readonly string[] KwDate = { "NGAY GIAO DICH", "TRANSACTION DATE", "NGAY HACH TOAN", "POSTING DATE", "NGAY HIEU LUC", "VALUE DATE", "NGAY PHAT SINH", "TRANS DATE", "NGAY GD", "NGAY" };
        static readonly string[] KwTime = { "NGAY KH THUC HIEN", "REQUESTING DATE", "THOI GIAN", "DATE TIME", "GIO" };
        static readonly string[] KwNd = { "DIEN GIAI", "DESCRIPTION", "NOI DUNG", "REMARK", "MO TA", "CHI TIET GIAO DICH", "NARRATIVE" };
        static readonly string[] KwWho = { "TEN TAI KHOAN DOI UNG", "TAI KHOAN DOI UNG", "REMITTER", "BENEFICIARY", "TEN DOI TAC", "NGUOI THU HUONG", "NGUOI CHUYEN", "DOI TAC", "TEN DON VI" };
        static readonly string[] KwFt = { "SO BUT TOAN", "REFERENCE", "SO THAM CHIEU", "MA GIAO DICH", "SO GIAO DICH", "SO CHUNG TU", "TRANS NO", "SO LENH" };
        static readonly string[] KwBal = { "SO DU", "BALANCE" };
        static readonly string[] KwFee = { "PHI/LAI", "PHI DICH VU", "FEE", "PHI" };
        static readonly string[] KwVat = { "THUE GTGT", "TRANSACTION VAT", "VAT", "THUE", "TAX" };
        static readonly string[] KwOut = { "SO TIEN GHI NO", "PHAT SINH NO", "GHI NO", "NO/DEBIT", "DEBIT", "TIEN RA", "WITHDRAWAL", "SO TIEN RUT", "NO" };
        static readonly string[] KwIn = { "SO TIEN GHI CO", "PHAT SINH CO", "GHI CO", "CO/CREDIT", "CREDIT", "TIEN VAO", "DEPOSIT", "SO TIEN NOP", "CO" };

        static bool HdrHit(string cell, string kw)
        {
            if (cell.Length == 0) return false;
            if (kw.Length > 3) return cell.IndexOf(kw, StringComparison.Ordinal) >= 0;
            return Regex.IsMatch(cell, "(^|[^A-Z0-9])" + Regex.Escape(kw) + "([^A-Z0-9]|$)");
        }

        static int FindCol(string[] hdr, string[] kws, HashSet<int> used)
        {
            for (int ki = 0; ki < kws.Length; ki++)
                for (int i = 0; i < hdr.Length; i++)
                {
                    if (used.Contains(i)) continue;
                    if (HdrHit(hdr[i], kws[ki])) { used.Add(i); return i; }
                }
            return -1;
        }

        static int FindCol(object[] row, string[] kws, HashSet<int> used)
        {
            var hdr = new string[row.Length];
            for (int i = 0; i < row.Length; i++) hdr[i] = U.Norm(row[i]);
            return FindCol(hdr, kws, used);
        }

        static ColMap MapCols(object[] row)
        {
            var hdr = new string[row.Length];
            for (int i = 0; i < row.Length; i++) hdr[i] = U.Norm(row[i]);
            var used = new HashSet<int>();
            var m = new ColMap();
            // thu tu quan trong: cot co tu khoa dai/ro rang tim truoc, "No"/"Co" ngan tim sau cung
            m.Time = FindCol(hdr, KwTime, used);
            m.Date = FindCol(hdr, KwDate, used);
            m.Nd = FindCol(hdr, KwNd, used);
            m.Who = FindCol(hdr, KwWho, used);
            m.Ft = FindCol(hdr, KwFt, used);
            m.Bal = FindCol(hdr, KwBal, used);
            m.Fee = FindCol(hdr, KwFee, used);
            m.Vat = FindCol(hdr, KwVat, used);
            m.Out = FindCol(hdr, KwOut, used);
            m.In = FindCol(hdr, KwIn, used);
            int sc = 0;
            if (m.Date >= 0) sc++;
            if (m.Nd >= 0) sc++;
            if (m.Out >= 0) sc++;
            if (m.In >= 0) sc++;
            if (m.Bal >= 0) sc++;
            if (m.Ft >= 0) sc++;
            if (m.Who >= 0) sc++;
            m.Score = sc;
            return m;
        }

        static int ColByName(object[] row, string want)
        {
            if (want == null || want.Length == 0) return -1;
            int idx;
            if (int.TryParse(want.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out idx)) return idx - 1; // 1-based
            string w = U.Norm(want);
            for (int i = 0; i < row.Length; i++) if (U.Norm(row[i]).IndexOf(w, StringComparison.Ordinal) >= 0) return i;
            return -1;
        }

        static double CellNum(object[] r, int i)
        {
            if (i < 0 || r == null || i >= r.Length) return 0;
            return U.Num(r[i]);
        }

        static string CellStr(object[] r, int i)
        {
            if (i < 0 || r == null || i >= r.Length) return "";
            return U.Clean(r[i]);
        }

        static double? NumAfterLabel(object[] r, int labelIdx)
        {
            for (int i = labelIdx + 1; i < r.Length; i++)
            {
                if (r[i] == null) continue;
                double v = U.Num(r[i]);
                if (v != 0) return v;
                string s = U.PyStr(r[i]).Trim();
                if (s == "0" || s == "0.0") return 0;
            }
            return null;
        }

        static Stmt ReadAuto(string path, string bankKey, J nh, Action<string> log)
        {
            var st = new Stmt(); st.Bank = bankKey; st.File = Path.GetFileName(path);
            XlsxRead.Book book = XlsxRead.Read(path);
            J ds = nh["doc_sao_ke"];
            string wantSheet = ds == null ? "" : ds.S("sheet", "");
            var sheets = new List<XlsxRead.Sheet>();
            if (wantSheet.Length > 0)
            {
                XlsxRead.Sheet s0 = book.ByName(wantSheet);
                if (s0 != null) sheets.Add(s0);
            }
            if (sheets.Count == 0) sheets.AddRange(book.Sheets);
            if (sheets.Count == 0) return st;

            XlsxRead.Sheet ws = null; ColMap map = null; int hdrRow = -1;
            foreach (XlsxRead.Sheet sh in sheets)
            {
                int lim = Math.Min(sh.Rows.Count, 80);
                ColMap best = null; int bestRow = -1;
                for (int i = 0; i < lim; i++)
                {
                    ColMap m = MapCols(sh.Rows[i]);
                    if (m.Date < 0 || m.Nd < 0 || (m.In < 0 && m.Out < 0)) continue;
                    if (m.Score < 4) continue;
                    if (best == null || m.Score > best.Score) { best = m; bestRow = i; }
                }
                if (best != null) { ws = sh; map = best; hdrRow = bestRow; break; }
            }
            if (ws == null)
            {
                log("  ! " + st.File + ": không nhận ra dòng tiêu đề sao kê – khai báo \"doc_sao_ke\" trong quy_tac.json");
                return st;
            }
            // cho phep chi dinh tay tung cot
            if (ds != null && ds["cot"] != null)
            {
                J c = ds["cot"]; object[] hr = ws.Rows[hdrRow];
                int t;
                t = ColByName(hr, c.S("ngay", "")); if (t >= 0) map.Date = t;
                t = ColByName(hr, c.S("thoi_gian", "")); if (t >= 0) map.Time = t;
                t = ColByName(hr, c.S("thu", "")); if (t >= 0) map.In = t;
                t = ColByName(hr, c.S("chi", "")); if (t >= 0) map.Out = t;
                t = ColByName(hr, c.S("noi_dung", "")); if (t >= 0) map.Nd = t;
                t = ColByName(hr, c.S("doi_tac", "")); if (t >= 0) map.Who = t;
                t = ColByName(hr, c.S("so_but_toan", "")); if (t >= 0) map.Ft = t;
                t = ColByName(hr, c.S("so_du", "")); if (t >= 0) map.Bal = t;
                t = ColByName(hr, c.S("phi", "")); if (t >= 0) map.Fee = t;
                t = ColByName(hr, c.S("thue", "")); if (t >= 0) map.Vat = t;
            }

            // --- so du dau / cuoi ky + ky sao ke (quet toan bo dong van ban)
            for (int i = 0; i < ws.Rows.Count; i++)
            {
                object[] r = ws.Rows[i];
                for (int j = 0; j < r.Length; j++)
                {
                    string c = U.Norm(r[j]);
                    if (c.Length == 0) continue;
                    bool isOpen = c.IndexOf("SO DU DAU", StringComparison.Ordinal) >= 0 || c.IndexOf("OPENING BALANCE", StringComparison.Ordinal) >= 0;
                    bool isClose = c.IndexOf("SO DU CUOI", StringComparison.Ordinal) >= 0 || c.IndexOf("CLOSING BALANCE", StringComparison.Ordinal) >= 0;
                    if (isOpen && !st.Open.HasValue) st.Open = NumAfterLabel(r, j);
                    if (isClose && !st.Close.HasValue) st.Close = NumAfterLabel(r, j);
                }
                if (!st.Period.HasValue && i < hdrRow)
                {
                    string joined = Join(r);
                    string jn = U.Norm(joined);
                    if (jn.IndexOf("TU NGAY", StringComparison.Ordinal) >= 0 || jn.IndexOf("FROM", StringComparison.Ordinal) >= 0)
                    {
                        Match m1 = Regex.Match(joined, @"(\d{4}-\d{2}-\d{2})|(\d{1,2}/\d{1,2}/\d{4})");
                        if (m1.Success) st.Period = U.ParseDate(m1.Value);
                    }
                }
            }

            // --- doc dong du lieu
            var raw = new List<Txn>();
            var fees = new List<double>(); var vats = new List<double>();
            for (int i = hdrRow + 1; i < ws.Rows.Count; i++)
            {
                object[] r = ws.Rows[i];
                object dv = (map.Date < ((object[])r).Length) ? r[map.Date] : null;
                if (dv == null) continue;
                DateTime dt;
                if (!U.TryParseDate(dv, out dt)) continue;
                double vin = Math.Abs(CellNum(r, map.In));
                double vout = Math.Abs(CellNum(r, map.Out));
                double fee = Math.Abs(CellNum(r, map.Fee));
                double vat = Math.Abs(CellNum(r, map.Vat));
                if (vin == 0 && vout == 0 && fee == 0 && vat == 0) continue;
                // mot so sao ke chi co 1 cot so tien, am = chi
                if (map.In < 0 && map.Out >= 0)
                {
                    double v = CellNum(r, map.Out);
                    if (v >= 0) { vin = v; vout = 0; } else { vout = -v; vin = 0; }
                }
                var t = new Txn();
                t.Bank = bankKey; t.Date = dt; t.In = vin; t.Out = vout;
                t.Bal = CellNum(r, map.Bal);
                t.Nd = CellStr(r, map.Nd);
                t.Who = CellStr(r, map.Who);
                t.Ft = CellStr(r, map.Ft);
                DateTime tg;
                t.Time = (map.Time >= 0 && map.Time < r.Length && U.TryParseDate(r[map.Time], out tg)) ? tg : dt;
                raw.Add(t); fees.Add(fee); vats.Add(vat);
            }
            // sao ke co the sap xep moi nhat truoc -> dao lai cho dung thu tu phat sinh
            bool desc = raw.Count > 1 && raw[0].Date > raw[raw.Count - 1].Date;
            if (desc) { raw.Reverse(); fees.Reverse(); vats.Reverse(); }

            J phiCfg = nh["phi"]; J thueCfg = nh["thue_phi"];
            for (int i = 0; i < raw.Count; i++)
            {
                Txn t = raw[i];
                t.Time = t.Date.AddSeconds(i);     // giu dung thu tu trong sao ke
                if (t.In != 0 || t.Out != 0) st.Rows.Add(t);
                if (fees[i] != 0)
                {
                    Txn f = CloneTxn(t); f.Kind = "PHI"; f.In = 0; f.Out = fees[i];
                    f.Nd = RenderPhi(phiCfg, "{nd}", t);
                    f.Time = t.Date.AddSeconds(i).AddMilliseconds(100);
                    st.Rows.Add(f);
                }
                if (vats[i] != 0)
                {
                    Txn f = CloneTxn(t); f.Kind = "THUE_PHI"; f.In = 0; f.Out = vats[i];
                    f.Nd = RenderPhi(thueCfg, "{nd}", t);
                    f.Time = t.Date.AddSeconds(i).AddMilliseconds(200);
                    st.Rows.Add(f);
                }
            }

            // --- khong tim thay so du dau/cuoi -> suy ra tu cot so du
            if (map.Bal >= 0 && raw.Count > 0)
            {
                if (!st.Close.HasValue) st.Close = raw[raw.Count - 1].Bal;
                if (!st.Open.HasValue)
                {
                    Txn f0 = raw[0];
                    st.Open = f0.Bal - f0.In + f0.Out + fees[0] + vats[0];
                }
            }
            if (!st.Period.HasValue && raw.Count > 0)
            {
                var cnt = new Dictionary<string, int>(); string bestK = ""; int bestN = 0; DateTime bestD = raw[0].Date;
                foreach (Txn t in raw)
                {
                    string k = t.Date.Year.ToString("0000") + t.Date.Month.ToString("00");
                    cnt[k] = (cnt.ContainsKey(k) ? cnt[k] : 0) + 1;
                    if (cnt[k] > bestN) { bestN = cnt[k]; bestK = k; bestD = t.Date; }
                }
                if (bestK.Length > 0) st.Period = new DateTime(bestD.Year, bestD.Month, 1);
            }
            return st;
        }

        static Txn CloneTxn(Txn t)
        {
            var n = new Txn();
            n.Bank = t.Bank; n.Date = t.Date; n.Time = t.Time; n.Out = t.Out; n.In = t.In;
            n.Who = t.Who; n.Nd = t.Nd; n.Ft = t.Ft; n.Bal = t.Bal; n.Kind = t.Kind;
            return n;
        }

        static string RenderPhi(J cfg, string def, Txn t)
        {
            string tpl = cfg == null ? def : cfg.S("tien_to_nd", def);
            return tpl.Replace("{nd}", t.Nd).Replace("{doi_tac}", t.Who).Replace("{ft}", t.Ft);
        }

        static object At(object[] r, int i) { return (r != null && i < r.Length) ? r[i] : null; }

        static string Join(object[] r)
        {
            var sb = new StringBuilder();
            for (int i = 0; i < r.Length; i++)
            {
                object c = r[i];
                if (c == null) continue;
                if (c is double && (double)c == 0) continue;
                if (c is string && ((string)c).Length == 0) continue;
                if (c is bool && !(bool)c) continue;
                if (sb.Length > 0) sb.Append(' ');
                sb.Append(U.ToStr(c));
            }
            return sb.ToString();
        }

        static bool IsDataRow(object[] r)
        {
            object c = At(r, 0);
            if (c == null) return false;
            string s = U.PyStr(c).Trim();
            if (s.Length == 0) return false;
            for (int i = 0; i < s.Length; i++) if (!char.IsDigit(s[i])) return false;
            return true;
        }

        // ---------------------------------------------------------------- doc hoa don
        public class Rec : Dictionary<string, object>
        {
            public object G(string k) { object v; return TryGetValue(k, out v) ? v : null; }
        }

        static List<Rec> ReadInvoiceList(string path)
        {
            var outp = new List<Rec>();
            XlsxRead.Sheet ws = XlsxRead.Read(path).Active;
            if (ws == null) return outp;
            string[] hdr = null;
            foreach (object[] r in ws.Rows)
            {
                if (hdr == null)
                {
                    object c0 = At(r, 0);
                    if (c0 is string && (string)c0 == "STT")
                    {
                        hdr = new string[r.Length];
                        for (int i = 0; i < r.Length; i++) hdr[i] = U.Clean(r[i]);
                    }
                    continue;
                }
                if (!IsDataRow(r)) continue;
                var d = new Rec();
                for (int i = 0; i < hdr.Length && i < r.Length; i++) d[hdr[i]] = r[i];
                outp.Add(d);
            }
            return outp;
        }

        static List<Rec> ReadInvoiceItems(string path)
        {
            var outp = new List<Rec>();
            XlsxRead.Sheet ws = XlsxRead.Read(path).Active;
            if (ws == null) return outp;
            string[] hdr = null;
            foreach (object[] r in ws.Rows)
            {
                if (hdr == null)
                {
                    object c0 = At(r, 0);
                    if (c0 != null && U.PyStr(c0).StartsWith("Mẫu số"))
                    {
                        hdr = new string[r.Length];
                        for (int i = 0; i < r.Length; i++) hdr[i] = U.Clean(r[i]);
                    }
                    continue;
                }
                if (At(r, 2) == null) continue;
                var d = new Rec();
                for (int i = 0; i < hdr.Length && i < r.Length; i++) d[hdr[i]] = r[i];
                outp.Add(d);
            }
            return outp;
        }

        /// <summary>Mot dong trong danh muc doi tuong cua AMIS.</summary>
        class CatEntry
        {
            public string Code = "", Name = "", Mst = "", Addr = "", Kind = "";
            public string NormName = "", Core = "", Flat = "";
            public List<string> Toks = new List<string>();
        }

        static Dictionary<string, string> ReadCatalog(string folder, Action<string> log, List<CatEntry> cats)
        {
            var cat = new Dictionary<string, string>();
            if (!Directory.Exists(folder)) return cat;
            var files = Directory.GetFiles(folder, "*.xlsx", SearchOption.TopDirectoryOnly).OrderBy(x => x, StringComparer.Ordinal).ToList();
            foreach (string f in files)
            {
                if (Path.GetFileName(f).Contains("~$")) continue;
                try
                {
                    XlsxRead.Sheet ws = XlsxRead.Read(f).Active;
                    if (ws == null) continue;
                    string fn = U.Norm(Path.GetFileNameWithoutExtension(f).Replace("_", " ").Replace("-", " "));
                    string kind = "";
                    if (fn.IndexOf("KHACH HANG", StringComparison.Ordinal) >= 0) kind = "KH";
                    else if (fn.IndexOf("NHA CUNG CAP", StringComparison.Ordinal) >= 0) kind = "NCC";
                    else if (fn.IndexOf("NHAN VIEN", StringComparison.Ordinal) >= 0) kind = "NV";
                    bool hdr = false;
                    int cMa = 1, cTen = 2, cDc = -1, cMst = -1;
                    foreach (object[] r in ws.Rows)
                    {
                        if (!hdr)
                        {
                            object c0 = At(r, 0);
                            if (c0 is string && (string)c0 == "STT")
                            {
                                hdr = true;
                                for (int i = 1; i < r.Length; i++)
                                {
                                    string h = U.Norm(r[i]);
                                    if (h.Length == 0) continue;
                                    if (cMst < 0 && (h.IndexOf("MA SO THUE", StringComparison.Ordinal) >= 0 || h == "MST")) cMst = i;
                                    else if (cDc < 0 && h.IndexOf("DIA CHI", StringComparison.Ordinal) >= 0) cDc = i;
                                }
                            }
                            continue;
                        }
                        if (At(r, 0) == null) continue;
                        string code = U.Clean(At(r, cMa));
                        if (code.Length == 0) continue;
                        string nm = U.Clean(At(r, cTen));
                        cat[code] = nm;
                        if (cats != null)
                        {
                            var e = new CatEntry();
                            e.Code = code; e.Name = nm; e.Kind = kind;
                            e.Mst = cMst >= 0 ? U.Clean(At(r, cMst)) : "";
                            e.Addr = cDc >= 0 ? U.Clean(At(r, cDc)) : "";
                            e.NormName = U.Norm(nm); e.Core = NameCore(nm); e.Flat = Flatten(nm);
                            e.Toks = Toks(nm);
                            cats.Add(e);
                        }
                    }
                }
                catch (Exception ex)
                {
                    log("  ! Không đọc được danh mục " + Path.GetFileName(f) + ": " + ex.Message);
                }
            }
            return cat;
        }

        /// <summary>Tim doi tuong trong danh muc theo MST roi theo ten (bo dau, bo "Cong ty/TNHH/Pte/Ltd...").
        /// prefer = "KH" cho hoa don ban ra, "NCC" cho mua vao, "" = khong uu tien.</summary>
        static bool ResolveObj(List<CatEntry> cats, string mst, string name, string prefer, out string code, out string oname)
        {
            return ResolveObj(cats, mst, name, prefer, false, out code, out oname);
        }

        /// <summary>strict = chi tim trong dung loai danh muc "prefer" (VD lương chỉ tìm trong nhân viên).</summary>
        static bool ResolveObj(List<CatEntry> cats, string mst, string name, string prefer, bool strict, out string code, out string oname)
        {
            code = ""; oname = "";
            if (cats == null || cats.Count == 0) return false;
            string m = U.Clean(mst);
            string nn = U.Norm(name);
            string core = NameCore(name);
            string flat = Flatten(name);
            List<string> toks = Toks(name);
            int npass = (strict && prefer != null && prefer.Length > 0) ? 1 : 2;
            for (int pass = 0; pass < npass; pass++)
            {
                string want = pass == 0 ? prefer : "";          // vong 1: dung loai danh muc; vong 2: moi loai
                if (pass == 0 && (prefer == null || prefer.Length == 0)) continue;
                CatEntry hit = null;
                // a) khop ma so thue
                if (m.Length >= 6)
                {
                    foreach (CatEntry e in cats)
                        if ((want.Length == 0 || e.Kind == want) && e.Mst.Length > 0 && string.Equals(e.Mst, m, StringComparison.OrdinalIgnoreCase)) { hit = e; break; }
                    // b) ma doi tuong chinh la MST (cach dat ma pho bien)
                    if (hit == null)
                        foreach (CatEntry e in cats)
                            if ((want.Length == 0 || e.Kind == want) && string.Equals(e.Code, m, StringComparison.OrdinalIgnoreCase)) { hit = e; break; }
                }
                // c) ten trung khit  (bo qua dong co MST khac han -> tranh gan nham cong ty)
                if (hit == null && nn.Length >= 4)
                    foreach (CatEntry e in cats)
                        if ((want.Length == 0 || e.Kind == want) && e.NormName == nn && !MstClash(e, m)) { hit = e; break; }
                // d) loi ten trung khit
                if (hit == null && core.Length >= 4)
                    foreach (CatEntry e in cats)
                        if ((want.Length == 0 || e.Kind == want) && e.Core.Length >= 4 && e.Core == core && !MstClash(e, m)) { hit = e; break; }
                // d2) bo het khoang trang / dau cham: "UnityTechnologies SF" == "Unity Technologies SF"
                if (hit == null && flat.Length >= 5)
                    foreach (CatEntry e in cats)
                        if ((want.Length == 0 || e.Kind == want) && e.Flat.Length >= 5 && e.Flat == flat && !MstClash(e, m)) { hit = e; break; }
                // d3) trung bo tu (ten nguoi viet hoa khong dau, thua/thieu chu lot)
                if (hit == null && toks.Count >= 2)
                {
                    int best = 0;
                    foreach (CatEntry e in cats)
                    {
                        if (want.Length > 0 && e.Kind != want) continue;
                        if (MstClash(e, m)) continue;
                        if (TokSubset(toks, e.Toks) && e.Toks.Count > best) { best = e.Toks.Count; hit = e; }
                    }
                }
                // e) loi ten chua nhau (lay loi dai nhat)
                if (hit == null && core.Length >= 6)
                {
                    int best = 0;
                    foreach (CatEntry e in cats)
                    {
                        if (want.Length > 0 && e.Kind != want) continue;
                        if (MstClash(e, m)) continue;
                        string kc = e.Core;
                        if (kc.Length < 6) continue;
                        if ((core.IndexOf(kc, StringComparison.Ordinal) >= 0 || kc.IndexOf(core, StringComparison.Ordinal) >= 0) && kc.Length > best)
                        { best = kc.Length; hit = e; }
                    }
                }
                if (hit != null) { code = hit.Code; oname = hit.Name; return true; }
            }
            return false;
        }

        /// <summary>Chi giu chu va so: "UnityTechnologies SF" == "Unity Technologies SF".</summary>
        static string Flatten(string s)
        {
            string x = U.Norm(s);
            var sb = new StringBuilder();
            for (int i = 0; i < x.Length; i++) if (char.IsLetterOrDigit(x[i])) sb.Append(x[i]);
            return sb.ToString();
        }

        /// <summary>Tach tu (bo dau, bo tu chi loai hinh cong ty) de so khop ten nguoi.</summary>
        static List<string> Toks(string s)
        {
            string x = U.Norm(s);
            for (int i = 0; i < FormWords.Length; i++) x = x.Replace(FormWords[i], " ");
            var outp = new List<string>();
            foreach (string t in x.Split(new char[] { ' ', '.', ',', '-', '_', '/', '(', ')', ':', ';', '"', '\'' }, StringSplitOptions.RemoveEmptyEntries))
                if (t.Length > 1 && !outp.Contains(t)) outp.Add(t);
            return outp;
        }

        /// <summary>Tat ca tu cua a deu nam trong b (hoac nguoc lai) va it nhat 2 tu -> cung mot nguoi.</summary>
        static bool TokSubset(List<string> a, List<string> b)
        {
            if (a.Count < 2 || b.Count < 2) return false;
            List<string> s = a.Count <= b.Count ? a : b;
            List<string> l = a.Count <= b.Count ? b : a;
            if (s.Count < 2) return false;
            foreach (string t in s) if (!l.Contains(t)) return false;
            return true;
        }

        /// <summary>Bang anh xa "chu tren sao ke" -> "ma doi tuong". Doc tu quy_tac.json va tu tep Excel co chu ANH XA / BUT DANH.</summary>
        static Dictionary<string, string> ReadAlias(J cfg, List<string> files, Action<string> log)
        {
            var map = new Dictionary<string, string>();
            J ax = cfg["anh_xa_doi_tuong"];
            if (ax != null)
                foreach (var kv in ax.Fields())
                {
                    string k = Flatten(kv.Key); string v = ax.S(kv.Key, "");
                    if (k.Length > 0 && v.Length > 0) map[k] = v;
                }
            foreach (string f in files)
            {
                try
                {
                    foreach (XlsxRead.Sheet ws in XlsxRead.Read(f).Sheets)
                    {
                        int hdr = -1, cTen = -1, cMa = -1;
                        for (int i = 0; i < ws.Rows.Count && i < 30; i++)
                        {
                            var used = new HashSet<int>();
                            int a = FindCol(ws.Rows[i], new string[] { "TEN TREN SAO KE", "CHU TREN SAO KE", "TEN DOI TAC", "TEN", "NOI DUNG" }, used);
                            int b = FindCol(ws.Rows[i], new string[] { "MA DOI TUONG", "MA" }, used);
                            if (a < 0 || b < 0) continue;
                            cTen = a; cMa = b; hdr = i; break;
                        }
                        if (hdr < 0) continue;
                        for (int i = hdr + 1; i < ws.Rows.Count; i++)
                        {
                            string t = Flatten(CellStr(ws.Rows[i], cTen));
                            string c = CellStr(ws.Rows[i], cMa);
                            if (t.Length > 0 && c.Length > 0) map[t] = c;
                        }
                    }
                }
                catch (Exception ex) { log("  ! Không đọc được bảng ánh xạ " + Path.GetFileName(f) + ": " + ex.Message); }
            }
            return map;
        }

        /// <summary>Duong dan tep anh xa do phan mem tu quan ly (giao dien ghi vao day).</summary>
        public static string AliasPath(string baseDir, J cfg)
        {
            string dl = cfg == null ? "5. DU LIEU" : cfg["thu_muc"].S("du_lieu", "5. DU LIEU");
            return Path.Combine(Path.Combine(baseDir, dl), "ANH XA DOI TUONG.xlsx");
        }

        public static string AliasPath(string baseDir)
        {
            return Path.Combine(Path.Combine(baseDir, "5. DU LIEU"), "ANH XA DOI TUONG.xlsx");
        }

        /// <summary>Ghi mot dong anh xa "chu tren sao ke -> ma doi tuong"; trung thi ghi de.</summary>
        public static string SaveAlias(string baseDir, string text, string code, string note)
        {
            string p = AliasPath(baseDir);
            var keys = new List<string>();
            var rows = new Dictionary<string, string[]>();
            if (File.Exists(p))
            {
                try
                {
                    XlsxRead.Sheet ws = XlsxRead.Read(p).Active;
                    bool hdr = false;
                    if (ws != null)
                        foreach (object[] r in ws.Rows)
                        {
                            if (!hdr) { if (U.Norm(At(r, 0)).IndexOf("TEN TREN SAO KE", StringComparison.Ordinal) >= 0) hdr = true; continue; }
                            string a = U.Clean(At(r, 0)), b = U.Clean(At(r, 1));
                            if (a.Length == 0 || b.Length == 0) continue;
                            string k = Flatten(a);
                            if (!rows.ContainsKey(k)) keys.Add(k);
                            rows[k] = new string[] { a, b, U.Clean(At(r, 2)) };
                        }
                }
                catch { }
            }
            string nk = Flatten(text);
            if (nk.Length == 0) return "Chưa có tên đối ứng để khai.";
            if (!rows.ContainsKey(nk)) keys.Add(nk);
            rows[nk] = new string[] { text, code, note };

            var ws2 = new WSheet("Anh xa doi tuong");
            ws2.Add(new object[] { "BẢNG ÁNH XẠ ĐỐI TƯỢNG – khai 1 lần, các tháng sau tự nhận" });
            ws2.StyleCell(1, 1, true, 12);
            ws2.Add(new object[] { "Tên trên sao kê", "Mã đối tượng", "Ghi chú" });
            ws2.StyleRow(2, true, 11, true, false, null);
            foreach (string k in keys) ws2.Add(new object[] { rows[k][0], rows[k][1], rows[k][2] });
            ws2.Widths = new double[] { 56, 20, 50 };
            ws2.FreezeRows = 2;
            var wb = new WBook(); wb.Sheets.Add(ws2);
            try { Directory.CreateDirectory(Path.GetDirectoryName(p)); wb.Save(p); }
            catch (Exception ex) { return "Không ghi được tệp ánh xạ: " + ex.Message; }
            return "";
        }

        static bool MstClash(CatEntry e, string mst)
        {
            return mst.Length >= 6 && e.Mst.Length >= 6 && !string.Equals(e.Mst, mst, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>Ma goi y cho doi tuong chua co: tiep theo day so dang NCC000xx / KH000xx.</summary>
        static string NextCode(List<CatEntry> cats, string kind, int offset)
        {
            string pre = kind == "KH" ? "KH" : (kind == "NV" ? "NV" : "NCC");
            int width = 0, max = 0;
            foreach (CatEntry e in cats)
            {
                if (!e.Code.StartsWith(pre, StringComparison.OrdinalIgnoreCase)) continue;
                string tail = e.Code.Substring(pre.Length);
                int v;
                if (tail.Length > 0 && int.TryParse(tail, NumberStyles.Integer, CultureInfo.InvariantCulture, out v))
                { if (v > max) max = v; if (tail.Length > width) width = tail.Length; }
            }
            if (width == 0) width = 5;
            return pre + (max + offset).ToString(new string('0', width));
        }

        // ---------------------------------------------------------------- phan loai
        class Classifier
        {
            J cfg;
            public List<J> Rules;
            J obj;
            public Dictionary<string, string> Vars = new Dictionary<string, string>();

            public Classifier(J c, int month, int year)
            {
                cfg = c;
                Rules = c.Items("quy_tac_sao_ke");
                obj = c["doi_tuong"];
                int pm = month > 1 ? month - 1 : 12;
                int py = month > 1 ? year : year - 1;
                int q = (month - 1) / 3;
                int qy = year;
                if (q == 0) { q = 4; qy = year - 1; }
                Vars["thang"] = month.ToString(CultureInfo.InvariantCulture) + "/" + year.ToString(CultureInfo.InvariantCulture);
                Vars["thang_truoc"] = pm.ToString(CultureInfo.InvariantCulture) + "/" + py.ToString(CultureInfo.InvariantCulture);
                Vars["ky"] = "quý " + q.ToString(CultureInfo.InvariantCulture) + "/" + qy.ToString(CultureInfo.InvariantCulture);
            }

            public bool Match(J rule, Txn t)
            {
                string nd = U.Norm(t.Nd);
                string who = U.Norm(t.Who);
                string kind = t.In > 0 ? "thu" : "chi";
                string chiKhi = rule.S("chi_khi", "");
                if (chiKhi.Length > 0 && chiKhi != kind) return false;
                // "loai": dong phi/thue tach ra tu cot rieng cua sao ke ("PHI" / "THUE_PHI").
                // Quy tac khong khai bao "loai" chi ap dung cho giao dich thuong.
                if (rule.S("loai", "") != (t.Kind == null ? "" : t.Kind)) return false;
                bool ok = false;
                List<string> keys = rule.Strings("nd");
                if (keys.Count > 0) foreach (string k in keys) if (nd.Contains(U.Norm(k))) { ok = true; break; }
                if (!ok)
                {
                    List<string> bens = rule.Strings("ben");
                    if (bens.Count > 0 && who.Length > 0) foreach (string k in bens) if (who.Contains(U.Norm(k))) { ok = true; break; }
                }
                if (!ok)
                {
                    string rx = rule.S("nd_regex", "");
                    if (rx.Length > 0 && Regex.IsMatch(nd, rx)) ok = true;
                }
                if (!ok && rule.B("mac_dinh", false)) ok = true;
                if (!ok) return false;
                List<string> them = rule.Strings("nd_them");
                if (them.Count > 0)
                {
                    bool any = false;
                    foreach (string k in them) if (nd.Contains(U.Norm(k))) { any = true; break; }
                    if (!any) return false;
                }
                return true;
            }

            public J Classify(Txn t)
            {
                foreach (J r in Rules) if (Match(r, t)) return r;
                return null;
            }

            public void ObjOf(string key, Txn t, out string code, out string name)
            {
                if (key == "LAI_NH")
                {
                    J nh = cfg["ngan_hang"][t.Bank];
                    code = nh.S("ma_doi_tuong_lai", ""); name = nh.S("ten_doi_tuong_lai", ""); return;
                }
                if (key == "VPBANK")
                {
                    J nh = cfg["ngan_hang"]["VP"];
                    code = nh.S("ma_doi_tuong_lai", ""); name = nh.S("ten_doi_tuong_lai", ""); return;
                }
                code = ""; name = "";
                J v = obj == null ? null : obj[key];
                if (v != null && v.Kind == J.K.Arr && v.Arr.Count >= 2) { code = v.Arr[0].AsStr(); name = v.Arr[1].AsStr(); }
            }

            public string Render(string tpl, Txn t, string name)
            {
                var v = new Dictionary<string, string>(Vars);
                v["nd"] = t.Nd ?? "";
                v["ten"] = name ?? "";
                return U.Render(tpl, v);
            }
        }

        // ---------------------------------------------------------------- helper ghi excel
        static void Head8(WSheet ws, string title, string[] hdr, int groupCol, string groupTxt, string noteLine)
        {
            ws.Add(new object[] { title });
            ws.StyleCell(1, 1, true, 12);
            ws.Add(new object[] { "Hướng dẫn:" });
            ws.Add(new object[] { "- Điền dữ liệu vào các cột tương ứng trên file này" });
            ws.Add(new object[] { "- Các cột có dấu (*) là những cột bắt buộc" });
            ws.Add(new object[] { "- Nếu muốn nhập nhiều thông tin hơn người dùng có thể tải mẫu đầy đủ/hoặc tự thêm cột trên mẫu cơ bản" });
            ws.Add(new object[] { noteLine });
            var r = new object[hdr.Length];
            for (int i = 0; i < hdr.Length; i++) r[i] = "";
            r[groupCol] = groupTxt;
            ws.Add(r);
            ws.Add(hdr.Cast<object>());
            ws.StyleRow(8, true, 11, true, true, "center");
            ws.FreezeRows = 8;
        }

        /// <summary>Thue suat de ghi ra bang ke: so thap phan (0.1) hoac chu (KCT/KKKNT).</summary>
        static object PctCell(string rk)
        {
            double d;
            if (double.TryParse(rk, NumberStyles.Any, CultureInfo.InvariantCulture, out d))
                return d > 1 ? d / 100.0 : d;     // mau bao cao ghi 0.1 / 0.08
            return rk;
        }

        /// <summary>Cong bang ke theo thue suat -> {thue suat, so hoa don, tien, thue}.</summary>
        static List<object[]> RateSum(List<object[]> rows, int cPct, int cAmt, int cVat)
        {
            var keys = new List<string>();
            var n = new Dictionary<string, int>();
            var a = new Dictionary<string, double>();
            var v = new Dictionary<string, double>();
            foreach (object[] r in rows)
            {
                string k = U.ToStr(r[cPct]);
                if (!n.ContainsKey(k)) { keys.Add(k); n[k] = 0; a[k] = 0; v[k] = 0; }
                n[k]++; a[k] += U.Num(r[cAmt]); v[k] += U.Num(r[cVat]);
            }
            keys.Sort(StringComparer.Ordinal);
            var outp = new List<object[]>();
            foreach (string k in keys) outp.Add(new object[] { k, (double)n[k], a[k], v[k] });
            return outp;
        }

        static void Head3(WSheet ws, string title, string[] hdr, int[] groupCols, string[] groupTxts)
        {
            ws.Add(new object[] { title });
            ws.StyleCell(1, 1, true, 12);
            var r = new object[hdr.Length];
            for (int i = 0; i < hdr.Length; i++) r[i] = "";
            for (int i = 0; i < groupCols.Length; i++) r[groupCols[i]] = groupTxts[i];
            ws.Add(r);
            ws.Add(hdr.Cast<object>());
            ws.StyleRow(3, true, 11, true, true, "center");
            ws.FreezeRows = 3;
        }

        // ---------------------------------------------------------------- chay
        public static RunResult Run(string baseDir, string rulesPath, int month, int year, Action<string> onLog)
        {
            var res = new RunResult();
            var LOG = res.Log;
            Action<string> log = delegate (string m)
            {
                LOG.Add(m ?? "");
                if (onLog != null) onLog(m ?? "");
            };
            try
            {
                J cfg = J.Parse(File.ReadAllText(rulesPath, Encoding.UTF8));
                J NH = cfg["ngan_hang"];
                J CT = cfg["cong_ty"];
                res.CongTy = CT == null ? "" : CT.S("ten", "");
                string soTk = CT == null ? "" : CT.S("so_tai_khoan", "");
                string DL = Path.Combine(baseDir, cfg["thu_muc"].S("du_lieu", "5. DU LIEU"));
                log("Trợ lý kế toán – lập file AMIS   (" + DateTime.Now.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture) + ")");
                log("Thư mục gốc: " + baseDir);
                if (!Directory.Exists(DL)) { log("!! Không thấy thư mục dữ liệu: " + DL); res.Code = 2; return res; }

                // ---- tim sao ke
                var allXlsx = Directory.GetFiles(DL, "*.xlsx", SearchOption.AllDirectories)
                    .Where(f => !Path.GetFileName(f).Contains("~$"))
                    .OrderBy(f => f, StringComparer.Ordinal).ToList();
                // moi ngan hang trong quy_tac.json co the khai bao "tien_to_tep" (dau ten tep sao ke)
                // va "dinh_dang" ("MB" hoac "VP") -> dung duoc cho cong ty khac.
                var bankKeys = new List<string>();
                var bankPrefix = new Dictionary<string, string>();
                var bankFormat = new Dictionary<string, string>();
                foreach (var kv in NH.Fields())
                {
                    string k = kv.Key;
                    bankKeys.Add(k);
                    bankPrefix[k] = kv.Value.S("tien_to_tep", k).ToUpperInvariant();
                    bankFormat[k] = kv.Value.S("dinh_dang", "AUTO").ToUpperInvariant();
                }
                var stmts = new List<Stmt>();
                foreach (string k in bankKeys)
                {
                    foreach (string f in allXlsx)
                    {
                        string nm = Path.GetFileName(f).ToUpperInvariant();
                        if (!nm.StartsWith(bankPrefix[k])) continue;
                        // neu co ngan hang khac co tien to dai hon cung khop thi nhuong
                        string best = k;
                        foreach (string k2 in bankKeys)
                            if (nm.StartsWith(bankPrefix[k2]) && bankPrefix[k2].Length > bankPrefix[best].Length) best = k2;
                        if (best != k) continue;
                        try
                        {
                            string fm = bankFormat[k];
                            if (fm == "VP") stmts.Add(ReadVp(f, k));
                            else if (fm == "MB") stmts.Add(ReadMb(f, k));
                            else stmts.Add(ReadAuto(f, k, NH[k], log));
                        }
                        catch (Exception ex) { log("  ! Bỏ qua " + f + ": " + ex.Message); }
                    }
                }
                stmts = stmts.Where(s => s.Period.HasValue).ToList();
                if (month > 0 && year > 0) { }
                else if (stmts.Count > 0)
                {
                    DateTime p = stmts.Max(s => s.Period.Value);
                    month = p.Month; year = p.Year;
                }
                else
                {
                    log("!! Không tìm thấy sao kê (" + string.Join(", ", bankKeys.Select(k => bankPrefix[k] + "*.xlsx").ToArray()) + ") trong " + DL + " (hoặc chọn tháng/năm rồi chạy lại)");
                    res.Code = 2; return res;
                }
                stmts = stmts.Where(s => s.Period.Value.Month == month && s.Period.Value.Year == year).ToList();
                res.Month = month; res.Year = year;
                log("Tháng xử lý: " + month.ToString("00") + "/" + year);
                if (stmts.Count == 0) log("  ! Không có sao kê cho tháng này – chỉ xử lý hóa đơn");
                foreach (Stmt s in stmts)
                    log("  Sao kê " + s.Bank + ": " + s.File + " – " + s.Rows.Count + " giao dịch, đầu kỳ "
                        + (s.Open.HasValue ? U.Money(s.Open.Value) : "?") + ", cuối kỳ " + (s.Close.HasValue ? U.Money(s.Close.Value) : "?"));
                // giong dict comprehension cua Python: thu tu theo lan xuat hien dau, gia tri la ban ghi cuoi
                var bankOrder = new List<string>();
                var bankLast = new Dictionary<string, Stmt>();
                foreach (Stmt s in stmts)
                {
                    if (!bankLast.ContainsKey(s.Bank)) bankOrder.Add(s.Bank);
                    bankLast[s.Bank] = s;
                }
                var stmtByBank = bankOrder.Select(b => bankLast[b]).ToList();

                // ---- hoa don
                var muaList = allXlsx.Where(f => Path.GetFileName(f).ToUpperInvariant().Contains("HDCTMUAVAO")).ToList();
                var banList = allXlsx.Where(f => Path.GetFileName(f).ToUpperInvariant().Contains("HDCTBANRA")).ToList();
                var muaItemFiles = allXlsx.Where(f => Path.GetFileName(f).ToUpperInvariant().Contains("CHI_TIET_HD_MUA_VAO")).ToList();
                var banItemFiles = allXlsx.Where(f => Path.GetFileName(f).ToUpperInvariant().Contains("CHI_TIET_HD_BAN_RA")).ToList();

                int mm = month, yy = year;
                Func<object, bool> inMonth = delegate (object d)
                {
                    DateTime x;
                    if (!U.TryParseDate(d, out x)) return false;
                    return x.Month == mm && x.Year == yy;
                };

                string supKw = U.Norm(cfg["thu_muc"].S("tu_khoa_bo_sung", "BO SUNG"));
                var supFiles = allXlsx.Where(f => U.Norm(Path.GetFileNameWithoutExtension(f).Replace("_", " ")).IndexOf(supKw, StringComparison.Ordinal) >= 0).ToList();
                List<SupRow> supp = ReadSupp(supFiles, log);
                if (supFiles.Count > 0) log("  Hồ sơ bổ sung: " + supFiles.Count + " tệp, " + supp.Count + " dòng tách");

                var mua = new List<Rec>();
                foreach (string f in muaList) foreach (Rec i in ReadInvoiceList(f)) if (inMonth(i.G("Ngày lập"))) mua.Add(i);
                var ban = new List<Rec>();
                foreach (string f in banList) foreach (Rec i in ReadInvoiceList(f)) if (inMonth(i.G("Ngày lập"))) ban.Add(i);
                var muaIt = new List<Rec>();
                foreach (string f in muaItemFiles) foreach (Rec i in ReadInvoiceItems(f)) if (inMonth(i.G("Ngày lập hóa đơn"))) muaIt.Add(i);
                var banIt = new List<Rec>();
                foreach (string f in banItemFiles) foreach (Rec i in ReadInvoiceItems(f)) if (inMonth(i.G("Ngày lập hóa đơn"))) banIt.Add(i);
                log("  Hóa đơn mua vào: " + mua.Count + " (chi tiết " + muaIt.Count + " dòng) | bán ra: " + ban.Count + " (chi tiết " + banIt.Count + " dòng)");
                res.NMuaHd = mua.Count; res.NBanHd = ban.Count;

                var aliasFiles = allXlsx.Where(f => { string n = U.Norm(Path.GetFileNameWithoutExtension(f).Replace("_", " ")); return n.IndexOf("ANH XA", StringComparison.Ordinal) >= 0 || n.IndexOf("BUT DANH", StringComparison.Ordinal) >= 0; }).ToList();
                Dictionary<string, string> alias = ReadAlias(cfg, aliasFiles, log);
                if (alias.Count > 0) log("  Bảng ánh xạ đối tượng: " + alias.Count + " dòng");

                var cats = new List<CatEntry>();
                Dictionary<string, string> cat = ReadCatalog(Path.Combine(baseDir, cfg["thu_muc"].S("danh_muc", "2. DANH MUC PHAN MEM")), log, cats);
                log("  Danh mục đối tượng: " + cat.Count + " mã");
                var missObj = new List<object[]>();          // doi tuong chua co -> file 7
                var missSeen = new Dictionary<string, bool>();
                var missCode = new Dictionary<string, string>();
                // Them doi tuong vao file 7 va tra ve ma se dung tren chung tu.
                // fixedCode != "" -> ma da do quy tac quyet dinh, giu nguyen; "" -> tu goi y.
                Func<string, string, string, string, string, string> addMiss =
                    delegate(string mkind, string mmst, string mname, string maddr, string fixedCode)
                {
                    if (U.Norm(mname).Length == 0 && fixedCode.Length == 0) return "";
                    string key = fixedCode.Length > 0 ? "C|" + fixedCode : mkind + "|" + U.Norm(mname);
                    if (missCode.ContainsKey(key)) return missCode[key];
                    string label = mkind == "KH" ? "Khách hàng" : "Nhà cung cấp";
                    string sug = fixedCode;
                    if (sug.Length == 0)
                    {
                        sug = U.Clean(mmst);
                        if (sug.Length < 6 || cat.ContainsKey(sug))
                        {
                            int n = 0;
                            foreach (object[] x in missObj) if (U.ToStr(x[0]) == label) n++;
                            sug = NextCode(cats, mkind, n + 1);
                        }
                    }
                    missCode[key] = sug;
                    bool both = fixedCode.Length > 0;         // ma dung chung cho ca thu lan chi
                    missObj.Add(new object[] { both ? "Khách hàng / Nhà cung cấp" : label, sug, mname, maddr, U.Clean(mmst),
                        both || mkind == "KH" ? "x" : "", both || mkind != "KH" ? "x" : "" });
                    return sug;
                };
                bool autoObj = cfg.B("tu_dong_tim_doi_tuong", false);

                string OUT = Path.Combine(baseDir, cfg["thu_muc"].S("ket_qua", "4. UP PHAN MEM"),
                    cfg["thu_muc"].S("ten_thu_muc_ket_qua", "THANG {MM}.{YYYY}").Replace("{MM}", month.ToString("00")).Replace("{YYYY}", year.ToString(CultureInfo.InvariantCulture)));
                Directory.CreateDirectory(OUT);
                res.OutDir = OUT;
                string T = "T" + month.ToString("00");
                string mprefix = month.ToString(CultureInfo.InvariantCulture);
                var cl = new Classifier(cfg, month, year);

                // ---- phan loai sao ke
                var allt = new List<Txn>();
                foreach (Stmt s in stmts) allt.AddRange(s.Rows);
                allt = allt.OrderBy(t => t.Date).ThenBy(t => t.Bank, StringComparer.Ordinal).ThenBy(t => t.Time).ToList();

                var thu = new List<VRow>();
                var chi = new List<VRow>();
                var ctnb = new List<CtnbRow>();
                var notes = new List<NoteRow>();
                var counters = new Dictionary<string, int>();
                J lyDo = cfg["ly_do"];
                string lyDoThu = lyDo.S("thu", "Thu khác"), lyDoChi = lyDo.S("chi", "Chi khác");
                J theNH = cfg["the_ngan_hang"];
                string mstPhi = theNH.S("mst_phi", "");

                // hoa don phi the
                var feeInv = new List<FeeInv>();
                foreach (Rec it in muaIt)
                {
                    if (U.Clean(it.G("MST người bán")) == mstPhi && U.Norm(it.G("Tên hàng hóa, dịch vụ")).Contains("THE"))
                    {
                        var fi = new FeeInv();
                        fi.So = U.PyStr(it.G("Số hóa đơn"));
                        fi.Date = U.ParseDate(it.G("Ngày lập hóa đơn"));
                        fi.Text = U.Norm(it.G("Tên hàng hóa, dịch vụ"));
                        double tot = U.Num(it.G("Tiền sau thuế (VND)"));
                        if (tot == 0) tot = U.Num(it.G("Tổng tiền thanh toán (VND)"));
                        fi.Total = tot;
                        feeInv.Add(fi);
                    }
                }

                foreach (Txn t in allt)
                {
                    J rule = cl.Classify(t);
                    bool isFee = false;
                    if (t.Kind.Length > 0 && rule == null && NH[t.Bank] != null)
                    {
                        J fn = NH[t.Bank][t.Kind == "PHI" ? "phi" : "thue_phi"];
                        if (fn != null) { rule = fn; isFee = true; }
                    }
                    string d = U.D2S(t.Date);
                    double amt = t.In != 0 ? t.In : t.Out;
                    string bank = t.Bank;
                    if (rule != null && rule.B("noi_bo", false) && t.Kind.Length == 0)
                    {
                        var cb = new CtnbRow();
                        cb.Date = d; cb.Bank = bank; cb.Amt = amt; cb.In = t.In; cb.Out = t.Out; cb.Nd = t.Nd; cb.Ft = t.Ft;
                        ctnb.Add(cb);
                        continue;
                    }
                    string code, name, tk, dg, note;
                    if (rule != null)
                    {
                        string key = rule.S("doi_tuong", "NONE");
                        cl.ObjOf(key, t, out code, out name);
                        string tkKey = t.In != 0 ? "tk_thu" : "tk_chi";
                        tk = rule.S(tkKey, rule.S("tk", ""));
                        dg = isFee ? t.Nd : cl.Render(rule.S("dien_giai", "{nd}"), t, name);
                        note = rule.S("ghi_chu", "");
                    }
                    else
                    {
                        code = ""; name = ""; tk = ""; dg = t.Nd;
                        note = "CHƯA PHÂN LOẠI – chị bổ sung quy tắc trong quy_tac.json hoặc sửa tay";
                    }
                    if (code.Length == 0 && (rule == null || !rule.B("khong_tu_tim", false)))
                    {
                        // 1) bang anh xa chi khai (chac chan nhat)
                        string ak = AliasHit(alias, t.Who, t.Nd);
                        if (ak.Length > 0)
                        {
                            code = ak; name = cat.ContainsKey(ak) ? cat[ak] : t.Who;
                            note = (note.Length > 0 ? note + "; " : "") + "Gán theo bảng ánh xạ";
                        }
                        // 2) do theo ten trong danh muc
                        else if (autoObj)
                        {
                            // tim_trong = uu tien loai danh muc; chi_trong = true thi CHI tim trong loai do
                            string tt = rule == null ? "" : rule.S("tim_trong", "");
                            bool onlyTt = rule != null && rule.B("chi_trong", false);
                            string fcode, fname;
                            if (ResolveObj(cats, "", t.Who, tt, onlyTt, out fcode, out fname)
                                || FindInText(cats, t.Nd, onlyTt ? tt : "", out fcode, out fname))
                            {
                                code = fcode; name = fname;
                                note = (note.Length > 0 ? note + "; " : "") + "Tự gán mã theo tên – chị soát lại";
                            }
                        }
                    }
                    if (code.Length == 0)
                    {
                        code = cfg.S("ma_doi_tuong_trong", "KR");
                        name = cfg.S("ten_doi_tuong_trong", "Không rõ");
                        if (rule != null && rule.S("doi_tuong", "NONE") != "NONE")
                            note = (note.Length > 0 ? note + "; " : "") + "Mã đối tượng trống";
                    }
                    if (code.Length > 0 && cat.Count > 0 && !cat.ContainsKey(code))
                    {
                        note = (note.Length > 0 ? note + "; " : "") + "Mã đối tượng <" + code + "> CHƯA CÓ trong danh mục AMIS – nhập tệp 7 trước khi import";
                        addMiss(t.In != 0 ? "KH" : "NCC", "", name.Length > 0 ? name : t.Who, "", code);
                    }

                    var baseRow = new VRow();
                    baseRow.Date = d; baseRow.Bank = bank; baseRow.Code = code; baseRow.Name = name; baseRow.Tk = tk;
                    baseRow.Dg = dg; baseRow.Amt = amt; baseRow.Ft = t.Ft; baseRow.Nd = t.Nd; baseRow.Note = note;
                    baseRow.Who = t.Who;

                    string so;
                    if (t.In != 0)
                    {
                        string ck = bank + "|thu";
                        counters[ck] = (counters.ContainsKey(ck) ? counters[ck] : 0) + 1;
                        so = mprefix + NH[bank].S("so_thu", "TG") + counters[ck].ToString("00");
                        VRow v = baseRow.Copy(); v.So = so; v.LyDo = lyDoThu;
                        var tl = SplitBySupp(supp, t, amt, v, cats, cat, alias);
                        CheckLineObjs(tl, cat, addMiss, "KH");
                        thu.AddRange(tl);
                        note = tl[0].Note;
                    }
                    else
                    {
                        string ck = bank + "|chi";
                        counters[ck] = (counters.ContainsKey(ck) ? counters[ck] : 0) + 1;
                        so = mprefix + NH[bank].S("so_chi", "UN") + counters[ck].ToString("00");
                        var lines = new List<VRow>();
                        VRow v0 = baseRow.Copy(); v0.So = so; v0.LyDo = lyDoChi;
                        lines.Add(v0);
                        if (rule != null && rule.B("the", false))
                        {
                            FeeInv f = MatchFee(feeInv, t);
                            if (f != null)
                            {
                                lines[0].Amt = amt - f.Total;
                                string vcode, vname;
                                FeeObject(cfg, theNH, mstPhi, out vcode, out vname);
                                VRow v1 = baseRow.Copy();
                                v1.So = so; v1.LyDo = lyDoChi; v1.Code = vcode; v1.Name = vname; v1.Tk = "331"; v1.Amt = f.Total;
                                v1.Dg = theNH.S("dien_giai_phi", "Phí dịch vụ thẻ theo hóa đơn số {so_hd}").Replace("{so_hd}", f.So);
                                v1.Note = theNH.S("ghi_chu", "");
                                lines.Add(v1);
                            }
                            else
                            {
                                lines[0].Note = (lines[0].Note.Length > 0 ? lines[0].Note + "; " : "")
                                    + "Thanh toán thẻ: KHÔNG tìm thấy hóa đơn phí VPBank cùng ngày – kiểm tra bảng kê mua vào";
                            }
                        }
                        if (lines.Count == 1)
                        {
                            lines = SplitBySupp(supp, t, amt, lines[0], cats, cat, alias);
                            CheckLineObjs(lines, cat, addMiss, "NCC");
                        }
                        chi.AddRange(lines);
                        note = lines[0].Note;
                    }
                    if (note.Length > 0)
                    {
                        var n = new NoteRow(); n.So = so; n.Date = d; n.Bank = bank; n.Amt = amt; n.Note = note;
                        notes.Add(n);
                    }
                }

                // ---- file 1: thu
                string tenNH = string.Join(" và ", bankKeys.Select(k => NH[k].S("ten_ngan", k)).ToArray());
                string noteLine = cfg.S("ghi_chu_nguon", "- Dữ liệu tháng {MM}/{YYYY} – lập tự động từ sao kê {NH} (tài khoản {STK})")
                    .Replace("{MM}", month.ToString("00")).Replace("{YYYY}", year.ToString(CultureInfo.InvariantCulture))
                    .Replace("{NH}", tenNH).Replace("{STK}", soTk);
                WSheet ws1 = new WSheet("Phieu thu tien gui");
                string[] h1 = { "Ngày hạch toán (*)", "Ngày chứng từ (*)", "Số chứng từ (*)", "Mã đối tượng ", "Tên đối tượng", "Nộp vào TK",
                    "Mở tại ngân hàng", "Lý do thu", "Diễn giải lý do thu", "Loại tiền", "Tỷ giá", "Diễn giải (hạch toán)",
                    "TK Nợ (*)", "TK Có (*)", "Số tiền", "Quy đổi", "Mã đối tượng (hạch toán)", "Mã bút toán NH (tham chiếu)", "Ghi chú" };
                Head8(ws1, "FILE MẪU PHIẾU THU TIỀN GỬI ĐỂ NHẬP VÀO PHẦN MỀM AMIS ACCOUNTING", h1, 11, "Chi tiết hạch toán", noteLine);
                foreach (VRow x in thu)
                {
                    J nh = NH[x.Bank];
                    ws1.Add(new object[] { x.Date, x.Date, x.So, x.Code, x.Name, nh.S("so_tai_khoan", soTk), nh.S("ten_amis", ""), x.LyDo,
                        x.Dg, "VND", "", x.Dg, nh.S("tk",""), x.Tk, x.Amt, "", x.Code, x.Ft, x.Note });
                }
                ws1.Widths = new double[] { 12, 12, 10, 14, 34, 11, 30, 12, 50, 8, 6, 50, 8, 8, 15, 8, 14, 20, 60 };
                ws1.MoneyFmt(9, new int[] { 15 });
                string f1 = Path.Combine(OUT, "1. Phieu_thu_tien_gui_" + T + ".xlsx");
                var wb1 = new WBook(); wb1.Sheets.Add(ws1); wb1.Save(f1);

                // ---- file 2: chi
                WSheet ws2 = new WSheet("Phieu chi tien gui");
                string[] h2 = { "Phương thức thanh toán", "Ngày hạch toán (*)", "Ngày chứng từ (*)", "Số chứng từ (*)", "Lý do chi",
                    "Là UNC chuyển tiền theo lô", "Nội dung thanh toán", "Số tài khoản chi", "Tên ngân hàng chi ", "Mã đối tượng ",
                    "Tên đối tượng", "Số tài khoản nhận", "Tên ngân hàng nhận", "Loại tiền", "Tỷ giá", "Diễn giải (hạch toán)",
                    "TK Nợ (*)", "TK Có (*)", "Số tiền", "Số tiền quy đổi", "Mã đối tượng (hạch toán)", "Mã bút toán NH (tham chiếu)", "Ghi chú" };
                Head8(ws2, "FILE MẪU PHIẾU CHI TIỀN GỬI ĐỂ NHẬP VÀO PHẦN MỀM AMIS ACCOUNTING", h2, 15, "Chi tiết hạch toán", noteLine);
                foreach (VRow x in chi)
                {
                    J nh = NH[x.Bank];
                    ws2.Add(new object[] { "Ủy nhiệm chi", x.Date, x.Date, x.So, x.LyDo, "", x.Nd, nh.S("so_tai_khoan", soTk), nh.S("ten_amis",""),
                        x.Code, x.Name, "", "", "VND", "", x.Dg, x.Tk, nh.S("tk",""), x.Amt, "", x.Code, x.Ft, x.Note });
                }
                ws2.Widths = new double[] { 14, 12, 12, 10, 12, 8, 50, 11, 30, 14, 34, 10, 10, 8, 6, 50, 8, 8, 15, 8, 14, 20, 60 };
                ws2.MoneyFmt(9, new int[] { 19 });
                string f2 = Path.Combine(OUT, "2. Phieu_chi_tien_gui_" + T + ".xlsx");
                var wb2 = new WBook(); wb2.Sheets.Add(ws2); wb2.Save(f2);

                // ---- file 3: CTNB
                WSheet ws3 = new WSheet("Chuyen tien noi bo");
                ws3.Add(new object[] { cfg.S("tieu_de_ctnb", "CHUYỂN TIỀN NỘI BỘ GIỮA {NH} THÁNG {MM}/{YYYY} – nhập tay trong AMIS: Tiền gửi > Chi tiền ▾ > Chuyển tiền nội bộ (Nợ TK nhận / Có TK chuyển)")
                    .Replace("{MM}", month.ToString("00")).Replace("{YYYY}", year.ToString(CultureInfo.InvariantCulture))
                    .Replace("{NH}", string.Join(" VÀ ", bankKeys.Select(k => NH[k].S("ten_ngan", k).ToUpperInvariant()).ToArray())) });
                ws3.StyleCell(1, 1, true, 11);
                ws3.Add(new object[] { "Ngày", "Số tiền", "Chiều", "Nội dung bên chuyển", "Nội dung bên nhận", "Bút toán bên chuyển", "Bút toán bên nhận", "Diễn giải đề xuất", "TK Nợ", "TK Có" });
                ws3.StyleRow(2, true, 11, true, false, null);
                var pairKeys = new List<string>();
                var pairs = new Dictionary<string, CtnbRow[]>();
                foreach (CtnbRow x in ctnb)
                {
                    string k = x.Date + "|" + x.Amt.ToString("R", CultureInfo.InvariantCulture);
                    if (!pairs.ContainsKey(k)) { pairs[k] = new CtnbRow[2]; pairKeys.Add(k); }
                    pairs[k][x.Out != 0 ? 0 : 1] = x;
                }
                var ordered = pairKeys.OrderBy(k => U.ParseDate(k.Split('|')[0])).ToList();
                foreach (string k in ordered)
                {
                    CtnbRow o = pairs[k][0], i2 = pairs[k][1];
                    string dd = k.Split('|')[0];
                    double amt2 = pairs[k][0] != null ? pairs[k][0].Amt : pairs[k][1].Amt;
                    if (o != null && i2 != null)
                    {
                        ws3.Add(new object[] { dd, amt2, o.Bank + " → " + i2.Bank, o.Nd, i2.Nd, o.Ft, i2.Ft,
                            "Chuyển tiền nội bộ từ " + o.Bank + " sang " + i2.Bank, NH[i2.Bank].S("tk",""), NH[o.Bank].S("tk","") });
                    }
                    else
                    {
                        CtnbRow x = o ?? i2;
                        ws3.Add(new object[] { dd, amt2, "CHƯA KHỚP CẶP", o != null ? x.Nd : "", o == null ? x.Nd : "", o != null ? x.Ft : "", o == null ? x.Ft : "",
                            "KIỂM TRA: chỉ thấy 1 phía (" + x.Bank + ") của giao dịch nội bộ", "", "" });
                        var n = new NoteRow(); n.So = "CTNB"; n.Date = dd; n.Bank = x.Bank; n.Amt = amt2;
                        n.Note = "Chuyển nội bộ chỉ thấy 1 phía – kiểm tra sao kê ngân hàng còn lại";
                        notes.Add(n);
                    }
                }
                ws3.Widths = new double[] { 12, 14, 10, 45, 45, 20, 20, 35, 8, 8 };
                ws3.MoneyFmt(3, new int[] { 2 });
                string f3 = Path.Combine(OUT, "3. Chuyen_tien_noi_bo_" + T + ".xlsx");
                var wb3 = new WBook(); wb3.Sheets.Add(ws3); wb3.Save(f3);

                // ---- file 4 + 5
                J HM = cfg["hoa_don_mua"];
                var itemsByInv = new Dictionary<string, List<Rec>>();
                foreach (Rec it in muaIt)
                {
                    string k = U.Clean(it.G("MST người bán")) + "|" + U.PyStr(it.G("Số hóa đơn"));
                    if (!itemsByInv.ContainsKey(k)) itemsByInv[k] = new List<Rec>();
                    itemsByInv[k].Add(it);
                }
                var dvRows = new List<object[]>();
                var ccdcRows = new List<object[]>();
                var muaNotes = new List<string[]>();
                var muaCt = new Dictionary<string, string>();   // MST|so HD -> so chung tu (cho bang ke VAT)
                var banCt = new Dictionary<string, string>();
                int nDv = 0;
                var ccdcKeys = HM.Strings("ccdc_tu_khoa");
                var mstLaiVay = HM.Strings("mst_lai_vay");
                J mstBoQua = HM["mst_bo_qua"];
                J theoMst = HM["theo_mst"];
                string tkThue = HM.S("tk_thue", "1331");
                string maDv = HM.S("ma_dich_vu", "DV001");
                string tkMacDinh = HM.S("tk_mac_dinh", "64227");
                string tkLaiVay = HM.S("tk_lai_vay", "6351");
                string tkCcdc = HM.S("tk_ccdc", "242");
                int soKyPb = (int)HM.D("ccdc_so_ky_pb", 12);
                string tkCpCcdc = HM.S("ccdc_tk_chi_phi", "64223");
                bool gopDong = HM.B("gop_dong", true);

                var muaSorted = mua.OrderBy(i => U.ParseDate(i.G("Ngày lập"))).ThenBy(i => U.PyStr(i.G("Số hóa đơn")), StringComparer.Ordinal).ToList();
                foreach (Rec inv in muaSorted)
                {
                    string mst = U.Clean(inv.G("MST người bán/MST người xuất hàng"));
                    string ten = U.Clean(inv.G("Tên người bán/Tên người xuất hàng"));
                    string dc = U.Clean(inv.G("Địa chỉ người bán"));
                    string shd = U.PyStr(inv.G("Số hóa đơn"));
                    string kh = U.Clean(inv.G("Ký hiệu hóa đơn"));
                    string nhd = U.D2S(U.ParseDate(inv.G("Ngày lập")));
                    if (mstBoQua != null && mstBoQua.Has(mst))
                    {
                        muaNotes.Add(new string[] { "HĐ " + shd + " – " + ten, "KHÔNG hạch toán: " + mstBoQua.S(mst, "") });
                        continue;
                    }
                    string ik = mst + "|" + shd;
                    var items = new List<Rec>();
                    if (itemsByInv.ContainsKey(ik))
                        foreach (Rec i in itemsByInv[ik])
                            if (U.Num(i.G("Tiền chưa thuế (VND)")) != 0 || U.Num(i.G("Tiền sau thuế (VND)")) != 0) items.Add(i);
                    if (items.Count == 0)
                    {
                        var syn = new Rec();
                        syn["Tên hàng hóa, dịch vụ"] = "Hàng hóa/dịch vụ theo HĐ " + shd;
                        syn["Thuế suất"] = null;
                        syn["Tiền chưa thuế (VND)"] = U.Num(inv.G("Tổng tiền chưa thuế"));
                        syn["Tiền thuế (VND)"] = U.Num(inv.G("Tổng tiền thuế"));
                        syn["Đơn vị tính"] = "Lần";
                        items.Add(syn);
                    }
                    nDv++;
                    string so = mprefix + "DV" + nDv.ToString("00");
                    muaCt[ik] = so;
                    J rule = theoMst == null ? null : theoMst[mst];
                    string note = rule == null ? "" : rule.S("ghi_chu", "");
                    string tkDefault;
                    if (mstLaiVay.Contains(mst)) { tkDefault = tkLaiVay; note = "Lãi vay phải trả – 6351/331"; }
                    else tkDefault = rule == null ? tkMacDinh : rule.S("tk", tkMacDinh);
                    string objCode = mst, objName = ten;
                    if (cats.Count > 0)
                    {
                        string rc, rn;
                        if (ResolveObj(cats, mst, ten, "NCC", out rc, out rn))
                        {
                            objCode = rc;
                            if (rn.Length > 0) objName = rn;
                        }
                        else
                        {
                            string sug = addMiss("NCC", mst, ten, dc, "");
                            if (sug.Length > 0) objCode = sug;
                            note = (note.Length > 0 ? note + "; " : "") + "NCC <" + ten + "> CHƯA CÓ trong danh mục AMIS – nhập tệp 7 (mã gợi ý " + objCode + ") trước khi import";
                        }
                    }
                    string tt_status = U.Norm(inv.G("Trạng thái hóa đơn"));
                    if (tt_status != "HOA DON MOI" && tt_status != "")
                        note = (note.Length > 0 ? note + "; " : "") + "Trạng thái HĐ: " + U.PyStr(inv.G("Trạng thái hóa đơn")) + " – kiểm tra HĐ gốc";

                    // gop dong cung thue suat
                    if (gopDong && items.Count > 1)
                    {
                        var gKeys = new List<string>();
                        var gMap = new Dictionary<string, Rec>();
                        int ccSeq = 0;
                        foreach (Rec it in items)
                        {
                            object pctKey = U.VatPct(it.G("Thuế suất"));
                            bool isCc = false;
                            string nname = U.Norm(it.G("Tên hàng hóa, dịch vụ"));
                            foreach (string k in ccdcKeys) if (nname.Contains(U.Norm(k))) { isCc = true; break; }
                            if (isCc)
                            {
                                string ck = "CC:" + (ccSeq++);
                                var cp = new Rec(); foreach (var kv in it) cp[kv.Key] = kv.Value;
                                gMap[ck] = cp; gKeys.Add(ck);
                                continue;
                            }
                            string key = "V:" + U.ToStr(pctKey);
                            Rec g;
                            if (!gMap.TryGetValue(key, out g))
                            {
                                g = new Rec();
                                foreach (var kv in it) g[kv.Key] = kv.Value;
                                g["Tiền chưa thuế (VND)"] = 0.0;
                                g["Tiền thuế (VND)"] = 0.0;
                                g["_n"] = 0.0;
                                g["_first"] = U.Clean(it.G("Tên hàng hóa, dịch vụ"));
                                gMap[key] = g; gKeys.Add(key);
                            }
                            g["Tiền chưa thuế (VND)"] = U.Num(g.G("Tiền chưa thuế (VND)")) + U.Num(it.G("Tiền chưa thuế (VND)"));
                            g["Tiền thuế (VND)"] = U.Num(g.G("Tiền thuế (VND)")) + U.Num(it.G("Tiền thuế (VND)"));
                            g["_n"] = U.Num(g.G("_n")) + 1;
                        }
                        items = new List<Rec>();
                        foreach (string k in gKeys)
                        {
                            Rec g = gMap[k];
                            if (U.Num(g.G("_n")) > 1)
                            {
                                g["Tên hàng hóa, dịch vụ"] = U.ToStr(g.G("_first")) + " và " + ((int)U.Num(g.G("_n")) - 1) + " mặt hàng khác theo HĐ " + shd;
                                g["Đơn vị tính"] = "Lần";
                                g["Số lượng"] = 1.0;
                            }
                            items.Add(g);
                        }
                    }

                    string firstDg = null;
                    foreach (Rec it in items)
                    {
                        string tendv = U.Clean(it.G("Tên hàng hóa, dịch vụ"));
                        double tt = U.Num(it.G("Tiền chưa thuế (VND)"));
                        double tvat = U.Num(it.G("Tiền thuế (VND)"));
                        object tsRaw = it.G("Thuế suất");
                        object pct = (tvat != 0 || tsRaw != null) ? U.VatPct(tsRaw) : (object)"KCT";
                        string tk = tkDefault;
                        bool isCcdc = false;
                        string normName = U.Norm(tendv);
                        foreach (string k in ccdcKeys) if (normName.Contains(U.Norm(k))) { isCcdc = true; break; }
                        if (isCcdc && mstLaiVay.Contains(mst)) isCcdc = false;
                        if (isCcdc)
                        {
                            tk = tkCcdc;
                            string code = "CCDC-" + T + "-" + shd;
                            double sl = U.Num(it.G("Số lượng")); if (sl == 0) sl = 1;
                            string dvt = U.Clean(it.G("Đơn vị tính")); if (dvt.Length == 0) dvt = "Cái";
                            ccdcRows.Add(new object[] { code, U.Cut(tendv,120), mprefix + "GT" + (ccdcRows.Count + 1).ToString("00"), nhd, "Mua mới", dvt,
                                sl, tt, tt, (double)soKyPb, Math.Round(tt / soKyPb, MidpointRounding.ToEven), tkCcdc, "", "", "", 1.0, "", 100.0,
                                tkCpCcdc, "", "", "Nguồn: HĐ " + shd + " " + ten + " ngày " + nhd + " (chứng từ mua DV " + so + ", Nợ " + tkCcdc
                                + "). CHỊ CHỐT: mã đơn vị sử dụng (bắt buộc), số kỳ PB (tạm " + soKyPb + "), TK chi phí (tạm " + tkCpCcdc + ")" });
                            note = (note.Length > 0 ? note + "; " : "") + "CCDC: hạch toán 242 + ghi tăng CCDC (file 5)";
                        }
                        string what;
                        if (tk == tkLaiVay) what = "Lãi vay";
                        else if (mst == mstPhi) what = normName.Contains("THE") ? "Phí dịch vụ thẻ VPBank" : (normName.Contains("KBNN") ? "Phí nộp thuế điện tử" : "Phí ngân hàng VPBank");
                        else what = U.Cut(tendv, 70);
                        string dg = what + " theo hóa đơn số " + shd;
                        if (firstDg == null) firstDg = dg;
                        double sl2 = U.Num(it.G("Số lượng")); if (sl2 == 0) sl2 = 1;
                        string dvt2 = U.Clean(it.G("Đơn vị tính")); if (dvt2.Length == 0) dvt2 = "Lần";
                        // Don gia phai nhan dung so luong ra thanh tien thi AMIS moi nhan
                        double dgia = tt;
                        if (sl2 != 1 && sl2 != 0)
                        {
                            double dFile = U.Num(it.G("Đơn giá"));
                            dgia = (dFile != 0 && Math.Abs(dFile * sl2 - tt) <= 1) ? dFile : Math.Round(tt / sl2, MidpointRounding.ToEven);
                        }
                        dvRows.Add(new object[] { "Chưa thanh toán", "Nhận kèm hóa đơn", "Không", nhd, nhd, so, "", "", objCode, objName, dc, firstDg, "VND", "", maDv, tendv, "không",
                            tk, "331", objCode, dvt2, sl2, dgia, tt, "", "", "", "", pct, "", tvat, "", tkThue,
                            nhd, shd, "1", kh, 1.0, objCode, objName, mst, dc, note });
                    }
                    muaNotes.Add(new string[] { so + " – HĐ " + shd + " " + ten, firstDg + " | " + (note.Length > 0 ? note : "OK") });
                }

                WSheet ws4 = new WSheet("Mua dich vu");
                string[] h4 = { "Phương thức thanh toán", "Nhận kèm hóa đơn", "Là CP mua hàng", "Ngày hạch toán (*)", "Ngày chứng từ (*)", "Số chứng từ (*)", "Số tài khoản chi", "Tên ngân hàng chi", "Nhà cung cấp", "Tên nhà cung cấp", "Địa chỉ", "Diễn giải/Lý do chi/Nội dung thanh toán", "Loại tiền", "Tỷ giá", "Mã dịch vụ (*)", "Tên dịch vụ", "Là dòng ghi chú", "TK kho/TK chi phí (*)", "TK công nợ/TK tiền (*)", "Mã đối tượng", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền", "Thành tiền quy đổi", "Tỷ lệ CK (%)", "Tiền chiết khấu", "Tiền chiết khấu quy đổi", "% thuế GTGT", "% thuế suất KHAC", "Tiền thuế GTGT", "Tiền thuế GTGT quy đổi", "TK thuế GTGT", "Ngày hóa đơn", "Số hóa đơn", "Mẫu số HĐ", "Ký hiệu HĐ", "Nhóm HHDV mua vào", "Mã NCC", "Tên NCC", "Mã số thuế NCC", "Địa chỉ NCC", "Ghi chú" };
                Head3(ws4, "FILE MẪU CHỨNG TỪ MUA DỊCH VỤ ĐỂ NHẬP VÀO PHẦN MỀM AMIS ACCOUNTING – THÁNG " + month.ToString("00") + "/" + year, h4, new int[] { 14, 28 }, new string[] { "Chi tiết hàng tiền", "Chi tiết Thuế" });
                foreach (object[] r in dvRows) ws4.Add(r);
                ws4.Widths = new double[] { 16, 14, 8, 12, 12, 10, 8, 8, 13, 40, 30, 40, 6, 6, 10, 55, 8, 10, 10, 13, 6, 6, 13, 13, 8, 6, 6, 6, 8, 6, 12, 6, 8, 12, 10, 8, 10, 8, 13, 40, 13, 30, 60 };
                ws4.MoneyFmt(4, new int[] { 23, 24, 31 });
                string f4 = Path.Combine(OUT, "4. Mua_dich_vu_" + T + ".xlsx");
                var wb4 = new WBook(); wb4.Sheets.Add(ws4); wb4.Save(f4);

                WSheet ws5 = new WSheet("Ghi tăng CCDC");
                string[] h5 = { "Mã CCDC (*)", "Tên CCDC (*)", "Số CT ghi tăng (*)", "Ngày ghi tăng (*)", "Lý do ghi tăng", "Đơn vị tính", "Số lượng", "Đơn giá", "Thành tiền", "Tổng Số kỳ PB (tháng) (*)", "Số tiền phân bổ hàng kỳ", "TK chờ phân bổ", "Mã loại công cụ dụng cụ", "Nhóm công cụ dụng cụ", "Mã đơn vị (*)", "Số lượng đơn vị sử dụng", "Đối tượng phân bổ", "Tỷ lệ phân bổ (%)", "TK chi phí", "Mã khoản mục chi phí", "Mã thống kê", "Ghi chú" };
                Head3(ws5, "FILE MẪU DANH SÁCH CÔNG CỤ DỤNG CỤ GHI TĂNG ĐỂ NHẬP VÀO PHẦN MỀM AMIS ACCOUNTING – THÁNG " + month.ToString("00") + "/" + year, h5, new int[] { 14, 16 }, new string[] { "1. Đơn vị sử dụng", "2. Thiết lập phân bổ" });
                foreach (object[] r in ccdcRows) ws5.Add(r);
                if (ccdcRows.Count == 0) ws5.Add(new object[] { "(Tháng này không có CCDC)" });
                ws5.Widths = new double[] { 16, 50, 12, 12, 10, 8, 6, 12, 12, 10, 12, 8, 10, 10, 10, 8, 10, 8, 8, 8, 8, 80 };
                ws5.MoneyFmt(4, new int[] { 8, 9, 11 });
                string f5 = Path.Combine(OUT, "5. Ghi_tang_CCDC_" + T + ".xlsx");
                var wb5 = new WBook(); wb5.Sheets.Add(ws5); wb5.Save(f5);

                // ---- file 6: NVK
                J HB = cfg["hoa_don_ban"];
                var nvkRows = new List<object[]>();
                var banNotes = new List<string[]>();
                var itemsBan = new Dictionary<string, List<Rec>>();
                foreach (Rec it in banIt)
                {
                    string k = U.PyStr(it.G("Số hóa đơn"));
                    if (!itemsBan.ContainsKey(k)) itemsBan[k] = new List<Rec>();
                    itemsBan[k].Add(it);
                }
                int nb = 0;
                var banSorted = ban.OrderBy(i => U.ParseDate(i.G("Ngày lập"))).ThenBy(i => U.PyStr(i.G("Số hóa đơn")), StringComparer.Ordinal).ToList();
                foreach (Rec inv in banSorted)
                {
                    nb++;
                    string so = mprefix + "NV" + nb.ToString("00");
                    string shd = U.PyStr(inv.G("Số hóa đơn"));
                    banCt[shd] = so;
                    string mst = U.Clean(inv.G("MST người mua/MST người nhận hàng"));
                    string ten = U.Clean(inv.G("Tên người mua/Tên người nhận hàng"));
                    string d = U.D2S(U.ParseDate(inv.G("Ngày lập")));
                    List<Rec> items;
                    if (!itemsBan.TryGetValue(shd, out items) || items.Count == 0)
                    {
                        items = new List<Rec>();
                        var syn = new Rec();
                        syn["Tên hàng hóa, dịch vụ"] = "Theo HĐ " + shd;
                        syn["Tiền chưa thuế (VND)"] = U.Num(inv.G("Tổng tiền chưa thuế"));
                        items.Add(syn);
                    }
                    string note = "";
                    string objCode = mst, objName = ten;
                    if (cats.Count > 0)
                    {
                        string rc, rn;
                        if (ResolveObj(cats, mst, ten, "KH", out rc, out rn))
                        {
                            objCode = rc;
                            if (rn.Length > 0) objName = rn;
                        }
                        else
                        {
                            string sug = addMiss("KH", mst, ten, U.Clean(inv.G("Địa chỉ người mua")), "");
                            if (sug.Length > 0) objCode = sug;
                            note = "Khách hàng <" + ten + "> CHƯA CÓ trong danh mục AMIS – nhập tệp 7 (mã gợi ý " + objCode + ") trước khi import";
                        }
                    }
                    string tt2 = U.Norm(inv.G("Trạng thái hóa đơn"));
                    if (tt2.Length > 0 && tt2 != "HOA DON MOI")
                        note = (note.Length > 0 ? note + "; " : "") + "HĐ " + shd + " là '" + U.PyStr(inv.G("Trạng thái hóa đơn"))
                            + "' – KIỂM TRA HĐ bị thay thế/điều chỉnh đã hạch toán kỳ trước chưa; nếu rồi phải lập bút toán đảo (Nợ 5153/Có 1388) trước";
                    double sum = 0;
                    foreach (Rec it in items)
                    {
                        string dg = U.Clean(it.G("Tên hàng hóa, dịch vụ"));
                        double amt = U.Num(it.G("Tiền chưa thuế (VND)"));
                        sum += amt;
                        nvkRows.Add(new object[] { d, d, so, dg, "VND", dg, HB.S("tk_no", "1388"), HB.S("tk_co", "5153"), objCode, "", amt, "HĐ " + shd + " – " + ten + ". " + note });
                    }
                    banNotes.Add(new string[] { so + " – HĐ " + shd + " " + ten, PyFloat(sum) + " | " + (note.Length > 0 ? note : "OK") });
                }
                WSheet ws6 = new WSheet("Chung tu NVK");
                ws6.Add(new object[] { "Ngày hạch toán", "Ngày chứng từ", "Số chứng từ", "Diễn giải", "Loại tiền", "Diễn giải (Hạch toán)", "TK Nợ", "TK Có", "Mã đối tượng Nợ", "Mã đối tượng Có", "Số tiền", "Ghi chú" });
                ws6.StyleRow(1, true, 11, true, false, null);
                foreach (object[] r in nvkRows) ws6.Add(r);
                ws6.Widths = new double[] { 12, 12, 10, 60, 6, 60, 8, 8, 14, 14, 14, 70 };
                ws6.MoneyFmt(2, new int[] { 11 });
                string f6 = Path.Combine(OUT, "6. Chung_tu_NVK_lai_vay_" + T + ".xlsx");
                var wb6 = new WBook(); wb6.Sheets.Add(ws6); wb6.Save(f6);

                // ---- doi chieu + file 0
                foreach (Stmt s in stmtByBank)
                {
                    string b = s.Bank;
                    double tThu = thu.Where(x => x.Bank == b).Sum(x => x.Amt);
                    double tChi = chi.Where(x => x.Bank == b).Sum(x => x.Amt);
                    double cIn = ctnb.Where(x => x.Bank == b).Sum(x => x.In);
                    double cOut = ctnb.Where(x => x.Bank == b).Sum(x => x.Out);
                    double calc = (s.Open ?? 0) + tThu + cIn - tChi - cOut;
                    bool ok = s.Close.HasValue && Math.Abs(calc - s.Close.Value) < 1;
                    var br = new BankRec();
                    br.Bank = b; br.Tk = NH[b].S("tk", ""); br.SoTk = soTk;
                    br.Open = s.Open ?? 0; br.Thu = tThu; br.CIn = cIn; br.Chi = tChi; br.COut = cOut;
                    br.Calc = calc; br.Close = s.Close; br.Ok = ok;
                    res.Rec.Add(br);
                    log("  Đối chiếu " + b + ": đầu " + U.Money(br.Open) + " + thu " + U.Money(tThu) + " + nhận NB " + U.Money(cIn)
                        + " – chi " + U.Money(tChi) + " – chuyển NB " + U.Money(cOut) + " = " + U.Money(calc)
                        + " | sao kê " + (s.Close.HasValue ? U.Money(s.Close.Value) : "?") + " → " + (ok ? "KHỚP" : "LỆCH"));
                }

                var wb0 = new WBook();
                WSheet s0 = wb0.Add("Sao ke");
                s0.Add(new object[] { "GHI CHÚ NHẬP LIỆU THÁNG " + month.ToString("00") + "/" + year + " – TIỀN GỬI NGÂN HÀNG" });
                s0.StyleCell(1, 1, true, 12);
                s0.Add(new object[] { "Lập tự động ngày " + DateTime.Now.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture) + " bởi Trợ lý kế toán từ: " + string.Join(", ", stmts.Select(s => s.File).ToArray()) });
                s0.Add();
                s0.Add(new object[] { "1. ĐỐI CHIẾU VỚI SAO KÊ" });
                s0.StyleCell(4, 1, true, 11);
                s0.Add(new object[] { "Ngân hàng", "Số dư đầu kỳ", "Thu (file 1)", "Nhận CTNB", "Chi (file 2)", "Chuyển CTNB", "Số dư cuối tính ra", "Số dư cuối sao kê", "Kết quả" });
                s0.StyleRow(5, true, 11, true, false, null);
                foreach (BankRec r in res.Rec)
                    s0.Add(new object[] { r.Label, r.Open, r.Thu, r.CIn, r.Chi, r.COut, r.Calc, r.Close.HasValue ? (object)r.Close.Value : null, r.KetQua });
                s0.Add();
                s0.Add(new object[] { "2. SỐ LƯỢNG CHỨNG TỪ" });
                s0.StyleCell(s0.Count, 1, true, 11);
                int chiVouchers = chi.Select(x => x.So).Distinct().Count();
                s0.Add(new object[] { "Phiếu thu: " + thu.Count, "Phiếu chi: " + chi.Count + " dòng / " + chiVouchers + " chứng từ",
                    "CTNB: " + pairKeys.Count, "Mua DV: " + nDv + " chứng từ", "CCDC: " + ccdcRows.Count, "NVK lãi cho vay: " + ban.Count });
                s0.Add();
                s0.Add(new object[] { "3. CÁC GIAO DỊCH CẦN CHỊ XEM / XÁC NHẬN" });
                s0.StyleCell(s0.Count, 1, true, 11);
                s0.Add(new object[] { "Số CT", "Ngày", "NH", "Số tiền", "Ghi chú" });
                s0.StyleRow(s0.Count, true, 11, true, false, null);
                foreach (NoteRow n in notes) s0.Add(new object[] { n.So, n.Date, n.Bank, n.Amt, n.Note });
                if (notes.Count == 0) s0.Add(new object[] { "(không có)" });
                s0.Widths = new double[] { 28, 16, 16, 14, 16, 14, 18, 18, 60 };
                s0.MoneyFmt(6, new int[] { 2, 3, 4, 5, 6, 7, 8 });
                s0.WrapFrom(12, "top");

                WSheet sm = wb0.Add("Mua vao");
                sm.Add(new object[] { "GHI CHÚ NHẬP LIỆU THÁNG " + month.ToString("00") + "/" + year + " – HÓA ĐƠN MUA VÀO (" + mua.Count + " HĐ)" });
                sm.StyleCell(1, 1, true, 12);
                sm.Add(new object[] { "Chứng từ / HĐ", "Hạch toán & ghi chú" });
                sm.StyleRow(2, true, 11, true, false, null);
                foreach (string[] r in muaNotes) sm.Add(new object[] { r[0], r[1] });
                sm.Widths = new double[] { 50, 120 };

                WSheet sb2 = wb0.Add("Ban ra");
                sb2.Add(new object[] { "GHI CHÚ NHẬP LIỆU THÁNG " + month.ToString("00") + "/" + year + " – HÓA ĐƠN BÁN RA (" + ban.Count + " HĐ) → Chứng từ nghiệp vụ khác Nợ " + HB.S("tk_no", "1388") + " / Có " + HB.S("tk_co", "5153") });
                sb2.StyleCell(1, 1, true, 12);
                sb2.Add(new object[] { "Chứng từ / HĐ", "Số tiền | ghi chú" });
                sb2.StyleRow(2, true, 11, true, false, null);
                foreach (string[] r in banNotes) sb2.Add(new object[] { r[0], r[1] });
                sb2.Widths = new double[] { 50, 120 };

                // ---- file 8: bang ke VAT dau vao / dau ra + so lieu to khai
                int quy = (month - 1) / 3 + 1;
                var vinRows = new List<object[]>();
                var voutRows = new List<object[]>();
                // mot dong cho moi (hoa don x thue suat) - to khai tach theo thue suat
                Func<List<Rec>, string, List<string>> rateKeys = delegate(List<Rec> its, string dummy)
                {
                    var ks = new List<string>();
                    foreach (Rec it in its) { string k = U.ToStr(U.VatPct(it.G("Thuế suất"))); if (!ks.Contains(k)) ks.Add(k); }
                    return ks;
                };
                int stt = 0;
                foreach (Rec inv in muaSorted)
                {
                    string mstv = U.Clean(inv.G("MST người bán/MST người xuất hàng"));
                    string shdv = U.PyStr(inv.G("Số hóa đơn"));
                    string khv = U.Clean(inv.G("Ký hiệu hóa đơn"));
                    DateTime nd0 = U.ParseDate(inv.G("Ngày lập"));
                    var its = new List<Rec>();
                    string ikv = mstv + "|" + shdv;
                    if (itemsByInv.ContainsKey(ikv)) its.AddRange(itemsByInv[ikv]);
                    string ctv = muaCt.ContainsKey(ikv) ? muaCt[ikv] : "";
                    string bq = (mstBoQua != null && mstBoQua.Has(mstv)) ? ("KHÔNG hạch toán: " + mstBoQua.S(mstv, "")) : "";
                    if (its.Count == 0)
                    {
                        stt++;
                        vinRows.Add(new object[] { year, quy, year, quy, (double)stt, "", khv, shdv, U.D2S(nd0),
                            U.Clean(inv.G("Tên người bán/Tên người xuất hàng")), mstv, "Hàng hóa/dịch vụ theo HĐ " + shdv,
                            U.Num(inv.G("Tổng tiền chưa thuế")), "KCT", U.Num(inv.G("Tổng tiền thuế")), U.Num(inv.G("Tổng tiền thanh toán")),
                            U.PyStr(inv.G("Trạng thái hóa đơn")), U.PyStr(inv.G("Kết quả kiểm tra hóa đơn")), "", "", "", ctv, bq });
                        continue;
                    }
                    foreach (string rk in rateKeys(its, ""))
                    {
                        double tien = 0, vat2 = 0; string ten1 = ""; int cnt = 0;
                        foreach (Rec it in its)
                        {
                            if (U.ToStr(U.VatPct(it.G("Thuế suất"))) != rk) continue;
                            tien += U.Num(it.G("Tiền chưa thuế (VND)")); vat2 += U.Num(it.G("Tiền thuế (VND)"));
                            if (ten1.Length == 0) ten1 = U.Clean(it.G("Tên hàng hóa, dịch vụ"));
                            cnt++;
                        }
                        stt++;
                        string hh = cnt > 1 ? ten1 + " và " + (cnt - 1) + " mặt hàng khác" : ten1;
                        vinRows.Add(new object[] { year, quy, year, quy, (double)stt, "", khv, shdv, U.D2S(nd0),
                            U.Clean(inv.G("Tên người bán/Tên người xuất hàng")), mstv, hh,
                            tien, PctCell(rk), vat2, tien + vat2,
                            U.PyStr(inv.G("Trạng thái hóa đơn")), U.PyStr(inv.G("Kết quả kiểm tra hóa đơn")), "", "", "", ctv, bq });
                    }
                }
                stt = 0;
                foreach (Rec inv in banSorted)
                {
                    string shdv = U.PyStr(inv.G("Số hóa đơn"));
                    DateTime nd0 = U.ParseDate(inv.G("Ngày lập"));
                    var its = new List<Rec>();
                    if (itemsBan.ContainsKey(shdv)) its.AddRange(itemsBan[shdv]);
                    string ctv = banCt.ContainsKey(shdv) ? banCt[shdv] : "";
                    if (its.Count == 0)
                    {
                        stt++;
                        voutRows.Add(new object[] { year, quy, year, quy, (double)stt, U.Clean(inv.G("Ký hiệu hóa đơn")), shdv, U.D2S(nd0),
                            U.Clean(inv.G("Tên người mua/Tên người nhận hàng")), U.Clean(inv.G("MST người mua/MST người nhận hàng")),
                            "Theo HĐ " + shdv, U.Num(inv.G("Tổng tiền chưa thuế")), "KCT", U.Num(inv.G("Tổng tiền thuế")),
                            U.Num(inv.G("Tổng tiền thanh toán")), U.PyStr(inv.G("Trạng thái hóa đơn")),
                            U.PyStr(inv.G("Kết quả kiểm tra hóa đơn")), "", "", "", ctv });
                        continue;
                    }
                    foreach (string rk in rateKeys(its, ""))
                    {
                        double tien = 0, vat2 = 0; string ten1 = ""; int cnt = 0;
                        foreach (Rec it in its)
                        {
                            if (U.ToStr(U.VatPct(it.G("Thuế suất"))) != rk) continue;
                            tien += U.Num(it.G("Tiền chưa thuế (VND)")); vat2 += U.Num(it.G("Tiền thuế (VND)"));
                            if (ten1.Length == 0) ten1 = U.Clean(it.G("Tên hàng hóa, dịch vụ"));
                            cnt++;
                        }
                        stt++;
                        string hh = cnt > 1 ? ten1 + " và " + (cnt - 1) + " mặt hàng khác" : ten1;
                        voutRows.Add(new object[] { year, quy, year, quy, (double)stt, U.Clean(inv.G("Ký hiệu hóa đơn")), shdv, U.D2S(nd0),
                            U.Clean(inv.G("Tên người mua/Tên người nhận hàng")), U.Clean(inv.G("MST người mua/MST người nhận hàng")),
                            hh, tien, PctCell(rk), vat2, tien + vat2, U.PyStr(inv.G("Trạng thái hóa đơn")),
                            U.PyStr(inv.G("Kết quả kiểm tra hóa đơn")), "", "", "", ctv });
                    }
                }

                var wb8 = new WBook();
                WSheet wsIn = wb8.Add("Dau vao");
                string[] h8a = { "Năm KK", "Quý KK", "Năm đúng", "Quý đúng", "STT", "Phân loại", "Ký hiệu hóa đơn", "Số HĐ", "Ngày HĐ",
                    "Tên người bán", "MST người bán", "Hàng hóa, dịch vụ", "Tổng giá trị HHDV mua vào", "Thuế suất", "Thuế GTGT mua vào",
                    "Tổng tiền", "Trạng thái hóa đơn", "Kết quả kiểm tra hóa đơn", "HĐ liên quan", "Ngày HĐ", "Thông tin", "Hạch toán",
                    "Tình trạng hóa đơn đỏ (hóa đơn gốc)" };
                wsIn.Add(new object[] { "BẢNG KÊ HÓA ĐƠN ĐẦU VÀO – THÁNG " + month.ToString("00") + "/" + year + " (Quý " + quy + ") – dán vào sheet 'Đầu vào' của báo cáo tháng" });
                wsIn.StyleCell(1, 1, true, 12);
                wsIn.Add(h8a.Cast<object>());
                wsIn.StyleRow(2, true, 11, true, true, "center");
                wsIn.FreezeRows = 2;
                foreach (object[] r in vinRows) wsIn.Add(r);
                wsIn.Widths = new double[] { 8, 7, 8, 8, 6, 9, 13, 10, 11, 42, 14, 50, 16, 8, 14, 16, 14, 20, 12, 11, 14, 10, 20 };
                wsIn.MoneyFmt(3, new int[] { 13, 15, 16 });

                WSheet wsOut = wb8.Add("Dau ra");
                string[] h8b = { "Năm", "Quý KK", "Năm đúng", "Quý đúng", "STT", "Ký hiệu hóa đơn", "Số HĐ", "Ngày HĐ", "Tên người mua",
                    "MST người mua", "Nội dung", "Doanh thu", "Thuế suất", "Thuế GTGT đầu ra", "Tổng tiền", "Trạng thái hóa đơn",
                    "Kết quả kiểm tra hóa đơn", "Kê khai", "HĐ liên quan", "Ngày hóa đơn liên quan", "Hạch toán" };
                wsOut.Add(new object[] { "BẢNG KÊ HÓA ĐƠN ĐẦU RA – THÁNG " + month.ToString("00") + "/" + year + " (Quý " + quy + ") – dán vào sheet 'Đầu ra' của báo cáo tháng" });
                wsOut.StyleCell(1, 1, true, 12);
                wsOut.Add(h8b.Cast<object>());
                wsOut.StyleRow(2, true, 11, true, true, "center");
                wsOut.FreezeRows = 2;
                foreach (object[] r in voutRows) wsOut.Add(r);
                wsOut.Widths = new double[] { 8, 7, 8, 8, 6, 13, 10, 11, 42, 14, 50, 16, 8, 14, 16, 14, 20, 10, 12, 14, 10 };
                wsOut.MoneyFmt(3, new int[] { 12, 14, 15 });

                // tong hop so lieu to khai
                WSheet wsTk = wb8.Add("Tong hop VAT");
                wsTk.Add(new object[] { "TỔNG HỢP THUẾ GTGT – THÁNG " + month.ToString("00") + "/" + year + " (thuộc Quý " + quy + "/" + year + ")" });
                wsTk.StyleCell(1, 1, true, 12);
                wsTk.Add(new object[] { "Số liệu dưới đây CHỈ của tháng này. Tờ khai theo quý thì cộng cả 3 tháng. CT22 (khấu trừ đầu kỳ) và CT25 (được khấu trừ kỳ này) phụ thuộc kỳ trước – chị tự điền." });
                wsTk.Add();
                wsTk.Add(new object[] { "ĐẦU VÀO – theo thuế suất" });
                wsTk.StyleCell(wsTk.Count, 1, true, 11);
                wsTk.Add(new object[] { "Thuế suất", "Số hóa đơn", "Giá trị chưa thuế", "Thuế GTGT" });
                wsTk.StyleRow(wsTk.Count, true, 11, true, false, null);
                double in23 = 0, in24 = 0;
                foreach (object[] kv in RateSum(vinRows, 13, 12, 14))
                {
                    wsTk.Add(kv); in23 += U.Num(kv[2]); in24 += U.Num(kv[3]);
                }
                wsTk.Add(new object[] { "CỘNG", "", in23, in24 });
                wsTk.StyleRow(wsTk.Count, true, 11, false, false, null);
                wsTk.Add();
                wsTk.Add(new object[] { "ĐẦU RA – theo thuế suất" });
                wsTk.StyleCell(wsTk.Count, 1, true, 11);
                wsTk.Add(new object[] { "Thuế suất", "Số hóa đơn", "Doanh thu", "Thuế GTGT" });
                wsTk.StyleRow(wsTk.Count, true, 11, true, false, null);
                double o34 = 0, o28 = 0, o26 = 0, o10 = 0;
                foreach (object[] kv in RateSum(voutRows, 12, 11, 13))
                {
                    wsTk.Add(kv); o34 += U.Num(kv[2]); o28 += U.Num(kv[3]);
                    string rk = U.ToStr(kv[0]);
                    if (rk == "KCT" || rk == "KKKNT") o26 += U.Num(kv[2]); else o10 += U.Num(kv[2]);
                }
                wsTk.Add(new object[] { "CỘNG", "", o34, o28 });
                wsTk.StyleRow(wsTk.Count, true, 11, false, false, null);
                wsTk.Add();
                wsTk.Add(new object[] { "CHỈ TIÊU TỜ KHAI 01/GTGT (phần phát sinh trong tháng)" });
                wsTk.StyleCell(wsTk.Count, 1, true, 11);
                wsTk.Add(new object[] { "Chỉ tiêu", "Diễn giải", "Số tiền" });
                wsTk.StyleRow(wsTk.Count, true, 11, true, false, null);
                wsTk.Add(new object[] { "CT 23", "Giá trị HHDV mua vào", in23 });
                wsTk.Add(new object[] { "CT 24", "Tổng thuế GTGT mua vào", in24 });
                wsTk.Add(new object[] { "CT 25", "Thuế GTGT được khấu trừ kỳ này (tạm = CT24, sửa nếu phân bổ)", in24 });
                wsTk.Add(new object[] { "CT 26", "Doanh thu không chịu thuế / không kê khai", o26 });
                wsTk.Add(new object[] { "CT 27+", "Doanh thu chịu thuế (xem bảng trên để tách 8% / 10%)", o10 });
                wsTk.Add(new object[] { "CT 34", "Tổng doanh thu HHDV bán ra", o34 });
                wsTk.Add(new object[] { "CT 28", "Thuế GTGT đầu ra", o28 });
                wsTk.Add(new object[] { "", "Chênh lệch kỳ này (CT28 − CT25)", o28 - in24 });
                wsTk.StyleRow(wsTk.Count, true, 11, false, false, null);
                wsTk.Widths = new double[] { 14, 64, 18, 18 };
                wsTk.MoneyFmt(5, new int[] { 3, 4 });
                string f8 = Path.Combine(OUT, "8. Bang_ke_VAT_" + T + ".xlsx");
                wb8.Save(f8);

                // ---- file 7: danh muc doi tuong can them
                WSheet ws7 = new WSheet("Danh muc can them");
                string[] h7 = { "Loại đối tượng (*)", "Mã đối tượng (*)", "Tên đối tượng (*)", "Địa chỉ", "Mã số thuế", "Là khách hàng", "Là nhà cung cấp" };
                Head3(ws7, "DANH MỤC ĐỐI TƯỢNG CẦN THÊM VÀO AMIS – THÁNG " + month.ToString("00") + "/" + year
                    + " (Danh mục > Đối tượng > Thêm ▾ > Nhập từ Excel). Mã do phần mềm gợi ý, chị sửa lại nếu muốn.", h7, new int[] { }, new string[] { });
                foreach (object[] r in missObj) ws7.Add(r);
                if (missObj.Count == 0) ws7.Add(new object[] { "(Tháng này không thiếu đối tượng nào)" });
                ws7.Widths = new double[] { 16, 14, 50, 46, 14, 12, 14 };
                string f7 = Path.Combine(OUT, "7. Danh_muc_doi_tuong_can_them_" + T + ".xlsx");
                var wb7 = new WBook(); wb7.Sheets.Add(ws7); wb7.Save(f7);

                WSheet sd = wb0.Add("Danh muc can them");
                sd.Add(new object[] { "ĐỐI TƯỢNG CHƯA CÓ TRONG DANH MỤC AMIS (" + missObj.Count + ") – nhập trước khi import, xem tệp 7" });
                sd.StyleCell(1, 1, true, 12);
                sd.Add(new object[] { "Loại", "Mã gợi ý", "Tên đối tượng", "Địa chỉ", "Mã số thuế" });
                sd.StyleRow(2, true, 11, true, false, null);
                foreach (object[] r in missObj) sd.Add(new object[] { r[0], r[1], r[2], r[3], r[4] });
                if (missObj.Count == 0) sd.Add(new object[] { "(không thiếu đối tượng nào)" });
                sd.Widths = new double[] { 14, 14, 50, 46, 14 };

                WSheet sh = wb0.Add("Mau ho so bo sung");
                sh.Add(new object[] { "CÁCH CUNG CẤP THÊM HỒ SƠ CHO GIAO DỊCH GỘP / CHƯA RÕ" });
                sh.StyleCell(1, 1, true, 12);
                sh.Add(new object[] { "Tạo một tệp Excel có chữ \"BO SUNG\" trong tên (VD: HO SO BO SUNG T" + month.ToString("00") + ".xlsx),"
                    + " bỏ vào thư mục dữ liệu của tháng. Lần chạy sau phần mềm tự tách giao dịch gộp thành nhiều dòng (giữ nguyên số chứng từ)." });
                sh.Add(new object[] { "Khớp giao dịch bằng Số bút toán; nếu để trống thì khớp theo Ngày + Số tiền gốc. Tổng các dòng tách phải bằng số tiền trên sao kê." });
                sh.Add();
                sh.Add(new object[] { "Số bút toán", "Ngày giao dịch", "Số tiền gốc", "Người nhận", "Số tiền", "TK đối ứng", "Mã đối tượng", "Diễn giải", "Ghi chú" });
                sh.StyleRow(sh.Count, true, 11, true, false, null);
                sh.Add(new object[] { "FT26xxxxxxx", "29/10/2026", 30000000.0, "Nguyen Van A", 8000000.0, "3341", "(để trống nếu chưa có)", "Phí dịch vụ T10 – Nguyen Van A", "" });
                sh.Add(new object[] { "FT26xxxxxxx", "29/10/2026", 30000000.0, "Tran Thi B", 7000000.0, "3341", "", "Phí dịch vụ T10 – Tran Thi B", "" });
                sh.Add(new object[] { "(… mỗi người một dòng …)" });
                sh.Widths = new double[] { 16, 14, 16, 26, 14, 10, 20, 44, 24 };
                sh.MoneyFmt(5, new int[] { 3, 5 });

                WSheet sk = wb0.Add("Ket qua AMIS");
                sk.Add(new object[] { "KẾT QUẢ ĐƯA LÊN AMIS (Hệ thống tự động cập nhật sau khi duyệt)" });
                sk.StyleCell(1, 1, true, 11);

                string f0 = Path.Combine(OUT, "0. Ghi_chu_doi_chieu_" + T + ".xlsx");
                wb0.Save(f0);

                log("");
                log("Đã ghi 9 file vào: " + OUT);
                string[] files = { f0, f1, f2, f3, f4, f5, f6, f7, f8 };
                foreach (string f in files) { log("  - " + Path.GetFileName(f)); res.Files.Add(f); }
                log("Giao dịch cần xem: " + notes.Count + " (xem sheet 'Sao ke' file 0)");

                res.Notes = notes;
                // danh sach chung tu day du de xem chi tiet tren giao dien
                Action<VRow, string> addV = delegate(VRow v, string kind)
                {
                    var vi = new VoucherInfo();
                    vi.So = v.So; vi.Date = v.Date; vi.Bank = v.Bank; vi.Kind = kind;
                    vi.Code = v.Code; vi.Name = v.Name; vi.Tk = v.Tk;
                    vi.TkNh = NH[v.Bank] != null ? NH[v.Bank].S("tk", "") : "";
                    vi.Dg = v.Dg; vi.LyDo = v.LyDo; vi.Nd = v.Nd; vi.Ft = v.Ft; vi.Who = v.Who ?? "";
                    vi.Note = v.Note; vi.Amt = v.Amt;
                    res.Vouchers.Add(vi);
                };
                foreach (VRow v in thu) addV(v, "Thu");
                foreach (VRow v in chi) addV(v, "Chi");
                foreach (CtnbRow x in ctnb)
                {
                    var vi = new VoucherInfo();
                    vi.So = "CTNB"; vi.Date = x.Date; vi.Bank = x.Bank; vi.Kind = "Nội bộ";
                    vi.TkNh = NH[x.Bank] != null ? NH[x.Bank].S("tk", "") : "";
                    vi.Nd = x.Nd; vi.Ft = x.Ft; vi.Amt = x.Amt;
                    vi.Dg = "Chuyển tiền nội bộ"; vi.Note = "Nhập tay trong AMIS (tệp 3)";
                    res.Vouchers.Add(vi);
                }
                res.NThu = thu.Count; res.NChiLines = chi.Count; res.NChiVouchers = chiVouchers;
                res.NCtnb = pairKeys.Count; res.NMuaDv = nDv; res.NCcdc = ccdcRows.Count; res.NNvk = ban.Count;
                res.NMuaIt = muaIt.Count; res.NBanIt = banIt.Count; res.NDanhMuc = cat.Count; res.NSupp = supp.Count;
                res.NextNcc = NextCode(cats, "NCC", 1); res.NextKh = NextCode(cats, "KH", 1);
                res.NextNv = NextCode(cats, "NV", 1);
                res.NVatIn = vinRows.Count; res.NVatOut = voutRows.Count;
                foreach (string[] x in muaNotes) res.MuaNotes.Add(x);
                foreach (string[] x in banNotes) res.BanNotes.Add(x);
                foreach (object[] x in missObj) res.MissObj.Add(x);
                foreach (object[] x in ccdcRows) res.Ccdc.Add(new object[] { x[0], x[1], x[7], x[9] });
                res.VatSum.Add(new object[] { "CT 23", "Giá trị HHDV mua vào", in23 });
                res.VatSum.Add(new object[] { "CT 24", "Tổng thuế GTGT mua vào", in24 });
                res.VatSum.Add(new object[] { "CT 26", "Doanh thu không chịu thuế", o26 });
                res.VatSum.Add(new object[] { "CT 27+", "Doanh thu chịu thuế", o10 });
                res.VatSum.Add(new object[] { "CT 34", "Tổng doanh thu bán ra", o34 });
                res.VatSum.Add(new object[] { "CT 28", "Thuế GTGT đầu ra", o28 });
                res.VatSum.Add(new object[] { "", "Chênh lệch kỳ này (CT28 − CT24)", o28 - in24 });
                res.Code = res.Rec.All(r => r.Ok) ? 0 : 1;

                try { File.WriteAllText(Path.Combine(OUT, "nhat_ky.txt"), string.Join(Environment.NewLine, LOG.ToArray()), new UTF8Encoding(true)); }
                catch { }
                return res;
            }
            catch (Exception ex)
            {
                res.Error = ex.Message;
                log("!! LỖI: " + ex.Message);
                log(ex.StackTrace ?? "");
                res.Code = 3;
                try { if (res.OutDir.Length > 0) File.WriteAllText(Path.Combine(res.OutDir, "nhat_ky.txt"), string.Join(Environment.NewLine, LOG.ToArray()), new UTF8Encoding(true)); }
                catch { }
                return res;
            }
        }

        /// <summary>Doi tuong NCC thu phi the: theo "ma_doi_tuong_phi", neu khong co thi tim theo MST.</summary>
        /// <summary>Do ten doi tac tren sao ke voi danh muc AMIS (bo dau, viet hoa) de lay ma doi tuong.</summary>
        static readonly string[] FormWords = { "CONG TY CO PHAN", "CONG TY TNHH", "TRACH NHIEM HUU HAN", "MOT THANH VIEN",
            "JOINT STOCK COMPANY", "THUONG MAI CO PHAN", "TMCP", "CONG TY", "CO PHAN", "TNHH", "CTCP", "CTY", "JSC", "MTV", "LTD", "LIMITED",
            "CORPORATION", "COMPANY", "INCORPORATED", "PRIVATE", "HOLDINGS", "GROUP", "PTE", "PLC", "LLC", "GMBH",
            "S.A.R.L", "SARL", "B.V.", "N.V.", "S.A.", "A.G.", "INC", "CORP", "VIET NAM", "VIETNAM" };

        /// <summary>Rut gon ten don vi: bo "cong ty / co phan / TNHH / JSC..." va ky tu dac biet de so khop.</summary>
        static string NameCore(string s)
        {
            string x = U.Norm(s);
            for (int i = 0; i < FormWords.Length; i++) x = x.Replace(FormWords[i], " ");
            var sb = new StringBuilder();
            for (int i = 0; i < x.Length; i++) if (char.IsLetterOrDigit(x[i])) sb.Append(x[i]);
            return sb.ToString();
        }

        /// <summary>Tim ma trong bang anh xa: khop ca cum, roi khop chuoi con.</summary>
        static string AliasHit(Dictionary<string, string> alias, string who, string nd)
        {
            if (alias == null || alias.Count == 0) return "";
            string fw = Flatten(who), fn = Flatten(nd);
            if (fw.Length > 0 && alias.ContainsKey(fw)) return alias[fw];
            if (fn.Length > 0 && alias.ContainsKey(fn)) return alias[fn];
            string best = ""; int bl = 0;
            foreach (var kv in alias)
            {
                if (kv.Key.Length < 5) continue;
                if ((fw.Length > 0 && fw.IndexOf(kv.Key, StringComparison.Ordinal) >= 0)
                    || (fn.Length > 0 && fn.IndexOf(kv.Key, StringComparison.Ordinal) >= 0))
                    if (kv.Key.Length > bl) { bl = kv.Key.Length; best = kv.Value; }
            }
            return best;
        }

        /// <summary>Quet noi dung giao dich, tim ten doi tuong nao cua danh muc xuat hien trong do.</summary>
        static bool FindInText(List<CatEntry> cats, string text, string kind, out string code, out string name)
        {
            code = ""; name = "";
            string f = Flatten(text);
            if (f.Length < 8 || cats == null) return false;
            CatEntry hit = null; int best = 0;
            foreach (CatEntry e in cats)
            {
                if (kind.Length > 0 && e.Kind != kind) continue;
                if (e.Flat.Length < 8) continue;
                if (f.IndexOf(e.Flat, StringComparison.Ordinal) >= 0 && e.Flat.Length > best) { best = e.Flat.Length; hit = e; }
            }
            if (hit == null) return false;
            code = hit.Code; name = hit.Name;
            return true;
        }

        static bool FindObjByName(List<CatEntry> cats, string who, out string code, out string name)
        {
            code = ""; name = "";
            if (U.Norm(who).Length < 8) return false;
            return ResolveObj(cats, "", who, "", out code, out name);
        }

        static void FeeObject(J cfg, J theNH, string mstPhi, out string code, out string name)
        {
            code = mstPhi; name = "";
            J dt = cfg["doi_tuong"];
            if (dt == null) return;
            string key = theNH.S("ma_doi_tuong_phi", "VPBANK_NCC");
            J v = dt[key];
            if (v != null && v.Kind == J.K.Arr && v.Arr.Count >= 2)
            {
                code = v.Arr[0].AsStr(); name = v.Arr[1].AsStr(); return;
            }
            foreach (var kv in dt.Fields())
            {
                J a = kv.Value;
                if (a != null && a.Kind == J.K.Arr && a.Arr.Count >= 2 && a.Arr[0].AsStr() == mstPhi)
                {
                    code = a.Arr[0].AsStr(); name = a.Arr[1].AsStr(); return;
                }
            }
        }

        class FeeInv
        {
            public string So;
            public DateTime Date;
            public string Text;
            public double Total;
            public bool Used;
        }

        // ---------------------------------------------------------------- ho so bo sung
        // Mot giao dich gop tren sao ke (VD chi 30tr cho 5 nguoi) -> chi tach thanh nhieu dong.
        class SupRow
        {
            public string Ft = "", Who = "", Tk = "", Code = "", Dg = "", Note = "";
            public DateTime Date;
            public double Gross, Amt;
            public bool Used;
        }

        static List<SupRow> ReadSupp(List<string> files, Action<string> log)
        {
            var outp = new List<SupRow>();
            foreach (string f in files)
            {
                try
                {
                    foreach (XlsxRead.Sheet ws in XlsxRead.Read(f).Sheets)
                    {
                        int hdr = -1;
                        int cFt = -1, cNgay = -1, cGoc = -1, cWho = -1, cAmt = -1, cTk = -1, cCode = -1, cDg = -1, cNote = -1;
                        for (int i = 0; i < ws.Rows.Count && i < 30; i++)
                        {
                            object[] r = ws.Rows[i];
                            var probe = new HashSet<int>();
                            if (FindCol(r, new string[] { "SO TIEN" }, probe) < 0) continue;
                            var used = new HashSet<int>();
                            // thu tu quan trong: "So tien goc" phai lay truoc "So tien"
                            cFt = FindCol(r, new string[] { "SO BUT TOAN", "SO THAM CHIEU", "MA GIAO DICH", "FT" }, used);
                            cNgay = FindCol(r, new string[] { "NGAY GIAO DICH", "NGAY" }, used);
                            cGoc = FindCol(r, new string[] { "SO TIEN GOC", "SO TIEN TREN SAO KE", "TONG TIEN" }, used);
                            cAmt = FindCol(r, new string[] { "SO TIEN TACH", "SO TIEN CHI TIET", "SO TIEN" }, used);
                            cWho = FindCol(r, new string[] { "NGUOI NHAN", "NGUOI NOP", "DOI TAC", "TEN DOI TUONG", "HO TEN" }, used);
                            cTk = FindCol(r, new string[] { "TK DOI UNG", "TAI KHOAN", "TK" }, used);
                            cCode = FindCol(r, new string[] { "MA DOI TUONG", "MA" }, used);
                            cDg = FindCol(r, new string[] { "DIEN GIAI", "NOI DUNG" }, used);
                            cNote = FindCol(r, new string[] { "GHI CHU" }, used);
                            hdr = i; break;
                        }
                        if (hdr < 0 || cAmt < 0) continue;
                        for (int i = hdr + 1; i < ws.Rows.Count; i++)
                        {
                            object[] r = ws.Rows[i];
                            double am = Math.Abs(CellNum(r, cAmt));
                            if (am == 0) continue;
                            var s = new SupRow();
                            s.Ft = CellStr(r, cFt); s.Amt = am; s.Gross = Math.Abs(CellNum(r, cGoc));
                            s.Who = CellStr(r, cWho); s.Tk = CellStr(r, cTk); s.Code = CellStr(r, cCode);
                            s.Dg = CellStr(r, cDg); s.Note = CellStr(r, cNote);
                            DateTime dd;
                            if (cNgay >= 0 && cNgay < r.Length && U.TryParseDate(r[cNgay], out dd)) s.Date = dd;
                            if (s.Ft.Length > 0 || s.Gross > 0 || s.Date != default(DateTime)) outp.Add(s);
                        }
                    }
                }
                catch (Exception ex) { log("  ! Không đọc được hồ sơ bổ sung " + Path.GetFileName(f) + ": " + ex.Message); }
            }
            return outp;
        }

        static List<SupRow> MatchSupp(List<SupRow> sup, Txn t, double amt)
        {
            var hit = new List<SupRow>();
            string ft = U.Norm(t.Ft);
            if (ft.Length > 0)
                foreach (SupRow s in sup) if (!s.Used && s.Ft.Length > 0 && U.Norm(s.Ft) == ft) hit.Add(s);
            if (hit.Count == 0)
                foreach (SupRow s in sup)
                    if (!s.Used && s.Ft.Length == 0 && s.Date.Date == t.Date.Date && s.Gross > 0 && Math.Abs(s.Gross - amt) < 1) hit.Add(s);
            return hit;
        }

        /// <summary>Tach mot giao dich gop thanh nhieu dong theo ho so bo sung (giu nguyen so chung tu).</summary>
        static List<VRow> SplitBySupp(List<SupRow> supp, Txn t, double amt, VRow v0, List<CatEntry> cats, Dictionary<string, string> cat, Dictionary<string, string> alias)
        {
            var outp = new List<VRow>();
            if (supp == null || supp.Count == 0) { outp.Add(v0); return outp; }
            List<SupRow> hit = MatchSupp(supp, t, amt);
            if (hit.Count == 0) { outp.Add(v0); return outp; }
            double tong = 0;
            foreach (SupRow s in hit) tong += s.Amt;
            foreach (SupRow s in hit)
            {
                s.Used = true;
                VRow v = v0.Copy();
                v.Amt = s.Amt;
                if (s.Tk.Length > 0) v.Tk = s.Tk;
                v.Who = s.Who.Length > 0 ? s.Who : v0.Who;
                if (s.Code.Length > 0) { v.Code = s.Code; v.Name = cat.ContainsKey(s.Code) ? cat[s.Code] : s.Who; }
                else if (s.Who.Length > 0)
                {
                    string ak = AliasHit(alias, s.Who, "");
                    string rc, rn;
                    if (ak.Length > 0) { v.Code = ak; v.Name = cat.ContainsKey(ak) ? cat[ak] : s.Who; }
                    else if (ResolveObj(cats, "", s.Who, "", out rc, out rn)) { v.Code = rc; v.Name = rn; }
                    else v.Name = s.Who;
                }
                v.Dg = s.Dg.Length > 0 ? s.Dg : (s.Who.Length > 0 ? v0.Dg + " – " + s.Who : v0.Dg);
                v.Note = "Tách theo hồ sơ bổ sung" + (s.Note.Length > 0 ? "; " + s.Note : "");
                outp.Add(v);
            }
            if (Math.Abs(tong - amt) >= 1)
                outp[0].Note += "; LỆCH: tổng dòng tách " + U.Money(tong) + " ≠ số tiền sao kê " + U.Money(amt) + " – kiểm tra hồ sơ bổ sung";
            return outp;
        }

        /// <summary>Ma doi tuong tren dong tach ma chua co trong danh muc -> dua vao tep 7 (giu dung ma do).</summary>
        static void CheckLineObjs(List<VRow> lines, Dictionary<string, string> cat,
            Func<string, string, string, string, string, string> addMiss, string kind)
        {
            if (cat.Count == 0 || lines.Count < 2) return;
            foreach (VRow v in lines)
            {
                if (v.Code.Length == 0 || cat.ContainsKey(v.Code)) continue;
                addMiss(kind, "", v.Name.Length > 0 ? v.Name : v.Who, "", v.Code);
                v.Note = (v.Note.Length > 0 ? v.Note + "; " : "")
                    + "Mã đối tượng <" + v.Code + "> CHƯA CÓ trong danh mục AMIS – nhập tệp 7 trước khi import";
            }
        }

        static FeeInv MatchFee(List<FeeInv> feeInv, Txn t)
        {
            string nd = U.Norm(t.Nd).Replace(" ", "");
            FeeInv best = null;
            int score = 0;
            foreach (FeeInv f in feeInv)
            {
                if (f.Used || f.Date.Date != t.Date.Date) continue;
                int sc = 0;
                foreach (Match m in Regex.Matches(f.Text, "[A-Z0-9]{4,}"))
                {
                    string w = m.Value;
                    if (w == "THANH" || w == "TOAN" || w == "TOANTAI") continue;
                    if (nd.Contains(w)) sc++;
                }
                if (sc > score) { best = f; score = sc; }
            }
            if (best != null && score >= 2) { best.Used = true; return best; }
            return null;
        }

        /// <summary>So thuc kieu Python: 4931507.0</summary>
        static string PyFloat(double d)
        {
            if (d == Math.Floor(d) && Math.Abs(d) < 1e15) return ((long)d).ToString(CultureInfo.InvariantCulture) + ".0";
            return d.ToString("R", CultureInfo.InvariantCulture);
        }
    }
}
