import * as THREE from 'three'
import type { CompositionPiece, PieceColor } from '../game/grid'

const COLORS: Record<PieceColor, number> = { red: 0xdd2938, blue: 0x1355a1, yellow: 0xf2c320, white: 0xfafafa, gray: 0x999999, black: 0x111111 }
export type CollisionRect = { minX: number; maxX: number; minZ: number; maxZ: number }
export const HOUSE_BOUNDS = { minX: -2.18, maxX: 2.18, minZ: -1.28, maxZ: 1.28 }
export const HOUSE_COLLIDERS: CollisionRect[] = [
  { minX: -.11, maxX: .11, minZ: -.92, maxZ: .28 },
  { minX: .55, maxX: 1.9, minZ: -.11, maxZ: .11 },
]

export function createMondrianHouse(pieces: CompositionPiece[]) {
  const house = new THREE.Group()
  house.name = 'Casa criada a partir da composição'
  const materials = new Map<PieceColor | 'floor' | 'roof', THREE.MeshStandardMaterial>()
  const material = (color: PieceColor | 'floor' | 'roof') => {
    let value = materials.get(color)
    if (!value) {
      const hex = color === 'floor' ? 0xd2cec3 : color === 'roof' ? 0x222222 : COLORS[color]
      value = new THREE.MeshStandardMaterial({ color: hex, roughness: .86, metalness: 0, side: THREE.DoubleSide })
      materials.set(color, value)
    }
    return value
  }
  const box = (size: [number, number, number], position: [number, number, number], color: PieceColor | 'floor' | 'roof') => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color))
    mesh.position.set(...position)
    house.add(mesh)
  }
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0xb9d7df,
    transparent: true,
    opacity: .24,
    roughness: .28,
    metalness: .05,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  box([7.6, .18, 5.8], [0, -.1, 0], 'floor')
  box([5.1, 3.35, .18], [0, 1.58, -1.52], 'white')
  box([.18, 3.35, 3.2], [-2.42, 1.58, 0], 'white')
  const glass = new THREE.Mesh(new THREE.BoxGeometry(.045, 3.08, 2.92), glassMaterial)
  glass.position.set(2.42, 1.58, 0)
  glass.renderOrder = 1
  house.add(glass)

  // Cortina de vidro lateral: moldura, montantes e travessas em ritmos desiguais.
  for (const z of [-1.48, -.46, .5, 1.48]) box([.12, 3.24, .12], [2.42, 1.58, z], 'black')
  for (const y of [.02, 1.02, 2.18, 3.2]) box([.12, .12, 3.08], [2.42, y, 0], 'black')
  box([2.06, 3.35, .18], [-1.52, 1.58, 1.52], 'white')
  box([2.06, 3.35, .18], [1.52, 1.58, 1.52], 'white')
  box([.98, 1.18, .18], [0, 2.66, 1.52], 'white')
  box([5.45, .28, 3.7], [0, 3.42, 0], 'roof')
  box([5.75, .1, 4], [0, 3.61, 0], 'gray')
  box([.12, 2.18, .16], [-.55, 1.08, 1.58], 'black')
  box([.12, 2.18, .16], [.55, 1.08, 1.58], 'black')
  box([1.22, .12, .16], [0, 2.14, 1.58], 'black')

  for (const piece of pieces) {
    const width = (piece.width / 8) * 3.9
    const height = (piece.height / 8) * 2.65
    const x = ((piece.column + piece.width / 2) / 8) * 3.9 - 1.95
    const y = .32 + (1 - (piece.row + piece.height / 2) / 8) * 2.65
    const crossesDoor = Math.abs(x) < .62 + width / 2 && y - height / 2 < 2.2
    if (!crossesDoor) box([Math.max(.12, width - .045), Math.max(.12, height - .045), .1], [x, y, 1.63], piece.color)
  }

  const source = pieces.length ? pieces : defaultInteriorPieces
  source.forEach((piece, index) => {
    const panelWidth = Math.max(.28, piece.width * .43)
    const panelHeight = Math.max(.35, piece.height * .55)
    const y = .28 + ((7 - piece.row) / 7) * 2.25
    if (index % 2 === 0) {
      const x = -1.75 + ((piece.column + piece.width / 2) / 8) * 3.5
      box([panelWidth, panelHeight, .08], [x, y, -1.405], piece.color)
    } else {
      const z = -1.05 + ((piece.column + piece.width / 2) / 8) * 2.1
      box([.08, panelHeight, panelWidth], [-2.285, y, z], piece.color)
    }
  })

  box([.16, 2.55, 1.2], [0, 1.27, -.32], 'black')
  box([.19, 2.35, 1.08], [0, 1.23, -.3], source[0]?.color ?? 'red')
  box([1.35, 2.3, .16], [1.22, 1.15, 0], 'black')
  box([1.2, 2.15, .19], [1.22, 1.12, 0], source[1]?.color ?? 'blue')
  box([4.4, .08, .08], [0, 2.72, -1.36], 'black')
  return house
}

const defaultInteriorPieces: CompositionPiece[] = [
  { id: -1, column: 0, row: 0, width: 2, height: 2, color: 'red' },
  { id: -2, column: 5, row: 2, width: 2, height: 1, color: 'blue' },
  { id: -3, column: 2, row: 5, width: 1, height: 2, color: 'yellow' },
]

export function disposeObject(object: THREE.Object3D) {
  const materials = new Set<THREE.Material>()
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.geometry.dispose()
    const list = Array.isArray(child.material) ? child.material : [child.material]
    list.forEach((item) => materials.add(item))
  })
  materials.forEach((item) => item.dispose())
}
