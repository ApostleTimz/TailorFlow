// Single source of truth for measurement fields. The frontend renders its form from this.
const f = (key, label, group) => ({ key, label, group });

const male = [
  f('height', 'Height', 'Body'),
  f('neck', 'Neck', 'Upper body'), f('shoulder', 'Shoulder width', 'Upper body'), f('chest', 'Chest', 'Upper body'),
  f('stomach', 'Stomach', 'Upper body'), f('waist', 'Waist', 'Upper body'), f('hip', 'Hip / seat', 'Upper body'), f('back_width', 'Back width', 'Upper body'),
  f('sleeve_length', 'Sleeve length', 'Arms'), f('bicep', 'Bicep', 'Arms'), f('wrist', 'Wrist', 'Arms'),
  f('shirt_length', 'Shirt / jacket length', 'Lengths'), f('trouser_length', 'Trouser length (outseam)', 'Lengths'), f('inseam', 'Inseam', 'Lengths'),
  f('thigh', 'Thigh', 'Lower body'), f('knee', 'Knee', 'Lower body'), f('bottom_opening', 'Trouser bottom opening', 'Lower body'), f('crotch_depth', 'Crotch depth', 'Lower body'),
];

const female = [
  f('height', 'Height', 'Body'),
  f('bust', 'Bust', 'Upper body'), f('underbust', 'Underbust', 'Upper body'), f('waist', 'Waist', 'Upper body'), f('high_hip', 'High hip', 'Upper body'), f('hip', 'Hip', 'Upper body'),
  f('neck', 'Neck', 'Upper body'), f('shoulder', 'Shoulder width', 'Upper body'), f('back_width', 'Back width', 'Upper body'), f('armhole', 'Armhole', 'Upper body'),
  f('bust_point_distance', 'Bust point to bust point', 'Upper body'), f('shoulder_to_bust_point', 'Shoulder to bust point', 'Upper body'),
  f('sleeve_length', 'Sleeve length', 'Arms'), f('bicep', 'Bicep', 'Arms'), f('wrist', 'Wrist', 'Arms'),
  f('nape_to_waist', 'Nape to waist', 'Lengths'), f('blouse_length', 'Blouse / top length', 'Lengths'), f('dress_length', 'Dress / gown length', 'Lengths'),
  f('skirt_length', 'Skirt length', 'Lengths'), f('trouser_length', 'Trouser length (outseam)', 'Lengths'), f('inseam', 'Inseam', 'Lengths'),
  f('thigh', 'Thigh', 'Lower body'), f('knee', 'Knee', 'Lower body'),
];

module.exports = { TEMPLATES: { male, female }, UNITS: ['cm', 'in'] };
