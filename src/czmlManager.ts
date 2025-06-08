const czml: any[] = [
  {
    id: 'document',
    name: 'CZML Editor',
    version: '1.0'
  }
];

let idCounter = 1;

export function addPointToCzml(coord: { lon: number; lat: number; height: number }) {
  czml.push({
    id: `point-${idCounter++}`,
    name: 'Point',
    position: {
      cartographicDegrees: [coord.lon, coord.lat, coord.height]
    },
    point: {
      color: { rgba: [255, 0, 0, 255] },
      pixelSize: 10
    }
  });
}

export function getCzml() {
  return czml;
}
