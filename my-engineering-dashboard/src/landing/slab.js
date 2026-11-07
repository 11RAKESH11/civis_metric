// Slab concrete method shared by the landing page demo and its previews. Same method as the Concrete estimator:
// wet volume x 1.54 dry factor, split by nominal mix ratio; cement 1440 kg/m3 in 50 kg bags; sand and aggregate 1600 kg/m3.
export const GRADES = [
  { id: 'M15', ratio: [1, 2, 4] },
  { id: 'M20', ratio: [1, 1.5, 3] },
  { id: 'M25', ratio: [1, 1, 2] },
];

export function computeSlab({ length, width, thickness, grade, wastage }) {
  const wet = (length * width * thickness) / 1000;
  const order = wet * (1 + wastage / 100);
  const dry = order * 1.54;
  const [c, s, a] = GRADES.find((g) => g.id === grade).ratio;
  const parts = c + s + a;
  const cementKg = (c / parts) * dry * 1440;
  return {
    wet, order,
    bags: Math.ceil(cementKg / 50),
    sandT: (((s / parts) * dry * 1600) / 1000),
    aggT: (((a / parts) * dry * 1600) / 1000),
  };
}

