import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

// 3D 矿机模型组件
function MinerBox({ active = true }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // 旋转动画
      meshRef.current.rotation.y += 0.005;

      // 浮动动画
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;

      // 发光效果
      if (active) {
        const intensity = (Math.sin(state.clock.elapsedTime * 2) + 1) * 0.5;
        meshRef.current.material.emissiveIntensity = 0.5 + intensity * 0.5;
      }
    }
  });

  return (
    <group>
      {/* 主矿机体 */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.1 : 1}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial
          color={active ? '#FFD700' : '#666'}
          metalness={0.9}
          roughness={0.1}
          emissive={active ? '#FFD700' : '#333'}
          emissiveIntensity={active ? 0.5 : 0.1}
        />
      </mesh>

      {/* 内部发光核心 */}
      {active && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshBasicMaterial
            color="#00BFFF"
            transparent
            opacity={0.3}
          />
        </mesh>
      )}

      {/* 外圈光环 */}
      {active && (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <torusGeometry args={[1.5, 0.05, 16, 100]} />
            <meshBasicMaterial color="#FFD700" transparent opacity={0.6} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
            <torusGeometry args={[1.5, 0.05, 16, 100]} />
            <meshBasicMaterial color="#00BFFF" transparent opacity={0.6} />
          </mesh>
        </>
      )}

      {/* 点光源 */}
      {active && (
        <>
          <pointLight position={[2, 2, 2]} intensity={1} color="#FFD700" />
          <pointLight position={[-2, -2, -2]} intensity={1} color="#00BFFF" />
        </>
      )}
    </group>
  );
}

// Canvas 容器
export default function MinerModel3D({ active = true, width = '100%', height = '400px' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      style={{ width, height }}
    >
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 6]} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={4}
          maxDistance={10}
          autoRotate={false}
        />

        {/* 环境光 */}
        <ambientLight intensity={0.3} />
        <Environment preset="night" />

        {/* 矿机模型 */}
        <MinerBox active={active} />

        {/* 背景粒子效果 */}
        <Stars />
      </Canvas>
    </motion.div>
  );
}

// 星空粒子背景
function Stars() {
  const starsRef = useRef();

  const vertices = new Float32Array(2000 * 3);
  for (let i = 0; i < 2000 * 3; i++) {
    vertices[i] = (Math.random() - 0.5) * 20;
  }

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0002;
      starsRef.current.rotation.x += 0.0001;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={vertices.length / 3}
          array={vertices}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#ffffff"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}
