import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';

/** glossy dark floor: a soft (blurred) reflection that fades with distance, over a deep navy base */
const MirrorShader = {
  name: 'SGMirror',
  uniforms: {
    color: {value: null},
    tDiffuse: {value: null},
    textureMatrix: {value: null},
    uBase: {value: new THREE.Color('#0a1122')},
    uPool: {value: new THREE.Color('#1c2c50')},
    uCenter: {value: new THREE.Vector2(0, 0)},
    uPoolR: {value: 6},
    uAmt: {value: 0.5},
    uBlur: {value: new THREE.Vector2(0.0015, 0.0015)},
    uFar: {value: 40},
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
    void main(){ vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec3 uBase, uPool; uniform vec2 uCenter, uBlur; uniform float uPoolR, uAmt, uFar;
    varying vec4 vUv; varying vec3 vW;
    void main(){
      vec2 uv = vUv.xy / vUv.w;
      vec3 r = vec3(0.0); float wsum = 0.0;
      for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) {
        float w = exp(-float(i * i + j * j) / 4.0);
        r += texture2D(tDiffuse, uv + vec2(float(i), float(j)) * uBlur).rgb * w; wsum += w;
      }
      r /= wsum;
      float d = length(vW.xz - uCenter);
      vec3 base = mix(uPool, uBase, smoothstep(0.0, uPoolR, d));
      float fade = 1.0 - smoothstep(uFar * 0.4, uFar, d);
      gl_FragColor = vec4(base + r * uAmt * fade, 1.0);
    }`,
};

export const Mirror: React.FC<{size?: number; y?: number; amt?: number; center?: [number, number]; poolR?: number; pool?: string; base?: string; res?: [number, number]; far?: number}> = ({size = 200, y = 0, amt = 0.5, center = [0, 0], poolR = 6, pool = '#1c2c50', base = '#0a1122', res = [720, 1280], far = 40}) => {
  const refl = useMemo(() => {
    const r = new Reflector(new THREE.PlaneGeometry(size, size), {textureWidth: res[0], textureHeight: res[1], clipBias: 0.002, shader: MirrorShader, multisample: 4});
    r.rotateX(-Math.PI / 2);
    return r;
  }, [size, res[0], res[1]]);
  useEffect(() => () => {
    refl.getRenderTarget().dispose();
    (refl.material as THREE.Material).dispose();
    refl.geometry.dispose();
  }, [refl]);
  const u = (refl.material as THREE.ShaderMaterial).uniforms;
  u.uAmt.value = amt;
  u.uCenter.value.set(center[0], center[1]);
  u.uPoolR.value = poolR;
  u.uPool.value.set(pool);
  u.uBase.value.set(base);
  u.uFar.value = far;
  u.uBlur.value.set(1.4 / res[0], 1.4 / res[1]);
  refl.position.y = y;
  return <primitive object={refl} />;
};
