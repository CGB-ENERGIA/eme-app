export default function LogoCGB({ size = 36 }: { size?: number }) {
  const c = 50
  const N = [c, 2], E = [98, c], S = [c, 98], W = [2, c]
  const NE = [74, 26], SE = [74, 74], SW = [26, 74], NW = [26, 26]
  const pt = (coords: number[][]) => coords.map(p => p.join(',')).join(' ')

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points={pt([N, NE, [c, c]])} fill="#BE0047" />
      <polygon points={pt([NE, E, [c, c]])} fill="#8A0030" />
      <polygon points={pt([E, SE, [c, c]])} fill="#BE0047" />
      <polygon points={pt([SE, S, [c, c]])} fill="#8A0030" />
      <polygon points={pt([S, SW, [c, c]])} fill="#BE0047" />
      <polygon points={pt([SW, W, [c, c]])} fill="#8A0030" />
      <polygon points={pt([W, NW, [c, c]])} fill="#BE0047" />
      <polygon points={pt([NW, N, [c, c]])} fill="#8A0030" />
      <polygon points={pt([[c, 34], [66, c], [c, 66], [34, c]])} fill="white" />
    </svg>
  )
}
