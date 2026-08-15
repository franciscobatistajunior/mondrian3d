import { useEffect, useRef, type PointerEvent } from 'react'
import * as THREE from 'three'
import type { CompositionPiece } from '../game/grid'
import { createMondrianHouse, disposeObject, HOUSE_BOUNDS, HOUSE_COLLIDERS } from './houseModel'
import { disposeFurnitureResources, furnitureDefinition, isFurniturePlacementValid, type FurnitureItem } from './furnitureCatalog'

type ZoomRequest = { id: number; amount: number }
type NudgeRequest = { id: number; screenX: number; screenZ: number }
type MoveKey = 'forward' | 'backward' | 'left' | 'right'
type Props = { pieces: CompositionPiece[]; resetToken: number; zoomRequest: ZoomRequest; nudgeRequest: NudgeRequest; immersive: boolean; insideView: boolean; plantView: boolean; showDemoFurniture: boolean; furniture: FurnitureItem[]; selectedFurnitureId: number | null; onSelectFurniture: (id: number | null) => void; onMoveFurniture: (id: number, x: number, z: number) => void }
type CameraAnimation = { startedAt: number; duration: number; fromPosition: THREE.Vector3; toPosition: THREE.Vector3; fromQuaternion: THREE.Quaternion; toQuaternion: THREE.Quaternion }

export function HouseScene({ pieces, resetToken, zoomRequest, nudgeRequest, immersive, insideView, plantView, showDemoFurniture, furniture, selectedFurnitureId, onSelectFurniture, onMoveFurniture }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const houseRef = useRef<THREE.Group | null>(null)
  const furnitureGroupRef = useRef<THREE.Group | null>(null)
  const selectionHelperRef = useRef<THREE.BoxHelper | null>(null)
  const furnitureRef = useRef(furniture)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const distanceRef = useRef(12.4)
  const plantDistanceRef = useRef(Number.NaN)
  const plantViewRef = useRef(plantView)
  const animationRef = useRef<CameraAnimation | null>(null)
  const pointerRef = useRef<{ x: number; y: number; furnitureId?: number; offsetX?: number; offsetZ?: number } | null>(null)
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const movementRef = useRef<Record<MoveKey, boolean>>({ forward: false, backward: false, left: false, right: false })

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf4f1e8)
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 100)
    camera.position.set(0, 5.2, distanceRef.current)
    camera.lookAt(-.5, 1.25, 0)
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }) }
    catch { mount.dataset.error = 'true'; return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)
    const ambient = new THREE.HemisphereLight(0xffffff, 0x777777, 2.15)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.15)
    keyLight.position.set(4, 7, 6)
    scene.add(ambient, keyLight)
    sceneRef.current = scene; cameraRef.current = camera

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect()
      if (!width || !height) return
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false)
      if (plantViewRef.current && houseRef.current) setPlantCamera(camera, houseRef.current, plantDistanceRef, false)
    }
    resize(); window.addEventListener('resize', resize)
    let previous = performance.now(); let frame = 0
    const render = (now: number) => {
      frame = requestAnimationFrame(render)
      const dt = Math.min(.04, (now - previous) / 1000); previous = now
      if (mount.dataset.immersive === 'true') yawRef.current = moveCamera(camera, movementRef.current, yawRef.current, dt)
      const animation = animationRef.current
      if (animation) {
        const progress = Math.min(1, (now - animation.startedAt) / animation.duration)
        const eased = progress < .5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2
        camera.position.lerpVectors(animation.fromPosition, animation.toPosition, eased)
        camera.quaternion.slerpQuaternions(animation.fromQuaternion, animation.toQuaternion, eased)
        if (progress === 1) animationRef.current = null
      }
      renderer.render(scene, camera)
    }
    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame); window.removeEventListener('resize', resize)
      if (selectionHelperRef.current) { selectionHelperRef.current.removeFromParent(); selectionHelperRef.current.geometry.dispose(); (selectionHelperRef.current.material as THREE.Material).dispose(); selectionHelperRef.current = null }
      if (houseRef.current) disposeObject(houseRef.current)
      disposeFurnitureResources()
      renderer.dispose(); renderer.domElement.remove()
      sceneRef.current = null; houseRef.current = null; furnitureGroupRef.current = null; cameraRef.current = null
    }
  }, [])

  useEffect(() => {
    plantViewRef.current = plantView
    if (plantView) plantDistanceRef.current = Number.NaN
  }, [plantView])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (houseRef.current) {
      if (furnitureGroupRef.current) houseRef.current.remove(furnitureGroupRef.current)
      scene.remove(houseRef.current); disposeObject(houseRef.current)
    }
    const house = createMondrianHouse(pieces); house.rotation.y = immersive ? 0 : -.32
    scene.add(house); houseRef.current = house
  }, [pieces])

  useEffect(() => {
    const demoFurniture = houseRef.current?.getObjectByName('demo-furniture')
    if (demoFurniture) demoFurniture.visible = showDemoFurniture
  }, [showDemoFurniture, pieces])

  useEffect(() => {
    furnitureRef.current = furniture
    const house = houseRef.current
    if (!house) return
    let group = furnitureGroupRef.current
    if (!group) { group = new THREE.Group(); group.name = 'user-furniture'; furnitureGroupRef.current = group }
    if (group.parent !== house) house.add(group)
    const current = new Map<number, THREE.Group>()
    for (const child of group.children) if (child instanceof THREE.Group && typeof child.userData.furnitureId === 'number') current.set(child.userData.furnitureId, child)
    for (const item of furniture) {
      let object = current.get(item.id)
      if (!object) {
        object = furnitureDefinition(item.type)?.create()
        if (!object) continue
        object.userData.furnitureId = item.id; object.name = `furniture-${item.type}-${item.id}`; group.add(object)
      }
      object.position.set(item.x, .08, item.z); object.rotation.y = item.rotation; current.delete(item.id)
    }
    current.forEach((object) => group.remove(object))
  }, [furniture, pieces])

  useEffect(() => {
    const group = furnitureGroupRef.current
    if (selectionHelperRef.current) { selectionHelperRef.current.removeFromParent(); selectionHelperRef.current.geometry.dispose(); (selectionHelperRef.current.material as THREE.Material).dispose(); selectionHelperRef.current = null }
    if (!plantView || !group || selectedFurnitureId === null) return
    const selected = group.children.find((child) => child.userData.furnitureId === selectedFurnitureId)
    if (!selected) return
    const helper = new THREE.BoxHelper(selected, 0xf2c320); helper.material.depthTest = false; helper.renderOrder = 10; sceneRef.current?.add(helper); selectionHelperRef.current = helper
  }, [selectedFurnitureId, furniture, pieces, plantView])

  useEffect(() => {
    const roofs = houseRef.current?.getObjectByName('roofs')
    if (roofs) roofs.visible = !insideView && !plantView
    const camera = cameraRef.current
    if (!camera || immersive) return
    if (plantView && houseRef.current) setPlantCamera(camera, houseRef.current, plantDistanceRef, true, animationRef)
    else if (insideView) {
      camera.up.set(0, 1, 0)
      animateCamera(camera, new THREE.Vector3(0, 10.8, 8.8), new THREE.Vector3(-.45, 0, 0), animationRef)
    } else {
      camera.up.set(0, 1, 0)
      animateCamera(camera, new THREE.Vector3(0, 5.2, distanceRef.current), new THREE.Vector3(-.5, 1.25, 0), animationRef)
    }
  }, [insideView, plantView, pieces, immersive])

  useEffect(() => {
    const camera = cameraRef.current; const house = houseRef.current; const mount = mountRef.current
    if (!camera || !house || !mount) return
    mount.dataset.immersive = String(immersive)
    movementRef.current = { forward: false, backward: false, left: false, right: false }
    if (immersive) {
      house.rotation.y = 0; yawRef.current = 0; pitchRef.current = 0
      camera.fov = 64; camera.position.set(0, 1.58, 1.08); updateLook(camera, yawRef.current, pitchRef.current)
    } else if (plantView) {
      camera.fov = 42
      setPlantCamera(camera, house, plantDistanceRef, false)
    } else {
      distanceRef.current = 12.4; house.rotation.y = -.32; camera.fov = 42
      camera.up.set(0, 1, 0)
      camera.position.set(0, insideView ? 10.8 : 5.2, insideView ? 8.8 : distanceRef.current); camera.lookAt(-.5, insideView ? 0 : 1.25, 0)
    }
    camera.updateProjectionMatrix()
  }, [immersive, resetToken])

  useEffect(() => {
    if (!immersive || !cameraRef.current) return
    const down = (event: KeyboardEvent) => setKeyboard(event.code, true)
    const up = (event: KeyboardEvent) => setKeyboard(event.code, false)
    const setKeyboard = (code: string, active: boolean) => {
      const key = ({ KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' } as Record<string, MoveKey>)[code]
      if (key) movementRef.current[key] = active
    }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [immersive])

  useEffect(() => {
    if (immersive || zoomRequest.id === 0 || !cameraRef.current) return
    if (plantView && houseRef.current) {
      plantDistanceRef.current = Math.max(7, Math.min(24, plantDistanceRef.current + zoomRequest.amount))
      setPlantCamera(cameraRef.current, houseRef.current, plantDistanceRef, false)
      return
    }
    distanceRef.current = Math.max(8.2, Math.min(16, distanceRef.current + zoomRequest.amount))
    cameraRef.current.position.z = distanceRef.current; cameraRef.current.lookAt(-.5, insideView ? 0 : 1.25, 0)
  }, [zoomRequest, immersive, plantView, insideView])

  useEffect(() => {
    const house = houseRef.current
    if (!plantView || nudgeRequest.id === 0 || selectedFurnitureId === null || !house) return
    const item = furnitureRef.current.find((value) => value.id === selectedFurnitureId)
    if (!item) return
    const inverseHouseRotation = house.getWorldQuaternion(new THREE.Quaternion()).invert()
    const localMovement = new THREE.Vector3(nudgeRequest.screenX, 0, nudgeRequest.screenZ).applyQuaternion(inverseHouseRotation)
    const candidate = { ...item, x:item.x + localMovement.x, z:item.z + localMovement.z }
    if (!isFurniturePlacementValid(candidate, furnitureRef.current)) return
    furnitureRef.current = furnitureRef.current.map((value) => value.id === candidate.id ? candidate : value)
    onMoveFurniture(candidate.id, candidate.x, candidate.z)
  }, [nudgeRequest])

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    if (plantView && cameraRef.current && furnitureGroupRef.current && houseRef.current) {
      const hit = furnitureAtPointer(event, cameraRef.current, furnitureGroupRef.current)
      if (hit) {
        const point = groundPoint(event, cameraRef.current, event.currentTarget, houseRef.current)
        const item = furnitureRef.current.find((value) => value.id === hit.id)
        if (point && item) pointerRef.current = { x:event.clientX, y:event.clientY, furnitureId:hit.id, offsetX:item.x-point.x, offsetZ:item.z-point.z }
        onSelectFurniture(hit.id); return
      }
      onSelectFurniture(null)
    }
    pointerRef.current = { x: event.clientX, y: event.clientY }
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointerRef.current || !houseRef.current || !cameraRef.current) return
    const dx = event.clientX - pointerRef.current.x; const dy = event.clientY - pointerRef.current.y
    if (plantView && pointerRef.current.furnitureId !== undefined && houseRef.current) {
      const point = groundPoint(event, cameraRef.current, event.currentTarget, houseRef.current)
      const item = furnitureRef.current.find((value) => value.id === pointerRef.current?.furnitureId)
      if (point && item) {
        const candidate = { ...item, x:point.x + (pointerRef.current.offsetX ?? 0), z:point.z + (pointerRef.current.offsetZ ?? 0) }
        if (isFurniturePlacementValid(candidate, furnitureRef.current)) {
          furnitureRef.current = furnitureRef.current.map((value) => value.id === candidate.id ? candidate : value)
          onMoveFurniture(candidate.id, candidate.x, candidate.z)
        }
      }
    } else if (immersive) {
      yawRef.current -= dx * .006; pitchRef.current = Math.max(-.72, Math.min(.72, pitchRef.current - dy * .004))
      updateLook(cameraRef.current, yawRef.current, pitchRef.current)
    } else if (!plantView) houseRef.current.rotation.y += dx * .012
    pointerRef.current = { x: event.clientX, y: event.clientY }
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    pointerRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const hold = (key: MoveKey, active: boolean) => { movementRef.current[key] = active }

  return <div className={`house-canvas${immersive ? ' is-immersive' : ''}${plantView ? ' is-plant-view' : ''}`} ref={mountRef} aria-label={immersive ? 'Interior navegável da sua casa. Arraste para olhar ao redor.' : plantView ? 'Vista de planta da casa, observada verticalmente de cima.' : 'Casa tridimensional. Arraste horizontalmente para girar.'} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
    {immersive && <div className="touch-navigation" aria-label="Controles de movimento">
      <button type="button" aria-label="Andar para frente" onPointerDown={(e) => { e.stopPropagation(); hold('forward', true) }} onPointerUp={() => hold('forward', false)} onPointerCancel={() => hold('forward', false)}>↑</button>
      <button type="button" aria-label="Virar para esquerda" onPointerDown={(e) => { e.stopPropagation(); hold('left', true) }} onPointerUp={() => hold('left', false)} onPointerCancel={() => hold('left', false)}>←</button>
      <button type="button" aria-label="Andar para trás" onPointerDown={(e) => { e.stopPropagation(); hold('backward', true) }} onPointerUp={() => hold('backward', false)} onPointerCancel={() => hold('backward', false)}>↓</button>
      <button type="button" aria-label="Virar para direita" onPointerDown={(e) => { e.stopPropagation(); hold('right', true) }} onPointerUp={() => hold('right', false)} onPointerCancel={() => hold('right', false)}>→</button>
    </div>}
  </div>
}

function pointerRay(event: PointerEvent<HTMLDivElement>, camera: THREE.PerspectiveCamera, element: HTMLDivElement) {
  const bounds = element.getBoundingClientRect()
  const pointer = new THREE.Vector2(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1)
  const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(pointer, camera); return raycaster
}

function furnitureAtPointer(event: PointerEvent<HTMLDivElement>, camera: THREE.PerspectiveCamera, group: THREE.Group) {
  const intersections = pointerRay(event, camera, event.currentTarget).intersectObjects(group.children, true)
  for (const intersection of intersections) {
    let object: THREE.Object3D | null = intersection.object
    while (object && object !== group) { if (typeof object.userData.furnitureId === 'number') return { id: object.userData.furnitureId as number }; object = object.parent }
  }
  return null
}

function groundPoint(event: PointerEvent<HTMLDivElement>, camera: THREE.PerspectiveCamera, element: HTMLDivElement, house: THREE.Group) {
  const point = pointerRay(event, camera, element).ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3())
  return point ? house.worldToLocal(point) : null
}

function setPlantCamera(camera: THREE.PerspectiveCamera, house: THREE.Group, distance: React.MutableRefObject<number>, smooth: boolean, animationRef?: React.MutableRefObject<CameraAnimation | null>) {
  const bounds = new THREE.Box3().setFromObject(house)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  const verticalFov = THREE.MathUtils.degToRad(camera.fov)
  const fitDistance = Math.max(size.z / (2 * Math.tan(verticalFov / 2)), size.x / (2 * Math.tan(verticalFov / 2) * camera.aspect)) * 1.12
  if (!Number.isFinite(distance.current)) distance.current = Math.max(7, fitDistance)
  const position = new THREE.Vector3(center.x, bounds.max.y + distance.current, center.z)
  const target = new THREE.Vector3(center.x, bounds.min.y, center.z)
  camera.up.set(0, 0, -1)
  if (smooth && animationRef) animateCamera(camera, position, target, animationRef)
  else { camera.position.copy(position); camera.lookAt(target) }
}

function animateCamera(camera: THREE.PerspectiveCamera, position: THREE.Vector3, target: THREE.Vector3, animationRef: React.MutableRefObject<CameraAnimation | null>) {
  const targetCamera = camera.clone()
  targetCamera.position.copy(position)
  targetCamera.lookAt(target)
  animationRef.current = { startedAt: performance.now(), duration: 650, fromPosition: camera.position.clone(), toPosition: position, fromQuaternion: camera.quaternion.clone(), toQuaternion: targetCamera.quaternion.clone() }
}

function updateLook(camera: THREE.PerspectiveCamera, yaw: number, pitch: number) {
  camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch; camera.rotation.z = 0
}

function moveCamera(camera: THREE.PerspectiveCamera, keys: Record<MoveKey, boolean>, yaw: number, dt: number) {
  if (keys.left) yaw += 1.65 * dt
  if (keys.right) yaw -= 1.65 * dt
  const direction = (Number(keys.forward) - Number(keys.backward)) * 1.45 * dt
  if (!direction) { updateLook(camera, yaw, camera.rotation.x); return yaw }
  const nextX = camera.position.x - Math.sin(yaw) * direction
  const nextZ = camera.position.z - Math.cos(yaw) * direction
  const radius = .18
  const blocked = HOUSE_COLLIDERS.some((wall) => nextX + radius > wall.minX && nextX - radius < wall.maxX && nextZ + radius > wall.minZ && nextZ - radius < wall.maxZ)
  if (!blocked) {
    camera.position.x = Math.max(HOUSE_BOUNDS.minX, Math.min(HOUSE_BOUNDS.maxX, nextX))
    camera.position.z = Math.max(HOUSE_BOUNDS.minZ, Math.min(HOUSE_BOUNDS.maxZ, nextZ))
  }
  updateLook(camera, yaw, camera.rotation.x)
  return yaw
}
