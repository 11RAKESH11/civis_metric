// Frees the GPU memory held by an object and everything under it. Calculators rebuild their
// meshes on every input change, so anything not disposed here accumulates until the tab closes.
// Disposing a material that's still in use elsewhere is safe: three.js re-uploads it on next render.
export default function disposeObject(root) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    materials.forEach((m) => {
      Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
      m.dispose();
    });
    if (obj.isInstancedMesh) obj.dispose();
  });
}
