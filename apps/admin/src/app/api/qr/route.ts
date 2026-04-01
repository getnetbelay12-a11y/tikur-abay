import { NextRequest, NextResponse } from 'next/server';

function hashSeed(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildSvg(data: string) {
  const size = 21;
  const cell = 8;
  const pad = 12;
  const seed = hashSeed(data);
  const squares: string[] = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const bit = ((seed >> ((row * size + col) % 24)) & 1) ^ ((row + col) % 2);
      const inFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= size - 7) ||
        (row >= size - 7 && col < 7);
      const shouldFill = inFinder || bit === 1;
      if (!shouldFill) continue;
      squares.push(`<rect x="${pad + col * cell}" y="${pad + row * cell}" width="${cell}" height="${cell}" fill="#0F2A44" />`);
    }
  }

  const side = pad * 2 + size * cell;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}" fill="none"><rect width="${side}" height="${side}" fill="white"/><rect x="0.5" y="0.5" width="${side - 1}" height="${side - 1}" stroke="#0F2A44"/>${squares.join('')}</svg>`;
}

export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get('data') || 'TIKUR-ABAY|BL';
  const svg = buildSvg(data);
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store',
    },
  });
}
