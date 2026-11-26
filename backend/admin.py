"""Panel de administración: acceso con contraseña y gestión de clientes."""
import hmac
import os
import secrets
import time
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

DURACION_SESION = 8 * 60 * 60  # segundos
MAX_INTENTOS = 5
BLOQUEO = 60  # segundos


# ---------- Base de datos ----------
def preparar_tablas(db) -> None:
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS clientes (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            telefono TEXT DEFAULT '',
            email TEXT DEFAULT '',
            direccion TEXT DEFAULT '',
            notas TEXT DEFAULT ''
        )
        """
    )
    columnas = {r["name"] for r in db.execute("PRAGMA table_info(vehiculos)")}
    if "clienteId" not in columnas:
        db.execute("ALTER TABLE vehiculos ADD COLUMN clienteId TEXT REFERENCES clientes(id)")


def _normalizar(nombre: str) -> str:
    return " ".join(nombre.split()).casefold()


def _buscar_por_nombre(db, nombre: str) -> Optional[str]:
    buscado = _normalizar(nombre)
    for r in db.execute("SELECT id, nombre FROM clientes"):
        if _normalizar(r["nombre"]) == buscado:
            return r["id"]
    return None


def vincular_propietario(db, vehiculo_id: str, propietario: str, nuevo_id) -> None:
    """Asocia el vehículo al cliente con ese nombre; si no existe, lo crea."""
    cliente_id = _buscar_por_nombre(db, propietario)
    if not cliente_id:
        cliente_id = nuevo_id()
        db.execute("INSERT INTO clientes (id, nombre) VALUES (?, ?)", (cliente_id, " ".join(propietario.split())))
    db.execute("UPDATE vehiculos SET clienteId=? WHERE id=?", (cliente_id, vehiculo_id))


def migrar_propietarios(db, nuevo_id) -> None:
    """Crea clientes a partir de los vehículos registrados antes de existir este módulo."""
    pendientes = db.execute("SELECT id, propietario FROM vehiculos WHERE clienteId IS NULL").fetchall()
    for v in pendientes:
        vincular_propietario(db, v["id"], v["propietario"], nuevo_id)


# ---------- Contraseña ----------
def obtener_password(ruta_db: str) -> str:
    """Usa GARAGEOS_ADMIN_PASSWORD; si no existe, genera una y la guarda junto a la base de datos."""
    password = os.environ.get("GARAGEOS_ADMIN_PASSWORD")
    if password:
        return password
    ruta = os.path.join(os.path.dirname(os.path.abspath(ruta_db)), "admin_password.txt")
    if os.path.exists(ruta):
        with open(ruta, encoding="utf-8") as f:
            guardada = f.read().strip()
        if guardada:
            return guardada
    password = secrets.token_urlsafe(9)
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(password + "\n")
    print(f"[GarageOS] Contraseña de administrador generada en: {ruta}")
    return password


# ---------- Modelos ----------
class LoginIn(BaseModel):
    password: str


class SesionOut(BaseModel):
    token: str


class ClienteIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    telefono: str = Field(default="", max_length=30)
    email: str = Field(default="", max_length=120)
    direccion: str = Field(default="", max_length=200)
    notas: str = Field(default="", max_length=1000)

    @field_validator("nombre", "telefono", "email", "direccion", "notas")
    @classmethod
    def sin_espacios(cls, v: str) -> str:
        return v.strip()

    @field_validator("nombre")
    @classmethod
    def nombre_requerido(cls, v: str) -> str:
        if not v:
            raise ValueError("El nombre es obligatorio")
        return " ".join(v.split())

    @field_validator("email")
    @classmethod
    def email_valido(cls, v: str) -> str:
        if v and ("@" not in v or "." not in v.split("@")[-1] or " " in v):
            raise ValueError("El correo no es válido")
        return v


class Cliente(ClienteIn):
    id: str


class ClienteResumen(Cliente):
    vehiculos: int
    servicios: int
    totalPagado: float
    totalPendiente: float
    ultimaVisita: Optional[str] = None


_SQL_RESUMEN = """
SELECT c.*,
  (SELECT COUNT(*) FROM vehiculos v WHERE v.clienteId = c.id) AS vehiculos,
  (SELECT COUNT(*) FROM servicios s JOIN vehiculos v ON v.id = s.vehiculoId
     WHERE v.clienteId = c.id) AS servicios,
  (SELECT COALESCE(SUM(s.costo), 0) FROM servicios s JOIN vehiculos v ON v.id = s.vehiculoId
     WHERE v.clienteId = c.id AND s.estado = 'Completado') AS totalPagado,
  (SELECT COALESCE(SUM(s.costo), 0) FROM servicios s JOIN vehiculos v ON v.id = s.vehiculoId
     WHERE v.clienteId = c.id AND s.estado <> 'Completado') AS totalPendiente,
  (SELECT MAX(s.fecha) FROM servicios s JOIN vehiculos v ON v.id = s.vehiculoId
     WHERE v.clienteId = c.id) AS ultimaVisita
FROM clientes c
"""


# ---------- Rutas ----------
def crear_router(get_db, nuevo_id, ruta_db: str) -> APIRouter:
    router = APIRouter(prefix="/api/admin", tags=["admin"])
    sesiones: dict[str, float] = {}  # token -> vencimiento
    intentos = {"fallidos": 0, "bloqueado_hasta": 0.0}

    def requiere_admin(authorization: str = Header(default="")) -> str:
        token = authorization.removeprefix("Bearer ").strip()
        if sesiones.get(token, 0) < time.time():
            sesiones.pop(token, None)
            raise HTTPException(401, "Sesión no válida. Inicia sesión de nuevo.")
        return token

    protegido = [Depends(requiere_admin)]

    @router.post("/login", response_model=SesionOut)
    def login(datos: LoginIn):
        ahora = time.time()
        if ahora < intentos["bloqueado_hasta"]:
            raise HTTPException(429, "Demasiados intentos. Espera un minuto.")
        correcta = obtener_password(ruta_db)
        if not hmac.compare_digest(datos.password.encode(), correcta.encode()):
            intentos["fallidos"] += 1
            if intentos["fallidos"] >= MAX_INTENTOS:
                intentos.update(fallidos=0, bloqueado_hasta=ahora + BLOQUEO)
            raise HTTPException(401, "Contraseña incorrecta")
        intentos["fallidos"] = 0
        token = secrets.token_urlsafe(32)
        sesiones[token] = ahora + DURACION_SESION
        return SesionOut(token=token)

    @router.post("/logout", status_code=204)
    def logout(token: str = Depends(requiere_admin)):
        sesiones.pop(token, None)

    def cliente_o_404(db, cliente_id: str):
        row = db.execute(_SQL_RESUMEN + " WHERE c.id = ?", (cliente_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Cliente no encontrado")
        return dict(row)

    def nombre_libre(db, nombre: str, propio: Optional[str] = None) -> None:
        existente = _buscar_por_nombre(db, nombre)
        if existente and existente != propio:
            raise HTTPException(409, "Ya existe un cliente con ese nombre")

    @router.get("/clientes", response_model=list[ClienteResumen], dependencies=protegido)
    def listar_clientes():
        with get_db() as db:
            filas = [dict(r) for r in db.execute(_SQL_RESUMEN)]
        return sorted(filas, key=lambda c: c["nombre"].casefold())

    @router.get("/clientes/{cliente_id}", dependencies=protegido)
    def detalle_cliente(cliente_id: str):
        with get_db() as db:
            cliente = cliente_o_404(db, cliente_id)
            vehiculos = db.execute(
                "SELECT * FROM vehiculos WHERE clienteId = ? ORDER BY id DESC", (cliente_id,)
            ).fetchall()
            servicios = db.execute(
                "SELECT s.* FROM servicios s JOIN vehiculos v ON v.id = s.vehiculoId "
                "WHERE v.clienteId = ? ORDER BY s.fecha DESC, s.id DESC", (cliente_id,)
            ).fetchall()
            citas = db.execute(
                "SELECT t.* FROM citas t JOIN vehiculos v ON v.id = t.vehiculoId "
                "WHERE v.clienteId = ? ORDER BY t.fecha DESC, t.hora DESC", (cliente_id,)
            ).fetchall()
        return {
            "cliente": cliente,
            "vehiculos": [dict(r) for r in vehiculos],
            "servicios": [dict(r) for r in servicios],
            "citas": [dict(r) for r in citas],
        }

    @router.post("/clientes", response_model=Cliente, status_code=201, dependencies=protegido)
    def crear_cliente(datos: ClienteIn):
        nuevo = Cliente(id=nuevo_id(), **datos.model_dump())
        with get_db() as db:
            nombre_libre(db, nuevo.nombre)
            db.execute(
                "INSERT INTO clientes (id, nombre, telefono, email, direccion, notas) "
                "VALUES (:id, :nombre, :telefono, :email, :direccion, :notas)",
                nuevo.model_dump(),
            )
        return nuevo

    @router.put("/clientes/{cliente_id}", response_model=Cliente, dependencies=protegido)
    def actualizar_cliente(cliente_id: str, datos: ClienteIn):
        with get_db() as db:
            cliente_o_404(db, cliente_id)
            nombre_libre(db, datos.nombre, cliente_id)
            db.execute(
                "UPDATE clientes SET nombre=:nombre, telefono=:telefono, email=:email, "
                "direccion=:direccion, notas=:notas WHERE id=:id",
                {**datos.model_dump(), "id": cliente_id},
            )
            # El nombre del propietario en sus vehículos se mantiene sincronizado
            db.execute("UPDATE vehiculos SET propietario=? WHERE clienteId=?", (datos.nombre, cliente_id))
        return Cliente(id=cliente_id, **datos.model_dump())

    @router.delete("/clientes/{cliente_id}", status_code=204, dependencies=protegido)
    def eliminar_cliente(cliente_id: str):
        with get_db() as db:
            cliente = cliente_o_404(db, cliente_id)
            if cliente["vehiculos"]:
                raise HTTPException(
                    409, "Este cliente tiene vehículos registrados. Elimínalos o cambia su propietario primero."
                )
            db.execute("DELETE FROM clientes WHERE id = ?", (cliente_id,))

    return router
