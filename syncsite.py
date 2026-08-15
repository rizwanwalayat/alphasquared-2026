#!/usr/bin/env python3
"""Bring the rest of the site in line with the rebuilt homepage.

Idempotent, stdlib only. Run from the repo root:

    python syncsite.py

What it does, per page:
  1. loads css/theme.css straight after css/style.css (the industrial palette
     was index-only until now)
  2. unifies every local ?v= cache-buster on to VERSION
  3. swaps the old footer block for the homepage footer, path-corrected
  4. title-cases <h1>/<h2>/<h3> copy and drops the trailing full stop

The 45 generated case-study pages are owned by buildcases.py, so the same
head/footer edits are applied to its templates and the generator is re-run.
"""

import os
import re
import subprocess
import sys

VERSION = "20260813c"

ROOT = os.path.dirname(os.path.abspath(__file__))

# mockup-preview.html is a scratch file and stays out of the sync.
ROOT_PAGES = [
    "index.html",
    "about.html",
    "services.html",
    "case-studies.html",
    "contact.html",
    "trust.html",
    "trucking.html",
]

FOOTER = """<footer class="footer">
  <div class="wrap">

    <div class="footer__grid">
      <div class="footer__brand">
        <a href="{p}index.html" class="brand" aria-label="Alpha Squared home, ideas implemented">
          <img src="{p}assets/logo-full-white.png" alt="Alpha Squared logo" class="brand__logo" />
        </a>
        <p>Canadian software studio building for operators and enterprises since 2012.
          Edmonton, Alberta. Trucking and transport specialists. Ideas implemented.</p>

        <h2 class="footer__h footer__h--soc">Follow Along</h2>
        <!-- Profile URLs are placeholders until the real handles are confirmed;
             WhatsApp and email are live. -->
        <ul class="soc">
          <li><a href="#" aria-label="Alpha Squared on LinkedIn">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9.5h4V21H3V9.5Zm6.5 0h3.8v1.6h.05a4.2 4.2 0 0 1 3.77-2.07c4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21h-4V9.5Z"/></svg>
          </a></li>
          <li><a href="#" aria-label="Alpha Squared on X">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.53 3h3.2l-6.99 7.99L22 21h-6.44l-5.04-6.6L4.75 21H1.54l7.48-8.55L2 3h6.6l4.56 6.03L17.53 3Zm-1.12 16.06h1.77L7.67 4.84H5.77l10.64 14.22Z"/></svg>
          </a></li>
          <li><a href="#" aria-label="Alpha Squared on Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.54-1.5h1.66V3.63A22 22 0 0 0 14.3 3.5c-2.4 0-4.05 1.47-4.05 4.17V9.9H7.5V13h2.75v8h3.25Z"/></svg>
          </a></li>
          <li><a href="#" aria-label="Alpha Squared on Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none"/></svg>
          </a></li>
          <li><a href="https://wa.me/18259772020" target="_blank" rel="noopener" aria-label="Alpha Squared on WhatsApp">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2 22l5.34-1.4a9.8 9.8 0 0 0 4.7 1.2h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.48 2 12.04 2Zm5.76 14.02c-.24.68-1.4 1.3-1.94 1.34-.5.05-.98.23-3.3-.69-2.78-1.1-4.55-3.94-4.69-4.13-.13-.19-1.12-1.49-1.12-2.84s.71-2.01.96-2.29c.25-.27.55-.34.73-.34l.53.01c.17 0 .4-.06.62.48.24.57.8 1.97.87 2.11.07.14.12.31.02.5-.09.19-.14.31-.28.47l-.42.49c-.14.14-.28.29-.12.57.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.28.14.44.12.6-.07.17-.19.7-.81.88-1.09.19-.27.37-.23.63-.14.25.1 1.65.78 1.93.92.28.14.47.21.54.33.07.11.07.65-.17 1.33Z"/></svg>
          </a></li>
          <li><a href="mailto:info@alphasquared.co" aria-label="Email Alpha Squared">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>
          </a></li>
        </ul>
      </div>

      <div>
        <h2 class="footer__h">Solutions</h2>
        <ul>
          <li><a href="{p}trucking.html">Trucking &amp; Transport</a></li>
          <li><a href="{p}services.html#platforms">Operations Platforms</a></li>
          <li><a href="{p}services.html#mobile">Mobile Apps</a></li>
          <li><a href="{p}services.html#ai">AI &amp; Automation</a></li>
          <li><a href="{p}services.html#teams">Dedicated Teams</a></li>
        </ul>
      </div>

      <div>
        <h2 class="footer__h">Company</h2>
        <ul>
          <li><a href="{p}about.html">About Us</a></li>
          <li><a href="{p}case-studies.html">Case Studies</a></li>
          <li><a href="{p}services.html">Services</a></li>
          <li><a href="{p}trust.html">Trust &amp; Security</a></li>
          <li><a href="{p}contact.html">Contact</a></li>
        </ul>
      </div>

      <div>
        <h2 class="footer__h">Talk to Us</h2>
        <ul class="footer__contact">
          <li><span>Phone</span><a href="tel:+18259772020">+1 (825) 977-2020</a></li>
          <li><span>Email</span><a href="mailto:info@alphasquared.co">info@alphasquared.co</a></li>
          <li><span>Office</span>5479 CrabApple Loop SW<br />Edmonton, Alberta T6X 1S5</li>
          <li><span>Hours</span>Mountain Time, 8am to 6pm</li>
        </ul>
      </div>
    </div>

    <div class="footer__base">
      <span>\u00a9 2026 Alpha Squared. Ideas Implemented.</span>
      <ul class="footer__legal">
        <li><a href="{p}sitemap.xml">Sitemap</a></li>
      </ul>
      <span>Built in Edmonton, Alberta</span>
    </div>
  </div>
</footer>"""

# Every page signs off on the same closing panel.
CLOSER = """<section class="final final--close" id="contact">
    <div class="wrap">
      <div class="close" data-anim="up">
        <h2 class="d2" data-anim="up">Show Us One Manual Process. <em>We'll Show You What Automating It Takes</em></h2>
        <p class="lead">One conversation, and you know what it takes.</p>

        <div class="close__act">
          <a class="btn" href="https://wa.me/18259772020?text=Hi%20Alpha%20Squared%2C%20I%27d%20like%20to%20book%20a%20call%20about%20a%20build."
             target="_blank" rel="noopener">
            <span>Book a call <i class="ar">&rarr;</i></span>
          </a>

          <a class="btn btn--ghost" href="{p}contact.html"><span>Send a brief</span></a>
        </div>
      </div>
    </div>
  </section>"""

# Words that stay lowercase unless they open a sentence.
SMALL = {
    "a", "an", "the", "and", "but", "or", "nor", "for", "so", "yet",
    "as", "at", "by", "in", "into", "of", "off", "on", "onto", "out",
    "per", "to", "up", "via", "with", "from", "over", "than", "vs",
}

TAG = re.compile(r"<[^>]+>")
WORD = re.compile(r"&[a-zA-Z]+;|[A-Za-z0-9][A-Za-z0-9'\u2019\-]*")
HEADING = re.compile(r"(<h([1-3])\b[^>]*>)(.*?)(</h\2>)", re.S)
FOOTER_BLOCK = re.compile(r"<footer class=\"footer\">.*?</footer>", re.S)
FINAL_BLOCK = re.compile(r"<section class=\"final\"[^>]*>.*?</section>", re.S)
# The "Alpha² 0%" preloader. main.js already no-ops when #loader is absent.
LOADER_BLOCK = re.compile(r"\n*<!-- ═+ LOADER ═+ -->\n<div class=\"loader\".*?</div>\n</div>\n", re.S)
BUSTER = re.compile(r'((?:\.\./)?(?:css|js)/[A-Za-z0-9_.-]+)\?v=[A-Za-z0-9]+')
TRAILING_DOT = re.compile(r"\.(\s*(?:</(?:span|em|b|i|strong)>\s*)*)$")

# Casing an earlier pass got wrong and cannot infer back.
REPAIR = {"3Am": "3am", "2Am": "2am", "3Pm": "3pm", "6Pm": "6pm", "8Am": "8am"}


def title_case(fragment):
    """Title-case the text nodes of a heading, leaving markup untouched."""
    out = []
    pos = 0
    force_cap = True

    for tag in TAG.finditer(fragment):
        out.append(_words(fragment[pos:tag.start()], force_cap))
        force_cap = _force_after(fragment[pos:tag.start()], force_cap)
        if tag.group(0).startswith("<br"):
            force_cap = True
        out.append(tag.group(0))
        pos = tag.end()

    out.append(_words(fragment[pos:], force_cap))
    return "".join(out)


def _force_after(text, current):
    stripped = text.rstrip()
    if not stripped:
        return current
    return stripped[-1] in ".!?:"


def _words(text, force_cap):
    result = []
    last = 0
    for m in WORD.finditer(text):
        result.append(text[last:m.start()])
        word = m.group(0)
        gap = text[last:m.start()]
        if gap.strip():
            force_cap = gap.rstrip()[-1] in ".!?:"
        result.append(_cap(word, force_cap))
        force_cap = False
        last = m.end()
    result.append(text[last:])
    return "".join(result)


def _cap(word, force_cap):
    if word.startswith("&"):                       # entity, leave alone
        return word
    if word in REPAIR:
        return REPAIR[word]
    if not word[0].isalpha():                      # 3am, 48, $520K
        return word
    if any(c.isupper() for c in word[1:]) and "-" not in word:
        return word                                # iOS, QuickBooks, FMCSA
    parts = word.split("-")
    out = []
    for i, part in enumerate(parts):
        if not part or any(c.isupper() for c in part[1:]):
            out.append(part)
        elif i and part.lower() in SMALL:
            out.append(part.lower())
        elif i == 0 and not force_cap and part.lower() in SMALL:
            out.append(part.lower())
        else:
            out.append(part[0].upper() + part[1:])
    return "-".join(out)


def _cap_last_word(fragment):
    """Title case never leaves the closing word of a heading lowercase."""
    matches = [m for m in WORD.finditer(fragment) if not m.group(0).startswith("&")]
    if not matches:
        return fragment
    last = matches[-1]
    word = last.group(0)
    if word.lower() in SMALL and word[0].islower():
        fragment = fragment[:last.start()] + word[0].upper() + word[1:] + fragment[last.end():]
    return fragment


def fix_headings(html, skip_ranges=()):
    def repl(m):
        start = m.start()
        for lo, hi in skip_ranges:
            if lo <= start <= hi:
                return m.group(0)
        inner = m.group(3)
        if "<h" in inner:                          # nested, leave it
            return m.group(0)
        inner = title_case(inner)
        inner = _cap_last_word(inner)
        inner = TRAILING_DOT.sub(r"\1", inner)
        return m.group(1) + inner + m.group(4)

    return HEADING.sub(repl, html)


def add_theme_link(html, prefix):
    if f'{prefix}css/theme.css' in html:
        return html
    style = re.search(r'[ \t]*<link rel="stylesheet" href="%scss/style\.css[^"]*" />\n' % re.escape(prefix), html)
    if not style:
        return html
    link = '<link rel="stylesheet" href="%scss/theme.css?v=%s" />\n' % (prefix, VERSION)
    return html[:style.end()] + link + html[style.end():]


def process(path, prefix, headings=True, closer=True):
    with open(path, encoding="utf-8") as fh:
        html = fh.read()
    before = html

    html = add_theme_link(html, prefix)
    html = BUSTER.sub(lambda m: "%s?v=%s" % (m.group(1), VERSION), html)
    html = LOADER_BLOCK.sub("\n", html)
    html = html.replace('<body class="is-loading">', "<body>")
    html = FOOTER_BLOCK.sub(lambda m: FOOTER.format(p=prefix), html)
    if closer:
        html = FINAL_BLOCK.sub(lambda m: CLOSER.format(p=prefix), html)

    if headings:
        skip = []
        for marker in re.finditer(r"work:start(.*?)work:end", html, re.S):
            skip.append((marker.start(), marker.end()))
        foot = FOOTER_BLOCK.search(html)
        if foot:
            skip.append((foot.start(), foot.end()))
        html = fix_headings(html, skip)

    if html != before:
        with open(path, "w", encoding="utf-8", newline="") as fh:
            fh.write(html)
        return True
    return False


def process_generator():
    """Keep buildcases.py emitting the same head links and footer."""
    path = os.path.join(ROOT, "buildcases.py")
    with open(path, encoding="utf-8") as fh:
        src = fh.read()
    before = src

    if "../css/theme.css" not in src:
        src = re.sub(
            r'(<link rel="stylesheet" href="\.\./css/style\.css\?v=[A-Za-z0-9]+" />)',
            r'\1\n<link rel="stylesheet" href="../css/theme.css?v=%s" />' % VERSION,
            src,
        )

    src = BUSTER.sub(lambda m: "%s?v=%s" % (m.group(1), VERSION), src)
    src = LOADER_BLOCK.sub("\n", src)
    src = src.replace('<body class="is-loading">', "<body>")
    src = FOOTER_BLOCK.sub(lambda m: FOOTER.format(p="../"), src)
    src = FINAL_BLOCK.sub(lambda m: CLOSER.format(p="../"), src)

    if src != before:
        with open(path, "w", encoding="utf-8", newline="") as fh:
            fh.write(src)
        return True
    return False


def flagship_intro():
    """The three hand-authored detail pages are skipped by the generator, so
    the top pager and the domain strip have to be installed here."""
    sys.path.insert(0, ROOT)
    import casedata
    import buildcases

    projects = casedata.PROJECTS
    done = []

    for i, p in enumerate(projects):
        if not p["hand"]:
            continue
        path = os.path.join(ROOT, "case-studies", "%s.html" % p["slug"])
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as fh:
            html = fh.read()
        if "pager--top" in html:
            continue

        block = buildcases.render_intro(p, projects[i - 1], projects[(i + 1) % len(projects)])
        anchor = re.search(r"</section>\n\n<section class=\"section\">", html)
        if not anchor:
            continue
        cut = anchor.start() + len("</section>\n")
        html = html[:cut] + "\n" + block + "\n" + html[cut:]

        with open(path, "w", encoding="utf-8", newline="") as fh:
            fh.write(html)
        done.append("case-studies/%s.html" % p["slug"])

    return done


def main():
    touched = []

    for name in ROOT_PAGES:
        path = os.path.join(ROOT, name)
        # contact.html ends on the form itself, so it keeps its own sign-off.
        if os.path.exists(path) and process(path, "", headings=name != "index.html",
                                            closer=name != "contact.html"):
            touched.append(name)

    if process_generator():
        touched.append("buildcases.py")

    # The three hand-authored flagships are not regenerated, so sync them here.
    cases = os.path.join(ROOT, "case-studies")
    for name in sorted(os.listdir(cases)):
        if name.endswith(".html") and process(os.path.join(cases, name), "../", headings=False):
            touched.append("case-studies/" + name)

    print("updated %d files" % len(touched))
    for name in touched:
        print("  " + name)

    print("\nregenerating case studies")
    subprocess.run([sys.executable, "buildcases.py"], cwd=ROOT, check=True)

    for name in flagship_intro():
        print("  intro band added to " + name)


if __name__ == "__main__":
    main()
