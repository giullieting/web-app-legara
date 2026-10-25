"""Gera dist/index.html (CSS e JS embutidos) para publicação como artefato de prévia.
Uso: python3 build.py"""
import re, pathlib
root = pathlib.Path(__file__).parent
src = (root / "index.html").read_text(encoding="utf-8")
css = (root / "css/style.css").read_text(encoding="utf-8")
head = re.search(r"<head>(.*)</head>", src, re.S).group(1)
body = re.search(r"<body>(.*)</body>", src, re.S).group(1)
head = re.sub(r'<meta charset[^>]*>\s*', '', head)
head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
head = re.sub(r'<title>.*?</title>', '<title>Site LEGARA</title>', head)
head = head.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')
def inline(m):
    return '<script>\n' + (root / m.group(1)).read_text(encoding="utf-8") + '\n</script>'
body = re.sub(r'<script src="(js/[^"]+)"></script>', inline, body)
import base64
def datauri(m):
    p = root / m.group(0)
    return "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()
body = re.sub(r'assets/[\w.-]+\.png', datauri, body)
out = root / "dist"; out.mkdir(exist_ok=True)
(out / "index.html").write_text(head + body, encoding="utf-8")
print("ok", (out / "index.html").stat().st_size)
