import * as THREE from 'three'
import { HOUSE_COLLIDERS, type CollisionRect } from './houseModel'

export type FurnitureCategory = 'Sala' | 'Quarto' | 'Cozinha' | 'Banheiro' | 'Garagem'
export type FurnitureItem = { id: number; type: string; x: number; z: number; rotation: number }
export type FurnitureDefinition = {
  type: string
  name: string
  category: FurnitureCategory
  icon: string
  width: number
  depth: number
  create: () => THREE.Group
}

const colors = { white: 0xf4f1e8, black: 0x111111, red: 0xdd2938, blue: 0x1355a1, yellow: 0xf2c320, wood: 0x9b6845, glass: 0x8db9c6, gray: 0x999999 }
const materials = new Map<keyof typeof colors, THREE.MeshStandardMaterial>()
const geometries = new Map<string, THREE.BoxGeometry>()

function material(color: keyof typeof colors) {
  let result = materials.get(color)
  if (!result) { result = new THREE.MeshStandardMaterial({ color: colors[color], roughness: .82, transparent: color === 'glass', opacity: color === 'glass' ? .42 : 1 }); materials.set(color, result) }
  return result
}

function box(parent: THREE.Group, size: [number, number, number], position: [number, number, number], color: keyof typeof colors) {
  const key = size.join(':')
  let geometry = geometries.get(key)
  if (!geometry) { geometry = new THREE.BoxGeometry(...size); geometries.set(key, geometry) }
  const mesh = new THREE.Mesh(geometry, material(color)); mesh.position.set(...position); parent.add(mesh)
}

function make(parts: (group: THREE.Group) => void) { const group = new THREE.Group(); parts(group); return group }
function legs(group: THREE.Group, width: number, depth: number, height: number) { for (const x of [-width / 2, width / 2]) for (const z of [-depth / 2, depth / 2]) box(group, [.07, height, .07], [x, height / 2, z], 'black') }

const sofa = () => make((g) => { box(g, [1.65,.38,.72], [0,.28,0], 'blue'); box(g,[1.65,.65,.16],[0,.6,.29],'blue'); box(g,[.16,.55,.72],[-.75,.48,0],'yellow'); box(g,[.16,.55,.72],[.75,.48,0],'red') })
const chair = () => make((g) => { box(g,[.48,.09,.48],[0,.47,0],'red'); box(g,[.48,.62,.09],[0,.76,.2],'blue'); legs(g,.36,.36,.43) })
const table = (width = 1.25, depth = .8, color: keyof typeof colors = 'wood') => make((g) => { box(g,[width,.12,depth],[0,.72,0],color); legs(g,width - .18,depth - .18,.68) })
const cabinet = (width = 1.2, depth = .42, height = .82, color: keyof typeof colors = 'white') => make((g) => { box(g,[width,height,depth],[0,height/2,0],color); box(g,[.04,height*.82,.03],[-.04,height/2,depth/2+.02],'black') })
const bed = (width: number) => make((g) => { box(g,[width,.32,1.85],[0,.25,0],'white'); box(g,[width-.1,.15,1.45],[0,.49,.13],'yellow'); box(g,[width,.7,.12],[0,.48,-.86],'wood'); box(g,[width*.72,.12,.38],[0,.62,-.52],'white') })

export const FURNITURE_CATEGORIES: FurnitureCategory[] = ['Sala', 'Quarto', 'Cozinha', 'Banheiro', 'Garagem']
export const FURNITURE_CATALOG: FurnitureDefinition[] = [
  { type:'sofa', name:'Sofá', category:'Sala', icon:'▰', width:1.65, depth:.72, create:sofa },
  { type:'armchair', name:'Poltrona', category:'Sala', icon:'▣', width:.82, depth:.78, create:() => make((g) => { box(g,[.78,.4,.7],[0,.3,0],'red'); box(g,[.78,.62,.14],[0,.58,.28],'red'); box(g,[.12,.52,.7],[-.34,.46,0],'black'); box(g,[.12,.52,.7],[.34,.46,0],'black') }) },
  { type:'coffee-table', name:'Mesa de centro', category:'Sala', icon:'▬', width:1.05, depth:.62, create:() => table(1.05,.62,'yellow') },
  { type:'rack', name:'Estante/rack', category:'Sala', icon:'▤', width:1.45, depth:.38, create:() => cabinet(1.45,.38,.62,'black') },
  { type:'double-bed', name:'Cama de casal', category:'Quarto', icon:'▥', width:1.45, depth:1.85, create:() => bed(1.45) },
  { type:'single-bed', name:'Cama de solteiro', category:'Quarto', icon:'▯', width:.88, depth:1.85, create:() => bed(.88) },
  { type:'nightstand', name:'Criado-mudo', category:'Quarto', icon:'▪', width:.42, depth:.42, create:() => cabinet(.42,.42,.48,'blue') },
  { type:'wardrobe', name:'Guarda-roupa', category:'Quarto', icon:'▥', width:1.25, depth:.52, create:() => cabinet(1.25,.52,1.72,'wood') },
  { type:'dining-table', name:'Mesa', category:'Cozinha', icon:'▭', width:1.3, depth:.82, create:() => table(1.3,.82) },
  { type:'chair', name:'Cadeira', category:'Cozinha', icon:'▱', width:.5, depth:.5, create:chair },
  { type:'counter', name:'Bancada', category:'Cozinha', icon:'▬', width:1.55, depth:.58, create:() => cabinet(1.55,.58,.9,'yellow') },
  { type:'kitchen-cabinet', name:'Armário', category:'Cozinha', icon:'▤', width:1.25, depth:.48, create:() => cabinet(1.25,.48,.92,'white') },
  { type:'fridge', name:'Geladeira', category:'Cozinha', icon:'▥', width:.68, depth:.68, create:() => make((g) => { box(g,[.68,1.65,.68],[0,.825,0],'white'); box(g,[.05,.55,.04],[.2,1.05,.36],'black') }) },
  { type:'toilet', name:'Vaso sanitário', category:'Banheiro', icon:'◉', width:.55, depth:.72, create:() => make((g) => { box(g,[.5,.42,.55],[0,.28,.06],'white'); box(g,[.55,.12,.6],[0,.52,.03],'white'); box(g,[.52,.68,.18],[0,.45,-.28],'white') }) },
  { type:'sink', name:'Pia/bancada', category:'Banheiro', icon:'▱', width:.85, depth:.48, create:() => make((g) => { box(g,[.85,.72,.48],[0,.36,0],'blue'); box(g,[.72,.09,.4],[0,.77,0],'white') }) },
  { type:'shower', name:'Box', category:'Banheiro', icon:'□', width:.9, depth:.9, create:() => make((g) => { box(g,[.9,.06,.9],[0,.04,0],'white'); box(g,[.05,1.75,.9],[-.43,.88,0],'glass'); box(g,[.9,1.75,.05],[0,.88,-.43],'glass') }) },
  { type:'car', name:'Carro simplificado', category:'Garagem', icon:'▰', width:1.45, depth:2.25, create:() => make((g) => { box(g,[1.45,.42,2.25],[0,.4,0],'red'); box(g,[1.22,.42,1.12],[0,.75,-.12],'blue'); for (const x of [-.68,.68]) for (const z of [-.72,.72]) box(g,[.16,.38,.42],[x,.25,z],'black') }) },
  { type:'garage-bench', name:'Armário/bancada', category:'Garagem', icon:'▤', width:1.35, depth:.52, create:() => cabinet(1.35,.52,.92,'gray') },
]

export function furnitureDefinition(type: string) { return FURNITURE_CATALOG.find((item) => item.type === type) }

const usableZones: CollisionRect[] = [
  { minX:-3.32, maxX:3.32, minZ:-2.02, maxZ:2.02 },
  { minX:-5.5, maxX:-3.18, minZ:-1.82, maxZ:1.72 },
]

export function furnitureRect(item: FurnitureItem): CollisionRect | null {
  const definition = furnitureDefinition(item.type); if (!definition) return null
  const quarterTurn = Math.abs(Math.round(item.rotation / (Math.PI / 2))) % 2 === 1
  const width = quarterTurn ? definition.depth : definition.width
  const depth = quarterTurn ? definition.width : definition.depth
  return { minX:item.x-width/2, maxX:item.x+width/2, minZ:item.z-depth/2, maxZ:item.z+depth/2 }
}

function overlaps(a: CollisionRect, b: CollisionRect, margin = .035) { return a.minX < b.maxX + margin && a.maxX > b.minX - margin && a.minZ < b.maxZ + margin && a.maxZ > b.minZ - margin }
export function isFurniturePlacementValid(item: FurnitureItem, all: FurnitureItem[]) {
  const rect = furnitureRect(item); if (!rect) return false
  const inZone = usableZones.some((zone) => rect.minX >= zone.minX && rect.maxX <= zone.maxX && rect.minZ >= zone.minZ && rect.maxZ <= zone.maxZ)
  if (!inZone || HOUSE_COLLIDERS.some((wall) => overlaps(rect, wall, .025))) return false
  return !all.some((other) => other.id !== item.id && (() => { const otherRect = furnitureRect(other); return otherRect ? overlaps(rect, otherRect, .025) : false })())
}

export function findFurniturePosition(type: string, all: FurnitureItem[], rotation = 0) {
  const definition = furnitureDefinition(type)
  const origins: Record<FurnitureCategory, { x:number; z:number }> = { Sala:{ x:-1.05,z:.65 }, Quarto:{ x:.85,z:1.35 }, Cozinha:{ x:.85,z:-1.45 }, Banheiro:{ x:2.55,z:.1 }, Garagem:{ x:-4.35,z:.65 } }
  const origin = origins[definition?.category ?? 'Sala']
  for (let ring = 0; ring < 8; ring++) for (let index = 0; index < 16; index++) {
    const angle = index / 16 * Math.PI * 2
    const candidate: FurnitureItem = { id:-1, type, x:origin.x + Math.cos(angle)*ring*.32, z:origin.z + Math.sin(angle)*ring*.32, rotation }
    if (isFurniturePlacementValid(candidate, all)) return { x:candidate.x, z:candidate.z }
  }
  return null
}

export function disposeFurnitureResources() { geometries.forEach((geometry) => geometry.dispose()); materials.forEach((value) => value.dispose()); geometries.clear(); materials.clear() }
