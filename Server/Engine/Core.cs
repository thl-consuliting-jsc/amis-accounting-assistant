#nullable disable
// TRO LY KE TOAN - Core: tien ich, JSON, doc/ghi XLSX (khong can thu vien ngoai).
// Viet theo C# 5 de bien dich duoc bang csc.exe co san trong Windows (.NET Framework 4.x).
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace Zf
{
    // ------------------------------------------------------------------ tien ich
    public static class U
    {
        static readonly CultureInfo INV = CultureInfo.InvariantCulture;
        static readonly Regex RxSpace = new Regex(@"\s+", RegexOptions.Compiled);
        static readonly Regex RxMoney = new Regex(@"([\d][\d,\.]*)\s*VND", RegexOptions.Compiled);

        public static string StripAccents(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            string d = s.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(d.Length);
            for (int i = 0; i < d.Length; i++)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(d[i]) != UnicodeCategory.NonSpacingMark) sb.Append(d[i]);
            }
            return sb.ToString().Replace('Đ', 'D').Replace('đ', 'd');
        }

        /// <summary>Bo dau, viet hoa, gop khoang trang - dung de so khop tu khoa.</summary>
        public static string Norm(object v)
        {
            string s = StripAccents(PyStrOrEmpty(v));
            return RxSpace.Replace(s, " ").Trim().ToUpperInvariant();
        }

        /// <summary>str(v) kieu Python: null -> "None", so nguyen -> khong co ".0".</summary>
        public static string PyStr(object v)
        {
            if (v == null) return "None";
            return ToStr(v);
        }

        static string PyStrOrEmpty(object v)
        {
            // tuong duong str(v or "") trong Python
            if (v == null) return "";
            if (v is double && (double)v == 0) return "";
            if (v is int && (int)v == 0) return "";
            if (v is bool && !(bool)v) return "";
            if (v is string && ((string)v).Length == 0) return "";
            return ToStr(v);
        }

        public static string ToStr(object v)
        {
            if (v == null) return "";
            if (v is string) return (string)v;
            if (v is double)
            {
                double d = (double)v;
                if (!double.IsNaN(d) && !double.IsInfinity(d) && d == Math.Floor(d) && Math.Abs(d) < 1e15)
                    return ((long)d).ToString(INV);
                return d.ToString("R", INV);
            }
            if (v is int) return ((int)v).ToString(INV);
            if (v is long) return ((long)v).ToString(INV);
            if (v is bool) return ((bool)v) ? "True" : "False";
            if (v is DateTime)
            {
                DateTime t = (DateTime)v;
                return t.TimeOfDay == TimeSpan.Zero ? t.ToString("yyyy-MM-dd 00:00:00", INV) : t.ToString("yyyy-MM-dd HH:mm:ss", INV);
            }
            return Convert.ToString(v, INV);
        }

        public static string Clean(object v)
        {
            return RxSpace.Replace(PyStrOrEmpty(v), " ").Trim();
        }

        public static double Num(object v)
        {
            if (v == null) return 0;
            if (v is double) return (double)v;
            if (v is int) return (int)v;
            if (v is long) return (long)v;
            if (v is bool) return ((bool)v) ? 1 : 0;
            string s = ToStr(v).Replace(",", "").Replace(".", "").Trim();
            if (s.Length == 0) return 0;
            double r;
            if (double.TryParse(s, NumberStyles.Any, INV, out r)) return r;
            return 0;
        }

        public static double? MoneyInText(string txt)
        {
            if (txt == null) return null;
            Match m = RxMoney.Match(txt);
            if (!m.Success) return null;
            return Num(m.Groups[1].Value);
        }

        public static string D2S(DateTime d) { return d.ToString("dd/MM/yyyy", INV); }

        static readonly string[] FMTS = { "dd/MM/yyyy", "dd-MM-yyyy", "dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy HH:mm", "yyyy-MM-dd", "yyyy-MM-dd HH:mm:ss", "dd/MM/yyyy HH:mm:ss tt" };
        static readonly string[] FMTS10 = { "dd/MM/yyyy", "dd-MM-yyyy", "yyyy-MM-dd" };

        public static bool TryParseDate(object v, out DateTime d)
        {
            d = DateTime.MinValue;
            if (v == null) return false;
            if (v is DateTime) { d = (DateTime)v; return true; }
            string s = ToStr(v).Trim();
            if (s.Length == 0) return false;
            for (int i = 0; i < FMTS.Length; i++)
                if (DateTime.TryParseExact(s, FMTS[i], CultureInfo.InvariantCulture, DateTimeStyles.None, out d)) return true;
            if (s.Length >= 10)
            {
                string head = s.Substring(0, 10);
                for (int i = 0; i < FMTS10.Length; i++)
                    if (DateTime.TryParseExact(head, FMTS10[i], CultureInfo.InvariantCulture, DateTimeStyles.None, out d)) return true;
            }
            return false;
        }

        public static DateTime ParseDate(object v)
        {
            DateTime d;
            if (TryParseDate(v, out d)) return d;
            throw new FormatException("Khong doc duoc ngay: " + PyStr(v));
        }

        /// <summary>0.1 -> 10 ; "KCT" -> "KCT" ; 8 -> 8. Tra ve int hoac string.</summary>
        public static object VatPct(object v)
        {
            if (v == null) return "KCT";
            if (v is string)
            {
                string t = ((string)v).Trim().ToUpperInvariant();
                if (t.Length == 0) return "KCT";
                if (t == "KCT" || t == "KKKNT") return t;
                double dv;
                if (!double.TryParse(t.Replace("%", ""), NumberStyles.Any, INV, out dv)) return "KHAC";
                return Pct(dv);
            }
            if (v is double && (double)v == 0 && false) return "KCT";
            return Pct(Num(v));
        }

        static object Pct(double v)
        {
            if (v <= 1) v = v * 100;
            return (int)Math.Round(v, MidpointRounding.ToEven);
        }

        public static string Money(double d)
        {
            return d.ToString("#,##0", INV);
        }

        /// <summary>Thay {key} trong mau; neu co key la, tra ve nguyen mau (giong Python .format bi loi).</summary>
        public static string Render(string tpl, Dictionary<string, string> vars)
        {
            if (string.IsNullOrEmpty(tpl)) return tpl;
            var found = Regex.Matches(tpl, @"\{([A-Za-z_][A-Za-z0-9_]*)\}");
            foreach (Match m in found) if (!vars.ContainsKey(m.Groups[1].Value)) return tpl;
            string outp = tpl;
            foreach (var kv in vars.OrderByDescending(k => k.Key.Length))
                outp = outp.Replace("{" + kv.Key + "}", kv.Value);
            return outp;
        }

        public static string Cut(string s, int n)
        {
            if (s == null) return "";
            return s.Length <= n ? s : s.Substring(0, n);
        }
    }

    // ------------------------------------------------------------------ JSON (giu thu tu khoa)
    public class J
    {
        public enum K { Obj, Arr, Str, Num, Bool, Null }
        public K Kind;
        public List<KeyValuePair<string, J>> Obj;
        public List<J> Arr;
        public string Str;
        public double Num;
        public bool Bool;

        public static J Parse(string text)
        {
            int i = 0;
            J v = ParseVal(text, ref i);
            return v;
        }

        public J this[string key]
        {
            get
            {
                if (Kind != K.Obj || Obj == null) return null;
                for (int i = 0; i < Obj.Count; i++) if (Obj[i].Key == key) return Obj[i].Value;
                return null;
            }
        }

        public bool Has(string key) { return this[key] != null; }

        public string S(string key, string def)
        {
            J v = this[key];
            if (v == null) return def;
            if (v.Kind == K.Str) return v.Str;
            if (v.Kind == K.Num) return U.ToStr(v.Num);
            if (v.Kind == K.Bool) return v.Bool ? "true" : "false";
            return def;
        }

        public string AsStr()
        {
            if (Kind == K.Str) return Str;
            if (Kind == K.Num) return U.ToStr(Num);
            if (Kind == K.Bool) return Bool ? "true" : "false";
            return "";
        }

        public double D(string key, double def)
        {
            J v = this[key];
            if (v == null) return def;
            if (v.Kind == K.Num) return v.Num;
            if (v.Kind == K.Str) { double r; if (double.TryParse(v.Str, NumberStyles.Any, CultureInfo.InvariantCulture, out r)) return r; }
            return def;
        }

        public bool B(string key, bool def)
        {
            J v = this[key];
            if (v == null) return def;
            if (v.Kind == K.Bool) return v.Bool;
            if (v.Kind == K.Str) return v.Str == "true" || v.Str == "1";
            if (v.Kind == K.Num) return v.Num != 0;
            return def;
        }

        public List<string> Strings(string key)
        {
            var o = new List<string>();
            J v = this[key];
            if (v == null || v.Kind != K.Arr) return o;
            foreach (J x in v.Arr) o.Add(x.AsStr());
            return o;
        }

        public List<J> Items(string key)
        {
            J v = this[key];
            if (v == null || v.Kind != K.Arr) return new List<J>();
            return v.Arr;
        }

        public IEnumerable<KeyValuePair<string, J>> Fields()
        {
            if (Kind != K.Obj || Obj == null) return new List<KeyValuePair<string, J>>();
            return Obj;
        }

        // ---- parser
        static void Ws(string s, ref int i) { while (i < s.Length && (s[i] == ' ' || s[i] == '\t' || s[i] == '\r' || s[i] == '\n')) i++; }

        static J ParseVal(string s, ref int i)
        {
            Ws(s, ref i);
            if (i >= s.Length) throw new FormatException("JSON: het du lieu");
            char c = s[i];
            if (c == '{') return ParseObj(s, ref i);
            if (c == '[') return ParseArr(s, ref i);
            if (c == '"') { var j = new J(); j.Kind = K.Str; j.Str = ParseStr(s, ref i); return j; }
            if (c == 't' && s.Substring(i, 4) == "true") { i += 4; var j = new J(); j.Kind = K.Bool; j.Bool = true; return j; }
            if (c == 'f' && s.Substring(i, 5) == "false") { i += 5; var j = new J(); j.Kind = K.Bool; j.Bool = false; return j; }
            if (c == 'n' && s.Substring(i, 4) == "null") { i += 4; var j = new J(); j.Kind = K.Null; return j; }
            int st = i;
            while (i < s.Length && (char.IsDigit(s[i]) || s[i] == '-' || s[i] == '+' || s[i] == '.' || s[i] == 'e' || s[i] == 'E')) i++;
            var n = new J(); n.Kind = K.Num;
            n.Num = double.Parse(s.Substring(st, i - st), CultureInfo.InvariantCulture);
            return n;
        }

        static J ParseObj(string s, ref int i)
        {
            var j = new J(); j.Kind = K.Obj; j.Obj = new List<KeyValuePair<string, J>>();
            i++; Ws(s, ref i);
            if (i < s.Length && s[i] == '}') { i++; return j; }
            while (true)
            {
                Ws(s, ref i);
                string key = ParseStr(s, ref i);
                Ws(s, ref i);
                if (s[i] != ':') throw new FormatException("JSON: thieu dau :");
                i++;
                J val = ParseVal(s, ref i);
                j.Obj.Add(new KeyValuePair<string, J>(key, val));
                Ws(s, ref i);
                if (i < s.Length && s[i] == ',') { i++; continue; }
                if (i < s.Length && s[i] == '}') { i++; break; }
                throw new FormatException("JSON: loi cu phap trong object");
            }
            return j;
        }

        static J ParseArr(string s, ref int i)
        {
            var j = new J(); j.Kind = K.Arr; j.Arr = new List<J>();
            i++; Ws(s, ref i);
            if (i < s.Length && s[i] == ']') { i++; return j; }
            while (true)
            {
                j.Arr.Add(ParseVal(s, ref i));
                Ws(s, ref i);
                if (i < s.Length && s[i] == ',') { i++; continue; }
                if (i < s.Length && s[i] == ']') { i++; break; }
                throw new FormatException("JSON: loi cu phap trong array");
            }
            return j;
        }

        static string ParseStr(string s, ref int i)
        {
            if (s[i] != '"') throw new FormatException("JSON: thieu dau nhay");
            i++;
            var sb = new StringBuilder();
            while (i < s.Length)
            {
                char c = s[i++];
                if (c == '"') break;
                if (c == '\\')
                {
                    char e = s[i++];
                    switch (e)
                    {
                        case 'n': sb.Append('\n'); break;
                        case 't': sb.Append('\t'); break;
                        case 'r': sb.Append('\r'); break;
                        case 'b': sb.Append('\b'); break;
                        case 'f': sb.Append('\f'); break;
                        case '/': sb.Append('/'); break;
                        case '\\': sb.Append('\\'); break;
                        case '"': sb.Append('"'); break;
                        case 'u':
                            sb.Append((char)int.Parse(s.Substring(i, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                            i += 4; break;
                        default: sb.Append(e); break;
                    }
                }
                else sb.Append(c);
            }
            return sb.ToString();
        }
    }

    // ------------------------------------------------------------------ doc XLSX
    public static class XlsxRead
    {
        static readonly XNamespace NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        static readonly XNamespace NSR = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
        static readonly XNamespace NSPR = "http://schemas.openxmlformats.org/package/2006/relationships";

        public class Sheet
        {
            public string Name;
            public List<object[]> Rows = new List<object[]>();
            public int MaxCol;
        }

        public class Book
        {
            public List<Sheet> Sheets = new List<Sheet>();
            public int ActiveIndex;
            public Sheet Active { get { return Sheets.Count == 0 ? null : Sheets[Math.Min(ActiveIndex, Sheets.Count - 1)]; } }
            public Sheet ByName(string n)
            {
                foreach (Sheet s in Sheets) if (s.Name == n) return s;
                return null;
            }
        }

        public static Book Read(string path)
        {
            var book = new Book();
            using (FileStream fs = File.Open(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            using (var zip = new ZipArchive(fs, ZipArchiveMode.Read))
            {
                // shared strings
                var sst = new List<string>();
                ZipArchiveEntry e = Entry(zip, "xl/sharedStrings.xml");
                if (e != null)
                {
                    XDocument doc = Load(e);
                    foreach (XElement si in doc.Root.Elements(NS + "si")) sst.Add(SiText(si));
                }

                // styles -> co phai dinh dang ngay khong
                var isDate = new List<bool>();
                e = Entry(zip, "xl/styles.xml");
                if (e != null)
                {
                    XDocument doc = Load(e);
                    var custom = new Dictionary<int, string>();
                    XElement nfs = doc.Root.Element(NS + "numFmts");
                    if (nfs != null)
                        foreach (XElement nf in nfs.Elements(NS + "numFmt"))
                            custom[int.Parse(nf.Attribute("numFmtId").Value, CultureInfo.InvariantCulture)] = (string)nf.Attribute("formatCode");
                    XElement xfs = doc.Root.Element(NS + "cellXfs");
                    if (xfs != null)
                        foreach (XElement xf in xfs.Elements(NS + "xf"))
                        {
                            int id = 0;
                            XAttribute a = xf.Attribute("numFmtId");
                            if (a != null) int.TryParse(a.Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out id);
                            bool dt = (id >= 14 && id <= 22) || (id >= 45 && id <= 47);
                            if (!dt && custom.ContainsKey(id))
                            {
                                string code = custom[id] ?? "";
                                string stripped = Regex.Replace(code, "\\[[^\\]]*\\]|\"[^\"]*\"", "");
                                dt = stripped.IndexOf('y') >= 0 || stripped.IndexOf('d') >= 0;
                            }
                            isDate.Add(dt);
                        }
                }

                // workbook: ten sheet + rId
                XDocument wbDoc = Load(Entry(zip, "xl/workbook.xml"));
                var rels = new Dictionary<string, string>();
                ZipArchiveEntry re = Entry(zip, "xl/_rels/workbook.xml.rels");
                if (re != null)
                {
                    XDocument rd = Load(re);
                    foreach (XElement r in rd.Root.Elements(NSPR + "Relationship"))
                        rels[r.Attribute("Id").Value] = r.Attribute("Target").Value;
                }
                XElement views = wbDoc.Root.Element(NS + "bookViews");
                if (views != null)
                {
                    XElement wv = views.Element(NS + "workbookView");
                    if (wv != null && wv.Attribute("activeTab") != null)
                        int.TryParse(wv.Attribute("activeTab").Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out book.ActiveIndex);
                }
                XElement sheets = wbDoc.Root.Element(NS + "sheets");
                if (sheets == null) return book;
                foreach (XElement sh in sheets.Elements(NS + "sheet"))
                {
                    string name = sh.Attribute("name").Value;
                    XAttribute rid = sh.Attribute(NSR + "id");
                    string target = (rid != null && rels.ContainsKey(rid.Value)) ? rels[rid.Value] : null;
                    if (target == null) continue;
                    string full = target.StartsWith("/") ? target.Substring(1) : (target.StartsWith("xl/") ? target : "xl/" + target);
                    ZipArchiveEntry se = Entry(zip, full);
                    if (se == null) continue;
                    book.Sheets.Add(ReadSheet(se, name, sst, isDate));
                }
            }
            return book;
        }

        static ZipArchiveEntry Entry(ZipArchive z, string name)
        {
            foreach (ZipArchiveEntry e in z.Entries)
                if (string.Equals(e.FullName, name, StringComparison.OrdinalIgnoreCase)) return e;
            return null;
        }

        static XDocument Load(ZipArchiveEntry e)
        {
            using (Stream s = e.Open()) return XDocument.Load(s);
        }

        static string SiText(XElement si)
        {
            var sb = new StringBuilder();
            foreach (XElement t in si.Descendants(NS + "t")) sb.Append(t.Value);
            return sb.ToString();
        }

        static Sheet ReadSheet(ZipArchiveEntry e, string name, List<string> sst, List<bool> isDate)
        {
            var sheet = new Sheet(); sheet.Name = name;
            var rows = new List<Dictionary<int, object>>();
            var rowIdx = new List<int>();
            int maxCol = 0, maxRow = 0;
            using (Stream st = e.Open())
            {
                XDocument doc = XDocument.Load(st);
                XElement data = doc.Root.Element(NS + "sheetData");
                if (data != null)
                {
                    foreach (XElement r in data.Elements(NS + "row"))
                    {
                        int rn = 0;
                        XAttribute ra = r.Attribute("r");
                        if (ra != null) int.TryParse(ra.Value, out rn);
                        else rn = rows.Count + 1;
                        var cells = new Dictionary<int, object>();
                        int autoCol = 0;
                        foreach (XElement c in r.Elements(NS + "c"))
                        {
                            int col;
                            XAttribute cr = c.Attribute("r");
                            if (cr != null) col = ColOf(cr.Value); else col = ++autoCol;
                            autoCol = col;
                            object val = CellValue(c, sst, isDate);
                            if (val != null) cells[col] = val;
                            if (col > maxCol) maxCol = col;
                        }
                        if (rn > maxRow) maxRow = rn;
                        rows.Add(cells); rowIdx.Add(rn);
                    }
                }
            }
            sheet.MaxCol = maxCol;
            // tra ve day du tu dong 1 den maxRow, moi dong co maxCol o
            var map = new Dictionary<int, Dictionary<int, object>>();
            for (int i = 0; i < rows.Count; i++) map[rowIdx[i]] = rows[i];
            for (int r = 1; r <= maxRow; r++)
            {
                var arr = new object[Math.Max(maxCol, 1)];
                Dictionary<int, object> src;
                if (map.TryGetValue(r, out src))
                    foreach (var kv in src) if (kv.Key >= 1 && kv.Key <= arr.Length) arr[kv.Key - 1] = kv.Value;
                sheet.Rows.Add(arr);
            }
            return sheet;
        }

        static int ColOf(string reference)
        {
            int n = 0;
            for (int i = 0; i < reference.Length; i++)
            {
                char c = reference[i];
                if (c >= 'A' && c <= 'Z') n = n * 26 + (c - 'A' + 1);
                else if (c >= 'a' && c <= 'z') n = n * 26 + (c - 'a' + 1);
                else break;
            }
            return n;
        }

        static object CellValue(XElement c, List<string> sst, List<bool> isDate)
        {
            string t = (string)c.Attribute("t");
            if (t == "inlineStr")
            {
                XElement isE = c.Element(NS + "is");
                return isE == null ? null : (object)SiText(isE);
            }
            XElement v = c.Element(NS + "v");
            if (v == null) return null;
            string raw = v.Value;
            if (t == "s")
            {
                int idx;
                if (int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out idx) && idx >= 0 && idx < sst.Count)
                {
                    string s = sst[idx];
                    return s.Length == 0 ? null : (object)s;
                }
                return null;
            }
            if (t == "str")
            {
                return raw.Length == 0 ? null : (object)raw;
            }
            if (t == "b") return raw == "1";
            if (t == "e") return null;
            double d;
            if (!double.TryParse(raw, NumberStyles.Any, CultureInfo.InvariantCulture, out d)) return raw.Length == 0 ? null : (object)raw;
            XAttribute sAttr = c.Attribute("s");
            if (sAttr != null)
            {
                int si;
                if (int.TryParse(sAttr.Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out si) && si >= 0 && si < isDate.Count && isDate[si])
                {
                    try { return DateTime.FromOADate(d); } catch { }
                }
            }
            return d;
        }
    }

    // ------------------------------------------------------------------ ghi XLSX
    public class Spec
    {
        public bool Bold;
        public double Size = 11;
        public bool Fill;
        public bool Wrap;
        public string VAlign;
        public bool Money;
        public Spec Copy()
        {
            var s = new Spec(); s.Bold = Bold; s.Size = Size; s.Fill = Fill; s.Wrap = Wrap; s.VAlign = VAlign; s.Money = Money; return s;
        }
        public string Key()
        {
            return (Bold ? "B" : "-") + Size.ToString(CultureInfo.InvariantCulture) + (Fill ? "F" : "-") + (Wrap ? "W" : "-") + (VAlign ?? "") + (Money ? "M" : "-");
        }
    }

    public class WSheet
    {
        public string Name;
        public List<List<object>> Rows = new List<List<object>>();
        public Dictionary<long, Spec> Styles = new Dictionary<long, Spec>();
        public double[] Widths;
        public int FreezeRows; // so dong dong bang (8 => A9)

        public WSheet(string name) { Name = name; }

        public int Count { get { return Rows.Count; } }

        public void Add(params object[] cells) { Rows.Add(new List<object>(cells ?? new object[0])); }
        public void Add(IEnumerable<object> cells) { Rows.Add(new List<object>(cells)); }

        static long Key(int r, int c) { return ((long)r << 20) | (uint)c; }

        public Spec At(int r, int c)
        {
            long k = Key(r, c);
            Spec s;
            if (!Styles.TryGetValue(k, out s)) { s = new Spec(); Styles[k] = s; }
            return s;
        }

        public void StyleRow(int r, bool bold, double size, bool fill, bool wrap, string vAlign)
        {
            if (r < 1 || r > Rows.Count) return;
            int n = Rows[r - 1].Count;
            for (int c = 1; c <= n; c++)
            {
                Spec s = At(r, c);
                s.Bold = bold; s.Size = size; s.Fill = fill; s.Wrap = wrap; s.VAlign = vAlign;
            }
        }

        public void StyleCell(int r, int c, bool bold, double size)
        {
            Spec s = At(r, c); s.Bold = bold; s.Size = size;
        }

        public void MoneyFmt(int minRow, int[] cols)
        {
            for (int r = minRow; r <= Rows.Count; r++)
            {
                List<object> row = Rows[r - 1];
                for (int i = 0; i < cols.Length; i++)
                {
                    int c = cols[i];
                    if (c < 1 || c > row.Count) continue;
                    object v = row[c - 1];
                    if (v is double || v is int || v is long) At(r, c).Money = true;
                }
            }
        }

        public void WrapFrom(int minRow, string vAlign)
        {
            for (int r = minRow; r <= Rows.Count; r++)
            {
                int n = Rows[r - 1].Count;
                for (int c = 1; c <= n; c++) { Spec s = At(r, c); s.Wrap = true; s.VAlign = vAlign; }
            }
        }
    }

    public class WBook
    {
        public List<WSheet> Sheets = new List<WSheet>();
        public WSheet Add(string name) { var s = new WSheet(name); Sheets.Add(s); return s; }

        static string Esc(string s)
        {
            var sb = new StringBuilder(s.Length + 16);
            for (int i = 0; i < s.Length; i++)
            {
                char c = s[i];
                if (c == '&') sb.Append("&amp;");
                else if (c == '<') sb.Append("&lt;");
                else if (c == '>') sb.Append("&gt;");
                else if (c == '"') sb.Append("&quot;");
                else if (c < 0x20 && c != '\t' && c != '\n' && c != '\r') { }
                else sb.Append(c);
            }
            return sb.ToString();
        }

        static string ColName(int n)
        {
            string s = "";
            while (n > 0) { int m = (n - 1) % 26; s = (char)('A' + m) + s; n = (n - 1) / 26; }
            return s;
        }

        public void Save(string path)
        {
            // gom style
            var keys = new List<string>();
            var specs = new List<Spec>();
            var index = new Dictionary<string, int>();
            index[new Spec().Key()] = 0; keys.Add(new Spec().Key()); specs.Add(new Spec());
            foreach (WSheet ws in Sheets)
                foreach (var kv in ws.Styles)
                {
                    string k = kv.Value.Key();
                    if (!index.ContainsKey(k)) { index[k] = keys.Count; keys.Add(k); specs.Add(kv.Value); }
                }

            string dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir)) Directory.CreateDirectory(dir);
            if (File.Exists(path)) File.Delete(path);
            using (FileStream fs = new FileStream(path, FileMode.CreateNew, FileAccess.Write))
            using (var zip = new ZipArchive(fs, ZipArchiveMode.Create))
            {
                var ct = new StringBuilder();
                ct.Append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">");
                ct.Append("<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/>");
                ct.Append("<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>");
                for (int i = 0; i < Sheets.Count; i++)
                    ct.Append("<Override PartName=\"/xl/worksheets/sheet" + (i + 1) + ".xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>");
                ct.Append("<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/></Types>");
                WriteEntry(zip, "[Content_Types].xml", ct.ToString());

                WriteEntry(zip, "_rels/.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");

                var wb = new StringBuilder();
                wb.Append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets>");
                for (int i = 0; i < Sheets.Count; i++)
                    wb.Append("<sheet name=\"" + Esc(Sheets[i].Name) + "\" sheetId=\"" + (i + 1) + "\" r:id=\"rId" + (i + 1) + "\"/>");
                wb.Append("</sheets></workbook>");
                WriteEntry(zip, "xl/workbook.xml", wb.ToString());

                var rel = new StringBuilder();
                rel.Append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">");
                for (int i = 0; i < Sheets.Count; i++)
                    rel.Append("<Relationship Id=\"rId" + (i + 1) + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet" + (i + 1) + ".xml\"/>");
                rel.Append("<Relationship Id=\"rId" + (Sheets.Count + 1) + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>");
                rel.Append("</Relationships>");
                WriteEntry(zip, "xl/_rels/workbook.xml.rels", rel.ToString());

                WriteEntry(zip, "xl/styles.xml", BuildStyles(specs));

                for (int i = 0; i < Sheets.Count; i++)
                    WriteEntry(zip, "xl/worksheets/sheet" + (i + 1) + ".xml", BuildSheet(Sheets[i], index));
            }
        }

        static void WriteEntry(ZipArchive zip, string name, string content)
        {
            ZipArchiveEntry e = zip.CreateEntry(name, CompressionLevel.Optimal);
            using (Stream s = e.Open())
            {
                byte[] b = new UTF8Encoding(false).GetBytes(content);
                s.Write(b, 0, b.Length);
            }
        }

        static string BuildStyles(List<Spec> specs)
        {
            // fonts: 0 = thuong 11, 1 = dam 11, 2 = dam 12
            var sb = new StringBuilder();
            sb.Append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">");
            sb.Append("<fonts count=\"3\">");
            sb.Append("<font><sz val=\"11\"/><name val=\"Calibri\"/><family val=\"2\"/></font>");
            sb.Append("<font><b/><sz val=\"11\"/><name val=\"Calibri\"/><family val=\"2\"/></font>");
            sb.Append("<font><b/><sz val=\"12\"/><name val=\"Calibri\"/><family val=\"2\"/></font>");
            sb.Append("</fonts>");
            sb.Append("<fills count=\"3\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFDDEBF7\"/><bgColor indexed=\"64\"/></patternFill></fill></fills>");
            sb.Append("<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>");
            sb.Append("<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>");
            sb.Append("<cellXfs count=\"" + specs.Count + "\">");
            foreach (Spec s in specs)
            {
                int font = s.Bold ? (s.Size >= 12 ? 2 : 1) : 0;
                int fill = s.Fill ? 2 : 0;
                int nf = s.Money ? 3 : 0;
                bool align = s.Wrap || !string.IsNullOrEmpty(s.VAlign);
                sb.Append("<xf numFmtId=\"" + nf + "\" fontId=\"" + font + "\" fillId=\"" + fill + "\" borderId=\"0\" xfId=\"0\"");
                sb.Append(" applyFont=\"1\" applyFill=\"1\" applyNumberFormat=\"1\"");
                if (align) sb.Append(" applyAlignment=\"1\"");
                if (align)
                {
                    sb.Append("><alignment");
                    if (s.Wrap) sb.Append(" wrapText=\"1\"");
                    if (!string.IsNullOrEmpty(s.VAlign)) sb.Append(" vertical=\"" + s.VAlign + "\"");
                    sb.Append("/></xf>");
                }
                else sb.Append("/>");
            }
            sb.Append("</cellXfs>");
            sb.Append("<cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>");
            return sb.ToString();
        }

        static string BuildSheet(WSheet ws, Dictionary<string, int> index)
        {
            var sb = new StringBuilder(1 << 16);
            sb.Append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">");
            if (ws.FreezeRows > 0)
            {
                sb.Append("<sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"" + ws.FreezeRows + "\" topLeftCell=\"A" + (ws.FreezeRows + 1) + "\" activePane=\"bottomLeft\" state=\"frozen\"/><selection pane=\"bottomLeft\"/></sheetView></sheetViews>");
            }
            if (ws.Widths != null && ws.Widths.Length > 0)
            {
                sb.Append("<cols>");
                for (int i = 0; i < ws.Widths.Length; i++)
                    sb.Append("<col min=\"" + (i + 1) + "\" max=\"" + (i + 1) + "\" width=\"" + ws.Widths[i].ToString(CultureInfo.InvariantCulture) + "\" customWidth=\"1\"/>");
                sb.Append("</cols>");
            }
            sb.Append("<sheetData>");
            for (int r = 1; r <= ws.Rows.Count; r++)
            {
                List<object> row = ws.Rows[r - 1];
                var cells = new StringBuilder();
                for (int c = 1; c <= row.Count; c++)
                {
                    object v = row[c - 1];
                    Spec sp = null;
                    long k = ((long)r << 20) | (uint)c;
                    ws.Styles.TryGetValue(k, out sp);
                    int sid = 0;
                    if (sp != null) index.TryGetValue(sp.Key(), out sid);
                    bool empty = v == null || (v is string && ((string)v).Length == 0);
                    if (empty && sid == 0) continue;
                    string refr = ColName(c) + r;
                    if (empty) { cells.Append("<c r=\"" + refr + "\" s=\"" + sid + "\"/>"); continue; }
                    if (v is double || v is int || v is long)
                    {
                        double d = v is double ? (double)v : (v is int ? (int)v : (long)v);
                        string num = (d == Math.Floor(d) && Math.Abs(d) < 1e15) ? ((long)d).ToString(CultureInfo.InvariantCulture) : d.ToString("R", CultureInfo.InvariantCulture);
                        cells.Append("<c r=\"" + refr + "\"" + (sid > 0 ? " s=\"" + sid + "\"" : "") + "><v>" + num + "</v></c>");
                    }
                    else
                    {
                        cells.Append("<c r=\"" + refr + "\"" + (sid > 0 ? " s=\"" + sid + "\"" : "") + " t=\"inlineStr\"><is><t xml:space=\"preserve\">" + Esc(U.ToStr(v)) + "</t></is></c>");
                    }
                }
                if (cells.Length > 0) sb.Append("<row r=\"" + r + "\">" + cells + "</row>");
            }
            sb.Append("</sheetData></worksheet>");
            return sb.ToString();
        }
    }
}
