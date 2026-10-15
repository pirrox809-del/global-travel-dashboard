'use client';

import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { useAspect, useTexture } from '@react-three/drei';
import { Component, Suspense, useMemo, useRef, useState, useEffect, type ReactNode } from 'react';
import * as THREE from 'three/webgpu';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { Mesh } from 'three';

import {
  abs,
  blendScreen,
  float,
  mod,
  mx_cell_noise_float,
  oneMinus,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  pass,
  mix,
  add,
} from 'three/tsl';

// Register THREE elements with R3F (WebGPU build).
extend(THREE as never);

// External displacement-mapped textures (sci-fi surface + depth map).
const TEXTUREMAP = { src: 'https://i.postimg.cc/XYwvXN8D/img-4.png' };
const DEPTHMAP = { src: 'https://i.postimg.cc/2SHKQh2q/raw-4.webp' };

/**
 * TSL uniforms live at MODULE SCOPE so we can mutate `.value` in useFrame
 * without tripping React 19's react-hooks/immutability rule (which only
 * guards values returned FROM hooks, not module-level constants). This is
 * safe because only one Scene/PostProcessing instance is ever mounted.
 */
const SCAN_UNIFORM = uniform(0);
const POINTER_UNIFORM = uniform(new THREE.Vector2(0));
const PROGRESS_UNIFORM = uniform(0);

/* ------------------------------------------------------------------ */
/* Post-processing: bloom + animated red scan-line overlay             */
/* ------------------------------------------------------------------ */
const PostProcessing = ({
  strength = 1,
  threshold = 1,
  fullScreenEffect = true,
}: {
  strength?: number;
  threshold?: number;
  fullScreenEffect?: boolean;
}) => {
  const { gl, scene, camera } = useThree();

  const render = useMemo(() => {
    // three.js v0.185 renamed PostProcessing → RenderPipeline.
    const PipelineCtor = (THREE as unknown as { RenderPipeline?: typeof THREE.PostProcessing }).RenderPipeline ?? THREE.PostProcessing;
    const postProcessing = new PipelineCtor(gl as never);
    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode('output');
    const bloomPass = bloom(scenePassColor, strength, 0.5, threshold);

    const scanPos = float(SCAN_UNIFORM.value);
    const uvY = uv().y;
    const scanWidth = float(0.05);
    const scanLine = smoothstep(0, scanWidth, abs(uvY.sub(scanPos)));
    const redOverlay = vec3(1, 0, 0).mul(oneMinus(scanLine)).mul(0.4);

    const withScanEffect = mix(
      scenePassColor,
      add(scenePassColor, redOverlay),
      fullScreenEffect ? smoothstep(0.9, 1.0, oneMinus(scanLine)) : 1.0,
    );

    const final = withScanEffect.add(bloomPass);
    postProcessing.outputNode = final;

    return postProcessing;
  }, [camera, gl, scene, strength, threshold, fullScreenEffect]);

  useFrame(({ clock }) => {
    SCAN_UNIFORM.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    // three.js v0.185: renderAsync() deprecated → render().
    const r = render as unknown as { render: () => void; renderAsync: () => Promise<void> };
    if (typeof r.render === 'function') r.render();
    else r.renderAsync();
  }, 1);

  return null;
};

const WIDTH = 300;
const HEIGHT = 300;

/* ------------------------------------------------------------------ */
/* Scene: displacement-mapped plane with dot-grid + flow mask          */
/* ------------------------------------------------------------------ */
const Scene = () => {
  const [rawMap, depthMap] = useTexture([TEXTUREMAP.src, DEPTHMAP.src]);
  const meshRef = useRef<Mesh>(null);
  // useTexture suspends, so by the time we render, textures are loaded.
  // `visible` is derived directly (no state/effect needed).
  const visible = !!(rawMap && depthMap);

  const material = useMemo(() => {
    const strength = 0.01;

    const tDepthMap = texture(depthMap);
    const tMap = texture(rawMap, uv().add(tDepthMap.r.mul(POINTER_UNIFORM).mul(strength)));

    const aspect = float(WIDTH).div(HEIGHT);
    const tUv = vec2(uv().x.mul(aspect), uv().y);

    const tiling = vec2(120.0);
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);
    const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2));
    const dist = float(tiledUv.length());
    const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness);

    const depth = tDepthMap;
    const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(PROGRESS_UNIFORM))));

    const mask = dot.mul(flow).mul(vec3(10, 0, 0));
    const final = blendScreen(tMap, mask);

    return new THREE.MeshBasicNodeMaterial({
      colorNode: final,
      transparent: true,
      opacity: 0,
    });
  }, [rawMap, depthMap]);

  const [w, h] = useAspect(WIDTH, HEIGHT);

  useFrame(({ clock }) => {
    PROGRESS_UNIFORM.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    if (meshRef.current && 'material' in meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as { opacity: number };
      if ('opacity' in mat) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, visible ? 1 : 0, 0.07);
      }
    }
  });

  useFrame(({ pointer }) => {
    POINTER_UNIFORM.value = pointer;
  });

  const scaleFactor = 0.4;
  return (
    <mesh ref={meshRef} scale={[w * scaleFactor, h * scaleFactor, 1]} material={material}>
      <planeGeometry />
    </mesh>
  );
};

/* ------------------------------------------------------------------ */
/* Error boundary: if the WebGPU canvas throws (unsupported browser,   */
/* texture load failure, TSL compile error…), we silently drop it and  */
/* the text overlay + CTA still render on the NeuralNoise backdrop.    */
/* ------------------------------------------------------------------ */
class CanvasBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('[HeroFuturistic] 3D canvas unavailable, falling back to text-only.', err);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/** Detect WebGPU support (navigator.gpu is undefined in non-supporting browsers). */
function hasWebGPU(): boolean {
  if (typeof navigator === 'undefined') return true; // SSR optimistic
  return typeof (navigator as Navigator & { gpu?: unknown }).gpu !== 'undefined';
}

/* ------------------------------------------------------------------ */
/* Main exported component                                             */
/* ------------------------------------------------------------------ */
export type HeroFuturisticProps = {
  /** Title split into words for the staggered glitch-in animation. */
  titleWords: string[];
  subtitle: string;
  ctaLabel: string;
  onEnter: () => void;
};

export function HeroFuturistic({ titleWords, subtitle, ctaLabel, onEnter }: HeroFuturisticProps) {
  const [visibleWords, setVisibleWords] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);

  // WebGPU support — checked once via lazy initial state (no effect).
  const [webgpuOk] = useState<boolean>(hasWebGPU);

  // Random glitch delays — generated once via lazy initial state (no effect).
  const [delays] = useState<number[]>(() => titleWords.map(() => Math.random() * 0.07));
  const [subtitleDelay] = useState<number>(() => Math.random() * 0.1);

  useEffect(() => {
    if (visibleWords < titleWords.length) {
      const timeout = setTimeout(() => setVisibleWords(visibleWords + 1), 600);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => setSubtitleVisible(true), 800);
    return () => clearTimeout(timeout);
  }, [visibleWords, titleWords.length]);

  return (
    <div className="relative h-svh w-full overflow-hidden">
      {/* 3D canvas layer — skipped if WebGPU unsupported; error-boundaried
          so any runtime failure degrades to text-only gracefully. */}
      {webgpuOk ? (
        <CanvasBoundary>
          <Suspense fallback={null}>
            <Canvas
              flat
              gl={async (props) => {
                const renderer = new THREE.WebGPURenderer(props as never);
                await renderer.init();
                return renderer;
              }}
            >
              <PostProcessing fullScreenEffect={true} />
              <Scene />
            </Canvas>
          </Suspense>
        </CanvasBoundary>
      ) : null}

      {/* Text overlay — always rendered (independent of the 3D canvas). */}
      <div className="pointer-events-none absolute inset-0 z-[60] flex h-svh flex-col items-center justify-center px-10 uppercase">
        <div className="text-3xl font-extrabold md:text-5xl xl:text-6xl 2xl:text-7xl">
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 overflow-hidden text-white lg:gap-x-6">
            {titleWords.map((word, index) => (
              <span
                key={index}
                className={index < visibleWords ? 'fade-in' : ''}
                style={{
                  animationDelay: `${index * 0.13 + (delays[index] || 0)}s`,
                  opacity: index < visibleWords ? undefined : 0,
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-2 overflow-hidden text-xs font-bold text-white md:text-xl xl:text-2xl 2xl:text-3xl">
          <div
            className={subtitleVisible ? 'fade-in-subtitle' : ''}
            style={{
              animationDelay: `${titleWords.length * 0.13 + 0.2 + subtitleDelay}s`,
              opacity: subtitleVisible ? undefined : 0,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      {/* CTA button */}
      <button
        type="button"
        onClick={onEnter}
        className="explore-btn pointer-events-auto"
        style={{ animationDelay: '2.2s' }}
      >
        {ctaLabel}
        <span className="explore-arrow">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="arrow-svg">
            <path d="M11 5V17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 12L11 17L16 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </button>
    </div>
  );
}

export default HeroFuturistic;
