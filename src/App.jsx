import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import {
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
  import { loginGoogle } from "./firebase";
import { db, auth } from "./firebase";

/* ================= STYLES ================= */
const styles = {
  app: {
    display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", background: "#f6f8fb", color: "#0a2540", backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundSize: "600px", backgroundColor: "#f6f8fb",
  },
  container: {
    width: "100%", maxWidth: 1100, margin: "0 auto", padding: "16px", boxSizing: "border-box",
  },
  toast: {
  position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: "#0a2540", color: "white", padding: "12px 18px", borderRadius: 999, fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", zIndex: 999999, pointerEvents: "none", animation: "fadeIn 0.2s ease",
},
bottomBackground: {
  position: "fixed", bottom: 0, left: 0, width: "100%", height: 300, backgroundImage: "url('/fondomarcadeagua.png')", backgroundRepeat: "no-repeat", backgroundPosition: "bottom center", backgroundSize: "contain", opacity: 0.08, zIndex: 0, pointerEvents: "none",
},
  topBar: {
    width: "100%", background: "white", borderBottom: "1px solid #e6e8ec", padding: "6px 0", display: "flex", justifyContent: "center", position: "sticky", top: 0, zIndex: 1000,
  },
  topBarInner: {
    width: "100%", maxWidth: 1100, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px", flexWrap: "wrap", gap: 10,
  },
  menu: {
    display: "flex", gap: 10,
  },

  button: {
    padding: "8px 14px", borderRadius: 999, border: "1px solid #e6e8ec", background: "#e482da", cursor: "pointer", fontWeight: 600,
  },
  loginButton: {
  padding: "16px 34px", borderRadius: 999, border: "none", background: "#791f8f", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 20, boxShadow: "0 6px 18px rgba(121,31,143,0.25)",
},
  
  watermark: {
  position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 400, opacity: 0.06, zIndex: 0, pointerEvents: "none",
},
  danger: {
    background: "red", color: "white",
  },
  card: {
    background: "#e2a9f1", padding: 20, borderRadius: 12, marginBottom: 20, color: "#000",
  },
  input: {
  width: "100%", padding: "6px 8px", marginTop: 6, fontSize: 13, borderRadius: 6, border: "1px solid #ccc",
}, 
};

export default function App() {
  /* ================= STATE ================= */
  const [user, setUser] = useState(null);
  const [seccion, setSeccion] = useState("facturas");

  const [emisores, setEmisores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [facturas, setFacturas] = useState([]);
const [toast, setToast] = useState(null);
  const showToast = (message) => {
  setToast(message);

  setTimeout(() => {
    setToast(null);
  }, 2500);
};
  const [emisorSel, setEmisorSel] = useState(null);
  const [clienteSel, setClienteSel] = useState(null);

  const ADMIN_EMAIL = "andrea.garcia192@gmail.com";
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [allFacturas, setAllFacturas] = useState([]);
  const loadAllFacturas = async () => {
  const snap = await getDocs(collection(db, "facturas"));
  setAllFacturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
};
  const getBase64Image = (imgUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.src = imgUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
  });
};
  const [emisorForm, setEmisorForm] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
  });

  const [clienteForm, setClienteForm] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
  });

  const [concepto, setConcepto] = useState("");
  const [base, setBase] = useState(0);

  const IVA = 0.21;
  const IRPF = 0.07;

  const iva = base * IVA;
  const irpf = base * IRPF;
  const total = base + iva - irpf;

  /* ================= AUTH ================= */
  useEffect(() => {
  const unsub = onAuthStateChanged(auth, (u) => {
    setUser(u);
    if (u?.uid) loadAll(u.uid);
  });
  return () => unsub();
}, []);


const login = () => loginGoogle();
  const logout = () => signOut(auth);

  /* ================= LOAD ================= */
  const loadAll = async (uid) => {
    const e = await getDocs(query(collection(db, "emisores"), where("uid", "==", uid)));
    const c = await getDocs(query(collection(db, "clientes"), where("uid", "==", uid)));
    const f = await getDocs(query(collection(db, "facturas"), where("uid", "==", uid)));

    setEmisores(e.docs.map(d => ({ id: d.id, ...d.data() })));
    setClientes(c.docs.map(d => ({ id: d.id, ...d.data() })));
    setFacturas(f.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  /* ================= SAVE ================= */
const saveEmisor = async () => {
  if (!user?.uid) return;

  await addDoc(collection(db, "emisores"), {
    uid: user.uid,
    nombre: emisorForm.nombre,
    nif: emisorForm.nif,
    direccion: emisorForm.direccion,
    email: emisorForm.email,
    telefono: emisorForm.telefono,
  });

  loadAll(user.uid);
  showToast("✅ Emisor guardado correctamente");
};

const saveCliente = async () => {
  if (!user?.uid) return;

  try {
    console.log("1 - intentando guardar");

    await addDoc(collection(db, "clientes"), {
      uid: user.uid,
      nombre: clienteForm.nombre,
      nif: clienteForm.nif,
      direccion: clienteForm.direccion,
      email: clienteForm.email,
      telefono: clienteForm.telefono,
    });

    console.log("2 - guardado OK");

    await loadAll(user.uid);

    setToast("✅ Cliente guardado correctamente");

    setTimeout(() => setToast(null), 2500);

  } catch (error) {
    console.error("🔥 ERROR COMPLETO:", error);
    showToast("❌ Error al guardar cliente");
  }
};

  const crearFactura = async () => {
    if (!emisorSel || !clienteSel) return;

    await addDoc(collection(db, "facturas"), {
      uid: user.uid,
      emisorId: emisorSel.id,
      clienteId: clienteSel.id,
      concepto,
      base,
      iva,
      irpf,
      total,
      numero: `${new Date().getFullYear()}-${facturas.length + 1}`,
      fecha: new Date().toISOString(),
    });

    loadAll(user.uid);
    showToast("📄 Factura creada correctamente");
  };
const generarPDF = async (f) => {

  // ================= LOGO FUNCTION PRIMERO =================
  const getBase64Image = (imgUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.src = imgUrl;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL("image/png"));
      };
    });
  };

  const logo = await getBase64Image("/logo.jpg");

  const doc = new jsPDF();

  const emisor = emisores.find(e => e.id === f.emisorId);
  const cliente = clientes.find(c => c.id === f.clienteId);
  const startY = headerHeight + 25;
  const pageW = doc.internal.pageSize.getWidth();


  // LOGO CENTRADO
const headerHeight = 65;
const logoWidth = 85;
const logoHeight = (1181 / 1772) * logoWidth;
const marginLeft = 10;
const logoX = marginLeft;
const logoY = (headerHeight - logoHeight) / 2;
const rightColX = pageW - 50;
// ================= HEADER ================= 
doc.setFillColor(0, 0, 0);
doc.rect(0, 0, pageW, headerHeight, "F");
  
doc.addImage(logo, "JPG", logoX, logoY, logoWidth, logoHeight);
  // TITULO
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Factura", rightColX, 38);

  // ================= INFO =================
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Nº ${f.numero}`, rightColX, 20);
doc.text(new Date(f.fecha).toLocaleDateString(), rightColX, 52);

  // ================= CLIENTE / EMISOR =================
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  

  doc.text("FACTURAR A", 15, startY);
doc.text("EMITIDA POR", 110, startY);

  doc.setFont("helvetica", "normal");
doc.text(cliente?.nombre || "", 15, startY + 10);
doc.text(cliente?.email || "", 15, startY + 17);

doc.text(emisor?.nombre || "", 110, startY + 10);
doc.text(emisor?.email || "", 110, startY + 17);

  // línea separadora
  doc.setDrawColor(230);
  doc.line(15, 100, pageW - 15, 100);

  // ================= TABLA =================
  let y = 120;

  doc.setFont("helvetica", "bold");
  doc.text("Descripción", 15, y);
  doc.text("Base", 120, y, { align: "right" });
  doc.text("IVA", 150, y, { align: "right" });
  doc.text("Total", 190, y, { align: "right" });

  doc.line(15, y + 3, pageW - 15, y + 3);

  y += 15;

  doc.setFont("helvetica", "normal");

  doc.text(f.concepto || "-", 15, y);
  doc.text(`${f.base.toFixed(2)} €`, 120, y, { align: "right" });
  doc.text(`${f.iva.toFixed(2)} €`, 150, y, { align: "right" });
  doc.text(`${f.total.toFixed(2)} €`, 190, y, { align: "right" });

  // ================= TOTAL =================
  y += 40;

  doc.line(110, y, pageW - 15, y);

  y += 10;

  doc.text("Subtotal", 120, y);
  doc.text(`${f.base.toFixed(2)} €`, 190, y, { align: "right" });

  doc.text("IVA", 120, y + 8);
  doc.text(`${f.iva.toFixed(2)} €`, 190, y + 8, { align: "right" });

  doc.text("IRPF", 120, y + 16);
  doc.text(`-${f.irpf.toFixed(2)} €`, 190, y + 16, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);

  doc.text("Total", 120, y + 30);
  doc.text(`${f.total.toFixed(2)} €`, 190, y + 30, { align: "right" });

  // ================= FOOTER =================
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);

  doc.text("Gracias por tu confianza", pageW / 2, 285, {
    align: "center",
  });

  doc.save(`factura-${f.numero}.pdf`);
};
  if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}
  if (!user) {
    return (
      <div style={styles.container}>
        <button style={styles.loginButton} onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div style={styles.app}>
<img src="/fondomarcadeagua.png" style={styles.watermark} />

   {/* TOP BAR */}
<div style={styles.topBar}>
  <div style={styles.topBarInner}>

    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img src="/logo192.png" style={{ width: 32, height: 32 }} />
      <h3 style={{ margin: 0 }}>FactuControl</h3>
    </div>

    <div style={styles.menu}>
    <button style={styles.button} onClick={() => setSeccion("emisor")}>
        Emisor
      </button>

  <button style={styles.button} onClick={() => setSeccion("clientes")}>
    Clientes
  </button>

  <button style={styles.button} onClick={() => setSeccion("facturas")}>
    Facturas
  </button>

  {isAdmin && (
    <button
  style={styles.button}
  onClick={() => {
    setSeccion("admin");
    loadAllFacturas();
  }}
>
  Admin
</button>
  )}

  <button style={{ ...styles.button, ...styles.danger }} onClick={logout}>
    Logout
  </button>
</div>
        </div>
      </div>

      <div style={styles.container}>
         {/* ADMIN */}
{seccion === "admin" && isAdmin && (
  <div style={styles.card}>
    <h3>🔥 Panel Admin - Todas las facturas</h3>

    {allFacturas.map(f => (
      <div key={f.id} style={{ marginBottom: 10 }}>
        <p>
          <b>Nº:</b> {f.numero} | <b>Total:</b> {f.total} €
        </p>

        <p style={{ fontSize: 12, opacity: 0.6 }}>
          UID: {f.uid}
        </p>

        <button onClick={() => generarPDF(f)}>
          PDF
        </button>
      </div>
    ))}
  </div>
)}
        {/* EMISOR */}
        {seccion === "emisor" && (
          <div style={styles.card}>
            <h3>Emisor</h3>
            <input placeholder="Nombre" style={styles.input} onChange={e=>setEmisorForm({...emisorForm,nombre:e.target.value})}/>
            <input placeholder="NIF" style={styles.input} onChange={e=>setEmisorForm({...emisorForm,nif:e.target.value})}/>
            <input placeholder="Dirección" style={styles.input} onChange={e=>setEmisorForm({...emisorForm,direccion:e.target.value})}/>
            <input placeholder="Email" style={styles.input} onChange={e=>setEmisorForm({...emisorForm,email:e.target.value})}/>
            <input placeholder="Teléfono" style={styles.input} onChange={e=>setEmisorForm({...emisorForm,telefono:e.target.value})}/>
            <button style={styles.button} onClick={saveEmisor}>Guardar</button>
          </div>
        )}

        {/* CLIENTES */}
        {seccion === "clientes" && (
          <div style={styles.card}>
            <h3>Clientes</h3>
            
            <input placeholder="Nombre" style={styles.input} onChange={e=>setClienteForm({...clienteForm,nombre:e.target.value})}/>
            <input placeholder="NIF" style={styles.input} onChange={e=>setClienteForm({...clienteForm,nif:e.target.value})}/>
            <input placeholder="Dirección" style={styles.input} onChange={e=>setClienteForm({...clienteForm,direccion:e.target.value})}/>
            <input placeholder="Email" style={styles.input} onChange={e=>setClienteForm({...clienteForm,email:e.target.value})}/>
            <input placeholder="Teléfono" style={styles.input} onChange={e=>setClienteForm({...clienteForm,telefono:e.target.value})}/>
            <button style={styles.button} onClick={saveCliente}>Guardar</button>
          </div>
        )}

        {/* FACTURAS */}
        {seccion === "facturas" && (
          <div style={styles.card}>
            <h3>Facturas</h3>

            <select onChange={e=>setEmisorSel(emisores.find(x=>x.id===e.target.value))}>
              <option>Emisor</option>
              {emisores.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>

            <select onChange={e=>setClienteSel(clientes.find(x=>x.id===e.target.value))}>
              <option>Cliente</option>
              {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>

            <input placeholder="Concepto" style={styles.input} onChange={e=>setConcepto(e.target.value)}/>
            <input type="number" style={styles.input} placeholder="Importe (€)" onChange={e => setBase(Number(e.target.value))}/>

            <p>Total: {total.toFixed(2)} €</p>

            <button style={styles.button} onClick={crearFactura}>Crear factura</button>

            {facturas.map(f=> (
              <div key={f.id} style={{ marginTop: 10 }}>
                <p>{f.concepto} - {f.total} €</p>
                <button style={styles.button} onClick={() => generarPDF(f)}>PDF</button>
              </div>
            ))}

          </div>
        )}

      </div>

    {toast && (
  <div style={styles.toast}>
    {toast}
  </div>
)}
    </div>
  );
}
