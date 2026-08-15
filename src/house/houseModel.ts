import * as THREE from 'three'
import type { CompositionPiece, PieceColor } from '../game/grid'

const COLORS: Record<PieceColor, number> = { red: 0xdd2938, blue: 0x1355a1, yellow: 0xf2c320, white: 0xfafafa, gray: 0x999999, black: 0x111111 }
export type CollisionRect = { minX: number; maxX: number; minZ: number; maxZ: number }
export const HOUSE_BOUNDS = { minX: -3.35, maxX: 3.35, minZ: -2.05, maxZ: 2.05 }
export const HOUSE_COLLIDERS: CollisionRect[] = [
  { minX: -.1, maxX: .1, minZ: -.75, maxZ: 2.1 }, { minX: 1.75, maxX: 1.95, minZ: -.75, maxZ: 2.1 },
  { minX: .05, maxX: 3.4, minZ: -.88, maxZ: -.68 },
]
type HouseColor = PieceColor | 'floor' | 'roof' | 'wood' | 'grass' | 'path' | 'water'

export function createMondrianHouse(pieces: CompositionPiece[]) {
  const house = new THREE.Group(); house.name = 'Casa Mondrian 2.0'
  const roofs = new THREE.Group(); roofs.name = 'roofs'; house.add(roofs)
  const demoFurniture = new THREE.Group(); demoFurniture.name = 'demo-furniture'; house.add(demoFurniture)
  const values: Record<HouseColor, number> = { ...COLORS, floor: 0xd8d2c5, roof: 0xeeeeea, wood: 0x9b6845, grass: 0x7d9b65, path: 0xb8b3a8, water: 0x8db9c6 }
  const materials = new Map<HouseColor, THREE.MeshStandardMaterial>()
  const material = (color: HouseColor) => { let value = materials.get(color); if (!value) { value = new THREE.MeshStandardMaterial({ color: values[color], roughness: .84 }); materials.set(color, value) } return value }
  const box = (size: [number, number, number], position: [number, number, number], color: HouseColor, parent: THREE.Object3D = house) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color)); mesh.position.set(...position); parent.add(mesh); return mesh }
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0xb9dce5, transparent: true, opacity: .18, roughness: .18, depthWrite: false, side: THREE.DoubleSide })
  const glass = (size: [number, number, number], position: [number, number, number], parent: THREE.Object3D = house) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), glassMaterial); mesh.position.set(...position); mesh.renderOrder = 2; parent.add(mesh) }
  const furnitureBox = (size: [number, number, number], position: [number, number, number], color: HouseColor) => box(size, position, color, demoFurniture)
  const window = (x: number, z: number, width: number, alongX = true) => {
    glass(alongX ? [width, 2.15, .035] : [.035, 2.15, width], [x, 1.34, z])
    for (const offset of [-width / 2, 0, width / 2]) box(alongX ? [.07, 2.28, .09] : [.09, 2.28, .07], alongX ? [x + offset, 1.34, z] : [x, 1.34, z + offset], 'black')
    for (const y of [.22, 2.46]) box(alongX ? [width + .08, .08, .09] : [.09, .08, width + .08], [x, y, z], 'black')
  }

  // Terreno, jardim, caminhos e varanda.
  box([11.8, .12, 8.4], [0, -.18, 0], 'grass'); box([3.15, .07, 2.15], [-4.25, -.07, 1.35], 'path')
  box([1.15, .08, 3.2], [-2.8, -.05, 2.7], 'path'); box([2.45, .08, 1.15], [1.15, -.05, 2.75], 'path')
  box([1.8, .05, .85], [3.95, -.06, 2.7], 'water'); box([2.25, .5, .16], [3.7, .17, 3.25], 'blue'); box([.16, .85, 1.6], [4.8, .3, 2.45], 'yellow')

  // Volumes arquitetônicos principais.
  box([7.35, .18, 4.55], [0, 0, 0], 'floor'); box([2.75, .16, 4.15], [-4.35, .02, -.15], 'path')
  box([7.2, 2.85, .16], [0, 1.43, -2.18], 'white'); box([.16, 2.85, 4.45], [-3.52, 1.43, 0], 'white'); box([.16, 2.85, 2.25], [3.52, 1.43, 1.05], 'white')
  window(1.45, 2.18, 3.95); window(3.52, -.95, 2.15, false); window(-1.55, 2.18, 1.45); box([1.05, 2.85, .16], [-2.83, 1.43, 2.18], 'white')
  // Divisórias: ala social à esquerda, circulação, dois quartos, banheiro e serviço.
  box([.13, 2.35, 3.1], [.02, 1.18, .68], 'white'); box([3.4, 2.35, .13], [1.75, 1.18, -.78], 'white')
  box([.13, 2.35, 1.4], [1.85, 1.18, 1.47], 'white'); box([1.7, 2.35, .13], [2.7, 1.18, .72], 'white')
  box([1.65, 2.35, .13], [-2.68, 1.18, -.65], 'white'); box([.13, 2.35, 1.45], [-1.84, 1.18, -1.42], 'white')
  box([7.65, .22, 4.85], [0, 2.94, 0], 'roof', roofs); box([3.15, .2, 4.45], [-4.35, 2.68, -.05], 'roof', roofs); box([2.2, .16, 1.35], [-2.45, 2.76, 2.35], 'yellow', roofs)

  // Garagem integrada e automóvel geométrico.
  for (const x of [-5.62, -3.08]) box([.16, 2.66, .16], [x, 1.31, -1.92], 'black')
  box([.15, 2.15, 2.7], [-5.65, 1.05, .1], 'red'); furnitureBox([1.55, .5, 2.45], [-4.35, .42, -.15], 'blue'); furnitureBox([1.35, .42, 1.25], [-4.35, .82, -.35], 'black')
  for (const x of [-5.05, -3.65]) for (const z of [-.88, .58]) { const wheel = furnitureBox([.25, .42, .42], [x, .25, z], 'black'); wheel.rotation.z = Math.PI / 2 }

  // Sala: sofá, mesa, rack e cadeira inspirada em Rietveld.
  furnitureBox([1.85, .38, .72], [-.95, .38, 1.2], 'gray'); furnitureBox([1.85, .72, .18], [-.95, .72, 1.5], 'gray')
  furnitureBox([1.05, .14, .68], [-.85, .47, .15], 'yellow'); for (const x of [-1.28, -.42]) for (const z of [-.1, .4]) furnitureBox([.07, .43, .07], [x, .25, z], 'black')
  furnitureBox([1.55, .55, .35], [-2.55, .3, -.05], 'black'); furnitureBox([.62, .12, .62], [-2.15, .55, 1.25], 'blue'); furnitureBox([.62, .82, .12], [-2.15, .98, 1.53], 'red')
  for (const x of [-2.42, -1.88]) for (const z of [1.02, 1.5]) furnitureBox([.07, .75, .07], [x, .38, z], 'black')

  // Jantar e cozinha integrada.
  furnitureBox([1.55, .12, .9], [-.85, .75, -1.28], 'wood'); for (const x of [-1.5, -.2]) for (const z of [-1.62, -.94]) furnitureBox([.08, .72, .08], [x, .36, z], 'black')
  for (const [x, z] of [[-1.55,-1.28],[-.15,-1.28],[-.85,-1.85],[-.85,-.72]]) { furnitureBox([.42,.08,.42],[x,.48,z],'red'); furnitureBox([.07,.48,.07],[x,.24,z],'black') }
  furnitureBox([2.85, .9, .48], [1.6, .46, -1.88], 'white'); furnitureBox([2.9, .09, .58], [1.6, .95, -1.88], 'black'); furnitureBox([1.5, .88, .62], [.92, .45, -.25], 'yellow'); furnitureBox([1.58, .09, .7], [.92, .93, -.25], 'black'); furnitureBox([.62, .07, .38], [1.65, 1.01, -1.88], 'water')

  // Quartos, banheiro e área de serviço.
  const bed = (x: number, z: number, color: HouseColor) => { furnitureBox([1.35,.35,1.72],[x,.3,z],'white'); furnitureBox([1.25,.18,1.45],[x,.55,z],color); furnitureBox([1.38,.72,.13],[x,.63,z-.82],'wood') }
  bed(.9, 1.38, 'blue'); bed(2.75, 1.5, 'yellow'); furnitureBox([.38,.48,.38],[1.65,.25,1.7],'red'); furnitureBox([.38,.48,.38],[2,.25,1.85],'blue')
  furnitureBox([.48,1.75,1.25],[3.18,.9,.02],'wood'); furnitureBox([.42,1.65,1.08],[.35,.85,.15],'wood')
  furnitureBox([.78,.7,.42],[2.35,.38,.32],'white'); furnitureBox([.38,.42,.55],[3.05,.25,.15],'white'); glass([.06,1.75,.72],[2.05,1.05,.05],demoFurniture); furnitureBox([.09,1.78,.78],[2.05,1.05,.05],'black')
  furnitureBox([.72,.82,.58],[-2.7,.42,-1.45],'white'); furnitureBox([.6,.08,.42],[-2.7,.87,-1.45],'water'); furnitureBox([.68,1.25,.42],[-2.75,.65,-1.95],'wood')

  // Preserva a composição do aluno nos planos da casa.
  const source = pieces.length ? pieces : defaultInteriorPieces
  source.forEach((piece, index) => { const width = Math.max(.28, piece.width * .42); const height = Math.max(.35, piece.height * .5); const x = -2.7 + ((piece.column + piece.width / 2) / 8) * 5.3; const y = .35 + ((7 - piece.row) / 7) * 1.9; if (index % 2 === 0) box([width, height, .07], [x, y, -2.085], piece.color); else box([.07, height, width], [-3.405, y, -1.4 + ((piece.column + piece.width / 2) / 8) * 2.4], piece.color) })
  return house
}

const defaultInteriorPieces: CompositionPiece[] = [
  { id: -1, column: 0, row: 0, width: 2, height: 2, color: 'red' }, { id: -2, column: 5, row: 2, width: 2, height: 1, color: 'blue' }, { id: -3, column: 2, row: 5, width: 1, height: 2, color: 'yellow' },
]

export function disposeObject(object: THREE.Object3D) {
  const materials = new Set<THREE.Material>()
  object.traverse((child) => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); (Array.isArray(child.material) ? child.material : [child.material]).forEach((item) => materials.add(item)) } })
  materials.forEach((item) => item.dispose())
}
