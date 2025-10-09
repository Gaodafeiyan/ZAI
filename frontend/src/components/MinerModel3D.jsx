import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

// 3D Miner Box Component
function MinerBox({ active = true, isMobile = false }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Rotation animation
      meshRef.current.rotation.y += 0.005;

      // Floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;

      // Glow effect
      if (active) {
        const intensity = (Math.sin(state.clock.elapsedTime * 2) + 1) * 0.5;
        meshRef.current.material.emissiveIntensity = 0.5 + intensity * 0.5;
      }
    }
  });

  // Scale down model for mobile
  const scale = isMobile ? 0.7 : 1;

  return (
    <group scale={[scale, scale, scale]}>
      {/* Main miner body */}
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

      {/* Inner glowing core */}
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

      {/* Outer ring halos */}
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

      {/* Point lights */}
      {active && (
        <>
          <pointLight position={[2, 2, 2]} intensity={1} color="#FFD700" />
          <pointLight position={[-2, -2, -2]} intensity={1} color="#00BFFF" />
        </>
      )}
    </group>
  );
}

// Star field background
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

// Canvas Container - Now responsive
export default function MinerModel3D({ active = true }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 900);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Adjust camera position based on screen size
  const cameraPosition = isMobile ? [0, 0, 8] : [0, 0, 6];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Canvas style={{ width: '100%', height: '100%' }}>
        <PerspectiveCamera makeDefault position={cameraPosition} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={isMobile ? 5 : 4}
          maxDistance={isMobile ? 12 : 10}
          autoRotate={false}
        />

        {/* Ambient light */}
        <ambientLight intensity={0.3} />
        <Environment preset="night" />

        {/* Miner model */}
        <MinerBox active={active} isMobile={isMobile} />

        {/* Background particles */}
        <Stars />
      </Canvas>
    </motion.div>
  );
}
