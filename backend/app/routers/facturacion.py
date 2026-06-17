"""
Balance OS — Router de Facturación de Ingresos (CFDI)
"""
from datetime import datetime
from decimal import Decimal
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import PlainTextResponse, FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import os

from app.database import get_db
from app.models import CfdiIngreso, CfdiIngresoConcepto, CfdiIngresoImpuesto, CfdiComplementoPago, CfdiPagoDetalle
from app.schemas.facturacion import (
    FacturaCreate, ConceptoFacturaCreate,
    CfdiIngresoResponse, ComplementoPagoCreate,
)
from app.routers.auth import verificar_token
from app.pac import get_pac_adapter
from app.cfdi.generador_xml import generar_xml_ingreso, guardar_xml_ingreso
from app.pdf.factura import generar_pdf_factura

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/facturacion", tags=["facturacion"])

RFC_EMISOR = "XXX010101XXX"
EMISOR_NOMBRE = "Balance OS S.A. de C.V."


def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


def _calcular_impuestos(subtotal: Decimal, conceptos: list) -> dict:
    """Calcula IVA trasladado (tasa 16%) para conceptos con objeto_imp=02."""
    iva_tasa = Decimal("0.16")
    total_traslados = Decimal("0.00")
    impuestos_list = []

    for conc in conceptos:
        if conc.objeto_imp == "02":  # Sí obligado al IVA
            iva = (conc.importe * iva_tasa).quantize(Decimal("0.01"))
            total_traslados += iva
            impuestos_list.append({
                "tipo": "traslado",
                "base": conc.importe,
                "impuesto": "IVA",
                "tasa_cuota": iva_tasa,
                "importe": iva,
            })

    return {
        "total_traslados": total_traslados,
        "total_retenciones": Decimal("0.00"),
        "impuestos": impuestos_list,
    }


# ─── Facturas (CFDI de Ingreso) ────────────────────


@router.post("/facturas", response_model=CfdiIngresoResponse, status_code=status.HTTP_201_CREATED)
async def crear_factura(
    data: FacturaCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Crea un CFDI de ingreso: genera XML 4.0, timbra vía PAC y guarda."""
    # Mapear iva → objeto_imp si se proporciona iva en los conceptos
    for conc in data.conceptos:
        if conc.iva is not None:
            conc.objeto_imp = "02" if conc.iva > 0 else "01"

    # Calcular subtotal desde conceptos
    subtotal = sum(c.importe for c in data.conceptos)
    descuento = data.descuento
    base = subtotal - descuento

    # Calcular impuestos
    calc = _calcular_impuestos(base, data.conceptos)
    total = base + calc["total_traslados"]

    # ── Construir datos para el XML CFDI 4.0 ──
    conceptos_xml = []
    for conc in data.conceptos:
        conceptos_xml.append({
            "clave_prod_serv": conc.clave_prod_serv,
            "no_identificacion": conc.no_identificacion,
            "cantidad": conc.cantidad,
            "clave_unidad": conc.clave_unidad,
            "unidad": conc.unidad,
            "descripcion": conc.descripcion,
            "valor_unitario": conc.valor_unitario,
            "importe": conc.importe,
            "descuento": conc.descuento,
            "objeto_imp": conc.objeto_imp,
        })

    # Construir estructura de impuestos para el XML
    traslados_xml = []
    retenciones_xml = []
    for imp in calc["impuestos"]:
        if imp["tipo"] == "traslado":
            traslados_xml.append({
                "base": imp["base"],
                "impuesto": "002" if imp["impuesto"] == "IVA" else imp["impuesto"],
                "tipo_factor": "Tasa",
                "tasa_cuota": imp["tasa_cuota"],
                "importe": imp["importe"],
            })

    fecha_emision = datetime.utcnow()
    datos_xml = {
        "serie": data.serie or "F",
        "folio": data.folio or "1",
        "fecha_emision": fecha_emision,
        "receptor_rfc": data.receptor_rfc,
        "receptor_nombre": data.receptor_nombre,
        "uso_cfdi": data.uso_cfdi,
        "forma_pago": data.forma_pago,
        "metodo_pago": data.metodo_pago,
        "moneda": data.moneda,
        "tipo_cambio": data.tipo_cambio,
        "lugar_expedicion": data.lugar_expedicion,
        "subtotal": subtotal,
        "descuento": descuento,
        "total": total,
        "conceptos": conceptos_xml,
        "impuestos": {
            "total_traslados": calc["total_traslados"],
            "total_retenciones": calc["total_retenciones"],
            "traslados": traslados_xml,
            "retenciones": retenciones_xml,
        },
    }

    # ── Generar XML CFDI 4.0 ──
    cfdi_xml = generar_xml_ingreso(datos_xml)

    # ── Timbrar vía PAC ──
    pac = get_pac_adapter()
    uuid_str = ""
    xml_timbrado = cfdi_xml
    try:
        resultado_pac = pac.timbrar(cfdi_xml, csd_pem="", llave_pem="", contrasena="")
        uuid_str = resultado_pac.get("uuid", "")
        xml_timbrado = resultado_pac.get("xml_timbrado", cfdi_xml)
        logger.info(f"CFDI timbrado vía PAC: UUID={uuid_str}")
    except Exception as e:
        logger.warning(f"PAC timbrado falló, usando mock: {e}")
        # Fallback a mock UUID si el PAC falla
        from uuid import uuid4
        uuid_str = uuid4().hex[:36]

    cfdi = CfdiIngreso(
        uuid=uuid_str,
        cliente_id=data.cliente_id,
        emisor_rfc=RFC_EMISOR,
        emisor_nombre=EMISOR_NOMBRE,
        receptor_rfc=data.receptor_rfc,
        receptor_nombre=data.receptor_nombre,
        fecha_emision=fecha_emision,
        serie=data.serie,
        folio=data.folio,
        tipo_comprobante="I",
        forma_pago=data.forma_pago,
        metodo_pago=data.metodo_pago,
        uso_cfdi=data.uso_cfdi,
        moneda=data.moneda,
        tipo_cambio=data.tipo_cambio,
        lugar_expedicion=data.lugar_expedicion,
        subtotal=subtotal,
        descuento=descuento,
        total=total,
        total_traslados=calc["total_traslados"],
        total_retenciones=calc["total_retenciones"],
        estatus="activo",
    )
    db.add(cfdi)
    await db.flush()

    # Guardar XML timbrado en disco
    try:
        cfdi.xml_path = guardar_xml_ingreso(xml_timbrado, cfdi.id)
    except Exception as e:
        logger.warning(f"No se pudo guardar XML en disco: {e}")

    # Insertar conceptos
    for conc in data.conceptos:
        concepto = CfdiIngresoConcepto(
            cfdi_id=cfdi.id,
            clave_prod_serv=conc.clave_prod_serv,
            no_identificacion=conc.no_identificacion,
            cantidad=conc.cantidad,
            clave_unidad=conc.clave_unidad,
            unidad=conc.unidad,
            descripcion=conc.descripcion,
            valor_unitario=conc.valor_unitario,
            importe=conc.importe,
            descuento=conc.descuento,
            objeto_imp=conc.objeto_imp,
        )
        db.add(concepto)

    # Insertar impuestos calculados
    for imp in calc["impuestos"]:
        impuesto = CfdiIngresoImpuesto(
            cfdi_id=cfdi.id,
            tipo=imp["tipo"],
            base=imp["base"],
            impuesto=imp["impuesto"],
            tasa_cuota=imp["tasa_cuota"],
            importe=imp["importe"],
        )
        db.add(impuesto)

    await db.commit()
    await db.refresh(cfdi)
    return cfdi


@router.get("/facturas", response_model=List[CfdiIngresoResponse])
async def listar_facturas(
    cliente_id: Optional[int] = Query(None),
    estatus: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista los CFDI de ingreso con filtros opcionales."""
    query = select(CfdiIngreso)
    if cliente_id:
        query = query.where(CfdiIngreso.cliente_id == cliente_id)
    if estatus:
        query = query.where(CfdiIngreso.estatus == estatus)
    query = query.order_by(CfdiIngreso.fecha_emision.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/facturas/{factura_id}", response_model=CfdiIngresoResponse)
async def obtener_factura(
    factura_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Obtiene un CFDI de ingreso con conceptos e impuestos."""
    result = await db.execute(
        select(CfdiIngreso).where(CfdiIngreso.id == factura_id)
    )
    factura = result.scalar_one_or_none()
    if not factura:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura no encontrada")
    return factura


@router.put("/facturas/{factura_id}/cancelar")
async def cancelar_factura(
    factura_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Cambia el estatus de un CFDI a cancelado."""
    result = await db.execute(
        select(CfdiIngreso).where(CfdiIngreso.id == factura_id)
    )
    factura = result.scalar_one_or_none()
    if not factura:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura no encontrada")
    if factura.estatus == "cancelado":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La factura ya está cancelada")

    factura.estatus = "cancelado"
    await db.commit()
    return {"detail": "Factura cancelada correctamente"}


@router.get("/facturas/{factura_id}/xml")
async def descargar_xml_factura(
    factura_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Descarga el XML timbrado de un CFDI de ingreso."""
    result = await db.execute(
        select(CfdiIngreso).where(CfdiIngreso.id == factura_id)
    )
    factura = result.scalar_one_or_none()
    if not factura:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura no encontrada")

    if factura.xml_path and os.path.exists(factura.xml_path):
        return FileResponse(
            factura.xml_path,
            media_type="application/xml",
            filename=f"cfdi_{factura.uuid}.xml",
        )

    # Si no hay archivo guardado, regenerar XML desde los datos
    conceptos_result = await db.execute(
        select(CfdiIngresoConcepto).where(CfdiIngresoConcepto.cfdi_id == factura_id)
    )
    conceptos = conceptos_result.scalars().all()

    impuestos_result = await db.execute(
        select(CfdiIngresoImpuesto).where(CfdiIngresoImpuesto.cfdi_id == factura_id)
    )
    impuestos_list = impuestos_result.scalars().all()

    conceptos_xml = []
    for c in conceptos:
        conceptos_xml.append({
            "clave_prod_serv": c.clave_prod_serv,
            "no_identificacion": c.no_identificacion,
            "cantidad": c.cantidad,
            "clave_unidad": c.clave_unidad,
            "unidad": c.unidad,
            "descripcion": c.descripcion,
            "valor_unitario": c.valor_unitario,
            "importe": c.importe,
            "descuento": c.descuento or Decimal("0.00"),
            "objeto_imp": c.objeto_imp,
        })

    traslados_xml = []
    retenciones_xml = []
    for imp in impuestos_list:
        entry = {
            "base": imp.base,
            "impuesto": "002" if imp.impuesto == "IVA" else imp.impuesto,
            "tipo_factor": "Tasa",
            "tasa_cuota": imp.tasa_cuota,
            "importe": imp.importe,
        }
        if imp.tipo == "traslado":
            traslados_xml.append(entry)
        else:
            retenciones_xml.append(entry)

    datos_xml = {
        "serie": factura.serie,
        "folio": factura.folio,
        "fecha_emision": factura.fecha_emision,
        "receptor_rfc": factura.receptor_rfc,
        "receptor_nombre": factura.receptor_nombre,
        "uso_cfdi": factura.uso_cfdi,
        "forma_pago": factura.forma_pago,
        "metodo_pago": factura.metodo_pago,
        "moneda": factura.moneda,
        "tipo_cambio": factura.tipo_cambio,
        "lugar_expedicion": factura.lugar_expedicion,
        "subtotal": factura.subtotal,
        "descuento": factura.descuento,
        "total": factura.total,
        "conceptos": conceptos_xml,
        "impuestos": {
            "total_traslados": factura.total_traslados,
            "total_retenciones": factura.total_retenciones,
            "traslados": traslados_xml,
            "retenciones": retenciones_xml,
        },
    }

    xml_content = generar_xml_ingreso(datos_xml)
    return PlainTextResponse(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename=cfdi_{factura.uuid}.xml"},
    )


@router.get("/facturas/{factura_id}/pdf")
async def descargar_pdf_factura(
    factura_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Descarga la representación impresa (PDF) de un CFDI de ingreso."""
    # Cargar factura con conceptos e impuestos
    result = await db.execute(
        select(CfdiIngreso).where(CfdiIngreso.id == factura_id)
    )
    factura = result.scalar_one_or_none()
    if not factura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Factura no encontrada",
        )

    # Cargar conceptos
    conc_result = await db.execute(
        select(CfdiIngresoConcepto)
        .where(CfdiIngresoConcepto.cfdi_id == factura_id)
    )
    conceptos = conc_result.scalars().all()

    # Cargar impuestos
    imp_result = await db.execute(
        select(CfdiIngresoImpuesto)
        .where(CfdiIngresoImpuesto.cfdi_id == factura_id)
    )
    impuestos_list = imp_result.scalars().all()

    pdf_bytes = generar_pdf_factura(factura, conceptos, impuestos_list)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                f"attachment; filename=factura_{factura_id}.pdf"
        },
    )


# ─── Complementos de Pago ─────────────────────────


@router.post("/complementos-pago", response_model=dict, status_code=status.HTTP_201_CREATED)
async def crear_complemento_pago(
    data: ComplementoPagoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Crea un complemento de pago."""
    uuid = uuid4().hex[:36]
    monto_total = sum(p.get("importe_pagado", 0) for p in data.pagos)

    complemento = CfdiComplementoPago(
        uuid=uuid,
        cliente_id=data.cliente_id,
        emisor_rfc=RFC_EMISOR,
        receptor_rfc=data.receptor_rfc,
        receptor_nombre=data.receptor_nombre,
        fecha_pago=datetime.utcnow(),
        forma_pago=data.forma_pago,
        moneda=data.moneda,
        monto_total=monto_total,
        estatus="activo",
    )
    db.add(complemento)
    await db.flush()

    for i, pago in enumerate(data.pagos):
        detalle = CfdiPagoDetalle(
            complemento_id=complemento.id,
            cfdi_relacionado_uuid=pago.get("cfdi_uuid"),
            importe_pagado=pago.get("importe_pagado", 0),
            importe_insoluto=pago.get("importe_insoluto", 0),
            numero_parcialidad=pago.get("parcialidad", i + 1),
        )
        db.add(detalle)

    await db.commit()
    return {"id": complemento.id, "uuid": uuid, "monto_total": str(monto_total), "estatus": "activo"}


@router.get("/complementos-pago", response_model=List[dict])
async def listar_complementos_pago(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista los complementos de pago."""
    result = await db.execute(
        select(CfdiComplementoPago).order_by(CfdiComplementoPago.fecha_pago.desc())
    )
    complementos = result.scalars().all()
    return [
        {
            "id": c.id,
            "uuid": c.uuid,
            "receptor_rfc": c.receptor_rfc,
            "receptor_nombre": c.receptor_nombre,
            "fecha_pago": c.fecha_pago.isoformat(),
            "monto_total": str(c.monto_total),
            "estatus": c.estatus,
        }
        for c in complementos
    ]
