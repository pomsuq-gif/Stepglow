import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {V3} from '../nc001-work-smart/kit3d';

/**
 * SG004 helpers: soft cast shadows on the floor (the kit only has additive light, nothing that darkens).
 * A shadow is a flat capsule from a to b (floor x/z) with radius r, soft edge, normal blending, black.
 */
const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
uniform float uA, uH, uR, uSoft; uniform vec2 uSize; varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * uSize;
  vec2 q = vec2(max(abs(p.x) - uH, 0.0), p.y);
  float d = length(q);
  float a = uA * (1.0 - smoothstep(uR * (1.0 - uSoft), uR * (1.0 + uSoft), d));
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`;
const plane = new THREE.PlaneGeometry(1, 1);

export const Shade: React.FC<{a: V3; b: V3; r: number; alpha: number; soft?: number; y?: number}> = ({a, b, r, alpha, soft = 0.6, y = 0.006}) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {uA: {value: 0}, uH: {value: 0}, uR: {value: 0.1}, uSoft: {value: 0.6}, uSize: {value: new THREE.Vector2(1, 1)}},
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  const R = r * (1 + soft);
  const L = len + 2 * R;
  const W = 2 * R;
  const u = material.uniforms;
  u.uA.value = alpha;
  u.uH.value = len / 2;
  u.uR.value = r;
  u.uSoft.value = soft;
  (u.uSize.value as THREE.Vector2).set(L, W);
  return <mesh geometry={plane} material={material} position={[(a[0] + b[0]) / 2, y, (a[2] + b[2]) / 2]} rotation={[-Math.PI / 2, 0, Math.atan2(-dz, dx)]} scale={[L, W, 1]} renderOrder={2} />;
};

/** light coming from above and a little behind the lanes: shadows fall toward the camera */
export const LIGHT: V3 = (() => {
  const v: V3 = [0.4, -1, 0.7];
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
/** a world point dropped onto the floor along the light */
export const onFloor = (p: V3): V3 => {
  const k = p[1] / -LIGHT[1];
  return [p[0] + LIGHT[0] * k, 0, p[2] + LIGHT[2] * k];
};

/** the floor: black, with the spotlight's pool (soft edge) at center c of radius r */
const FLOOR_FRAG = /* glsl */ `
uniform vec3 uPool, uBase; uniform vec2 uC; uniform float uR, uEdge; varying vec3 vW;
void main(){
  float d = length((vW.xz - uC) * vec2(1.0, 1.08));
  float k = 1.0 - smoothstep(uR * uEdge, uR, d);
  vec3 col = mix(uBase, uPool, k * k * (3.0 - 2.0 * k));
  gl_FragColor = vec4(col, 1.0);
}`;
const FLOOR_VERT = /* glsl */ `varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const floorGeo = new THREE.PlaneGeometry(80, 80);

export const PoolFloor: React.FC<{c: [number, number]; r: number; pool: string; base: string; edge?: number}> = ({c, r, pool, base, edge = 0.2}) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FLOOR_VERT,
        fragmentShader: FLOOR_FRAG,
        uniforms: {uPool: {value: new THREE.Color()}, uBase: {value: new THREE.Color()}, uC: {value: new THREE.Vector2()}, uR: {value: 1}, uEdge: {value: 0.2}},
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const u = material.uniforms;
  (u.uPool.value as THREE.Color).set(pool);
  (u.uBase.value as THREE.Color).set(base);
  (u.uC.value as THREE.Vector2).set(c[0], c[1]);
  u.uR.value = r;
  u.uEdge.value = edge;
  return <mesh geometry={floorGeo} material={material} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0} />;
};
