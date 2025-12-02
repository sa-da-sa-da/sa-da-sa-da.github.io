<template>
  <div class="three-d-model-viewer">
    <div class="model-container" ref="modelContainer"></div>
    <div class="model-status" v-if="statusText">
      {{ statusText }}
    </div>
    <div class="progress-container" v-if="progress > 0 && progress < 100">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

// 定义组件的属性
interface Props {
  modelPath?: string;
  fileType?: 'obj' | 'gltf' | 'glb' | 'fbx';
  width?: string;
  height?: string;
  backgroundColor?: string;
  scale?: number;
  autoRotate?: boolean;
  cameraPosition?: { x: number; y: number; z: number };
  cameraRotation?: { x: number; y: number; z: number };
  lightIntensity?: number;
}

// 定义组件的属性，提供默认值
const props = withDefaults(defineProps<Props>(), {
  modelPath: '/tree.obj', // 默认加载tree.obj文件
  fileType: 'obj',
  width: '600px',
  height: '600px',
  backgroundColor: '#f8f9fa',
  scale: 1,
  autoRotate: false,
  cameraPosition: () => ({ x: 0, y: 0, z: 5 }),
  cameraRotation: () => ({ x: 0, y: 0, z: 0 }),
  lightIntensity: 1
});

// 定义组件的事件
const emit = defineEmits<{
  load: [event: { model: THREE.Object3D }];
  error: [event: { error: Error }];
  progress: [event: { progress: number }];
  ready: [];
}>();

// 组件状态
const modelContainer = ref<HTMLElement>();
const statusText = ref<string>('准备加载模型...');
const progress = ref<number>(0);

// Three.js 相关变量
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let model: THREE.Object3D | null = null;
let animateId: number | null = null;
let loadTimeout: NodeJS.Timeout | null = null;

// 初始化 Three.js 场景
const initThreeScene = () => {
  if (!modelContainer.value) return;
  
  // 设置容器样式
  modelContainer.value.style.width = props.width;
  modelContainer.value.style.height = props.height;
  modelContainer.value.style.position = 'relative';
  modelContainer.value.style.overflow = 'hidden';
  modelContainer.value.style.borderRadius = '8px';
  
  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(props.backgroundColor);
  
  // 创建相机
  const containerRect = modelContainer.value.getBoundingClientRect();
  camera = new THREE.PerspectiveCamera(
    75,
    containerRect.width / containerRect.height,
    0.1,
    1000
  );
  camera.position.set(props.cameraPosition.x, props.cameraPosition.y, props.cameraPosition.z);
  camera.rotation.set(props.cameraRotation.x, props.cameraRotation.y, props.cameraRotation.z);
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(containerRect.width, containerRect.height);
  modelContainer.value.appendChild(renderer.domElement);
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6 * props.lightIntensity);
  scene.add(ambientLight);
  
  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8 * props.lightIntensity);
  directionalLight1.position.set(1, 1, 1);
  scene.add(directionalLight1);
  
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4 * props.lightIntensity);
  directionalLight2.position.set(-1, -1, -1);
  scene.add(directionalLight2);
  
  // 添加轨道控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = props.autoRotate;
  controls.autoRotateSpeed = 2;
  
  // 添加网格辅助（可选）
  const gridHelper = new THREE.GridHelper(10, 10, 0xcccccc, 0xcccccc);
  scene.add(gridHelper);
  
  // 添加坐标轴辅助（可选）
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);
  
  // 开始渲染循环
  animate();
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
};

// 渲染循环
const animate = () => {
  animateId = requestAnimationFrame(animate);
  
  if (controls) {
    controls.update();
  }
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
};

// 处理窗口大小变化
const handleResize = () => {
  if (!modelContainer.value || !camera || !renderer) return;
  
  const containerRect = modelContainer.value.getBoundingClientRect();
  camera.aspect = containerRect.width / containerRect.height;
  camera.updateProjectionMatrix();
  renderer.setSize(containerRect.width, containerRect.height);
};

// 加载模型
const loadModel = () => {
  if (!scene) return;
  
  statusText.value = '正在加载模型...';
  
  // 设置加载超时
  loadTimeout = setTimeout(() => {
    const error = new Error('模型加载超时');
    handleError(error);
  }, 15000); // 15秒超时
  
  let loader: THREE.Loader;
  
  // 根据文件类型选择合适的加载器
  switch (props.fileType) {
    case 'gltf':
    case 'glb':
      loader = new GLTFLoader();
      break;
    case 'fbx':
      loader = new FBXLoader();
      break;
    case 'obj':
    default:
      loader = new OBJLoader();
      break;
  }
  
  // 添加加载进度处理
  if ('setProgressCallback' in loader) {
    (loader as any).setProgressCallback((event: { loaded: number; total: number }) => {
      const progressValue = Math.floor((event.loaded / event.total) * 100);
      progress.value = progressValue;
      statusText.value = `模型加载中... ${progressValue}%`;
      emit('progress', { progress: progressValue });
    });
  }
  
  // 加载模型
  loader.load(
    props.modelPath,
    (object) => {
      // 清除超时
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
      }
      
      // 移除之前的模型
      if (model && scene) {
        scene.remove(model);
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            } else if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            }
          }
        });
        model = null;
      }
      
      // 处理加载的对象
      if (props.fileType === 'gltf' || props.fileType === 'glb') {
        // GLTF/GLB加载器返回的是一个包含scene的对象
        const gltf = object as any;
        model = gltf.scene || gltf;
      } else {
        model = object as THREE.Object3D;
      }
      
      // 设置模型缩放
      model.scale.set(props.scale, props.scale, props.scale);
      
      // 计算模型的边界框，以便自动调整相机位置
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      // 自动调整相机位置以适合模型大小
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera!.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraZ *= 1.5; // 添加一些缓冲
      
      // 更新相机位置
      const center = box.getCenter(new THREE.Vector3());
      model.position.x += center.x;
      model.position.y += center.y;
      model.position.z += center.z;
      
      // 保持相机在相同的相对位置，但调整距离
      if (props.cameraPosition.z > 0) {
        camera!.position.z = cameraZ;
      }
      
      // 添加模型到场景
      scene.add(model);
      
      // 触发加载完成事件
      statusText.value = '模型加载完成';
      emit('load', { model });
      
      // 短暂延迟后隐藏状态文本
      setTimeout(() => {
        statusText.value = '';
        emit('ready');
      }, 1000);
    },
    (xhr) => {
      // 进度回调（如果加载器支持）
      if (xhr.lengthComputable) {
        const progressValue = Math.floor((xhr.loaded / xhr.total) * 100);
        progress.value = progressValue;
        statusText.value = `模型加载中... ${progressValue}%`;
        emit('progress', { progress: progressValue });
      }
    },
    (error) => {
      handleError(error);
    }
  );
};

// 处理加载错误
const handleError = (error: Error) => {
  // 清除超时
  if (loadTimeout) {
    clearTimeout(loadTimeout);
    loadTimeout = null;
  }
  
  console.error('模型加载错误:', error);
  statusText.value = `加载错误: ${error.message}`;
  
  // 如果是文件未找到错误，尝试使用本地路径
  if (error.message.includes('404') || error.message.includes('not found')) {
    statusText.value += ' (文件路径可能有误)';
  }
  
  emit('error', { error });
};

// 组件挂载时初始化
onMounted(() => {
  // 延迟初始化，确保容器已经渲染
  setTimeout(() => {
    try {
      initThreeScene();
      loadModel();
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('初始化失败'));
    }
  }, 100);
});

// 组件卸载时清理资源
onUnmounted(() => {
  if (animateId !== null) {
    cancelAnimationFrame(animateId);
  }
  
  if (loadTimeout) {
    clearTimeout(loadTimeout);
  }
  
  window.removeEventListener('resize', handleResize);
  
  // 清理Three.js资源
  if (model && scene) {
    scene.remove(model);
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        } else if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        }
      }
    });
  }
  
  if (renderer) {
    renderer.dispose();
  }
  
  scene = null;
  camera = null;
  renderer = null;
  controls = null;
  model = null;
});

// 监听属性变化，重新加载模型
watch(
  () => [props.modelPath, props.fileType, props.scale],
  () => {
    if (model && scene) {
      scene.remove(model);
      model = null;
    }
    loadModel();
  }
);
</script>

<style scoped>
.three-d-model-viewer {
  position: relative;
  width: 100%;
  margin: 1rem 0;
}

.model-container {
  position: relative;
  width: 100%;
  height: 400px;
  background-color: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.model-status {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  text-align: center;
  font-size: 14px;
  border-radius: 0 0 8px 8px;
  z-index: 10;
}

.progress-container {
  position: absolute;
  bottom: 32px;
  left: 10%;
  right: 10%;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
  z-index: 10;
}

.progress-bar {
  width: 100%;
  height: 100%;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4285f4, #34a853);
  border-radius: 3px;
  transition: width 0.3s ease;
}
</style>
