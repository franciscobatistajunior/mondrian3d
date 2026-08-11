import { useEffect, useRef, type PointerEvent } from 'react'
import * as THREE from 'three'
import type { CompositionPiece } from '../game/grid'
import { createMondrianHouse, disposeObject, HOUSE_BOUNDS, HOUSE_COLLIDERS } from './houseModel'

type ZoomRequest = { id: number; amount: number }
type MoveKey = 'forward' | 'backward' | 'left' | 'right'
type Props = { pieces: CompositionPiece[]; resetToken: number; zoomRequest: ZoomRequest; immersive: boolean }

export function HouseScene({ pieces, resetToken, zoomRequest, immersive }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const houseRef = useRef<THREE.Group | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const distanceRef = useRef(8.4)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const movementRef = useRef<Record<MoveKey, boolean>>({ forward: false, backward: false, left: false, right: false })

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf4f1e8)
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 100)
    camera.position.set(0, 3.1, distanceRef.current)
    camera.lookAt(0, 1.5, 0)
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
    }
    resize(); window.addEventListener('resize', resize)
    let previous = performance.now(); let frame = 0
    const render = (now: number) => {
      frame = requestAnimationFrame(render)
      const dt = Math.min(.04, (now - previous) / 1000); previous = now
      if (mount.dataset.immersive === 'true') yawRef.current = moveCamera(camera, movementRef.current, yawRef.current, dt)
      renderer.render(scene, camera)
    }
    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame); window.removeEventListener('resize', resize)
      if (houseRef.current) disposeObject(houseRef.current)
      renderer.dispose(); renderer.domElement.remove()
      sceneRef.current = null; houseRef.current = null; cameraRef.current = null
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (houseRef.current) { scene.remove(houseRef.current); disposeObject(houseRef.current) }
    const house = createMondrianHouse(pieces); house.rotation.y = immersive ? 0 : -.32
    scene.add(house); houseRef.current = house
  }, [pieces])

  useEffect(() => {
    const camera = cameraRef.current; const house = houseRef.current; const mount = mountRef.current
    if (!camera || !house || !mount) return
    mount.dataset.immersive = String(immersive)
    movementRef.current = { forward: false, backward: false, left: false, right: false }
    if (immersive) {
      house.rotation.y = 0; yawRef.current = 0; pitchRef.current = 0
      camera.fov = 64; camera.position.set(0, 1.58, 1.08); updateLook(camera, yawRef.current, pitchRef.current)
    } else {
      distanceRef.current = 8.4; house.rotation.y = -.32; camera.fov = 42
      camera.position.set(0, 3.1, distanceRef.current); camera.lookAt(0, 1.5, 0)
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
    distanceRef.current = Math.max(5.4, Math.min(11, distanceRef.current + zoomRequest.amount))
    cameraRef.current.position.z = distanceRef.current; cameraRef.current.lookAt(0, 1.5, 0)
  }, [zoomRequest, immersive])

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId); pointerRef.current = { x: event.clientX, y: event.clientY }
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointerRef.current || !houseRef.current || !cameraRef.current) return
    const dx = event.clientX - pointerRef.current.x; const dy = event.clientY - pointerRef.current.y
    if (immersive) {
      yawRef.current -= dx * .006; pitchRef.current = Math.max(-.72, Math.min(.72, pitchRef.current - dy * .004))
      updateLook(cameraRef.current, yawRef.current, pitchRef.current)
    } else houseRef.current.rotation.y += dx * .012
    pointerRef.current = { x: event.clientX, y: event.clientY }
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    pointerRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const hold = (key: MoveKey, active: boolean) => { movementRef.current[key] = active }

  return <div className={`house-canvas${immersive ? ' is-immersive' : ''}`} ref={mountRef} aria-label={immersive ? 'Interior navegável da sua casa. Arraste para olhar ao redor.' : 'Casa tridimensional. Arraste horizontalmente para girar.'} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
    {immersive && <div className="touch-navigation" aria-label="Controles de movimento">
      <button type="button" aria-label="Andar para frente" onPointerDown={(e) => { e.stopPropagation(); hold('forward', true) }} onPointerUp={() => hold('forward', false)} onPointerCancel={() => hold('forward', false)}>↑</button>
      <button type="button" aria-label="Virar para esquerda" onPointerDown={(e) => { e.stopPropagation(); hold('left', true) }} onPointerUp={() => hold('left', false)} onPointerCancel={() => hold('left', false)}>←</button>
      <button type="button" aria-label="Andar para trás" onPointerDown={(e) => { e.stopPropagation(); hold('backward', true) }} onPointerUp={() => hold('backward', false)} onPointerCancel={() => hold('backward', false)}>↓</button>
      <button type="button" aria-label="Virar para direita" onPointerDown={(e) => { e.stopPropagation(); hold('right', true) }} onPointerUp={() => hold('right', false)} onPointerCancel={() => hold('right', false)}>→</button>
    </div>}
  </div>
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
