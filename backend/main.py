"""GarageOS - API REST con FastAPI + SQLite."""
import os
import sqlite3
import time
import secrets
from contextlib import contextmanager
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DB_PATH = os.environ.get("GARAGEOS_DB", os.path.join(os.path.dirname(__file__), "garageos.db"))

EstadoServicio = Literal["Pendiente", "En proceso", "Completado"]


# ---------- Base de datos ----------
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS vehiculos (
                id TEXT PRIMARY KEY,
                marca TEXT NOT NULL,
                modelo TEXT NOT NULL,
                anio INTEGER NOT NULL,
                matricula TEXT NOT NULL,
                color TEXT NOT NULL,
                propietario TEXT NOT NULL,
                foto TEXT
            );
            CREATE TABLE IF NOT EXISTS servicios (
                id TEXT PRIMARY KEY,
                vehiculoId TEXT NOT NULL,
                problema TEXT NOT NULL,
                fecha TEXT NOT NULL,
                costo REAL NOT NULL,
                estado TEXT NOT NULL,
                notas TEXT DEFAULT '',
                piezas TEXT DEFAULT '',
                FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_servicios_vehiculo ON servicios(vehiculoId);
            CREATE TABLE IF NOT EXISTS repuestos (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                sku TEXT DEFAULT '',
                categoria TEXT DEFAULT 'General',
                stock INTEGER NOT NULL DEFAULT 0,
                minimo INTEGER NOT NULL DEFAULT 2,
                costo REAL NOT NULL DEFAULT 0,
                precio REAL NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS citas (
                id TEXT PRIMARY KEY,
                vehiculoId TEXT NOT NULL,
                fecha TEXT NOT NULL,
                hora TEXT NOT NULL,
                motivo TEXT NOT NULL,
                estado TEXT NOT NULL DEFAULT 'Programada',
                notas TEXT DEFAULT '',
                FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha, hora);
            """
        )


def nuevo_id() -> str:
    # Ordenable por tiempo de creación (se usa para "últimos servicios")
    return f"{int(time.time() * 1000):013d}{secrets.token_hex(3)}"


# ---------- Modelos ----------
class VehiculoIn(BaseModel):
    marca: str = Field(min_length=1)
    modelo: str = Field(min_length=1)
    anio: int = Field(ge=1886, le=2100)
    matricula: str = Field(min_length=1)
    color: str = Field(min_length=1)
    propietario: str = Field(min_length=1)
    foto: Optional[str] = None


class Vehiculo(VehiculoIn):
    id: str


class ServicioIn(BaseModel):
    vehiculoId: str
    problema: str = Field(min_length=1)
    fecha: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    costo: float = Field(ge=0)
    estado: EstadoServicio = "Pendiente"
    notas: str = ""
    piezas: str = ""


class Servicio(ServicioIn):
    id: str


class Resumen(BaseModel):
    totalAutos: int
    pendientes: int
    completados: int


# ---------- App ----------
app = FastAPI(title="GarageOS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/resumen", response_model=Resumen)
def resumen():
    with get_db() as db:
        total = db.execute("SELECT COUNT(*) AS n FROM vehiculos").fetchone()["n"]
        pendientes = db.execute(
            "SELECT COUNT(*) AS n FROM servicios WHERE estado IN ('Pendiente','En proceso')"
        ).fetchone()["n"]
        completados = db.execute(
            "SELECT COUNT(*) AS n FROM servicios WHERE estado = 'Completado'"
        ).fetchone()["n"]
    return Resumen(totalAutos=total, pendientes=pendientes, completados=completados)


# --- Vehículos ---
@app.get("/api/vehiculos", response_model=list[Vehiculo])
def listar_vehiculos():
    with get_db() as db:
        return [dict(r) for r in db.execute("SELECT * FROM vehiculos ORDER BY id DESC")]


@app.get("/api/vehiculos/{vehiculo_id}", response_model=Vehiculo)
def obtener_vehiculo(vehiculo_id: str):
    with get_db() as db:
        row = db.execute("SELECT * FROM vehiculos WHERE id = ?", (vehiculo_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Vehículo no encontrado")
    return dict(row)


@app.post("/api/vehiculos", response_model=Vehiculo, status_code=201)
def crear_vehiculo(datos: VehiculoIn):
    nuevo = Vehiculo(id=nuevo_id(), **datos.model_dump())
    with get_db() as db:
        db.execute(
            "INSERT INTO vehiculos (id, marca, modelo, anio, matricula, color, propietario, foto) "
            "VALUES (:id, :marca, :modelo, :anio, :matricula, :color, :propietario, :foto)",
            nuevo.model_dump(),
        )
    return nuevo


@app.delete("/api/vehiculos/{vehiculo_id}", status_code=204)
def eliminar_vehiculo(vehiculo_id: str):
    with get_db() as db:
        cur = db.execute("DELETE FROM vehiculos WHERE id = ?", (vehiculo_id,))
    if cur.rowcount == 0:
        raise HTTPException(404, "Vehículo no encontrado")


@app.get("/api/vehiculos/{vehiculo_id}/servicios", response_model=list[Servicio])
def servicios_de_vehiculo(vehiculo_id: str):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM servicios WHERE vehiculoId = ? ORDER BY fecha DESC, id DESC",
            (vehiculo_id,),
        ).fetchall()
    return [dict(r) for r in rows]


# --- Servicios ---
@app.get("/api/servicios", response_model=list[Servicio])
def listar_servicios(limit: Optional[int] = None):
    sql = "SELECT * FROM servicios ORDER BY id DESC"
    params: tuple = ()
    if limit:
        sql += " LIMIT ?"
        params = (limit,)
    with get_db() as db:
        return [dict(r) for r in db.execute(sql, params)]


@app.post("/api/servicios", response_model=Servicio, status_code=201)
def crear_servicio(datos: ServicioIn):
    nuevo = Servicio(id=nuevo_id(), **datos.model_dump())
    with get_db() as db:
        existe = db.execute("SELECT 1 FROM vehiculos WHERE id = ?", (nuevo.vehiculoId,)).fetchone()
        if not existe:
            raise HTTPException(422, "El vehículo indicado no existe")
        db.execute(
            "INSERT INTO servicios (id, vehiculoId, problema, fecha, costo, estado, notas, piezas) "
            "VALUES (:id, :vehiculoId, :problema, :fecha, :costo, :estado, :notas, :piezas)",
            nuevo.model_dump(),
        )
    return nuevo


# ---------- Edición de vehículos y servicios ----------
class EstadoIn(BaseModel):
    estado: EstadoServicio


@app.put("/api/vehiculos/{vehiculo_id}", response_model=Vehiculo)
def actualizar_vehiculo(vehiculo_id: str, datos: VehiculoIn):
    with get_db() as db:
        cur = db.execute(
            "UPDATE vehiculos SET marca=:marca, modelo=:modelo, anio=:anio, matricula=:matricula, "
            "color=:color, propietario=:propietario, foto=:foto WHERE id=:id",
            {**datos.model_dump(), "id": vehiculo_id},
        )
    if cur.rowcount == 0:
        raise HTTPException(404, "Vehículo no encontrado")
    return Vehiculo(id=vehiculo_id, **datos.model_dump())


@app.put("/api/servicios/{servicio_id}", response_model=Servicio)
def actualizar_servicio(servicio_id: str, datos: ServicioIn):
    with get_db() as db:
        if not db.execute("SELECT 1 FROM vehiculos WHERE id = ?", (datos.vehiculoId,)).fetchone():
            raise HTTPException(422, "El vehículo indicado no existe")
        cur = db.execute(
            "UPDATE servicios SET vehiculoId=:vehiculoId, problema=:problema, fecha=:fecha, costo=:costo, "
            "estado=:estado, notas=:notas, piezas=:piezas WHERE id=:id",
            {**datos.model_dump(), "id": servicio_id},
        )
    if cur.rowcount == 0:
        raise HTTPException(404, "Servicio no encontrado")
    return Servicio(id=servicio_id, **datos.model_dump())


@app.patch("/api/servicios/{servicio_id}/estado", response_model=Servicio)
def cambiar_estado_servicio(servicio_id: str, datos: EstadoIn):
    with get_db() as db:
        cur = db.execute("UPDATE servicios SET estado=? WHERE id=?", (datos.estado, servicio_id))
        if cur.rowcount == 0:
            raise HTTPException(404, "Servicio no encontrado")
        row = db.execute("SELECT * FROM servicios WHERE id=?", (servicio_id,)).fetchone()
    return dict(row)


@app.delete("/api/servicios/{servicio_id}", status_code=204)
def eliminar_servicio(servicio_id: str):
    with get_db() as db:
        cur = db.execute("DELETE FROM servicios WHERE id = ?", (servicio_id,))
    if cur.rowcount == 0:
        raise HTTPException(404, "Servicio no encontrado")


# ---------- Inventario de repuestos ----------
class RepuestoIn(BaseModel):
    nombre: str = Field(min_length=1)
    sku: str = ""
    categoria: str = "General"
    stock: int = Field(ge=0, default=0)
    minimo: int = Field(ge=0, default=2)
    costo: float = Field(ge=0, default=0)
    precio: float = Field(ge=0, default=0)


class Repuesto(RepuestoIn):
    id: str


class AjusteIn(BaseModel):
    delta: int


@app.get("/api/repuestos", response_model=list[Repuesto])
def listar_repuestos():
    with get_db() as db:
        return [dict(r) for r in db.execute("SELECT * FROM repuestos ORDER BY nombre COLLATE NOCASE")]


@app.post("/api/repuestos", response_model=Repuesto, status_code=201)
def crear_repuesto(datos: RepuestoIn):
    nuevo = Repuesto(id=nuevo_id(), **datos.model_dump())
    with get_db() as db:
        db.execute(
            "INSERT INTO repuestos (id, nombre, sku, categoria, stock, minimo, costo, precio) "
            "VALUES (:id, :nombre, :sku, :categoria, :stock, :minimo, :costo, :precio)",
            nuevo.model_dump(),
        )
    return nuevo


@app.put("/api/repuestos/{repuesto_id}", response_model=Repuesto)
def actualizar_repuesto(repuesto_id: str, datos: RepuestoIn):
    with get_db() as db:
        cur = db.execute(
            "UPDATE repuestos SET nombre=:nombre, sku=:sku, categoria=:categoria, stock=:stock, "
            "minimo=:minimo, costo=:costo, precio=:precio WHERE id=:id",
            {**datos.model_dump(), "id": repuesto_id},
        )
    if cur.rowcount == 0:
        raise HTTPException(404, "Repuesto no encontrado")
    return Repuesto(id=repuesto_id, **datos.model_dump())


@app.post("/api/repuestos/{repuesto_id}/ajuste", response_model=Repuesto)
def ajustar_stock(repuesto_id: str, datos: AjusteIn):
    with get_db() as db:
        row = db.execute("SELECT * FROM repuestos WHERE id=?", (repuesto_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Repuesto no encontrado")
        nuevo_stock = max(0, row["stock"] + datos.delta)
        db.execute("UPDATE repuestos SET stock=? WHERE id=?", (nuevo_stock, repuesto_id))
        row = db.execute("SELECT * FROM repuestos WHERE id=?", (repuesto_id,)).fetchone()
    return dict(row)


@app.delete("/api/repuestos/{repuesto_id}", status_code=204)
def eliminar_repuesto(repuesto_id: str):
    with get_db() as db:
        cur = db.execute("DELETE FROM repuestos WHERE id = ?", (repuesto_id,))
    if cur.rowcount == 0:
        raise HTTPException(404, "Repuesto no encontrado")


# ---------- Citas ----------
EstadoCita = Literal["Programada", "Atendida", "Cancelada"]


class CitaIn(BaseModel):
    vehiculoId: str
    fecha: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    hora: str = Field(pattern=r"^\d{2}:\d{2}$")
    motivo: str = Field(min_length=1)
    estado: EstadoCita = "Programada"
    notas: str = ""


class Cita(CitaIn):
    id: str


class EstadoCitaIn(BaseModel):
    estado: EstadoCita


def _cita_o_404(db, cita_id: str):
    row = db.execute("SELECT * FROM citas WHERE id=?", (cita_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Cita no encontrada")
    return row


@app.get("/api/citas", response_model=list[Cita])
def listar_citas():
    with get_db() as db:
        return [dict(r) for r in db.execute("SELECT * FROM citas ORDER BY fecha, hora")]


@app.post("/api/citas", response_model=Cita, status_code=201)
def crear_cita(datos: CitaIn):
    nueva = Cita(id=nuevo_id(), **datos.model_dump())
    with get_db() as db:
        if not db.execute("SELECT 1 FROM vehiculos WHERE id = ?", (nueva.vehiculoId,)).fetchone():
            raise HTTPException(422, "El vehículo indicado no existe")
        db.execute(
            "INSERT INTO citas (id, vehiculoId, fecha, hora, motivo, estado, notas) "
            "VALUES (:id, :vehiculoId, :fecha, :hora, :motivo, :estado, :notas)",
            nueva.model_dump(),
        )
    return nueva


@app.put("/api/citas/{cita_id}", response_model=Cita)
def actualizar_cita(cita_id: str, datos: CitaIn):
    with get_db() as db:
        _cita_o_404(db, cita_id)
        if not db.execute("SELECT 1 FROM vehiculos WHERE id = ?", (datos.vehiculoId,)).fetchone():
            raise HTTPException(422, "El vehículo indicado no existe")
        db.execute(
            "UPDATE citas SET vehiculoId=:vehiculoId, fecha=:fecha, hora=:hora, motivo=:motivo, "
            "estado=:estado, notas=:notas WHERE id=:id",
            {**datos.model_dump(), "id": cita_id},
        )
    return Cita(id=cita_id, **datos.model_dump())


@app.patch("/api/citas/{cita_id}/estado", response_model=Cita)
def cambiar_estado_cita(cita_id: str, datos: EstadoCitaIn):
    with get_db() as db:
        _cita_o_404(db, cita_id)
        db.execute("UPDATE citas SET estado=? WHERE id=?", (datos.estado, cita_id))
        row = db.execute("SELECT * FROM citas WHERE id=?", (cita_id,)).fetchone()
    return dict(row)


@app.post("/api/citas/{cita_id}/convertir", response_model=Servicio, status_code=201)
def convertir_cita_en_servicio(cita_id: str):
    """Atiende la cita: crea una orden En proceso y marca la cita como Atendida."""
    with get_db() as db:
        c = _cita_o_404(db, cita_id)
        nuevo = Servicio(
            id=nuevo_id(), vehiculoId=c["vehiculoId"], problema=c["motivo"], fecha=c["fecha"],
            costo=0, estado="En proceso", notas=c["notas"] or "", piezas="",
        )
        db.execute(
            "INSERT INTO servicios (id, vehiculoId, problema, fecha, costo, estado, notas, piezas) "
            "VALUES (:id, :vehiculoId, :problema, :fecha, :costo, :estado, :notas, :piezas)",
            nuevo.model_dump(),
        )
        db.execute("UPDATE citas SET estado='Atendida' WHERE id=?", (cita_id,))
    return nuevo


@app.delete("/api/citas/{cita_id}", status_code=204)
def eliminar_cita(cita_id: str):
    with get_db() as db:
        cur = db.execute("DELETE FROM citas WHERE id = ?", (cita_id,))
    if cur.rowcount == 0:
        raise HTTPException(404, "Cita no encontrada")
