"""
Balance OS — Modelos de Datos
"""
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SAEnum, Boolean, Numeric, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
import enum

# ─── Enums ────────────────────────────────────────

class RegimenFiscal(str, enum.Enum):
    PF_ACTIVIDAD_EMPRESARIAL = "601"        # PF Actividad Empresarial
    PF_SERVICIOS_PROFESIONALES = "602"       # PF Servicios Profesionales
    PF_ARRA_NDAMIENTO = "603"                    # PF Arrendamiento
    PF_DEMAS_INGRESOS = "605"               # PF Demás Ingresos
    MORAL_GENERAL = "607"                 # PM Régimen General
    MORAL_SIN_FINES = "608"               # PM Sin Fines de Lucro

class TipoPersona(str, enum.Enum):
    FISICA = "fisica"
    MORAL = "moral"

class EstatusCliente(str, enum.Enum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    PROSPECTO = "prospecto"
    EN_PROCESO = "en_proceso"

class RolUsuario(str, enum.Enum):
    ADMIN = "admin"
    ASESOR = "asesor"
    JURIDICO = "juridico"
    CLIENTE = "cliente"

# ─── Modelos ──────────────────────────────────────

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    rol = Column(SAEnum(RolUsuario), default=RolUsuario.ASESOR)
    telefono = Column(String(20))
    activo = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    clientes = relationship("Cliente", back_populates="asesor")

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    rfc = Column(String(13), nullable=False, index=True)
    razon_social = Column(String(255), nullable=False)
    regimen_fiscal = Column(SAEnum(RegimenFiscal), nullable=False)
    tipo_persona = Column(SAEnum(TipoPersona), default=TipoPersona.FISICA)

    # Contacto
    email = Column(String(150))
    telefono = Column(String(20))
    direccion = Column(Text)

    # Estatus
    estatus = Column(SAEnum(EstatusCliente), default=EstatusCliente.PROSPECTO)

    # REPSE / PLD
    tiene_repse = Column(Integer, default=0)
    repse_vencimiento = Column(DateTime, nullable=True)
    tiene_pld = Column(Integer, default=0)
    pld_vencimiento = Column(DateTime, nullable=True)

    # FIEL
    fiel_vencimiento = Column(DateTime, nullable=True)

    # Asignación
    asesor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    asesor = relationship("Usuario", back_populates="clientes")

    # Notas internas
    notas = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    documentos = relationship("Documento", back_populates="cliente", cascade="all, delete-orphan")

class Documento(Base):
    __tablename__ = "documentos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    nombre = Column(String(255), nullable=False)
    tipo = Column(String(50))  # constancia, opinion, declaracion, cfdi, contrato, otro
    archivo_path = Column(String(500))
    notas = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    cliente = relationship("Cliente", back_populates="documentos")

# ─── Enums de Nómina ──────────────────────────────

class TipoContrato(str, enum.Enum):
    BASE = "base"
    CONFIANZA = "confianza"
    SINDICALIZADO = "sindicalizado"
    TEMPORAL = "temporal"
    HONORARIOS = "honorarios"

class TipoJornada(str, enum.Enum):
    DIURNA = "diurna"
    NOCTURNA = "nocturna"
    MIXTA = "mixta"
    ESPECIAL = "especial"

class EstatusEmpleado(str, enum.Enum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    SUSPENDIDO = "suspendido"
    BAJA = "baja"

# ─── Empleado ─────────────────────────────────────

class Empleado(Base):
    __tablename__ = "empleados"

    id = Column(Integer, primary_key=True, index=True)
    rfc = Column(String(13), unique=True, nullable=False, index=True)
    curp = Column(String(18), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(200), nullable=False)

    # Datos personales
    fecha_nacimiento = Column(DateTime, nullable=True)
    fecha_ingreso = Column(DateTime, nullable=False, default=datetime.utcnow)
    email = Column(String(150))
    telefono = Column(String(20))

    # Datos laborales
    salario_diario = Column(Numeric(10, 2), nullable=False)
    tipo_contrato = Column(SAEnum(TipoContrato), default=TipoContrato.BASE)
    tipo_jornada = Column(SAEnum(TipoJornada), default=TipoJornada.DIURNA)
    clase_riesgo = Column(Integer, default=1)
    estatus = Column(SAEnum(EstatusEmpleado), default=EstatusEmpleado.ACTIVO)

    # Datos bancarios
    banco = Column(String(100))
    cuenta_bancaria = Column(String(30))
    clabe = Column(String(18))

    # Control
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ─── Periodo de Nómina ────────────────────────────

class PeriodoNomina(Base):
    __tablename__ = "periodos_nomina"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)
    tipo = Column(String(20), nullable=False)  # semanal, quincenal, mensual
    estatus = Column(String(20), default="abierto")  # abierto, calculado, pagado, cancelado
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    recibos = relationship("Recibo", back_populates="periodo", cascade="all, delete-orphan")


# ─── Recibo de Nómina ─────────────────────────────

class Recibo(Base):
    __tablename__ = "recibos"

    id = Column(Integer, primary_key=True, index=True)
    periodo_id = Column(Integer, ForeignKey("periodos_nomina.id"), nullable=False)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False)

    salario_diario = Column(Numeric(12, 2), nullable=False)
    dias_trabajados = Column(Integer, nullable=False, default=15)
    sbc = Column(Numeric(12, 2), nullable=False)

    sueldo_base = Column(Numeric(12, 2), default=0)
    aguinaldo = Column(Numeric(12, 2), default=0)
    prima_vacacional = Column(Numeric(12, 2), default=0)
    otras_percepciones = Column(Numeric(12, 2), default=0)
    total_percepciones = Column(Numeric(12, 2), nullable=False)

    imss_obrero = Column(Numeric(12, 2), default=0)
    isr = Column(Numeric(12, 2), default=0)
    subsidio_al_empleo = Column(Numeric(12, 2), default=0)
    isr_neto = Column(Numeric(12, 2), default=0)
    otras_deducciones = Column(Numeric(12, 2), default=0)
    total_deducciones = Column(Numeric(12, 2), nullable=False)

    neto = Column(Numeric(12, 2), nullable=False)
    estatus = Column(String(20), default="calculado")  # calculado, pagado
    created_at = Column(DateTime, default=datetime.utcnow)

    periodo = relationship("PeriodoNomina", back_populates="recibos")
    empleado = relationship("Empleado")


# ─── Enums REPSE ──────────────────────────────────

class EstatusRepse(str, enum.Enum):
    ACTIVO = "activo"
    VENCIDO = "vencido"
    CANCELADO = "cancelado"
    TRAMITE = "tramite"

class TipoPersonalRepse(str, enum.Enum):
    ADMINISTRATIVO = "administrativo"
    OPERATIVO = "operativo"


# ─── REPSE Registro ────────────────────────────────

class RepseRegistro(Base):
    """Registro REPSE ante STPS para un cliente."""
    __tablename__ = "repse_registros"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    numero_registro = Column(String(50), unique=True, nullable=False)
    fecha_registro = Column(DateTime, nullable=False)
    fecha_vencimiento = Column(DateTime, nullable=False)
    estatus = Column(SAEnum(EstatusRepse), default=EstatusRepse.ACTIVO)
    actividad_economica = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cliente = relationship("Cliente")
    personal = relationship("RepsePersonal", back_populates="registro", cascade="all, delete-orphan")
    avisos = relationship("RepseAviso", back_populates="registro", cascade="all, delete-orphan")


class RepsePersonal(Base):
    """Asignación de empleados a registros REPSE (personal administrativo/operativo)."""
    __tablename__ = "repse_personal"

    id = Column(Integer, primary_key=True, index=True)
    registro_id = Column(Integer, ForeignKey("repse_registros.id"), nullable=False, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False)
    tipo = Column(SAEnum(TipoPersonalRepse), nullable=False)
    fecha_inicio = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_fin = Column(DateTime, nullable=True)
    activo = Column(Boolean, default=True)

    registro = relationship("RepseRegistro", back_populates="personal")
    empleado = relationship("Empleado")


class RepseAviso(Base):
    """Aviso trimestral REPSE presentado ante STPS."""
    __tablename__ = "repse_avisos"

    id = Column(Integer, primary_key=True, index=True)
    registro_id = Column(Integer, ForeignKey("repse_registros.id"), nullable=False, index=True)
    periodo = Column(String(7), nullable=False)  # "2026-Q1", "2026-Q2", ...
    total_personal = Column(Integer, nullable=False)
    administrativos = Column(Integer, nullable=False)
    operativos = Column(Integer, nullable=False)
    porcentaje_especializado = Column(Numeric(5, 2), nullable=False)  # %
    presentado = Column(Boolean, default=False)
    fecha_presentacion = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    registro = relationship("RepseRegistro", back_populates="avisos")


# ─── Enums PLD ─────────────────────────────────────

class NivelRiesgo(str, enum.Enum):
    BAJO = "bajo"
    MEDIO = "medio"
    ALTO = "alto"

class TipoOperacion(str, enum.Enum):
    NACIONAL = "nacional"
    INTERNACIONAL = "internacional"
    AMBAS = "ambas"


# ─── PLD Cuestionario ──────────────────────────────

class PldCuestionario(Base):
    """Cuestionario de evaluación de riesgo PLD para un cliente."""
    __tablename__ = "pld_cuestionarios"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    fecha_aplicacion = Column(DateTime, default=datetime.utcnow)

    # Factores de riesgo
    ingresos_anuales = Column(Numeric(14, 2), nullable=False)  # ingresos declarados
    volumen_operaciones = Column(Numeric(14, 2), default=0)
    transacciones_internacionales = Column(Boolean, default=False)
    tipo_operacion = Column(SAEnum(TipoOperacion), default=TipoOperacion.NACIONAL)
    expuesto_politicamente = Column(Boolean, default=False)  # PEP
    sector_riesgo_alto = Column(Boolean, default=False)  # sector vulnerable
    origen_fondos_documentado = Column(Boolean, default=True)
    antigüedad_relacion = Column(Integer, default=0)  # meses

    # Resultado
    puntaje = Column(Numeric(5, 2), nullable=False)  # 0-100
    nivel_riesgo = Column(SAEnum(NivelRiesgo), nullable=False)
    recomendacion = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    cliente = relationship("Cliente")


class PldDocumento(Base):
    """Documentos de soporte PLD por cliente."""
    __tablename__ = "pld_documentos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    tipo = Column(String(50), nullable=False)  # identificacion, comprobante_domicilio, acta_constitutiva, poder_notarial, etc.
    archivo_path = Column(String(500))
    verificado = Column(Boolean, default=False)
    fecha_verificacion = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cliente = relationship("Cliente")


# ─── Finiquito ─────────────────────────────────────

class TipoFiniquito(str, enum.Enum):
    DESPIDO_INJUSTIFICADO = "despido_injustificado"
    RENUNCIA = "renuncia"
    TERMINACION_MUTUO = "terminacion_mutuo"
    TERMINACION_TEMPORAL = "terminacion_temporal"

class Finiquito(Base):
    """Liquidación/Finiquito por terminación laboral."""
    __tablename__ = "finiquitos"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False, index=True)
    fecha_baja = Column(DateTime, nullable=False)
    tipo = Column(SAEnum(TipoFiniquito), nullable=False)
    causa = Column(Text)

    anios_servicio = Column(Integer, nullable=False)
    salario_diario = Column(Numeric(12, 2), nullable=False)

    indemnizacion_3meses = Column(Numeric(12, 2), default=0)
    indemnizacion_20dias_x_anio = Column(Numeric(12, 2), default=0)
    prima_antiguedad = Column(Numeric(12, 2), default=0)
    vacaciones_pendientes = Column(Numeric(12, 2), default=0)
    prima_vacacional = Column(Numeric(12, 2), default=0)
    aguinaldo_proporcional = Column(Numeric(12, 2), default=0)
    otras_percepciones = Column(Numeric(12, 2), default=0)
    total_percepciones = Column(Numeric(12, 2), nullable=False)

    isr = Column(Numeric(12, 2), default=0)
    isr_exento = Column(Numeric(12, 2), default=0)
    otras_deducciones = Column(Numeric(12, 2), default=0)
    total_deducciones = Column(Numeric(12, 2), nullable=False)

    neto = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    empleado = relationship("Empleado")


# ─── CFDI / CSD Models ────────────────────────────

class EstatusCFDI(str, enum.Enum):
    TIMBRADO = "timbrado"
    PENDIENTE = "pendiente"
    CANCELADO = "cancelado"
    ERROR = "error"

class CfdiRecibo(Base):
    """CFDI de nómina timbrado para un recibo."""
    __tablename__ = "cfdi_recibos"

    id = Column(Integer, primary_key=True, index=True)
    recibo_id = Column(Integer, ForeignKey("recibos.id"), nullable=False, unique=True, index=True)
    uuid = Column(String(36), unique=True, nullable=True)
    xml_path = Column(String(500))
    estatus = Column(SAEnum(EstatusCFDI), default=EstatusCFDI.PENDIENTE)
    serie = Column(String(5), default="N")
    folio = Column(Integer, nullable=True)
    fecha_timbrado = Column(DateTime, nullable=True)
    cadena_original = Column(Text, nullable=True)
    sello_csd = Column(Text, nullable=True)
    sello_sat = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    recibo = relationship("Recibo")


class CsdCertificado(Base):
    """Certificado de Sello Digital (CSD) del emisor."""
    __tablename__ = "csd_certificados"

    id = Column(Integer, primary_key=True, index=True)
    alias = Column(String(50), unique=True, nullable=False)
    rfc_emisor = Column(String(13), nullable=False)
    regimen_fiscal = Column(String(3), nullable=False, default="607")
    certificado_path = Column(String(500), nullable=True)
    llave_path = Column(String(500), nullable=True)
    contrasena = Column(String(255), nullable=True)
    numero_certificado = Column(String(20), nullable=True)
    fecha_validez_inicio = Column(DateTime, nullable=True)
    fecha_validez_fin = Column(DateTime, nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ─── Importar modelos de módulos extendidos ──────
from app.models.contabilidad import *  # noqa: F401, F403
from app.models.impuestos import *  # noqa: F401, F403
from app.models.facturacion import *  # noqa: F401, F403
from app.models.tesoreria import *  # noqa: F401, F403
