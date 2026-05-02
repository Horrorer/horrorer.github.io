import * as THREE from 'three';

// ==================== ПЕРЕМЕННЫЕ ====================
const keys = {};
let mouseX = 0;
let mouseY = 0;
let isPointerLocked = false;
let jumpscareTriggered = false;
let playerInDangerZone = false;
let dangerTimer = 0;
let ghostWhisperTimer = 0;
let lastTime = 0;

// ==================== СЦЕНА ====================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.02);

// ==================== КАМЕРА ====================
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 5);

// ==================== РЕНДЕРЕР ====================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
document.body.appendChild(renderer.domElement);

// ==================== СВЕТ ====================
const ambientLight = new THREE.AmbientLight(0x111122, 0.25);
scene.add(ambientLight);

const flashlight = new THREE.SpotLight(0xffeebb, 12, 18, Math.PI / 8, 0.3, 0.4);
flashlight.position.set(0, 0, 0);
flashlight.castShadow = true;
flashlight.shadow.mapSize.width = 1024;
flashlight.shadow.mapSize.height = 1024;
camera.add(flashlight);

const redLight = new THREE.PointLight(0xff0000, 2, 8);
redLight.position.set(0, 1, -12);
redLight.castShadow = true;
scene.add(redLight);

// ==================== ТЕКСТУРЫ (генерируем кодом) ====================
function createTexture(baseColor, noiseAmount = 0.06) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const alpha = Math.random() * noiseAmount;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
}

// ==================== ПОЛ ====================
const floorTexture = createTexture('#1a1818', 0.08);
const floorGeo = new THREE.PlaneGeometry(20, 30);
const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.9, metalness: 0.1 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ==================== СТЕНЫ ====================
function createWall(x, y, z, rotY, w = 12, h = 4) {
    const tex = createTexture('#1a1212', 0.07);
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 });
    const wall = new THREE.Mesh(geo, mat);
    wall.position.set(x, y, z);
    wall.rotation.y = rotY;
    wall.receiveShadow = true;
    wall.castShadow = true;
    scene.add(wall);
    return wall;
}

// Основной коридор
createWall(-3, 2, -2, 0);           // Левая передняя
createWall(3, 2, -2, Math.PI);      // Правая передняя
createWall(-3, 2, 8, 0);           // Левая задняя
createWall(3, 2, 8, Math.PI);      // Правая задняя
createWall(0, 2, -8, Math.PI / 2); // Дальняя
createWall(0, 2, 12, -Math.PI / 2); // Ближняя

// Поперечная стена с проходом
createWall(-1.5, 2, 3, Math.PI / 2, 3, 4);
createWall(1.5, 2, 3, Math.PI / 2, 3, 4);

// ==================== ПОТОЛОК ====================
const ceilingGeo = new THREE.PlaneGeometry(20, 30);
const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 4;
ceiling.receiveShadow = true;
scene.add(ceiling);

// ==================== БОЧКА С ОГНЁМ ====================
const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 1, 16);
const barrelMat = new THREE.MeshStandardMaterial({ color: 0x3d1a1a, roughness: 0.5, metalness: 0.7 });
const barrel = new THREE.Mesh(barrelGeo, barrelMat);
barrel.position.set(2, 0.5, -4);
barrel.castShadow = true;
barrel.receiveShadow = true;
scene.add(barrel);

const fireLight = new THREE.PointLight(0xff5500, 4, 7);
fireLight.position.set(2, 1.1, -4);
scene.add(fireLight);

// ==================== СТУЛ ====================
const chairGroup = new THREE.Group();
const seatGeo = new THREE.BoxGeometry(0.5, 0.05, 0.5);
const seatMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.7 });
chairGroup.add(new THREE.Mesh(seatGeo, seatMat));

for (let i = 0; i < 4; i++) {
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8);
    const leg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.5 }));
    leg.position.set((i % 2 === 0 ? -0.2 : 0.2), -0.4, (i < 2 ? -0.2 : 0.2));
    leg.castShadow = true;
    chairGroup.add(leg);
}
chairGroup.position.set(-2.2, 0.4, -7);
chairGroup.rotation.z = 1.3;
chairGroup.rotation.x = -0.4;
scene.add(chairGroup);

// ==================== КРОВАВЫЕ СЛЕДЫ ====================
const bloodGeo = new THREE.PlaneGeometry(0.25, 0.4);
const bloodMat = new THREE.MeshBasicMaterial({ color: 0x1a0000, transparent: true, opacity: 0.5, depthWrite: false });
for (let i = 0; i < 20; i++) {
    const blood = new THREE.Mesh(bloodGeo, bloodMat);
    blood.rotation.x = -Math.PI / 2;
    blood.position.set((Math.random() - 0.5) * 3, 0.001, -2 + i * 0.3);
    blood.rotation.z = Math.random() * Math.PI;
    scene.add(blood);
}

// ==================== ТРУБЫ НА СТЕНАХ ====================
function createPipe(x, y, z, rot) {
    const geo = new THREE.CylinderGeometry(0.06, 0.06, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.4 });
    const pipe = new THREE.Mesh(geo, mat);
    pipe.position.set(x, y, z);
    pipe.rotation.z = rot;
    pipe.castShadow = true;
    scene.add(pipe);
}
createPipe(-2.9, 2.5, -3, Math.PI / 2);
createPipe(2.9, 1.5, 5, -Math.PI / 2);

// ==================== СУЩНОСТЬ ====================
function createEntity() {
    const entity = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.6, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.9 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.3;
    body.castShadow = true;
    entity.add(body);

    const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.15, emissive: 0x111111, emissiveIntensity: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.7;
    entity.add(head);

    for (let i = 0; i < 2; i++) {
        const armGeo = new THREE.CylinderGeometry(0.04, 0.07, 1.6);
        const arm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
        arm.position.set(i === 0 ? -0.4 : 0.4, 2.1, 0);
        arm.rotation.z = i === 0 ? 0.5 : -0.5;
        arm.castShadow = true;
        entity.add(arm);
    }

    entity.position.set(0, 0, -8);
    entity.visible = false;
    return entity;
}

const entity = createEntity();
scene.add(entity);

// ==================== СКРИМЕР ====================
function triggerJumpscare() {
    if (jumpscareTriggered) return;
    jumpscareTriggered = true;

    // Сущность перед игроком
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    entity.position.copy(camera.position).add(dir.multiplyScalar(1.5));
    entity.position.y = 0;
    entity.visible = true;
    entity.lookAt(camera.position);

    // Красная вспышка
    const flash = new THREE.PointLight(0xff0000, 25, 18);
    flash.position.copy(camera.position);
    scene.add(flash);

    // Сообщение
    const msg = document.getElementById('message');
    msg.textContent = 'НЕ ОБОРАЧИВАЙСЯ';
    msg.style.opacity = '1';

    // Тряска
    let shake = 0.6;
    const origPos = camera.position.clone();
    const shakeInterval = setInterval(() => {
        camera.position.x = origPos.x + (Math.random() - 0.5) * shake;
        camera.position.y = origPos.y + (Math.random() - 0.5) * shake;
        shake *= 0.88;
    }, 16);

    setTimeout(() => {
        clearInterval(shakeInterval);
        camera.position.copy(origPos);
        flash.intensity = 0;
        setTimeout(() => scene.remove(flash), 300);
        msg.style.opacity = '0';
        entity.visible = false;
        jumpscareTriggered = false;
        playerInDangerZone = false;
    }, 2500);
}

// ==================== УПРАВЛЕНИЕ ====================
renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
    document.getElementById('instruction').style.display = 'none';
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
    if (isPointerLocked) {
        document.getElementById('instruction').style.display = 'none';
    } else {
        document.getElementById('instruction').style.display = 'block';
    }
});

document.addEventListener('mousemove', (e) => {
    if (isPointerLocked) {
        mouseX += e.movementX * 0.002;
        mouseY -= e.movementY * 0.002;
        mouseY = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, mouseY));
    }
});

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// ==================== ИГРОВОЙ ЦИКЛ ====================
function animate(currentTime) {
    requestAnimationFrame(animate);

    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (!isPointerLocked) {
        renderer.render(scene, camera);
        return;
    }

    // Вращение камеры
    camera.rotation.order = 'YXZ';
    camera.rotation.y += mouseX * 5 * dt;
    camera.rotation.x += mouseY * 5 * dt;
    mouseX *= 0.9;
    mouseY *= 0.9;

    // Движение
    const speed = 4.5;
    const dir = new THREE.Vector3();
    if (keys['w']) dir.z -= 1;
    if (keys['s']) dir.z += 1;
    if (keys['a']) dir.x -= 1;
    if (keys['d']) dir.x += 1;

    if (dir.length() > 0) {
        dir.normalize();
        dir.applyQuaternion(camera.quaternion);
        dir.y = 0;
        camera.position.add(dir.multiplyScalar(speed * dt));
    }

    // Границы
    camera.position.x = Math.max(-4.5, Math.min(4.5, camera.position.x));
    camera.position.z = Math.max(-6, Math.min(10, camera.position.z));

    // Огонь мерцает
    fireLight.intensity = 2.5 + Math.sin(currentTime * 0.015) * 1.5 + Math.random() * 1.5;

    // Логика опасной зоны
    const inDanger = camera.position.z < -4;
    if (inDanger && !playerInDangerZone) {
        playerInDangerZone = true;
        dangerTimer = 0;
    }
    if (!inDanger) {
        playerInDangerZone = false;
        dangerTimer = 0;
        entity.visible = false;
    }

    if (playerInDangerZone) {
        dangerTimer += dt;
        ghostWhisperTimer += dt;

        if (!entity.visible && dangerTimer > 1) {
            entity.visible = true;
        }

        if (entity.visible) {
            const behind = new THREE.Vector3(0, 0, 3);
            behind.applyQuaternion(camera.quaternion);
            entity.position.lerp(camera.position.clone().add(behind), 0.02);
            entity.position.y = 0;
            entity.lookAt(camera.position);
        }

        if (ghostWhisperTimer > 2.5) {
            ghostWhisperTimer = 0;
            entity.position.x += (Math.random() - 0.5) * 1.5;
        }

        if (dangerTimer > 7) {
            triggerJumpscare();
        }
    }

    // Красный свет пульсирует
    redLight.intensity = 1.5 + Math.sin(currentTime * 0.004) * 1.2;

    renderer.render(scene, camera);
}

// ==================== РЕСАЙЗ ====================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==================== ЗАПУСК ====================
document.getElementById('loading').style.display = 'none';
animate(0);
