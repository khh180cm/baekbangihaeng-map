import { geoMercator, geoPath, type GeoProjection, type GeoPath } from 'd3-geo';
import type { Coord } from '../types';

/** FeatureCollection을 주어진 크기에 맞춘 Mercator 투영을 만든다. */
export function createProjection(fc: any, width: number, height: number): GeoProjection {
  return geoMercator().fitSize([width, height], fc);
}

export function pathFor(projection: GeoProjection): GeoPath {
  return geoPath(projection);
}

/** 위경도를 SVG 좌표 [x, y]로 투영한다. 지도와 동일 투영을 써야 위치가 맞는다. */
export function projectCoord(projection: GeoProjection, c: Coord): [number, number] | null {
  const xy = projection([c.lng, c.lat]);
  return xy as [number, number] | null;
}
