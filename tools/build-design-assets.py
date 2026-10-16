"""
build-design-assets.py — Genera las imágenes de la sección "Identidad y diseño".

Toma los ORIGINALES (carpeta del CV) y produce WebP optimizados en
assets/diseno/, más assets/diseno/sizes.js con las medidas de cada imagen
(las usa js/design.js para reservar espacio y armar srcset).

  · Fotos / láminas: WebP en 2 tamaños (lado mayor 1600 y 800 px).
  · Logotipos: silueta monocroma (un solo color, fondo transparente).
  · Marcas con las que trabajé: idem, recortadas de piezas existentes.
  · Composiciones: línea de etiquetas, pantallas de app, íconos.

Uso:  python tools/build-design-assets.py
Para sumar una imagen: agregala en IMAGES (clave → archivo original) y
referenciala desde js/design.js con la misma clave.
"""
import io
import json
import os
from PIL import Image, ImageChops, ImageFilter

SRC = r"C:\Users\matip\Desktop\Diseño\cv\Matias Medrano\03_Proyectos-destacados"
SRC_HB = r"C:\Users\matip\Desktop\Diseño\Hierbas Blends"   # originales vivos de Hierbas Blends
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "diseno")
SIZES = (1600, 800)          # lado mayor de cada versión
QUALITY = 80
INK = (244, 239, 230)        # color de las siluetas (= --ink del sitio)

sizes = {}


def src(p):
    return os.path.join(SRC, p.replace("/", os.sep))


def flatten(im, bg=(255, 255, 255)):
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        base = Image.new("RGBA", im.size, bg + (255,))
        base.alpha_composite(im)
        return base.convert("RGB")
    return im.convert("RGB")


def crop_aspect(im, aspect, anchor=0.5):
    """Recorta al centro (o según anchor) para lograr ancho/alto = aspect."""
    w, h = im.size
    if w / h > aspect:
        nw = int(h * aspect)
        x = int((w - nw) * anchor)
        return im.crop((x, 0, x + nw, h))
    nh = int(w / aspect)
    y = int((h - nh) * anchor)
    return im.crop((0, y, w, y + nh))


def save(key, im, alpha=False):
    """Guarda key-1600.webp / key-800.webp (sin agrandar) y registra medidas."""
    path = os.path.join(OUT, key.replace("/", os.sep))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    w, h = im.size
    made = []
    for L in SIZES:
        s = min(1.0, L / max(w, h))
        if made and s == 1.0:
            continue  # el original ya es más chico que este tamaño
        out = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS) if s < 1 else im
        out.save(f"{path}-{L}.webp", "WEBP", quality=QUALITY, method=6, **({"lossless": False} if alpha else {}))
        made.append(L)
    big = min(1.0, SIZES[0] / max(w, h))
    sizes[key] = [round(w * big), round(h * big), made]


def photo(key, rel, aspect=None, anchor=0.5, bg=(255, 255, 255)):
    im = flatten(Image.open(src(rel)), bg)
    if aspect:
        im = crop_aspect(im, aspect, anchor)
    save(key, im)


# ── Siluetas monocromas ───────────────────────────────────────
def silhouette(key, rel, mode="alpha", box=None, remove_red=False, erase=(), thr=60, pad=0.04):
    """
    mode: 'alpha' (PNG transparente) · 'dark' (logo claro sobre fondo oscuro)
          'light' (logo oscuro/color sobre fondo claro)
    erase: rectángulos (x0,y0,x1,y1) a borrar (p. ej. gorros navideños).
    """
    im = Image.open(src(rel))
    if box:
        im = im.crop(box)
    rgba = im.convert("RGBA")
    r, g, b, a = rgba.split()
    if mode == "alpha":
        mask = a
    elif mode == "alphalum":  # PNG con sombras: solo las partes claras del logo
        lum = rgba.convert("L").point(lambda v: 0 if v < thr else min(255, (v - thr) * 4))
        mask = ImageChops.multiply(a, lum)
    else:
        lum = rgba.convert("L")
        if mode == "dark":
            mask = lum.point(lambda v: 0 if v < thr else min(255, (v - thr) * 3))
        else:  # distancia al blanco: incluye colores claros (p. ej. amarillo)
            dist = ImageChops.invert(ImageChops.darker(ImageChops.darker(r, g), b))
            mask = dist.point(lambda v: 0 if v < thr else min(255, (v - thr) * 3))
    if remove_red:
        red = Image.merge("RGB", (r, g, b)).point(lambda v: v)
        px = red.load()
        m = mask.load()
        for y in range(red.size[1]):
            for x in range(red.size[0]):
                R, G, B = px[x, y]
                if R > 140 and G < 110 and B < 110:
                    m[x, y] = 0
    if erase:
        m = mask.load()
        for (x0, y0, x1, y1) in erase:
            for y in range(max(0, y0), min(mask.size[1], y1)):
                for x in range(max(0, x0), min(mask.size[0], x1)):
                    m[x, y] = 0
    bbox = mask.getbbox()
    if bbox:
        mask = mask.crop(bbox)
    w, h = mask.size
    p = int(max(w, h) * pad)
    canvas = Image.new("L", (w + 2 * p, h + 2 * p), 0)
    canvas.paste(mask, (p, p))
    out = Image.new("RGBA", canvas.size, INK + (0,))
    out.putalpha(canvas)
    save(key, out, alpha=True)


# ── Composiciones ─────────────────────────────────────────────
def lineup(key, rels, canvas=(1600, 1000), bg=(236, 228, 214), height=0.78, gap=26, shadow=True):
    """Piezas en fila, centradas, sobre un fondo liso (línea de etiquetas)."""
    ims = [flatten(Image.open(src(r))) for r in rels]
    H = int(canvas[1] * height)
    ims = [im.resize((int(im.width * H / im.height), H), Image.LANCZOS) for im in ims]
    total = sum(im.width for im in ims) + gap * (len(ims) - 1)
    if total > canvas[0] * 0.92:
        s = canvas[0] * 0.92 / total
        ims = [im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS) for im in ims]
        total = sum(im.width for im in ims) + int(gap * s) * (len(ims) - 1)
        gap = int(gap * s)
    base = Image.new("RGB", canvas, bg)
    x = (canvas[0] - total) // 2
    for im in ims:
        y = (canvas[1] - im.height) // 2
        if shadow:
            sh = Image.new("RGBA", (im.width + 60, im.height + 60), (0, 0, 0, 0))
            sh.paste((0, 0, 0, 70), (30, 36, 30 + im.width, 36 + im.height))
            sh = sh.filter(ImageFilter.GaussianBlur(16))
            base.paste(sh, (x - 30, y - 30), sh)
        base.paste(im, (x, y))
        x += im.width + gap
    save(key, base)


def phone_crop(rel):
    """Recorta el teléfono del centro de una captura del prototipo de NoER."""
    im = flatten(Image.open(src(rel)))
    w, h = im.size
    bgc = im.getpixel((w // 2, 6))
    diff = ImageChops.difference(im, Image.new("RGB", im.size, bgc)).convert("L").point(lambda v: 255 if v > 22 else 0)
    region = diff.crop((int(w * 0.28), 0, int(w * 0.72), h))
    bb = region.getbbox()
    x0, y0, x1, y1 = bb[0] + int(w * 0.28), bb[1], bb[2] + int(w * 0.28), bb[3]
    return im.crop((x0, max(0, y0), x1, y1))


def phones(key, rels, bg=(233, 239, 236), gap=34, pad=50):
    ims = [phone_crop(r) for r in rels]
    H = max(im.height for im in ims)
    ims = [im.resize((int(im.width * H / im.height), H), Image.LANCZOS) for im in ims]
    W = sum(im.width for im in ims) + gap * (len(ims) - 1) + 2 * pad
    base = Image.new("RGB", (W, H + 2 * pad), bg)
    x = pad
    for im in ims:
        base.paste(im, (x, pad))
        x += im.width + gap
    save(key, base)


def grid(key, rels, cols, cell=420, bg=(238, 238, 236), inner=0.86):
    rows = (len(rels) + cols - 1) // cols
    base = Image.new("RGB", (cols * cell, rows * cell), bg)
    for k, r in enumerate(rels):
        im = flatten(Image.open(src(r)), bg)
        im = crop_aspect(im, 1)
        s = int(cell * inner)
        im = im.resize((s, s), Image.LANCZOS)
        base.paste(im, ((k % cols) * cell + (cell - s) // 2, (k // cols) * cell + (cell - s) // 2))
    save(key, base)


# ── Vectores (PDF / AI) ───────────────────────────────────────
def vector(key, path, dpi=300, crop=None, bg=(255, 255, 255), pad=0.03):
    """Rasteriza la página 1 de un PDF o .ai (Illustrator guarda un PDF adentro).

    Recorta el margen en blanco y, si se pasa `crop` (x0, y0, x1, y1 en
    fracciones del contenido ya recortado), se queda con ese pedazo.
    """
    import pymupdf
    page = pymupdf.open(path)[0]
    im = flatten(Image.open(io.BytesIO(page.get_pixmap(dpi=dpi).tobytes("png"))), bg)
    diff = ImageChops.difference(im, Image.new("RGB", im.size, bg)).convert("L").point(lambda v: 255 if v > 8 else 0)
    bb = diff.getbbox()
    if bb:
        im = im.crop(bb)
    if crop:
        w, h = im.size
        x0, y0, x1, y1 = crop
        im = im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))
    if pad:
        q = int(min(im.size) * pad)
        base = Image.new("RGB", (im.width + 2 * q, im.height + 2 * q), bg)
        base.paste(im, (q, q))
        im = base
    save(key, im)


# ══════════════════ MANIFIESTO ══════════════════
def build():
    HB = "01-hierbas-blends/"
    lineup("hb/cover", [HB + f"packaging/etiquetas-paisajes-2023/hb-etiqueta-paisaje-0{i}.jpg" for i in (1, 2, 3, 4, 5)],
           canvas=(1600, 1240), height=0.62)
    photo("hb/isotipo-construccion", HB + "branding/hb-construccion-isotipo.jpg")
    photo("hb/isotipo-argentina", HB + "logos/hb-isotipo-argentina.jpg", aspect=1)
    # Etiquetas de saquitos, línea 10.2026 (original vectorial, carpeta del cliente)
    SAQ = os.path.join(SRC_HB, "Et-Saquitos_10.26", "Et_b1.ai")
    vector("hb/saq26-pliego", SAQ)
    vector("hb/saq26-tisanas", SAQ, crop=(0.0, 0.0, 0.32, 0.47))
    vector("hb/saq26-te", SAQ, crop=(0.0, 0.52, 0.57, 1.0))
    for i in (1, 3, 5):
        photo(f"hb/paisaje-0{i}", HB + f"packaging/etiquetas-paisajes-2023/hb-etiqueta-paisaje-0{i}.jpg")
    for i in (1, 2, 3):
        photo(f"hb/acuarela-0{i}", HB + f"packaging/etiquetas-acuarela-2025/hb-etiqueta-acuarela-0{i}.jpg")
    for i in (1, 3, 6):
        photo(f"hb/v4-0{i}", HB + f"packaging/etiquetas-2026/hb-etiqueta-v4-0{i}.jpg")
    photo("hb/ilustracion-acuarela", HB + "packaging/etiquetas-acuarela-2025/hb-ilustracion-acuarela-02.jpg")

    NO = "03-noer/"
    photo("noer/cover", NO + "logos/noer-logo-05.jpg", aspect=1)
    photo("noer/logo-menta", NO + "logos/noer-logo-04.jpg", aspect=1)
    photo("noer/paleta", NO + "branding/noer-paleta-01.jpg", aspect=1)
    photo("noer/bocetos", NO + "branding/bocetos/noer-boceto-02.jpg", aspect=1)
    phones("noer/pantallas-a", [NO + f"app-pantallas/{f}" for f in sorted(os.listdir(src(NO + "app-pantallas")))
                                if f.startswith(("noer-19", "noer-03", "noer-05", "noer-09"))])
    phones("noer/pantallas-b", [NO + f"app-pantallas/{f}" for f in sorted(os.listdir(src(NO + "app-pantallas")))
                                if f.startswith(("noer-10", "noer-13", "noer-15", "noer-22"))])
    photo("noer/propuesta", NO + "documentacion/noer-rediseno-comparacion-01.jpg")

    HD = "06-hotdog24/"
    photo("hd24/cover", HD + "logos/hd24-logo-aplicacion-13.jpg", aspect=16 / 10)
    photo("hd24/antes", HD + "ploteo-local/hd24-ploteo-01.jpg", aspect=4 / 5, anchor=0.6)
    photo("hd24/propuesta", HD + "ploteo-local/hd24-ploteo-03.jpg", aspect=4 / 5)
    photo("hd24/medidas", HD + "ploteo-local/hd24-ploteo-04.jpg")
    photo("hd24/boceto", HD + "bocetos/hd24-boceto.jpg", aspect=4 / 5)
    photo("hd24/amarillo", HD + "logos/hd24-logo-aplicacion-14.jpg", aspect=4 / 5)
    photo("hd24/variantes", HD + "logos/hd24-logo-aplicacion-12.jpg", aspect=16 / 10)
    photo("hd24/menu", HD + "menu/hd24-menu.jpg")
    photo("hd24/qr", HD + "menu/hd24-tarjeta-qr.jpg", aspect=4 / 5)

    FM = "02-fm-libertad/"
    photo("fm/cover", FM + "logos/fml-logo-06.jpg", aspect=16 / 10, anchor=0.4)
    photo("fm/construccion", FM + "logos/fml-logo-02.jpg")
    photo("fm/colores", FM + "logos/fml-logo-03.jpg")
    photo("fm/variantes", FM + "logos/fml-logo-04.jpg")
    photo("fm/marca", FM + "logos/fml-logo-05.jpg")
    photo("fm/en-portada", FM + "programa-en-portada/en-portada-manual-03.jpg")
    photo("fm/en-portada-colores", FM + "programa-en-portada/en-portada-manual-04.jpg")
    photo("fm/en-portada-pieza", FM + "programa-en-portada/en-portada-pieza-01.jpg", aspect=1)
    photo("fm/stream", FM + "streaming/fml-overlay-stream-01.jpg")

    WC = "09-we-connection/"
    photo("wc/cover", WC + "etiqueta-y-vectorizacion/wc-pieza-03.jpg", aspect=4 / 5)
    for i in (1, 3, 7, 9, 10, 13, 14):
        photo(f"wc/manual-{i:02d}", WC + f"manual-de-marca/wc-manual-{i:02d}.jpg")
    photo("wc/etiqueta", WC + "etiqueta-y-vectorizacion/wc-pieza-02.jpg")
    photo("wc/sello", WC + "etiqueta-y-vectorizacion/wc-pieza-04.jpg", aspect=1)

    CA = "15-cover-art-musica/"
    LUD = CA + "ludmila-schimpf-para-no-pensar/"
    photo("cover/cover", LUD + "lud-08.jpg", aspect=16 / 10)
    photo("cover/portada", LUD + "lud-01.jpg", aspect=1)
    photo("cover/logos", LUD + "lud-12.jpg", aspect=1)
    photo("cover/fecha", LUD + "lud-02.jpg", aspect=1)
    photo("cover/banner", LUD + "lud-09.jpg")
    photo("cover/strato-orbe", CA + "strato-voidforest-ep/strato-01.jpg", aspect=1)
    photo("cover/strato-luz", CA + "strato-voidforest-ep/strato-05.jpg")

    GL = "07-growland/"
    photo("grow/cover", GL + "ilustracion/doodles-420/growland-doodle-02.jpg", aspect=16 / 10, anchor=0.45)
    photo("grow/doodle-01", GL + "ilustracion/doodles-420/growland-doodle-01.jpg", aspect=1)
    photo("grow/doodle-03", GL + "ilustracion/doodles-420/growland-doodle-03.jpg", aspect=1)
    grid("grow/destacadas", [GL + f"ilustracion/historias-destacadas/growland-destacada-0{i}.jpg" for i in range(1, 8)], cols=7, cell=320)
    photo("grow/flyer-apertura", GL + "flyers-eventos/growland-flyer-01.jpg")
    photo("grow/flyer-birra", GL + "flyers-eventos/growland-flyer-02.jpg")
    photo("grow/catalogo-portada", GL + "catalogo-semillas/growland-catalogo-01.jpg")
    photo("grow/catalogo-interior", GL + "catalogo-semillas/growland-catalogo-05.jpg")
    photo("grow/patio-antes", GL + "espacio-patio/growland-patio-01.jpg", aspect=3 / 2)
    photo("grow/patio-propuesta", GL + "espacio-patio/growland-patio-03.jpg", aspect=3 / 2)
    photo("grow/feed", GL + "social-media/growland-feed-02.jpg", aspect=1)

    # Logotipos propios (silueta)
    silhouette("logos/origenes", "10-origenes/logos/origenes-logo-01.png")
    silhouette("logos/ponte-guapa", "11-ponte-guapa/logos/pg-logo-03.png")
    silhouette("logos/rd-essence", "16-rd-essence/logos/rd-logo-02.png")
    silhouette("logos/hierbas-blends", "01-hierbas-blends/logos/hb-isotipo-blanco.png")
    silhouette("logos/noer", "03-noer/logos/noer-logo-01.png")
    silhouette("logos/we-connection", "09-we-connection/logos/wc-logo-04.png")
    silhouette("logos/hotdog24", "06-hotdog24/logos/hd24-logo-01.png", mode="alphalum", thr=110)
    silhouette("logos/fm-libertad", "02-fm-libertad/logos/fml-logo-01.jpg", mode="light", box=(560, 300, 1440, 800))
    silhouette("logos/en-portada", "02-fm-libertad/programa-en-portada/en-portada-logo-01.png")

    # Marcas con las que trabajé (silueta; las de NutriBlend, recortadas de catálogos)
    NB = "08-nutriblend-group/"
    silhouette("clientes/liliana", "04-liliana-lilitools/logos/liliana-logo-01.jpg", mode="light", thr=40)
    silhouette("clientes/positive", NB + "positive-merch-y-envases/nb-positive-09.png")
    silhouette("clientes/biologics", NB + "catalogos/biologic/nb-catalogo-biologic-01.jpg", mode="dark", box=(1370, 120, 1850, 250), thr=70)
    silhouette("clientes/muscle-concept", NB + "catalogos/muscle-concept/nb-catalogo-muscle-concept-01.jpg", mode="dark", box=(1420, 80, 1820, 200), thr=35)
    silhouette("clientes/my-nutrition", NB + "catalogos/my-nutrition/nb-catalogo-my-nutrition-01.jpg", mode="light", box=(1140, 290, 1630, 400), thr=60)
    silhouette("clientes/nutrilab", NB + "catalogos/nutrilab/nb-catalogo-nutrilab-02.jpg", mode="dark", box=(700, 1770, 1300, 1990), thr=110)
    # New Made y Dark Mood solo existen con gorro navideño: se borra el rojo y las zonas del gorro/barba
    silhouette("clientes/new-made", NB + "campana-navidad/nb-navidad-05.jpg", mode="light", box=(400, 780, 1600, 1220),
               remove_red=True, thr=60, erase=[(578, 130, 760, 196), (575, 196, 615, 232)])
    # Dark Mood: solo el logotipo tipográfico (la calavera lleva gorro y barba de Papá Noel)
    silhouette("clientes/dark-mood", NB + "campana-navidad/nb-navidad-02.jpg", mode="dark", box=(500, 600, 1480, 1420),
               remove_red=True, thr=70, erase=[(0, 0, 980, 445), (392, 0, 606, 820), (0, 672, 980, 820)])

    with open(os.path.join(OUT, "sizes.js"), "w", encoding="utf-8") as f:
        f.write("// Generado por tools/build-design-assets.py — no editar a mano.\n")
        f.write("window.DESIGN_SIZES = " + json.dumps(sizes, ensure_ascii=False) + ";\n")
    total = sum(os.path.getsize(os.path.join(dp, fn)) for dp, _, fs in os.walk(OUT) for fn in fs)
    print(f"{len(sizes)} imágenes · {total / 1024 / 1024:.1f} MB en assets/diseno/")


if __name__ == "__main__":
    build()
