import { useState, useEffect, useRef } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const TOWERS_URL  = import.meta.env.VITE_BACKEND_URL?.replace("predict_by_location", "towers_near");

function Card({ title, icon, children, borderColor = "#38bdf8" }) {
  return (
    <div style={{
      background   : "#1e293b",
      border       : `1px solid ${borderColor}`,
      borderRadius : "16px",
      padding      : "24px",
      flex         : "1 1 280px",
      minWidth     : "280px",
      boxShadow    : `0 0 20px ${borderColor}22`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <span style={{ fontSize: "1.6rem" }}>{icon}</span>
        <h3 style={{ margin: 0, color: borderColor, fontSize: "1rem", fontWeight: 700 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

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
      <span style={{ color: valueColor || "#e2e8f0", fontWeight: 600, fontSize: "0.92rem" }}>{value}</span>
    </div>
  );
}

function ProgressBar({ value, max = 100, color = "#38bdf8" }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ background: "#0f172a", borderRadius: "99px", height: "10px", overflow: "hidden", marginTop: "6px" }}>
      <div style={{
        width       : `${pct}%`,
        height      : "100%",
        background  : `linear-gradient(90deg, ${color}, ${color}cc)`,
        borderRadius: "99px",
        transition  : "width 1s ease",
      }} />
    </div>
  );
}

export default function App() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [result,   setResult]   = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [towers,   setTowers]   = useState([]);

  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const towersLayerRef = useRef(null);

  // ── تهيئة الخريطة لما يتحدد الموقع ──────────────────────────────────────
  useEffect(() => {
    if (!userInfo || !mapRef.current || !window.L) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = window.L.map(mapRef.current).setView(
      [userInfo.latitude, userInfo.longitude], 13
    );

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    const userIcon = window.L.divIcon({
      html     : `<div style="font-size:28px;line-height:1;">📍</div>`,
      className: "",
      iconSize : [30, 30],
      iconAnchor: [15, 30],
    });

    window.L.marker([userInfo.latitude, userInfo.longitude], { icon: userIcon })
      .addTo(map)
      .bindPopup("<b>موقعك الحالي</b>")
      .openPopup();

    towersLayerRef.current = window.L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
  }, [userInfo]);

  // ── إضافة أبراج على الخريطة لما تيجي من الـ backend ─────────────────────
  useEffect(() => {
    if (!towers.length || !towersLayerRef.current || !window.L) return;

    towersLayerRef.current.clearLayers();

    towers.forEach((tower) => {
      const emoji =
        tower.risk_level === "High Risk"   ? "🔴" :
        tower.risk_level === "Medium Risk" ? "🟡" : "🟢";

      const icon = window.L.divIcon({
        html     : `<div style="font-size:18px;line-height:1;">${emoji}</div>`,
        className: "",
        iconSize : [22, 22],
        iconAnchor: [11, 11],
      });

      window.L.marker([tower.lat, tower.lon], { icon })
        .addTo(towersLayerRef.current)
        .bindPopup(`
          <div style="direction:rtl;font-family:sans-serif;min-width:160px;">
            <b style="color:#0284c7;">${tower.tower_id}</b><br/>
            <span>${tower.network_operator}</span><br/>
            <span>${tower.government}</span><br/>
            <span style="color:${
              tower.risk_level === "High Risk"   ? "#ef4444" :
              tower.risk_level === "Medium Risk" ? "#f59e0b" : "#22c55e"
            };">${tower.risk_level}</span><br/>
            <span style="color:#64748b;">${tower.distance_m.toLocaleString()} م</span>
          </div>
        `);
    });
  }, [towers]);

  // ── الدالة الرئيسية ───────────────────────────────────────────────────────
  async function handleDetectAndReport() {
    setLoading(true);
    setError(null);
    setResult(null);
    setUserInfo(null);
    setTowers([]);

    try {
      if (!navigator.geolocation) throw new Error("متصفحك لا يدعم خاصية GPS");

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout           : 10000,
          maximumAge        : 0,
        });
      });

      const latitude  = position.coords.latitude;
      const longitude = position.coords.longitude;

      const geoRes  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      );
      const geoData = await geoRes.json();
      const governorate =
        geoData.address?.state  ||
        geoData.address?.county ||
        geoData.address?.city   || "";

      setUserInfo({ latitude, longitude, governorate });

      const [backendRes, towersRes] = await Promise.all([
        fetch(BACKEND_URL, {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({ latitude, longitude, governorate }),
        }),
        fetch(TOWERS_URL, {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({ latitude, longitude, n: 100 }),
        }),
      ]);

      if (!backendRes.ok) {
        const errData = await backendRes.json().catch(() => ({}));
        throw new Error(errData.error || `خطأ من السيرفر: ${backendRes.status}`);
      }

      const data       = await backendRes.json();
      const towersData = await towersRes.json();

      setResult(data);
      setTowers(towersData.towers || []);

    } catch (err) {
      if (err.code === 1)      setError("رفضت السماح بالوصول للموقع.");
      else if (err.code === 2) setError("تعذّر تحديد موقعك. تأكد من تفعيل GPS.");
      else if (err.code === 3) setError("انتهت مهلة تحديد الموقع. حاول مرة أخرى.");
      else                     setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const aiColor     = result?.ai_analysis?.is_overloaded ? "#ef4444" : "#22c55e";
  const stressColor = result?.governorate?.under_stress  ? "#f59e0b" : "#22c55e";

  return (
    <div style={{
      minHeight : "100vh",
      background: "#0f172a",
      color     : "#e2e8f0",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      direction : "rtl",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        background  : "#1e293b",
        borderBottom: "1px solid #334155",
        padding     : "20px 40px",
        display     : "flex",
        alignItems  : "center",
        gap         : "16px",
        boxShadow   : "0 4px 20px #00000044",
      }}>
        <span style={{ fontSize: "2rem" }}>📡</span>
        <div>
          <h1 style={{
            margin              : 0,
            fontSize            : "1.4rem",
            fontWeight          : 800,
            background          : "linear-gradient(90deg, #38bdf8, #818cf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor : "transparent",
          }}>
            نظام مراقبة شبكات الاتصالات — Telecom Tower Monitor
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.82rem" }}>
            تحليل البنية التحتية باستخدام الذكاء الاصطناعي والبيانات الجغرافية
          </p>
        </div>
      </header>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px" }}>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div style={{
          background  : "linear-gradient(135deg, #1e293b 0%, #0f2744 100%)",
          border      : "1px solid #38bdf833",
          borderRadius: "20px",
          padding     : "40px",
          textAlign   : "center",
          marginBottom: "36px",
          boxShadow   : "0 0 60px #38bdf811",
        }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🛰️</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "1.5rem", color: "#38bdf8" }}>
            مراقبة الشبكة في الوقت الفعلي
          </h2>
          <p style={{ color: "#94a3b8", marginBottom: "32px", lineHeight: 1.7 }}>
            اضغط الزر أدناه للسماح بالوصول لموقعك عبر GPS<br />
            والحصول على تقرير شامل عن أقرب برج اتصالات
          </p>

          <button
            onClick={handleDetectAndReport}
            disabled={loading}
            style={{
              background   : loading ? "#334155" : "linear-gradient(135deg, #0284c7, #38bdf8)",
              color        : "#fff",
              border       : "none",
              borderRadius : "14px",
              padding      : "16px 48px",
              fontSize     : "1.05rem",
              fontWeight   : 700,
              cursor       : loading ? "not-allowed" : "pointer",
              boxShadow    : loading ? "none" : "0 0 30px #38bdf844",
              transition   : "all 0.3s",
              display      : "inline-flex",
              alignItems   : "center",
              gap          : "10px",
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                جارٍ التحليل...
              </>
            ) : (
              <>📍 تحديد موقعي عبر GPS وإصدار التقرير</>
            )}
          </button>
        </div>

        {/* ── User Info ──────────────────────────────────────────────────── */}
        {userInfo && (
          <div style={{
            background  : "#1e293b",
            border      : "1px solid #334155",
            borderRadius: "12px",
            padding     : "16px 24px",
            marginBottom: "28px",
            display     : "flex",
            flexWrap    : "wrap",
            gap         : "20px",
            alignItems  : "center",
          }}>
            <span style={{ color: "#64748b", fontSize: "0.8rem" }}>📌 موقعك المُكتشف:</span>
            {[
              { label: "خط العرض", value: userInfo.latitude?.toFixed(4) },
              { label: "خط الطول", value: userInfo.longitude?.toFixed(4) },
              { label: "المحافظة", value: userInfo.governorate || "جارٍ التحديد..." },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{label}:</span>
                <span style={{ color: "#38bdf8", fontWeight: 600, fontSize: "0.85rem" }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Map ────────────────────────────────────────────────────────── */}
        {userInfo && (
          <div style={{
            background  : "#1e293b",
            border      : "1px solid #334155",
            borderRadius: "16px",
            overflow    : "hidden",
            marginBottom: "28px",
          }}>
            <div style={{
              padding    : "14px 20px",
              borderBottom: "1px solid #334155",
              display    : "flex",
              alignItems : "center",
              gap        : "10px",
            }}>
              <span style={{ fontSize: "1.2rem" }}>🗺️</span>
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>خريطة الأبراج التفاعلية</span>
              <span style={{ color: "#64748b", fontSize: "0.8rem", marginRight: "auto" }}>
                🔴 خطورة عالية &nbsp; 🟡 خطورة متوسطة &nbsp; 🟢 مستقر &nbsp; 📍 موقعك
              </span>
            </div>
            <div
              ref={mapRef}
              style={{ height: "420px", width: "100%" }}
            />
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background  : "#450a0a",
            border      : "1px solid #ef4444",
            borderRadius: "12px",
            padding     : "16px 24px",
            color       : "#fca5a5",
            marginBottom: "28px",
            display     : "flex",
            gap         : "10px",
            alignItems  : "center",
          }}>
            <span style={{ fontSize: "1.4rem" }}>⚠️</span>
            <div>
              <strong>حدث خطأ:</strong> {error}
              <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "4px" }}>
                تأكد من السماح للمتصفح بالوصول لموقعك وأن GPS مفعّل.
              </div>
            </div>
          </div>
        )}

        {/* ── Results ────────────────────────────────────────────────────── */}
        {result && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>

            <Card title="التقييم العام للمحافظة" icon="🗺️" borderColor={stressColor}>
              <DataRow label="المحافظة"          value={result.governorate.name}          valueColor="#38bdf8" />
              <DataRow label="نطاق البحث"         value={result.governorate.search_scope} />
              <DataRow label="حالة الشبكة"        value={result.governorate.stress_label} valueColor={stressColor} />
              <DataRow label="إجمالي الأبراج"     value={result.governorate.total_towers.toLocaleString("ar-EG")} />
              <DataRow
                label="أبراج عالية الخطورة"
                value={`${result.governorate.high_risk_towers.toLocaleString("ar-EG")} (${result.governorate.high_risk_pct}%)`}
                valueColor="#f59e0b"
              />
              <div style={{ marginTop: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>متوسط درجة الخطورة</span>
                  <span style={{ color: stressColor, fontWeight: 700 }}>{result.governorate.avg_risk_score}</span>
                </div>
                <ProgressBar value={result.governorate.avg_risk_score} max={10} color={stressColor} />
              </div>
            </Card>

            <Card title="أقرب برج اتصالات" icon="📶" borderColor="#818cf8">
              <DataRow label="كود البرج"      value={result.nearest_tower.tower_id}           valueColor="#818cf8" />
              <DataRow label="شركة التشغيل"   value={result.nearest_tower.network_operator}   valueColor="#e2e8f0" />
              <DataRow label="المسافة عنك"    value={result.nearest_tower.distance_formatted}  valueColor="#38bdf8" />
              <DataRow label="المسافة (أمتار)" value={`${result.nearest_tower.distance_meters.toLocaleString("ar-EG")} م`} />
              <DataRow
                label="مستوى الخطورة"
                value={result.nearest_tower.risk_level}
                valueColor={
                  result.nearest_tower.risk_level === "High Risk"   ? "#ef4444" :
                  result.nearest_tower.risk_level === "Medium Risk" ? "#f59e0b" : "#22c55e"
                }
              />
              <div style={{ marginTop: "16px", textAlign: "center" }}>
                <div style={{
                  display     : "inline-block",
                  background  : "#0f172a",
                  borderRadius: "12px",
                  padding     : "12px 24px",
                  border      : "1px solid #818cf844",
                }}>
                  <div style={{ fontSize: "2rem" }}>📍</div>
                  <div style={{ color: "#818cf8", fontWeight: 700, fontSize: "1.1rem" }}>
                    {result.nearest_tower.distance_formatted}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem" }}>من موقعك الحالي</div>
                </div>
              </div>
            </Card>

            <Card title="تحليل الذكاء الاصطناعي" icon="🤖" borderColor={aiColor}>
              <div style={{
                textAlign   : "center",
                padding     : "20px",
                background  : `${aiColor}11`,
                borderRadius: "12px",
                border      : `1px solid ${aiColor}44`,
                marginBottom: "18px",
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "8px" }}>
                  {result.ai_analysis.is_overloaded ? "🔴" : "🟢"}
                </div>
                <div style={{ color: aiColor, fontSize: "1.4rem", fontWeight: 800 }}>
                  {result.ai_analysis.status_arabic}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "4px" }}>
                  {result.ai_analysis.status_english}
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>نسبة ثقة النموذج</span>
                  <span style={{ color: aiColor, fontWeight: 700 }}>{result.ai_analysis.confidence_pct}%</span>
                </div>
                <ProgressBar value={result.ai_analysis.confidence_pct} color={aiColor} />
              </div>
              <div style={{
                background  : "#0f172a",
                borderRadius: "10px",
                padding     : "12px 16px",
                color       : "#94a3b8",
                fontSize    : "0.82rem",
                lineHeight  : 1.6,
                borderRight : `3px solid ${aiColor}`,
              }}>
                💡 {result.ai_analysis.note}
              </div>
            </Card>

          </div>
        )}

        {result && (
          <div style={{ textAlign: "center", marginTop: "32px", color: "#334155", fontSize: "0.75rem" }}>
            آخر تحليل: {new Date().toLocaleString("ar-EG")}
          </div>
        )}

      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .leaflet-container { font-family: 'Segoe UI', sans-serif; }
        .leaflet-popup-content-wrapper { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; }
        .leaflet-popup-tip { background: #1e293b; }
      `}</style>
    </div>
  );
}
