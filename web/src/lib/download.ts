/** Browser downloads: CSV from rows, SVG and PNG from an <svg> element. */

function save(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(name: string, header: string[], rows: unknown[][]) {
  const text = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n") + "\n";
  save(new Blob([text], { type: "text/csv" }), name);
}

function serialise(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const { width, height } = svg.getBoundingClientRect();
  clone.setAttribute("width", String(Math.round(width)));
  clone.setAttribute("height", String(Math.round(height)));
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);
  clone.setAttribute("font-family", "Inter, system-ui, sans-serif");
  return new XMLSerializer().serializeToString(clone);
}

export function downloadSvg(svg: SVGSVGElement | null, name: string) {
  if (!svg) return;
  save(new Blob([serialise(svg)], { type: "image/svg+xml" }), name);
}

export function downloadPng(svg: SVGSVGElement | null, name: string, scale = 3) {
  if (!svg) return;
  const { width, height } = svg.getBoundingClientRect();
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = Math.round(width * scale);
    c.height = Math.round(height * scale);
    const ctx = c.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    c.toBlob((b) => b && save(b, name), "image/png");
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serialise(svg));
}

/** Trace path for <Num>: segments are URI-encoded so ids containing "/" stay intact. */
export const tracePath = (file: string, ...segs: (string | number)[]) => `${file}:${segs.map((s) => encodeURIComponent(String(s))).join("/")}`;
