'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type ModernLuxury3DHeroProps = {
  primaryColor?: string;
  accentColor?: string;
  className?: string;
};

const safeColor = (value: string | undefined, fallback: string) => {
  try {
    return new THREE.Color(value || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
};

export function ModernLuxury3DHero({
  primaryColor = '#17130f',
  accentColor = '#d7b978',
  className,
}: ModernLuxury3DHeroProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.15, 5.2);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.set(0.08, -0.28, 0.05);
    scene.add(group);

    const primary = safeColor(primaryColor, '#17130f');
    const accent = safeColor(accentColor, '#d7b978');

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: primary,
      metalness: 0.86,
      roughness: 0.22,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: accent,
      metalness: 0.72,
      roughness: 0.18,
      emissive: accent,
      emissiveIntensity: 0.06,
    });

    const detail = window.innerWidth < 700 ? 72 : 128;
    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.08, 0.22, detail, 20, 2, 3),
      coreMaterial,
    );
    group.add(knot);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.48, 0.025, 12, 128),
      accentMaterial,
    );
    ring.rotation.x = Math.PI * 0.48;
    ring.rotation.z = Math.PI * 0.16;
    group.add(ring);

    const ringTwo = new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.012, 8, 128),
      accentMaterial,
    );
    ringTwo.rotation.x = Math.PI * 0.62;
    ringTwo.rotation.y = Math.PI * 0.18;
    group.add(ringTwo);

    const particleCount = window.innerWidth < 700 ? 120 : 220;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const radius = 1.9 + Math.random() * 1.35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.cos(phi);
      particlePositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: accent,
      size: window.innerWidth < 700 ? 0.018 : 0.025,
      transparent: true,
      opacity: 0.42,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const accentLight = new THREE.PointLight(accent, 16, 7, 2);
    accentLight.position.set(-2.5, 1.5, 2.8);
    scene.add(accentLight);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const onPointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
    };

    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', resize);

    const animate = (time: number) => {
      const seconds = time * 0.001;
      if (!reduceMotion) {
        group.rotation.y += (pointerX * 0.34 - group.rotation.y) * 0.018;
        group.rotation.x += (-pointerY * 0.2 + 0.08 - group.rotation.x) * 0.018;
        group.rotation.z = Math.sin(seconds * 0.35) * 0.035;
        knot.rotation.z = seconds * 0.12;
        ring.rotation.y = seconds * 0.08;
        ringTwo.rotation.z = -seconds * 0.055;
        particles.rotation.y = seconds * 0.018;
        particles.rotation.x = Math.sin(seconds * 0.18) * 0.05;
      }
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', resize);
      knot.geometry.dispose();
      coreMaterial.dispose();
      ring.geometry.dispose();
      ringTwo.geometry.dispose();
      accentMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [accentColor, primaryColor]);

  return <div ref={mountRef} className={className} aria-hidden="true" data-testid="modern-luxury-3d-hero" />;
}
