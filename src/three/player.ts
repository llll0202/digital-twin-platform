import * as THREE from 'three';
import signals, { Signal } from 'signals';
import Loader from './loader';
import { CSS2DRenderer, CSS3DRenderer } from 'three/examples/jsm/Addons.js';
import PlayerControls from './controls';
import Selector from './selector';
import TWEEN from '@tweenjs/tween.js';

// import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

const _DEFAULT_CAMERA = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
_DEFAULT_CAMERA.name = 'Camera';
_DEFAULT_CAMERA.position.set(0, 5, 10);
_DEFAULT_CAMERA.lookAt(new THREE.Vector3());

let time: number, startTime: number; // prevTime: number;
const clock = new THREE.Clock();
// type EventListenerHandler = (...params: any[]) => void;
type Events = {
  init: Signal<any>;
  start: Signal<any>;
  stop: Signal<any>;
  keydown: Signal<any>;
  keyup: Signal<any>;
  pointerdown: Signal<any>;
  pointerup: Signal<any>;
  pointermove: Signal<any>;
  update: Signal<any>;
  resize: Signal<any>;
  intersectionsDetected: Signal<any>;
  objectFocused: Signal<any>;
  objectSelected: Signal<any>;
};

export class Player {
  // 当前渲染区域宽度。
  width: any;
  // 当前渲染区域高度。
  height: any;
  // Three.js 播放器外层 DOM 容器，业务页面会把它挂到 viewport 中。
  dom: HTMLElement;
  // WebGL 渲染器，负责把 scene + camera 渲染到 canvas。
  renderer?: THREE.WebGLRenderer;
  // 主场景，所有模型、灯光、辅助对象都会添加到这里。
  scene: THREE.Scene;
  // 当前相机，一般使用透视相机 PerspectiveCamera。
  camera?: THREE.Camera;
  // 模型加载器封装，用于加载 glb/gltf 等资源。
  loader: Loader;
  // 监听容器尺寸变化，自动同步渲染器尺寸和相机比例。
  private resizeObserver: ResizeObserver;
  // 射线选择器，负责根据鼠标位置检测点中的 3D 对象。
  selector: Selector;
  // 相机控制器，负责旋转、缩放、聚焦等交互。
  controls?: PlayerControls;
  // 动画混合器列表，用于统一更新模型动画。
  private mixers: THREE.AnimationMixer[] = [];

  constructor() {
    // 创建播放器容器，并初始化渲染器、默认相机、场景和选择器。
    this.dom = document.createElement('div');
    this.dom.id = 'player';

    this.loader = new Loader();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.localClippingEnabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.clearDepth();

    this.dom.appendChild(this.renderer.domElement);
    // 设置默认相机。
    this.setCamera(_DEFAULT_CAMERA.clone());
    // 初始化主场景。
    this.scene = new THREE.Scene();
    this.scene.name = 'Scene';
    this.resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      this.onResize(width, height);
    });
    this.resizeObserver.observe(this.dom);
    this.selector = new Selector(this);
    this.events.objectFocused.add((object) => {
      this.controls?.focus2(object);
    });
  }

  // 容器尺寸变化时更新渲染尺寸、像素比，并向外广播 resize 事件。
  private onResize(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.setSize(width, height);
    this.setPixelRatio(window.devicePixelRatio);

    this.events.resize.dispatch(width, height);
  }

  private _events: Events = {
    init: new signals.Signal(),
    start: new signals.Signal(),
    stop: new signals.Signal(),
    keydown: new signals.Signal(),
    keyup: new signals.Signal(),
    pointerdown: new signals.Signal(),
    pointerup: new signals.Signal(),
    pointermove: new signals.Signal(),
    update: new signals.Signal(),
    resize: new signals.Signal(),
    intersectionsDetected: new signals.Signal(),
    objectFocused: new signals.Signal(),
    objectSelected: new signals.Signal(),
  };

  // 对外暴露事件中心，业务代码可以监听 start/update/resize/objectSelected 等事件。
  get events() {
    return this._events;
  }

  // 获取 WebGLRenderer 生成的 canvas。这里原名为 cavans，实际含义是 canvas。
  get cavans() {
    return this.renderer!.domElement;
  }

  // 开启阴影，并让当前场景里的所有 Mesh 都投射和接收阴影。
  public enableShadows() {
    this.renderer!.shadowMap.enabled = true;
    this.renderer!.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  // 根据动画名称为指定模型创建并播放动画，同时保存 mixer 以便在渲染循环中更新。
  public addAnimation(animations: Array<THREE.AnimationClip>, animationName: string, target: THREE.Object3D) {
    const mixer = new THREE.AnimationMixer(target);
    const clip = THREE.AnimationClip.findByName(animations, animationName);
    if (!clip) return undefined;
    const action = mixer.clipAction(clip);
    action.play();
    this.mixers.push(mixer);
  }

  // 手动添加外部创建的 AnimationMixer，由 Player 在每帧统一 update。
  public addAnimationMixer(mixer: THREE.AnimationMixer) {
    this.mixers.push(mixer);
  }

  // 添加 CSS2DRenderer，用于渲染跟随 3D 场景的 2D 标签。
  public addCSS2DRenderer() {
    const CSSRenderer = new CSS2DRenderer();
    CSSRenderer.setSize(this.width, this.height);
    CSSRenderer.domElement.style.position = 'absolute';
    CSSRenderer.domElement.style.top = '0px';
    CSSRenderer.domElement.style.pointerEvents = 'none';
    this.dom.appendChild(CSSRenderer.domElement);

    this.events.update.add(() => {
      CSSRenderer.render(this.scene, this.camera!);
    });
    this.events.resize.add((width, height) => {
      CSSRenderer.setSize(width, height);
    });
    return this;
  }

  // 添加 CSS3DRenderer，用于把 HTML/CSS 3D 元素叠加到 Three.js 场景上。
  public addCSS3Renderer() {
    const css3Renderer = new CSS3DRenderer();
    css3Renderer.setSize(this.width, this.height);
    // CSS3DRenderer 的 DOM 会覆盖在 WebGL canvas 上，用来承载 HTML 标签。
    css3Renderer.domElement.style.position = 'absolute';
    css3Renderer.domElement.style.top = '0px';
    // 禁用 CSS3D 层的鼠标事件，避免遮挡 canvas 点击、拖拽等交互。
    css3Renderer.domElement.style.pointerEvents = 'none';
    this.dom.appendChild(css3Renderer.domElement);
    this.events.update.add(() => {
      css3Renderer.render(this.scene, this.camera!);
    });
    this.events.resize.add((width, height) => {
      css3Renderer.setSize(width, height);
    });
  }

  // 设置当前相机；如果是透视相机，同步宽高比并更新投影矩阵。
  public setCamera(value: THREE.Camera) {
    this.camera = value;
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    }
  }

  // 创建相机控制器，并在每帧 update，让控制器阻尼、自动旋转等效果生效。
  public addControls() {
    this.controls = new PlayerControls(this.camera!, this.cavans);
    this.events.update.add(() => {
      this.controls?.update();
    });
  }

  // 用外部传入的 Scene 信息更新当前场景，并把子对象移动到 Player 的 scene 中。
  public setScene(scene: THREE.Scene) {
    this.scene.background = scene.background;
    this.scene.environment = scene.environment;
    this.scene.fog = scene.fog;
    this.scene.backgroundBlurriness = scene.backgroundBlurriness;
    this.scene.backgroundIntensity = scene.backgroundIntensity;

    this.scene.userData = JSON.parse(JSON.stringify(scene.userData));
    while (scene.children.length > 0) {
      this.addObject(scene.children[0]);
    }
  }

  // 设置渲染器像素比，通常传 window.devicePixelRatio 以适配高清屏。
  public setPixelRatio(pixelRatio: number) {
    this.renderer?.setPixelRatio(pixelRatio);
  }

  // 设置渲染器尺寸，并同步透视相机的 aspect。
  public setSize(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.width = width;
    this.height = height;

    if (this.camera && this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    }

    this.renderer?.setSize(width, height);
  }

  // 添加灯光；如果不传参数，则创建一组默认方向光、环境光和半球光。
  public addLight(light?: THREE.Light) {
    if (light) {
      this.addObject(light);
      return this;
    }
    const directionalLight = new THREE.DirectionalLight(0xffffff, 6);
    directionalLight.position.set(3, 15, 18);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.mapSize.set(512, 512);
    directionalLight.shadow.radius = 1;
    this.addObject(directionalLight);
    const ambientLight = new THREE.AmbientLight(0xfefefe, 0.8);
    this.addObject(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1);
    hemisphereLight.position.set(0, 8, 0);
    this.addObject(hemisphereLight);
    return this;
  }

  // 添加网格辅助线，常用于调试场景尺寸、地面方向和模型位置。
  public addGridHelpers() {
    const GRID_COLORS_LIGHT = [0x999999, 0x777777];

    const grid = new THREE.Group();

    const grid1 = new THREE.GridHelper(30, 30);
    grid1.material.color.setHex(GRID_COLORS_LIGHT[0]);
    grid1.material.vertexColors = false;
    grid.add(grid1);

    const grid2 = new THREE.GridHelper(30, 6);
    grid2.material.color.setHex(GRID_COLORS_LIGHT[1]);
    grid2.material.vertexColors = false;
    grid.add(grid2);
    this.events.update.add(() => {
      this.renderer?.render(grid, this.camera!);
    });
  }

  // 添加 3D 对象到场景或指定父对象中。
  public addObject(object: THREE.Object3D, parent?: THREE.Object3D, index?: number) {
    if (parent === undefined) {
      this.scene?.add(object);
    } else {
      parent.children.splice(index || 0, 0, object);
      object.parent = parent;
    }
  }

  // 启动渲染循环：每帧渲染场景、派发 update 事件、更新动画和 Tween。
  public play() {
    const animate = () => {
      time = performance.now();
      this.renderer?.render(this.scene!, this.camera!);
      const delta = clock.getDelta();

      try {
        this.events.update.dispatch({ time: time - startTime, delta: delta });
        for (const mixer of this.mixers) {
          mixer.update(delta);
        }
        TWEEN.update();
      } catch (e: any) {
        console.error(e.message || e, e.stack || '');
      }
    };

    startTime = performance.now();

    this.dom.addEventListener('click', this.onClick.bind(this));

    this.events.start.dispatch();

    this.renderer!.setAnimationLoop(animate);
  }

  // 手动渲染一帧，并派发一次 update 事件。
  public render(time?: number) {
    performance.now();
    this.events.update.dispatch({ time: time || 0 * 1000, delta: 0 /* TODO */ });
    this.renderer!.render(this.scene!, this.camera!);
  }

  // 停止渲染循环，并派发 stop 事件。
  public stop() {
    this.dom.removeEventListener('click', this.onClick.bind(this));

    this.events.stop.dispatch();

    this.renderer?.setAnimationLoop(null);
  }

  // 销毁播放器：停止循环、释放渲染器/几何体/材质、移除 DOM 和监听器。
  public dispose() {
    this.stop();
    this.renderer?.dispose();
    this.scene?.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
    this.scene.clear();
    this.cavans.remove();
    this.dom.remove();
    this.resizeObserver.disconnect();
    this.renderer = undefined;
    this.camera = undefined;
  }

  // 把鼠标在 DOM 内的像素坐标转换为 0~1 的归一化坐标。
  private getMousePosition(dom: HTMLElement, x: number, y: number) {
    const rect = dom.getBoundingClientRect();
    return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
  }

  // private onDoubleClickPosition = new THREE.Vector2();
  // private onDoubleClick(event: MouseEvent) {
  //   const array = this.getMousePosition(this.dom, event.clientX, event.clientY);
  //   this.onDoubleClickPosition = new THREE.Vector2().fromArray(array);
  //   const intersects = this.selector.getPointerIntersects(this.onDoubleClickPosition, this.camera!);

  //   if (intersects.length > 0) {
  //     const intersect = intersects[0];
  //     this.events.objectFocused.dispatch(intersect.object);
  //   }
  // }

  // 处理 canvas 点击：通过射线检测获取相交对象，并派发 intersectionsDetected 事件。
  private onClick(event: MouseEvent) {
    const array = this.getMousePosition(this.dom, event.clientX, event.clientY);
    const clickPosition = new THREE.Vector2().fromArray(array);
    const intersects = this.selector.getPointerIntersects(clickPosition, this.camera!);
    this.events.intersectionsDetected.dispatch(intersects);
  }
}
