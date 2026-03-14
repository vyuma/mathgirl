"use client";

import { VRMLoaderPlugin } from "@pixiv/three-vrm";
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
} from "@pixiv/three-vrm-animation";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { type ActiveMotion, type MotionName, motions } from "@/lib/vrmMotions";
import {
  type ActiveExpression,
  type ExpressionName,
  EXPRESSION_LERP_SPEED,
  expressions,
} from "@/lib/vrmExpressions";

type Props = {
  isSpeaking: boolean;
};

export type VRMChatHandle = {
  playMotion: (name: MotionName) => void;
  playVrmaAnimation: (url: string, loop?: boolean) => void;
  stopVrmaAnimation: () => void;
  playExpression: (name: ExpressionName, holdDuration?: number) => void;
  clearExpression: () => void;
};

const VRMChat = forwardRef<VRMChatHandle, Props>(function VRMChat(
  { isSpeaking },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vrmRef = useRef<any>(null);
  const isSpeakingRef = useRef(isSpeaking);
  const activeMotionRef = useRef<ActiveMotion | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const vrmaActionRef = useRef<THREE.AnimationAction | null>(null);
  const loaderRef = useRef<GLTFLoader | null>(null);
  const activeExpressionRef = useRef<ActiveExpression | null>(null);

  useImperativeHandle(ref, () => ({
    playMotion(name: MotionName) {
      activeMotionRef.current = {
        def: motions[name],
        startTime: Date.now(),
      };
    },

    playVrmaAnimation(url: string, loop = true) {
      const vrm = vrmRef.current;
      const loader = loaderRef.current;
      if (!vrm || !loader) return;

      // 既存のVRMAを停止
      vrmaActionRef.current?.stop();
      vrmaActionRef.current = null;

      loader.loadAsync(url).then((gltfVrma) => {
        const vrmAnimation = gltfVrma.userData.vrmAnimations?.[0];
        if (!vrmAnimation) {
          console.warn("VRMAにアニメーションが含まれていません:", url);
          return;
        }

        if (!mixerRef.current) {
          mixerRef.current = new THREE.AnimationMixer(vrm.scene);
        }

        const clip = createVRMAnimationClip(vrmAnimation, vrm);
        const action = mixerRef.current.clipAction(clip);
        action.setLoop(
          loop ? THREE.LoopRepeat : THREE.LoopOnce,
          loop ? Infinity : 1,
        );
        if (!loop) action.clampWhenFinished = true;
        action.play();
        vrmaActionRef.current = action;
      }).catch((e) => console.error("VRMAロードエラー:", e));
    },

    stopVrmaAnimation() {
      vrmaActionRef.current?.stop();
      vrmaActionRef.current = null;
    },

    playExpression(name: ExpressionName, holdDuration?: number) {
      const def = expressions[name];
      const hold = holdDuration ?? def.defaultHoldDuration;
      activeExpressionRef.current = {
        key: def.key,
        targetValue: def.defaultValue,
        currentValue: activeExpressionRef.current?.currentValue ?? 0,
        holdDuration: hold,
        startTime: Date.now(),
      };
    },

    clearExpression() {
      if (activeExpressionRef.current) {
        // targetValue を 0 にして自然にフェードアウト
        activeExpressionRef.current = {
          ...activeExpressionRef.current,
          targetValue: 0,
          holdDuration: 0,
          startTime: Date.now(),
        };
      }
    },
  }));

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (!containerRef.current) return;

    const SCREEN_WIDTH = window.innerWidth;
    const SCREEN_HEIGHT = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      precision: "highp",
    });

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const textureLoader = new THREE.TextureLoader();
    let currentIsMobile = SCREEN_WIDTH < 768;

    const loadBackground = (mobile: boolean) => {
      const bgImage = mobile ? "/images/home_1.png" : "/images/home.png";
      textureLoader.load(bgImage, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        scene.background = texture;
      });
    };

    loadBackground(currentIsMobile);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(3, 5, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const applyCameraSettings = (cam: THREE.PerspectiveCamera, mobile: boolean) => {
      if (mobile) {
        cam.fov = 55;
        cam.position.set(0, 1.3, 2.2);
        cam.lookAt(0, 1.3, 0);
      } else {
        cam.fov = 50;
        cam.position.set(0, 1.5, 1.8);
        cam.lookAt(0, 1.5, 0);
      }
      cam.updateProjectionMatrix();
    };

    const camera = new THREE.PerspectiveCamera(
      currentIsMobile ? 55 : 50,
      SCREEN_WIDTH / SCREEN_HEIGHT,
      0.1,
      20.0,
    );
    applyCameraSettings(camera, currentIsMobile);

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;

      const mobile = w < 768;
      if (mobile !== currentIsMobile) {
        currentIsMobile = mobile;
        loadBackground(mobile);
        applyCameraSettings(camera, mobile);
        if (vrmRef.current) {
          const s = mobile ? 1.0 : 1.2;
          vrmRef.current.scene.scale.set(s, s, s);
        }
      } else {
        camera.updateProjectionMatrix();
      }
    };
    window.addEventListener("resize", handleResize);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    loaderRef.current = loader;

    // 各腕のベースポーズ
    const BASE_RIGHT_ARM = {
      upperArm: { z: -1.3, x: 0.1 },
      lowerArm: { x: 0.1 },
      hand: { y: 0.1, z: 0.01 },
    };
    const BASE_LEFT_ARM = {
      upperArm: { z: 1.3, x: 0.1 },
      lowerArm: { x: 0.5 },
      hand: { y: 0.1, z: 0.1 },
    };

    const clock = new THREE.Clock();
    let time = 0;

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      time += delta;

      if (vrmRef.current) {
        const vrm = vrmRef.current;
        const isVrmaPlaying = vrmaActionRef.current?.isRunning() ?? false;

        // VRMAが再生中なら mixer を更新（ボーン制御はmixerに委ねる）
        if (isVrmaPlaying && mixerRef.current) {
          mixerRef.current.update(delta);
        }

        // VRM内部システム更新（SpringBone, LookAt等）
        vrm.update(delta);

        // VRMA非再生中のみ手書きモーション・アイドルを適用
        if (!isVrmaPlaying && vrm.humanoid) {
          const spine = vrm.humanoid.getRawBoneNode("spine");
          const chest = vrm.humanoid.getRawBoneNode("chest");
          const head = vrm.humanoid.getRawBoneNode("head");
          const rightUpperArm = vrm.humanoid.getRawBoneNode("rightUpperArm");
          const rightLowerArm = vrm.humanoid.getRawBoneNode("rightLowerArm");
          const rightHand = vrm.humanoid.getRawBoneNode("rightHand");
          const leftUpperArm = vrm.humanoid.getRawBoneNode("leftUpperArm");
          const leftLowerArm = vrm.humanoid.getRawBoneNode("leftLowerArm");
          const leftHand = vrm.humanoid.getRawBoneNode("leftHand");

          if (spine) {
            spine.rotation.z = Math.sin(time * 0.8) * 0.03;
            spine.rotation.x = Math.sin(time * 0.5) * 0.02;
          }
          if (chest) {
            chest.rotation.z = Math.sin(time * 0.8 + 0.5) * 0.02;
          }

          const motion = activeMotionRef.current;
          let bones = null;
          if (motion) {
            const elapsed = Date.now() - motion.startTime;
            const progress = Math.min(elapsed / motion.def.duration, 1);
            bones = motion.def.getBones(progress);
            if (progress >= 1) activeMotionRef.current = null;
          }

          if (head) {
            head.rotation.x = Math.sin(time * 0.6) * 0.015 + (bones?.head?.x ?? 0);
            head.rotation.z = Math.sin(time * 1.2) * 0.02  + (bones?.head?.z ?? 0);
          }

          if (rightUpperArm) {
            rightUpperArm.rotation.z = BASE_RIGHT_ARM.upperArm.z + (bones?.rightArm?.upperArm?.z ?? 0);
            rightUpperArm.rotation.x = BASE_RIGHT_ARM.upperArm.x + (bones?.rightArm?.upperArm?.x ?? 0);
          }
          if (rightLowerArm) {
            rightLowerArm.rotation.x = BASE_RIGHT_ARM.lowerArm.x + (bones?.rightArm?.lowerArm?.x ?? 0);
          }
          if (rightHand) {
            rightHand.rotation.y = BASE_RIGHT_ARM.hand.y + (bones?.rightArm?.hand?.y ?? 0);
            rightHand.rotation.z = BASE_RIGHT_ARM.hand.z + (bones?.rightArm?.hand?.z ?? 0);
          }
          if (leftUpperArm) {
            leftUpperArm.rotation.z = BASE_LEFT_ARM.upperArm.z + (bones?.leftArm?.upperArm?.z ?? 0);
            leftUpperArm.rotation.x = BASE_LEFT_ARM.upperArm.x + (bones?.leftArm?.upperArm?.x ?? 0);
          }
          if (leftLowerArm) {
            leftLowerArm.rotation.x = BASE_LEFT_ARM.lowerArm.x + (bones?.leftArm?.lowerArm?.x ?? 0);
          }
          if (leftHand) {
            leftHand.rotation.y = BASE_LEFT_ARM.hand.y + (bones?.leftArm?.hand?.y ?? 0);
            leftHand.rotation.z = BASE_LEFT_ARM.hand.z + (bones?.leftArm?.hand?.z ?? 0);
          }
        }

        const baseRotationY = Math.PI;
        vrm.scene.rotation.y = baseRotationY + Math.sin(time * 0.9) * 0.03;

        // 表情: スムーズ補間 + 保持時間後に自動フェードアウト
        if (vrm.expressionManager) {
          const expr = activeExpressionRef.current;
          if (expr) {
            // 保持時間が過ぎたら targetValue を 0 に
            if (
              expr.holdDuration > 0 &&
              Date.now() - expr.startTime > expr.holdDuration
            ) {
              expr.targetValue = 0;
            }

            // lerp で補間
            expr.currentValue +=
              (expr.targetValue - expr.currentValue) *
              Math.min(1, EXPRESSION_LERP_SPEED * delta);

            vrm.expressionManager.setValue(expr.key, expr.currentValue);

            // 完全に戻ったらクリア
            if (expr.targetValue === 0 && expr.currentValue < 0.01) {
              vrm.expressionManager.setValue(expr.key, 0);
              activeExpressionRef.current = null;
            }
          }

          // 口パク
          if (isSpeakingRef.current) {
            const speed = 4;
            const t = time * speed;
            const open = Math.abs(Math.sin(t));

            vrm.expressionManager.setValue("aa", 0);
            vrm.expressionManager.setValue("ih", 0);
            vrm.expressionManager.setValue("ou", 0);
            vrm.expressionManager.setValue("ee", 0);
            vrm.expressionManager.setValue("oh", 0);

            const vowelIndex = Math.floor(t) % 5;
            switch (vowelIndex) {
              case 0: vrm.expressionManager.setValue("aa", open); break;
              case 1: vrm.expressionManager.setValue("ih", open); break;
              case 2: vrm.expressionManager.setValue("ou", open); break;
              case 3: vrm.expressionManager.setValue("ee", open); break;
              case 4: vrm.expressionManager.setValue("oh", open); break;
            }
          } else {
            vrm.expressionManager.setValue("aa", 0);
            vrm.expressionManager.setValue("ih", 0);
            vrm.expressionManager.setValue("ou", 0);
            vrm.expressionManager.setValue("ee", 0);
            vrm.expressionManager.setValue("oh", 0);
          }

          vrm.expressionManager.update();
        }

        // 瞬き
        if (vrm.expressionManager && Math.random() < 0.003) {
          const blink = async () => {
            vrm.expressionManager.setValue("blinkLeft", 1.0);
            vrm.expressionManager.setValue("blinkRight", 1.0);
            vrm.expressionManager.update();
            await new Promise((r) => setTimeout(r, 50));
            for (let i = 1.0; i >= 0; i -= 0.1) {
              vrm.expressionManager.setValue("blinkLeft", i);
              vrm.expressionManager.setValue("blinkRight", i);
              vrm.expressionManager.update();
              await new Promise((r) => setTimeout(r, 5));
            }
          };
          blink();
        }
      }

      renderer.render(scene, camera);
    };

    loader.load(
      "/models/misato.vrm",
      (gltf: any) => {
        const vrm = gltf.userData.vrm;
        vrmRef.current = vrm;
        scene.add(vrm.scene);

        vrm.scene.rotation.y = Math.PI;
        const modelScale = currentIsMobile ? 1.0 : 1.2;
        vrm.scene.scale.set(modelScale, modelScale, modelScale);

        const bbox = new THREE.Box3().setFromObject(vrm.scene);
        vrm.scene.position.y = -bbox.min.y;

        animate();
      },
      undefined,
      (error) => console.error("VRMロードエラー:", error),
    );

    return () => {
      window.removeEventListener("resize", handleResize);
      mixerRef.current?.stopAllAction();
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
});

export default VRMChat;
