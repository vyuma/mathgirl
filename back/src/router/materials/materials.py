from fastapi import APIRouter, HTTPException

from model.session import MaterialDetail, MaterialListItem
from service.materials import get_material, list_materials

router = APIRouter()


@router.get("/materials", response_model=list[MaterialListItem])
async def get_materials():
    """教材一覧を返す。"""
    return list_materials()


@router.get("/materials/{material_id}", response_model=MaterialDetail)
async def get_material_detail(material_id: str):
    """教材の詳細（本文含む）を返す。"""
    material = get_material(material_id)
    if material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return material
