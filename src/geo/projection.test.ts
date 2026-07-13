import { describe, it, expect } from 'vitest';
import { createProjection, projectCoord } from './projection';

const fc = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature', properties: {},
    geometry: { type: 'Polygon', coordinates: [[[124, 33], [132, 33], [132, 39], [124, 39], [124, 33]]] },
  }],
} as any;

describe('projection', () => {
  it('projects a coord inside the viewport bounds', () => {
    const p = createProjection(fc, 800, 600);
    const xy = projectCoord(p, { lat: 36, lng: 128 });
    expect(xy).not.toBeNull();
    expect(xy![0]).toBeGreaterThanOrEqual(0);
    expect(xy![0]).toBeLessThanOrEqual(800);
    expect(xy![1]).toBeGreaterThanOrEqual(0);
    expect(xy![1]).toBeLessThanOrEqual(600);
  });
});
