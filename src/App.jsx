// =============================================================================
//  src/App.jsx
//  Dashboard احترافية لتحليل البنية التحتية لشبكات الاتصالات
//  الألوان: Dark Mode — كحلي (#0f172a) + سماوي (#38bdf8)
//  التشغيل: npm run dev  (بعد: npm create vite@latest . -- --template react)
// =============================================================================

import { useState } from "react";

// ─── ثوابت ───────────────────────────────────────────────────────────────────
// تم ربط الواجهة بالسيرفر الحي على PythonAnywhere بنجاح!
const BACKEND_URL = "https://omar21.pythonanywhere.com/predict_by_location";
const IP_API_URL  = "https://ipapi.co/json/";

// ─── مكوّن: بطاقة عامة (Card Shell) ─────────────────────────────────────────
function Card({ title, icon, children, borderColor = "#38bdf8" }) {
  return (
    <div style={{
      background    : "#1e293b",
      border        : `1px solid ${borderColor}`,
      borderRadius  : "16px",
      padding       : "24px",
      flex          : "1 1 280px",
      minWidth      : "280px",
      boxShadow     : `0 0 20px ${borderColor}22`,
      transition    : "transform 0.2s",
    }}>
      {/* رأس البطاقة */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <span style={{ fontSize: "1.6rem" }}>{icon}</span>
        <h3 style={{
          margin     : 0,
          color      : borderColor,
          fontSize   : "1rem",
          fontWeight : 700,
          letterSpacing: "0.5px",
        }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── مكوّن: صف بيانات (Label + Value) ───────────────────────────────────────
function DataRow({ label, value, valueColor }) {
  return (
    <div style={{
      display        : "flex",
      justifyContent : "space-between",
      alignItems     : "center",
      padding        : "8px 0",
      borderBottom   : "1px solid #334155",
    }}>
      <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{label}</span>
      <span style={{
        color      : valueColor || "#e2e8f0",
        fontWeight : 600,
        fontSize   : "0.92rem",
      }}>{value}</span>
    </div>
  );
}

// ─── مكوّن: شريط التقدم (Progress Bar) ──────────────────────────────────────
function ProgressBar({ value, max = 100, color = "#38bdf8" }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{
      background   : "#0f172a",
      borderRadius : "99px",
      height       : "10px",
      overflow     : "hidden",
      marginTop    : "6px",
    }}>
      <div style={{
        width      : `${pct}%`,
        height     : "100%",
        background : `linear-gradient(90deg, ${color}, ${color}cc)`,
        borderRadius: "99px",
        transition : "width 1s ease",
      }} />
    </div>
  );
}

// ─── المكوّن الرئيسي ─────────────────────────────────────────────────────────
export default function App() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [result,   setResult]   = useState(null);
  const [userInfo, setUserInfo] = useState(null);  // بيانات الموقع المُجلَبة

  // ── الدالة الرئيسية: رصد الموقع وإرسال الطلب ─────────────────────────────
  async function handleDetectAndReport() {
    setLoading(true);
    setError(null);
    setResult(null);
    setUserInfo(null);

    try {
      // ── الخطوة 1: جلب موقع المستخدم عبر ipapi.co ──────────────────────
      const geoRes  = await fetch(IP_API_URL);
      if (!geoRes.ok) throw new Error("فشل جلب بيانات الموقع من ipapi.co");
      const geoData = await geoRes.json();

      const latitude    = geoData.latitude;
      const longitude   = geoData.longitude;
      const governorate = geoData.region || geoData.city || "";
      const ip          = geoData.ip;
      const country     = geoData.country_name;

      setUserInfo({ ip, latitude, longitude, governorate, country });

      // ── الخطوة 2: إرسال البيانات للـ Backend ──────────────────────────
      const backendRes = await fetch(BACKEND_URL, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({ latitude, longitude, governorate }),
      });

      if (!backendRes.ok) {
        const errData = await backendRes.json().catch(() => ({}));
        throw new Error(errData.error || `خطأ من السيرفر: ${backendRes.status}`);
      }

      const data = await backendRes.json();
      setResult(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── ألوان ديناميكية بناءً على النتيجة ────────────────────────────────────
  const aiColor      = result?.ai_analysis?.is_overloaded ? "#ef4444" : "#22c55e";
  const stressColor  = result?.governorate?.under_stress  ? "#f59e0b" : "#22c55e";

  // ─────────────────────────────────────────────────────────────────────────
  // الواجهة (JSX)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight  : "100vh",
      background : "#0f172a",
      color      : "#e2e8f0",
      fontFamily : "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      direction  : "rtl",
    }}>

      {/* ── شريط العنوان العلوي ───────────────────────────────────────────── */}
      <header style={{
        background    : "#1e293b",
        borderBottom  : "1px solid #334155",
        padding       : "20px 40px",
        display       : "flex",
        alignItems    : "center",
        gap           : "16px",
        boxShadow     : "0 4px 20px #00000044",
      }}>
        <span style={{ fontSize: "2rem" }}>📡</span>
        <div>
          <h1 style={{
            margin     : 0,
            fontSize   : "1.4rem",
            fontWeight : 800,
            background : "linear-gradient(90deg, #38bdf8, #818cf8)",
            WebkitBackgroundClip : "text",
            WebkitTextFillColor  : "transparent",
          }}>
            نظام مراقبة شبكات الاتصالات — Telecom Tower Monitor
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.82rem" }}>
            تحليل البنية التحتية باستخدام الذكاء الاصطناعي والبيانات الجغرافية
          </p>
        </div>
      </header>

      {/* ── المحتوى الرئيسي ──────────────────────────────────────────────── */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px" }}>

        {/* ── بطاقة الترحيب والزر ───────────────────────────────────────── */}
        <div style={{
          background   : "linear-gradient(135deg, #1e293b 0%, #0f2744 100%)",
          border       : "1px solid #38bdf833",
          borderRadius : "20px",
          padding      : "40px",
          textAlign    : "center",
          marginBottom : "36px",
          boxShadow    : "0 0 60px #38bdf811",
        }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🛰️</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "1.5rem", color: "#38bdf8" }}>
            مراقبة الشبكة في الوقت الفعلي
          </h2>
          <p style={{ color: "#94a3b8", marginBottom: "32px", lineHeight: 1.7 }}>
            اضغط الزر أدناه لرصد موقعك تلقائياً والحصول على تقرير شامل<br />
            عن أقرب برج اتصالات وتقييم حالته بالذكاء الاصطناعي
          </p>

          {/* ── زر الرصد الرئيسي ───────────────────────────────────────── */}
          <button
            onClick={handleDetectAndReport}
            disabled={loading}
            style={{
              background    : loading
                ? "#334155"
                : "linear-gradient(135deg, #0284c7, #38bdf8)",
              color         : "#fff",
              border        : "none",
              borderRadius  : "14px",
              padding       : "16px 48px",
              fontSize      : "1.05rem",
              fontWeight    : 700,
              cursor        : loading ? "not-allowed" : "pointer",
              boxShadow     : loading ? "none" : "0 0 30px #38bdf844",
              transition    : "all 0.3s",
              letterSpacing : "0.5px",
              display       : "inline-flex",
              alignItems    : "center",
              gap           : "10px",
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                جارٍ التحليل...
              </>
            ) : (
              <>📍 رصد الموقع وإصدار التقرير</>
            )}
          </button>
        </div>

        {/* ── بيانات موقع المستخدم (تظهر بعد الجلب) ────────────────────── */}
        {userInfo && (
          <div style={{
            background   : "#1e293b",
            border       : "1px solid #334155",
            borderRadius : "12px",
            padding      : "16px 24px",
            marginBottom : "28px",
            display      : "flex",
            flexWrap     : "wrap",
            gap          : "20px",
            alignItems   : "center",
          }}>
            <span style={{ color: "#64748b", fontSize: "0.8rem" }}>📌 موقعك المُكتشف:</span>
            {[
              { label: "IP",           value: userInfo.ip },
              { label: "خط العرض",     value: userInfo.latitude?.toFixed(4) },
              { label: "خط الطول",     value: userInfo.longitude?.toFixed(4) },
              { label: "المحافظة",      value: userInfo.governorate },
              { label: "الدولة",       value: userInfo.country },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{label}:</span>
                <span style={{ color: "#38bdf8", fontWeight: 600, fontSize: "0.85rem" }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── رسالة الخطأ ──────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background   : "#450a0a",
            border       : "1px solid #ef4444",
            borderRadius : "12px",
            padding      : "16px 24px",
            color        : "#fca5a5",
            marginBottom : "28px",
            display      : "flex",
            gap          : "10px",
            alignItems   : "center",
          }}>
            <span style={{ fontSize: "1.4rem" }}>⚠️</span>
            <div>
              <strong>حدث خطأ:</strong> {error}
              <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "4px" }}>
                يرجى التأكد من اتصالك بالإنترنت وأن السيرفر يعمل بشكل صحيح.
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ثلاث بطاقات النتائج
        ══════════════════════════════════════════════════════════════════ */}
        {result && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>

            {/* ── البطاقة 1: التقييم العام للمحافظة ───────────────────── */}
            <Card
              title="التقييم العام للمحافظة"
              icon="🗺️"
              borderColor={stressColor}
            >
              <DataRow
                label="المحافظة"
                value={result.governorate.name}
                valueColor="#38bdf8"
              />
              <DataRow
                label="نطاق البحث"
                value={result.governorate.search_scope}
              />
              <DataRow
                label="حالة الشبكة"
                value={result.governorate.stress_label}
                valueColor={stressColor}
              />
              <DataRow
                label="إجمالي الأبراج"
                value={result.governorate.total_towers.toLocaleString("ar-EG")}
              />
              <DataRow
                label="أبراج عالية الخطورة"
                value={`${result.governorate.high_risk_towers.toLocaleString("ar-EG")} (${result.governorate.high_risk_pct}%)`}
                valueColor="#f59e0b"
              />

              {/* متوسط Risk Score مع شريط تقدم */}
              <div style={{ marginTop: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>متوسط درجة الخطورة</span>
                  <span style={{ color: stressColor, fontWeight: 700 }}>
                    {result.governorate.avg_risk_score}
                  </span>
                </div>
                <ProgressBar
                  value={result.governorate.avg_risk_score}
                  max={10}       /* Risk_Score مدى 0-10 تقريباً في البيانات */
                  color={stressColor}
                />
              </div>
            </Card>

            {/* ── البطاقة 2: بيانات أقرب برج ─────────────────────────── */}
            <Card
              title="أقرب برج اتصالات"
              icon="📶"
              borderColor="#818cf8"
            >
              <DataRow
                label="كود البرج (Tower ID)"
                value={result.nearest_tower.tower_id}
                valueColor="#818cf8"
              />
              <DataRow
                label="شركة التشغيل"
                value={result.nearest_tower.network_operator}
                valueColor="#e2e8f0"
              />
              <DataRow
                label="المسافة عنك"
                value={result.nearest_tower.distance_formatted}
                valueColor="#38bdf8"
              />
              <DataRow
                label="المسافة (أمتار)"
                value={`${result.nearest_tower.distance_meters.toLocaleString("ar-EG")} م`}
              />
              <DataRow
                label="مستوى الخطورة المسجّل"
                value={result.nearest_tower.risk_level}
                valueColor={
                  result.nearest_tower.risk_level === "High Risk"   ? "#ef4444" :
                  result.nearest_tower.risk_level === "Medium Risk" ? "#f59e0b" :
                  "#22c55e"
                }
              />

              {/* مؤشر المسافة بصري */}
              <div style={{ marginTop: "16px", textAlign: "center" }}>
                <div style={{
                  display       : "inline-block",
                  background    : "#0f172a",
                  borderRadius  : "12px",
                  padding       : "12px 24px",
                  border        : "1px solid #818cf844",
                }}>
                  <div style={{ fontSize: "2rem" }}>📍</div>
                  <div style={{ color: "#818cf8", fontWeight: 700, fontSize: "1.1rem" }}>
                    {result.nearest_tower.distance_formatted}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem" }}>من موقعك الحالي</div>
                </div>
              </div>
            </Card>

            {/* ── البطاقة 3: تحليل الذكاء الاصطناعي ──────────────────── */}
            <Card
              title="تحليل الذكاء الاصطناعي"
              icon="🤖"
              borderColor={aiColor}
            >
              {/* حكم النموذج الكبير */}
              <div style={{
                textAlign    : "center",
                padding      : "20px",
                background   : `${aiColor}11`,
                borderRadius : "12px",
                border       : `1px solid ${aiColor}44`,
                marginBottom : "18px",
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "8px" }}>
                  {result.ai_analysis.is_overloaded ? "🔴" : "🟢"}
                </div>
                <div style={{
                  color      : aiColor,
                  fontSize   : "1.4rem",
                  fontWeight : 800,
                }}>
                  {result.ai_analysis.status_arabic}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "4px" }}>
                  {result.ai_analysis.status_english}
                </div>
              </div>

              {/* نسبة الثقة */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>نسبة ثقة النموذج</span>
                  <span style={{ color: aiColor, fontWeight: 700 }}>
                    {result.ai_analysis.confidence_pct}%
                  </span>
                </div>
                <ProgressBar value={result.ai_analysis.confidence_pct} color={aiColor} />
              </div>

              {/* ملاحظة */}
              <div style={{
                background   : "#0f172a",
                borderRadius : "10px",
                padding      : "12px 16px",
                color        : "#94a3b8",
                fontSize     : "0.82rem",
                lineHeight   : 1.6,
                borderRight  : `3px solid ${aiColor}`,
              }}>
                💡 {result.ai_analysis.note}
              </div>
            </Card>

          </div>
        )}

        {/* ── Timestamp ──────────────────────────────────────────────────── */}
        {result && (
          <div style={{
            textAlign  : "center",
            marginTop  : "32px",
            color      : "#334155",
            fontSize   : "0.75rem",
          }}>
            آخر تحليل: {new Date().toLocaleString("ar-EG")}
          </div>
        )}

      </main>

      {/* ── CSS Keyframes (حركة التحميل) ─────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}