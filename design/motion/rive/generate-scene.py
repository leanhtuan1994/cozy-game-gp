"""Generate the Ghép Phố motion RML: the game's small Rive artboards, some drawing bitmap art."""
import math
import os
import sys

INK, RED, YEL, TAN, CREAM, GREEN = "FF2B2A33", "FFD9412B", "FFF5B841", "FFE2A85A", "FFFFF4E0", "FF3F7D5C"
BAMBOO, BAMBOO_D, GREY = "FFC99A62", "FF8F6440", "FFEFE3CC"

_next = [1000]


def nid():
    _next[0] += 1
    return f"0:{_next[0]}"


def fill(c):
    return f'<Fill name="F"><SolidColor colorValue="{c}" name="C"/></Fill>'


def stroke(c=INK, t=2):
    return f'<Stroke thickness="{t}" cap="round" join="round" name="S"><SolidColor colorValue="{c}" name="C"/></Stroke>'


def shape(path, paints, x=0, y=0, name="Shape", sid=None, extra=""):
    ida = f' id="{sid}"' if sid else ""
    return f'<Shape x="{x}" y="{y}" name="{name}"{ida}{extra}>{path}{paints}</Shape>'


def ellipse(w, h):
    return f'<Ellipse width="{w}" height="{h}" name="P"/>'


def rect(w, h, r=0):
    return f'<Rectangle width="{w}" height="{h}" cornerRadiusTL="{r}" name="P"/>'


def star(w, inner=0.5):
    return f'<Star width="{w}" height="{w}" points="5" innerRadius="{inner}" cornerRadius="2" name="P"/>'


def kf(value, frame, interp="cubic", ease=(0.42, 0, 0.58, 1), elastic=None):
    if interp == "cubic":
        x1, y1, x2, y2 = ease
        return (f'<KeyFrameDouble value="{value}" frame="{frame}" interpolationType="cubic">'
                f'<CubicEaseInterpolator x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/></KeyFrameDouble>')
    if interp == "elastic":
        a, p = elastic or (1, 0.4)
        return (f'<KeyFrameDouble value="{value}" frame="{frame}" interpolationType="elastic">'
                f'<ElasticInterpolator easingValue="1" amplitude="{a}" period="{p}"/></KeyFrameDouble>')
    return f'<KeyFrameDouble value="{value}" frame="{frame}" interpolationType="{interp}"/>'


def keyed(obj, props):
    """props: {propertyKey: [kf strings]}"""
    inner = "".join(f'<KeyedProperty propertyKey="{k}">{"".join(v)}</KeyedProperty>' for k, v in props.items())
    return f'<KeyedObject objectId="{obj}">{inner}</KeyedObject>'


X, Y, ROT, SX, SY, OP = 13, 14, 15, 16, 17, 18


def anim(aid, name, duration, loop, keyed_objs):
    return f'<LinearAnimation loopValue="{loop}" fps="60" duration="{duration}" name="{name}" id="{aid}">{"".join(keyed_objs)}</LinearAnimation>'


def state_machine(smid, anim_ids):
    layers = []
    for i, aid in enumerate(anim_ids):
        st = nid()
        layers.append(
            f'<StateMachineLayer name="Layer {i + 1}" id="{nid()}">'
            f'<AnyState x="0" y="-120"/><ExitState x="300" y="-120"/>'
            f'<EntryState x="0" y="0"><StateTransition stateToId="{st}"/></EntryState>'
            f'<AnimationState x="150" y="0" animationId="{aid}" id="{st}"/></StateMachineLayer>')
    return f'<StateMachine name="Motion" id="{smid}">{"".join(layers)}</StateMachine>'


def artboard(name, w, h, x, body, anims, anim_ids, bg=None, sm=None, vm=None):
    """sm: (smid, state machine xml) for a hand-built machine; vm: (viewModelId, instanceId)."""
    style = nid()
    smid, sm_xml = sm if sm else (lambda i: (i, state_machine(i, anim_ids)))(nid())
    bg = os.environ.get("RIVE_BG", bg)
    k = float(os.environ.get("RIVE_SCALE", "1"))
    if k != 1:
        body = f'<Node scaleX="{k}" scaleY="{k}" name="Scale">{body}</Node>'
        w, h = int(w * k), int(h * k)
    bgfill = f'<Fill name="Background"><SolidColor colorValue="{bg}" name="C"/></Fill>' if bg else ""
    vm_attrs = f' viewModelId="{vm[0]}" viewModelInstanceId="{vm[1]}"' if vm else ""
    return (f'<Artboard defaultStateMachineId="{smid}"{vm_attrs} x="{x}" y="0" width="{w}" height="{h}" styleId="{style}" '
            f'clip="true" name="{name}" id="{nid()}">'
            f'{bgfill}<LayoutComponentStyle name="Style" id="{style}"/>'
            f'{body}{sm_xml}{"".join(anims)}</Artboard>')


# ---------- state machine helpers driven by view model data ----------
ROOTS = []  # root elements (view models, fonts) emitted after the artboards


def view_model(name, props):
    """props: [(kind, propName, default)] kind in Number|Boolean. Returns (vm_id, inst_id, {propName: prop_id})."""
    vm_id, inst = nid(), nid()
    decl, vals, ids = [], [], {}
    for kind, pname, default in props:
        pid = nid()
        ids[pname] = pid
        decl.append(f'<ViewModelProperty{kind} name="{pname}" id="{pid}"/>')
        vals.append(f'<ViewModelInstance{kind} propertyValue="{default}" viewModelPropertyId="{pid}"/>')
    ROOTS.append(f'<ViewModel defaultInstanceId="{inst}" name="{name}" id="{vm_id}">{"".join(decl)}'
                 f'<ViewModelInstance exports="true" name="Default" id="{inst}">{"".join(vals)}</ViewModelInstance></ViewModel>')
    return vm_id, inst, ids


def cond_number(vm_id, pid, op, value):
    return (f'<TransitionViewModelCondition opValue="{op}"><TransitionPropertyViewModelComparator>'
            f'<BindablePropertyNumber><DataBindContext sourcePathIds="{vm_id}-{pid}" propertyKey="636"/></BindablePropertyNumber>'
            f'</TransitionPropertyViewModelComparator><TransitionValueNumberComparator value="{value}"/></TransitionViewModelCondition>')


def cond_bool(vm_id, pid, value):
    return (f'<TransitionViewModelCondition opValue="equal"><TransitionPropertyViewModelComparator>'
            f'<BindablePropertyBoolean><DataBindContext sourcePathIds="{vm_id}-{pid}" propertyKey="634"/></BindablePropertyBoolean>'
            f'</TransitionPropertyViewModelComparator><TransitionValueBooleanComparator value="{str(value).lower()}"/></TransitionViewModelCondition>')


def layer(name, entry_to, states):
    """states: [(state_id, anim_id, x, transitions_xml)]"""
    body = "".join(f'<AnimationState x="{x}" y="0" animationId="{a}" id="{s}">{t}</AnimationState>' for s, a, x, t in states)
    return (f'<StateMachineLayer name="{name}" id="{nid()}"><AnyState x="0" y="-160"/><ExitState x="{160 * (len(states) + 1)}" y="-160"/>'
            f'<EntryState x="0" y="0"><StateTransition stateToId="{entry_to}"/></EntryState>{body}</StateMachineLayer>')


def to(state, cond="", after_full=False, ms=0):
    exit_ = ' enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"' if after_full else ""
    return f'<StateTransition stateToId="{state}" duration="{ms}"{exit_}>{cond}</StateTransition>'


def once_then_loop(smid, once_aid, loop_aid):
    a, b = nid(), nid()
    return smid, (f'<StateMachine name="Motion" id="{smid}">'
                  + layer("Main", a, [(a, once_aid, 160, to(b, after_full=True)), (b, loop_aid, 320, "")]) + '</StateMachine>')


# ---------- Bitmap art embedded as images ----------
# Paths are written relative to the RML file being generated, so a copy rendered elsewhere
# (render-preview.sh) still finds them.
REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
OUT_DIR = os.path.dirname(os.path.abspath(sys.argv[1])) if len(sys.argv) > 1 else os.getcwd()
_image_assets = {}


def png_size(rel):
    with open(os.path.join(REPO, rel), "rb") as f:
        head = f.read(24)
    return int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")


def image(rel, size, x=0, y=0, name="Image", sid=None, extra=""):
    """The image at repo path `rel`, centred on x/y, scaled so its longer side is `size` points."""
    if rel not in _image_assets:
        _image_assets[rel] = nid()
        ROOTS.append(f'<ImageAsset file="{os.path.relpath(os.path.join(REPO, rel), OUT_DIR)}" '
                     f'name="{os.path.splitext(os.path.basename(rel))[0]}" id="{_image_assets[rel]}"/>')
    k = round(size / max(png_size(rel)), 5)
    ida = f' id="{sid}"' if sid else ""
    return f'<Image assetId="{_image_assets[rel]}" x="{x}" y="{y}" scaleX="{k}" scaleY="{k}" name="{name}"{ida}{extra}/>'


def wave(lo, hi, period, peak, until=None):
    """Keyframes swinging between lo and hi every `period` frames up to `until`, at hi on frame `peak` (mod period).
    A cosine sampled twelve times a swing with linear steps, so no key, the loop seam included, stalls mid-swing."""
    until = until or period

    def at(t):
        return round(lo + (hi - lo) * (1 + math.cos(2 * math.pi * (t - peak) / period)) / 2, 4)
    step = period / 12
    frames = {0, until} | {round(peak % step + j * step) for j in range(int(until / step) + 1)}
    return [kf(at(t), t, "linear") for t in sorted(f for f in frames if 0 <= f <= until)]


def sparkle(size, x=0, y=0, sid=None, color="FFFFF8E6"):
    """A four-point glint, no outline, for the glossy bitmap art."""
    return shape(f'<Star width="{size}" height="{size}" points="4" innerRadius="0.32" cornerRadius="1" name="P"/>', fill(color),
                 x=x, y=y, name="Sparkle", sid=sid, extra=' opacity="0"')


def glow(w, h, color="F5B841", sid=None, x=0, y=0, extra=""):
    """A soft round glow: a radial gradient fading to transparent."""
    paint = (f'<Fill name="F"><RadialGradient startX="0" startY="0" endX="{w / 2}" endY="0" name="G">'
             f'<GradientStop colorValue="CC{color}" position="0"/><GradientStop colorValue="00{color}" position="1"/></RadialGradient></Fill>')
    return shape(ellipse(w, h), paint, x=x, y=y, name="Glow", sid=sid, extra=extra)


# ---------- Lanterns: five lanterns swaying out of phase, glows breathing ----------
def lanterns(name="Lanterns", bg=None, x0=0):
    body, anims, ids = [], [], []
    xs = [39, 117, 195, 273, 351]
    colors = [RED, YEL, RED, YEL, RED]
    periods = [100, 100, 100, 100, 100]
    body.append(shape(rect(390, 2), fill(INK), x=195, y=10, name="Wire"))
    for i, (x, c, per) in enumerate(zip(xs, colors, periods)):
        nid_node, glow = nid(), nid()
        parts = (
            shape(rect(12, 6, 2), fill(YEL) + stroke(), y=68, name="Tassel")
            + shape(rect(16, 6, 2), fill(YEL) + stroke(), y=28, name="Cap")
            + shape(rect(2, 30), fill(INK), y=48, name="Rib")
            + shape(ellipse(34, 38), fill(c) + stroke(), y=48, name="Body")
            + shape(rect(2, 22), fill(INK), y=13, name="Cord")
            + shape(ellipse(80, 80), fill("38F5B841"), y=48, name="Glow", sid=glow)
        )
        body.append(f'<Node x="{x}" y="10" rotation="0" name="Lantern{i + 1}" id="{nid_node}">{parts}</Node>')
        aid = nid()
        swing = 0.14 if i % 2 == 0 else -0.14
        anims.append(anim(aid, f"Sway{i + 1}", per, "pingPong", [
            keyed(nid_node, {ROT: [kf(-swing, 0), kf(swing, per)]}),
            keyed(glow, {OP: [kf(0.55, 0), kf(1, per)], SX: [kf(0.9, 0), kf(1.1, per)], SY: [kf(0.9, 0), kf(1.1, per)]}),
        ]))
        ids.append(aid)
    return artboard(name, 390, 110, x0, "".join(body), anims, ids, bg)


# ---------- TriplePop: third loaf drops in, the three squash, pop and sparkle ----------
# Geometry matches the play screen's tray: 45x54 slots, 5px gap, first slot 50px from the left edge.
def loaf(x, sid):
    cuts = "".join(shape(rect(3, 7, 1.5), fill(INK), x=dx, y=-2, name="Cut", extra=' rotation="0.6"') for dx in (-7, 0, 7))
    return f'<Node x="{x}" y="55" name="Loaf" id="{sid}">{cuts}{shape(ellipse(36, 18), fill(TAN) + stroke(), name="Bread")}</Node>'


def triple_pop():
    import math
    D, cx = 150, [72.5, 122.5, 172.5]
    slots = "".join(shape(rect(45, 54, 10), fill(CREAM) + stroke(INK, 2), x=x, y=55, name="Slot") for x in cx)
    l1, l2, l3 = nid(), nid(), nid()
    sparks, spark_keys = [], []
    for k in range(8):
        sid = nid()
        ang = k * math.pi / 4
        dx, dy = round(math.cos(ang) * 105, 1), round(math.sin(ang) * 42, 1)
        sparks.append(shape(star(14, 0.45), fill(YEL) + stroke(INK, 1.5), x=122.5, y=55, name="Spark", sid=sid, extra=' opacity="0"'))
        spark_keys.append(keyed(sid, {
            X: [kf(122.5, 0, "hold"), kf(122.5, 62, "cubic", (0, 0, 0.58, 1)), kf(122.5 + dx, 92)],
            Y: [kf(55, 0, "hold"), kf(55, 62, "cubic", (0, 0, 0.58, 1)), kf(55 + dy, 92)],
            OP: [kf(0, 0, "hold"), kf(1, 62, "linear"), kf(0, 92)],
        }))
    body = loaf(cx[0], l1) + loaf(cx[1], l2) + loaf(cx[2], l3) + "".join(sparks) + slots
    ease_pop = (0.34, 0, 0.6, 1)
    regrow_x = [kf(1, 0, "hold"), kf(1, 40, "cubic"), kf(1.18, 52, "cubic", ease_pop), kf(0, 64, "hold"), kf(0, 128, "elastic", (0.6, 0.5)), kf(1, 146)]
    regrow_y = [kf(1, 0, "hold"), kf(1, 40, "cubic"), kf(0.7, 52, "cubic", ease_pop), kf(0, 64, "hold"), kf(0, 128, "elastic", (0.6, 0.5)), kf(1, 146)]
    keys = [keyed(l, {SX: regrow_x, SY: regrow_y}) for l in (l1, l2)]
    keys.append(keyed(l3, {
        Y: [kf(0, 0, "elastic", (0.6, 0.5)), kf(55, 28, "hold")],
        SX: [kf(1, 0, "hold"), kf(1, 40, "cubic"), kf(1.18, 52, "cubic", ease_pop), kf(0, 64, "hold")],
        SY: [kf(1, 0, "hold"), kf(1, 40, "cubic"), kf(0.7, 52, "cubic", ease_pop), kf(0, 64, "hold")],
        OP: [kf(0, 0, "linear"), kf(1, 6, "hold")]}))
    aid = nid()
    return artboard("TriplePop", 245, 110, 600, body, [anim(aid, "Pop", D, "loop", keys + spark_keys)], [aid])


# ---------- Stars: view model `WinStars.stars` (0-3) decides how many star images pop, staggered, then glow ----------
# Star i starts growing on frame 14·i and lands 30 frames later: src/feedback/plan.ts times the star
# vibrations to this, so keep it.
STAR_ART = "assets/ui/icons/star.png"


def stars():
    vm_id, inst, p = view_model("WinStars", [("Number", "stars", 2)])
    xs, sizes, ys = [52, 140, 228], [66, 82, 66], [66, 58, 66]
    tops, body, slots, anims, layers = [], [], [], [], []
    for i in range(3):
        x, y, s = xs[i], ys[i], sizes[i]
        node, halo, twinkle = nid(), nid(), nid()
        burst = [nid() for _ in range(4)]
        # The glossy star art leaves about a tenth of its square empty around the star.
        gold = image(STAR_ART, s * 1.12, name="Star") + glow(s * 1.35, s * 1.35, sid=halo, extra=' opacity="0"')
        tops.append(sparkle(s * 0.3, x - s * 0.05, y - s * 0.44, sid=twinkle))
        tops += [sparkle(s * 0.26, x, y, sid=b, color=YEL) for b in burst]
        body.append(f'<Node x="{x}" y="{y}" scaleX="0" scaleY="0" name="Star{i + 1}" id="{node}">{gold}</Node>')
        slots.append(image(STAR_ART, s * 1.12, x, y, name=f"Slot{i + 1}", extra=' opacity="0.25"'))

        d = i * 14
        hide, pop, shine = nid(), nid(), nid()
        quiet = {OP: [kf(0, 0, "hold")]}
        anims.append(anim(hide, f"Hide{i + 1}", 1, "oneShot",
                          [keyed(node, {SX: [kf(0, 0, "hold")], SY: [kf(0, 0, "hold")]}), keyed(halo, quiet), keyed(twinkle, quiet)]
                          + [keyed(b, quiet) for b in burst]))
        grow = [kf(0, 0, "hold"), kf(0, d, "elastic", (1, 0.35)), kf(1, d + 30, "hold")]
        pop_keys = [keyed(node, {SX: grow, SY: grow, ROT: [kf(-0.35, 0, "hold"), kf(-0.35, d, "elastic", (0.8, 0.4)), kf(0, d + 30, "hold")]}),
                    keyed(halo, {OP: [kf(0, 0, "hold"), kf(0, d + 6, "cubic"), kf(0.5, d + 24, "hold")]}),
                    keyed(twinkle, quiet)]
        for k, b in enumerate(burst):
            ang = math.pi / 4 + k * math.pi / 2
            dx, dy = round(math.cos(ang) * s * 0.72, 1), round(math.sin(ang) * s * 0.62, 1)
            out = (0, 0, 0.4, 1)
            pop_keys.append(keyed(b, {
                X: [kf(x, 0, "hold"), kf(x, d + 6, "cubic", out), kf(x + dx, d + 26)],
                Y: [kf(y, 0, "hold"), kf(y, d + 6, "cubic", out), kf(y + dy, d + 26)],
                SX: [kf(0.4, 0, "hold"), kf(0.4, d + 6, "cubic"), kf(1, d + 14, "cubic"), kf(0.3, d + 28)],
                SY: [kf(0.4, 0, "hold"), kf(0.4, d + 6, "cubic"), kf(1, d + 14, "cubic"), kf(0.3, d + 28)],
                OP: [kf(0, 0, "hold"), kf(0, d + 6, "linear"), kf(1, d + 9, "hold"), kf(1, d + 18, "linear"), kf(0, d + 28, "hold")]}))
        anims.append(anim(pop, f"Pop{i + 1}", d + 31, "oneShot", pop_keys))
        # Glow: the earned star breathes and its halo pulses, starting from the pose Pop lands on;
        # the stars land 14 frames apart, so they breathe out of step. A glint flicks at the top
        # point once a cycle.
        t = 20 + 35 * i
        peak = 60
        glint = [kf(0, 0, "hold"), kf(0, t, "cubic"), kf(1, t + 8, "cubic"), kf(0, t + 18, "hold"), kf(0, 120)]
        anims.append(anim(shine, f"Glow{i + 1}", 120, "loop", [
            keyed(node, {SX: wave(1, 1.05, 120, peak), SY: wave(1, 1.05, 120, peak), ROT: [kf(0, 0, "hold")]}),
            keyed(halo, {OP: wave(0.5, 0.95, 120, peak), SX: wave(1, 1.12, 120, peak), SY: wave(1, 1.12, 120, peak)}),
            keyed(twinkle, {OP: glint, SX: glint, SY: glint, ROT: [kf(0, 0, "hold"), kf(0, t, "linear"), kf(0.8, t + 18, "hold"), kf(0.8, 120)]}),
        ] + [keyed(b, quiet) for b in burst]))
        s_hide, s_pop, s_glow = nid(), nid(), nid()
        enough, short = (cond_number(vm_id, p["stars"], op, i + 1) for op in ("greaterThanOrEqual", "lessThan"))
        layers.append(layer(f"Star{i + 1}", s_hide, [
            (s_hide, hide, 160, to(s_pop, enough)),
            (s_pop, pop, 320, to(s_glow, after_full=True) + to(s_hide, short)),
            (s_glow, shine, 480, to(s_hide, short)),
        ]))
    smid = nid()
    sm = (smid, f'<StateMachine name="Motion" id="{smid}">{"".join(layers)}</StateMachine>')
    return artboard("Stars", 280, 120, 900, "".join(tops + body + slots), anims, [], sm=sm, vm=(vm_id, inst))


# ---------- WinConfetti: paper confetti bursts out above the win sheet, then keeps drifting down ----------
CONFETTI_COLORS = [YEL, RED, GREEN, CREAM]


def confetti_piece(x, y, k, sid):
    return shape(rect(10, 16, 3), fill(CONFETTI_COLORS[k % 4]) + stroke(INK, 2), x=x, y=y, name="Confetti", sid=sid)


def cyclic(f, cuts, per, shift, until):
    """Keyframes repeating one cycle of f(u), u in [0, per), shifted by `shift` frames, over [0, until].
    cuts: [(u, interp)] where the cycle's keyframes fall."""
    keys = {}
    for c in range(-1, until // per + 1):
        for u, interp in cuts:
            t = u + c * per + shift
            if 0 < t < until:
                keys[t] = kf(f(u), t, interp)
    u0 = (-shift) % per
    keys[0] = kf(f(u0), 0, max((c for c in cuts if c[0] <= u0), key=lambda c: c[0])[1])
    keys[until] = kf(f(u0), until)
    return [keys[t] for t in sorted(keys)]


def win_confetti():
    W, H, cx, cy = 400, 300, 200, 128
    burst_pieces, rain_pieces, burst_keys, rain_keys = [], [], [], []
    # Burst: twelve pieces fan out from behind the ribbon, arc up, then drift down and fade.
    B = 90
    for k in range(12):
        sid = nid()
        ang = math.pi + (k + 0.5) * math.pi / 12
        reach = 120 + 50 * ((k * 7) % 5) / 4
        tx, ty = round(cx + math.cos(ang) * reach * 1.25, 1), round(cy + math.sin(ang) * reach * 0.8, 1)
        burst_pieces.append(confetti_piece(cx, cy, k, sid))
        burst_keys.append(keyed(sid, {
            X: [kf(cx, 0, "cubic", (0, 0, 0.35, 1)), kf(tx, 40, "linear"), kf(tx + (8 if k % 2 else -8), B)],
            Y: [kf(cy, 0, "cubic", (0, 0, 0.4, 1)), kf(ty, 26, "cubic", (0.5, 0, 1, 1)), kf(ty + 40, 50, "linear"), kf(ty + 110, B)],
            ROT: [kf(0, 0, "linear"), kf((4 + k % 3) * (1 if k % 2 else -1), B)],
            SX: [kf(0.3, 0, "cubic", (0, 0, 0.4, 1)), kf(1, 10, "hold"), kf(1, B)],
            SY: [kf(0.3, 0, "cubic", (0, 0, 0.4, 1)), kf(1, 10, "hold"), kf(1, B)],
            OP: [kf(1, 0, "hold"), kf(1, 60, "linear"), kf(0, B)]}))
    # Rain: fourteen pieces falling in their own lanes at spread-out phases, so the sheet always has
    # a few drifting down; each fades out before the bottom edge and wraps while off screen. The
    # whole layer fades in under the burst so no piece pops in mid-air.
    D, rain = 240, nid()
    for k in range(14):
        sid = nid()
        x = round(18 + k * (W - 36) / 13 + (9 if k % 2 else -9), 1)
        y0, y1 = -24, H + 24
        per = D // (2 if k % 3 == 1 else 1)
        shift = round(((k * 0.618) % 1) * per)
        fade_from, fade_to = (round(per * (y - y0) / (y1 - y0)) for y in (H - 80, H - 16))

        def fall_y(u, per=per):
            return round(y0 + (y1 - y0) * min(u, per - 1) / (per - 1), 2)

        def fall_op(u, fade_from=fade_from, fade_to=fade_to):
            return 1 if u <= fade_from else 0 if u >= fade_to else round(1 - (u - fade_from) / (fade_to - fade_from), 3)
        rain_pieces.append(confetti_piece(x, y0, k + 1, sid))
        sway = 10 + (k % 3) * 4
        flutter = 30 + (k % 4) * 10
        flip = [kf(1, 0, "cubic")]
        for j in range(D // (2 * flutter)):
            flip += [kf(0.25, 2 * flutter * j + flutter, "cubic"), kf(1, 2 * flutter * (j + 1), "cubic")]
        if flip[-1] != kf(1, D, "cubic"):
            flip.append(kf(1, D))
        rain_keys.append(keyed(sid, {
            Y: cyclic(fall_y, [(0, "linear"), (per - 1, "hold")], per, shift, D),
            OP: cyclic(fall_op, [(0, "hold"), (fade_from, "linear"), (fade_to, "hold")], per, shift, D),
            SX: flip,
            X: wave(x - sway, x + sway, 80 if k % 2 else 120, (k * 17) % 60, D),
            ROT: [kf(0, 0, "linear"), kf(round(2 * math.pi * (1 + k % 2) * (1 if k % 3 else -1), 4), D)],
        }))
    body = "".join(burst_pieces) + f'<Node name="Rain" id="{rain}" opacity="0">{"".join(rain_pieces)}</Node>'
    burst, fall, rain_in = nid(), nid(), nid()
    anims = [anim(burst, "Burst", B, "oneShot", burst_keys), anim(fall, "Fall", D, "loop", rain_keys),
             anim(rain_in, "RainIn", 80, "oneShot", [keyed(rain, {OP: [kf(0, 0, "hold"), kf(0, 30, "cubic"), kf(1, 80)]})])]
    return artboard("WinConfetti", W, H, 2600, body, anims, [burst, fall, rain_in])


# ---------- Chest: `Chest.opened` false = wiggle and breathe; true = lid flips open, light bursts ----------
def chest():
    vm_id, inst, p = view_model("Chest", [("Boolean", "opened", "false")])
    root, lid, light = nid(), nid(), nid()
    chest_body = (shape(rect(14, 18, 3), fill(YEL) + stroke(), y=-2, name="Clasp")
                  + shape(rect(2, 30), fill(BAMBOO_D), x=-20, y=12, name="Strap")
                  + shape(rect(2, 30), fill(BAMBOO_D), x=20, y=12, name="Strap")
                  + shape(rect(72, 40, 6), fill(BAMBOO) + stroke(INK, 2.5), y=12, name="Box"))
    lid_node = f'<Node x="-36" y="-8" name="LidHinge" id="{lid}">{shape(rect(76, 18, 9), fill("FFB98B5A") + stroke(INK, 2.5), x=36, y=-9, name="Lid")}</Node>'
    glow = shape(ellipse(110, 70), fill("55F5B841"), y=-6, name="Light", sid=light)
    body = f'<Node x="60" y="70" name="Chest" id="{root}">{lid_node}{chest_body}{glow}</Node>'
    idle, opening = nid(), nid()
    wig = [kf(0, 0, "hold"), kf(0, 60, "cubic"), kf(0.09, 66, "cubic"), kf(-0.09, 74, "cubic"), kf(0.07, 82, "cubic"),
           kf(-0.05, 90, "cubic"), kf(0, 98, "hold"), kf(0, 150)]
    anims = [
        anim(idle, "Idle", 150, "loop", [
            keyed(root, {ROT: wig}),
            keyed(lid, {ROT: [kf(0, 0, "hold"), kf(0, 96, "cubic"), kf(-0.15, 104, "cubic"), kf(0, 130, "hold"), kf(0, 150)]}),
            keyed(light, {OP: [kf(0.3, 0, "cubic"), kf(0.8, 75, "cubic"), kf(0.3, 150)],
                          SX: [kf(1, 0, "hold"), kf(1, 150)], SY: [kf(1, 0, "hold"), kf(1, 150)]})]),
        anim(opening, "Open", 40, "oneShot", [
            keyed(root, {ROT: [kf(0, 0, "hold"), kf(0, 40)]}),
            keyed(lid, {ROT: [kf(0, 0, "elastic", (0.7, 0.45)), kf(-1.15, 30, "hold"), kf(-1.15, 40)]}),
            keyed(light, {OP: [kf(0.3, 0, "cubic", (0, 0, 0.58, 1)), kf(1, 16, "hold"), kf(1, 40)],
                          SX: [kf(1, 0, "elastic", (0.6, 0.5)), kf(1.25, 24, "hold"), kf(1.25, 40)],
                          SY: [kf(1, 0, "elastic", (0.6, 0.5)), kf(1.25, 24, "hold"), kf(1.25, 40)]})]),
    ]
    s_idle, s_open = nid(), nid()
    smid = nid()
    sm = (smid, f'<StateMachine name="Motion" id="{smid}">' + layer("Main", s_idle, [
        (s_idle, idle, 160, to(s_open, cond_bool(vm_id, p["opened"], True), ms=80)),
        (s_open, opening, 320, to(s_idle, cond_bool(vm_id, p["opened"], False), ms=120)),
    ]) + '</StateMachine>')
    return artboard("Chest", 120, 110, 1200, body, anims, [], sm=sm, vm=(vm_id, inst))


# ---------- ClearBurst: one-shot flash, ring and sparks over the three cleared tray slots ----------
def clear_burst():
    import math
    ring, flash = nid(), nid()
    sparks, keys = [], []
    cx, cy = 80, 55
    for k in range(10):
        sid = nid()
        ang = k * math.pi / 5 + 0.3
        dx, dy = round(math.cos(ang) * 70, 1), round(math.sin(ang) * 40, 1)
        sparks.append(shape(star(12 if k % 2 else 16, 0.45), fill(YEL if k % 3 else RED) + stroke(INK, 1.5),
                            x=cx, y=cy, name="Spark", sid=sid, extra=' opacity="0"'))
        keys.append(keyed(sid, {X: [kf(cx, 0, "cubic", (0, 0, 0.4, 1)), kf(cx + dx, 34)],
                                Y: [kf(cy, 0, "cubic", (0, 0, 0.4, 1)), kf(cy + dy, 34)],
                                ROT: [kf(0, 0, "linear"), kf(2.5, 34)],
                                OP: [kf(1, 0, "hold"), kf(1, 18, "linear"), kf(0, 34)]}))
    body = ("".join(sparks) + shape(ellipse(60, 60), stroke(YEL, 4), x=cx, y=cy, name="Ring", sid=ring, extra=' opacity="0"')
            + shape(ellipse(70, 46), fill("99FFF4E0"), x=cx, y=cy, name="Flash", sid=flash, extra=' opacity="0"'))
    keys += [keyed(ring, {SX: [kf(0.3, 0, "cubic", (0, 0, 0.4, 1)), kf(2.2, 26)], SY: [kf(0.3, 0, "cubic", (0, 0, 0.4, 1)), kf(1.6, 26)],
                          OP: [kf(1, 0, "linear"), kf(0, 26)]}),
             keyed(flash, {OP: [kf(0, 0, "linear"), kf(1, 4, "linear"), kf(0, 16)]})]
    aid = nid()
    return artboard("ClearBurst", 160, 110, 1600, body, [anim(aid, "Burst", 40, "oneShot", keys)], [aid])


# ---------- BasketFull: the basket drops in full of district 1 items, one pops over the rim; then it fidgets ----------
# The basket art comes in two layers cut from one image: the whole
# basket, drawn behind the items, and its front rim alone, drawn over them so they sit inside.
BASKET, BASKET_FRONT = "assets/ui/basket.png", "assets/ui/basket-front.png"
BASKET_W, BASKET_BOTTOM = 150, 67  # basket width and its bottom edge below the centre, in points
# (art, size, x, y, rotation) of each item, relative to the basket centre; the first draws on top.
BASKET_ITEMS = [("assets/items/xe-banh-mi/tuong-ot.png", 44, 8, -14, 0.55),
                ("assets/items/xe-banh-mi/banh-mi.png", 54, -24, -2, -0.25),
                ("assets/items/xe-banh-mi/trung-op-la.png", 46, 25, -2, 0.2)]


def basket_body(rest_y):
    """The basket at rest on y = rest_y, as it stands once it has landed. Returns (xml, ids)."""
    root, squash = nid(), nid()
    items = [nid() for _ in BASKET_ITEMS]
    inner = image(BASKET_FRONT, BASKET_W, name="FrontRim")
    for sid, (art, size, x, y, rot) in zip(items, BASKET_ITEMS):
        inner += f'<Node x="{x}" y="{y}" rotation="{rot}" name="Item" id="{sid}">{image(art, size)}</Node>'
    inner += image(BASKET, BASKET_W, name="Basket")
    xml = (f'<Node x="90" y="{rest_y}" name="BasketRoot" id="{root}"><Node y="{BASKET_BOTTOM}" name="Squash" id="{squash}">'
           f'<Node y="{-BASKET_BOTTOM}" name="Content">{inner}</Node></Node></Node>')
    return xml, root, squash, items


def basket_full():
    rest = 90
    xml, root, squash, items = basket_body(rest)
    land = 14
    enter = [keyed(root, {Y: [kf(rest - 30, 0, "cubic", (0.5, 0, 1, 1)), kf(rest, land, "hold"), kf(rest, 60)],
                          OP: [kf(0, 0, "linear"), kf(1, 8, "hold"), kf(1, 60)]}),
             keyed(squash, {SY: [kf(1, 0, "hold"), kf(1, land, "cubic"), kf(0.84, land + 4, "cubic"), kf(1.06, land + 12, "cubic"), kf(1, land + 20, "hold"), kf(1, 60)],
                            SX: [kf(1, 0, "hold"), kf(1, land, "cubic"), kf(1.1, land + 4, "cubic"), kf(0.97, land + 12, "cubic"), kf(1, land + 20, "hold"), kf(1, 60)],
                            ROT: [kf(0, 0, "hold"), kf(0, 60)]})]
    (_, _, tx, ty, trot) = BASKET_ITEMS[0]
    enter.append(keyed(items[0], {
        X: [kf(2, 0, "hold"), kf(2, land, "cubic", (0, 0, 0.4, 1)), kf(tx + 4, land + 16, "cubic"), kf(tx, land + 30, "hold"), kf(tx, 60)],
        Y: [kf(ty, 0, "hold"), kf(ty, land, "cubic", (0, 0, 0.4, 1)), kf(ty - 40, land + 14, "cubic", (0.6, 0, 1, 1)), kf(ty, land + 28, "cubic"),
            kf(ty - 4, land + 34, "cubic"), kf(ty, land + 40, "hold"), kf(ty, 60)],
        ROT: [kf(0.1, 0, "hold"), kf(0.1, land, "cubic"), kf(1.3, land + 16, "elastic", (0.6, 0.4)), kf(trot, land + 30, "hold"), kf(trot, 60)]}))
    for k, sid in enumerate(items[1:], 1):
        _, _, x, y, rot = BASKET_ITEMS[k]
        d = land + 2 * k
        enter.append(keyed(sid, {Y: [kf(y, 0, "hold"), kf(y, d, "cubic", (0, 0, 0.4, 1)), kf(y - 12, d + 8, "cubic"), kf(y, d + 16, "cubic"),
                                     kf(y - 4, d + 22, "cubic"), kf(y, d + 28, "hold"), kf(y, 60)]}))
    # Idle: every loop the basket gives a little shake on its base, the items bob out of step and
    # the sauce bottle teeters on top.
    L = 150
    idle = [keyed(squash, {ROT: [kf(0, 0, "cubic"), kf(0.06, 6, "cubic"), kf(-0.06, 12, "cubic"), kf(0.04, 18, "cubic"), kf(-0.02, 24, "cubic"),
                                 kf(0, 30, "hold"), kf(0, L)]}),
            keyed(items[0], {ROT: wave(trot - 0.12, trot + 0.12, 75, 75 // 4, L), Y: wave(ty - 3, ty, 50, 0, L)})]
    for k, sid in enumerate(items[1:], 1):
        y = BASKET_ITEMS[k][3]
        idle.append(keyed(sid, {Y: wave(y - 3, y, 75 if k == 1 else 50, 0, L)}))
    once, loop = nid(), nid()
    smid = nid()
    return artboard("BasketFull", 180, 160, 1800, xml, [anim(once, "Enter", 60, "oneShot", enter), anim(loop, "Idle", L, "loop", idle)], [],
                    sm=once_then_loop(smid, once, loop))


def basket_full_still():
    """BasketFull's landed pose without motion, for reduce motion."""
    xml, root, _, _ = basket_body(90)
    aid = nid()
    return artboard("BasketFullStill", 180, 160, 3100, xml, [anim(aid, "Still", 1, "oneShot", [keyed(root, {Y: [kf(90, 0, "hold")]})])], [aid])


# ---------- BadgeUnlock: hex badge drops in with a shine sweep and confetti, then bobs ----------
def badge_unlock():
    import math
    root, shine = nid(), nid()
    confetti, ckeys = [], []
    colors = [RED, YEL, GREEN, "FFF7D6E0"]
    for k in range(12):
        sid = nid()
        ang = -math.pi / 2 + (k - 5.5) * 0.28
        dx, dy = round(math.cos(ang) * 90, 1), round(math.sin(ang) * 80, 1)
        confetti.append(shape(rect(6, 12, 1.5), fill(colors[k % 4]), x=80, y=80, name="Confetti", sid=sid, extra=' opacity="0"'))
        ckeys.append(keyed(sid, {X: [kf(80, 0, "hold"), kf(80, 14, "cubic", (0, 0, 0.4, 1)), kf(80 + dx, 50)],
                                 Y: [kf(80, 0, "hold"), kf(80, 14, "cubic", (0, 0, 0.4, 1)), kf(80 + dy, 40, "cubic", (0.4, 0, 1, 1)), kf(80 + dy + 40, 70)],
                                 ROT: [kf(0, 14, "linear"), kf(4 + k % 3, 70)],
                                 OP: [kf(0, 0, "hold"), kf(1, 14, "hold"), kf(1, 52, "linear"), kf(0, 70)]}))
    badge = (shape(rect(8, 92, 2), fill("66FFFFFF"), x=-60, y=0, name="Shine", sid=shine, extra=' rotation="0.4"')
             + shape(star(40, 0.45), fill(YEL) + stroke(INK, 2.5), name="Emblem")
             + f'<Shape name="Hex"><Polygon width="96" height="104" points="6" cornerRadius="6" name="P"/>{fill("FFFBE3B0")}{stroke(INK, 3)}</Shape>'
             + shape(ellipse(130, 130), fill("40F5B841"), name="Halo"))
    body = "".join(confetti) + f'<Node x="80" y="80" name="Badge" id="{root}" scaleX="0" scaleY="0">{badge}</Node>'
    once, bob = nid(), nid()
    grow = [kf(0, 0, "elastic", (1, 0.4)), kf(1, 30, "hold"), kf(1, 80)]
    anims = [anim(once, "Unlock", 80, "oneShot", [
                 keyed(root, {SX: grow, SY: grow, ROT: [kf(-0.5, 0, "elastic", (0.8, 0.4)), kf(0, 30, "hold"), kf(0, 80)]}),
                 keyed(shine, {X: [kf(-36, 0, "hold"), kf(-36, 34, "cubic"), kf(36, 54, "hold"), kf(36, 80)]})] + ckeys),
             anim(bob, "Bob", 120, "loop", [keyed(root, {Y: [kf(80, 0, "cubic"), kf(74, 60, "cubic"), kf(80, 120)],
                                                         SX: [kf(1, 0, "hold"), kf(1, 120)], SY: [kf(1, 0, "hold"), kf(1, 120)]})])]
    smid = nid()
    return artboard("BadgeUnlock", 160, 160, 2000, body, anims, [], sm=once_then_loop(smid, once, bob))


# ---------- StreakFlame: a small flame flickering, for the daily streak ----------
def streak_flame():
    outer, inner = nid(), nid()
    flame = lambda w, h, c, sid, y: (f'<Node y="{y}" name="FlameNode" id="{sid}">'
                                     + shape(f'<Triangle width="{w * 0.78}" height="{h * 0.75}" name="P"/>', fill(c), y=-h * 0.32, name="Tip")
                                     + shape(ellipse(w, w), fill(c), y=0, name="Base") + '</Node>')
    body = (flame(16, 26, YEL, inner, 4) + flame(30, 46, RED, outer, 0))
    body = f'<Node x="30" y="38" name="Flame">{body}</Node>'
    flick = lambda a, b, n: [kf(a, 0, "cubic"), kf(b, n // 3, "cubic"), kf(a * 0.98, 2 * n // 3, "cubic"), kf(a, n)]
    keys = [keyed(outer, {SY: flick(1, 1.12, 48), SX: flick(1, 0.92, 48), ROT: [kf(0, 0, "cubic"), kf(0.06, 24, "cubic"), kf(0, 48)]}),
            keyed(inner, {SY: flick(1, 1.2, 36) + [], SX: flick(1, 0.86, 36), ROT: [kf(0, 0, "cubic"), kf(-0.08, 18, "cubic"), kf(0, 36)]})]
    a1, a2 = nid(), nid()
    return artboard("StreakFlame", 60, 64, 2200, body,
                    [anim(a1, "Outer", 48, "loop", keys[:1]), anim(a2, "Inner", 36, "loop", keys[1:])], [a1, a2])


# ---------- BoosterGain: `BoosterGain.kind` 0 undo / 1 shuffle / 2 hint; the icon pops up and floats away ----------
def booster_gain():
    vm_id, inst, p = view_model("BoosterGain", [("Number", "kind", 2)])
    icon_paths = [
        '<PointsPath isClosed="false" name="P"><StraightVertex x="-6" y="-10"/><StraightVertex x="-12" y="-4"/><StraightVertex x="-6" y="2"/></PointsPath>'
        '<PointsPath isClosed="false" name="P2"><StraightVertex x="-12" y="-4"/><StraightVertex x="4" y="-4"/><StraightVertex x="10" y="2"/><StraightVertex x="10" y="6"/><StraightVertex x="4" y="11"/><StraightVertex x="-2" y="11"/></PointsPath>',
        '<PointsPath isClosed="false" name="P"><StraightVertex x="-11" y="9"/><StraightVertex x="10" y="-10"/></PointsPath>'
        '<PointsPath isClosed="false" name="P2"><StraightVertex x="3" y="-10"/><StraightVertex x="10" y="-10"/><StraightVertex x="10" y="-3"/></PointsPath>'
        '<PointsPath isClosed="false" name="P3"><StraightVertex x="-11" y="-10"/><StraightVertex x="10" y="9"/></PointsPath>'
        '<PointsPath isClosed="false" name="P4"><StraightVertex x="3" y="9"/><StraightVertex x="10" y="9"/><StraightVertex x="10" y="2"/></PointsPath>',
        '<Ellipse width="16" height="16" y="-4" name="Bulb"/>'
        '<PointsPath isClosed="false" name="P2"><StraightVertex x="-4" y="6"/><StraightVertex x="4" y="6"/></PointsPath>'
        '<PointsPath isClosed="false" name="P3"><StraightVertex x="-3" y="10"/><StraightVertex x="3" y="10"/></PointsPath>',
    ]
    nodes, ids = [], []
    for i, path in enumerate(icon_paths):
        nid_i = nid()
        ids.append(nid_i)
        glyph = f'<Shape name="Glyph">{path}{stroke(INK, 3)}</Shape>'
        disc = shape(ellipse(52, 52), fill(CREAM) + stroke(INK, 2.5), name="Disc")
        badge = shape(ellipse(24, 24), fill(GREEN) + stroke(INK, 2), x=20, y=-20, name="Plus")
        plus = (shape(rect(10, 2.5, 1), fill("FFFFFFFF"), x=20, y=-20, name="H") + shape(rect(2.5, 10, 1), fill("FFFFFFFF"), x=20, y=-20, name="V"))
        nodes.append(f'<Node x="60" y="80" name="Icon{i}" id="{nid_i}" opacity="0">{plus}{badge}{glyph}{disc}</Node>')
    body = "".join(nodes)
    anims, states = [], []
    rest = nid()
    anims.append(anim(rest, "Rest", 1, "oneShot", [keyed(n, {OP: [kf(0, 0, "hold")]}) for n in ids]))
    s_rest = nid()
    trans = ""
    for i, n in enumerate(ids):
        aid, sid = nid(), nid()
        others = [keyed(o, {OP: [kf(0, 0, "hold")]}) for o in ids if o != n]
        anims.append(anim(aid, f"Gain{i}", 70, "oneShot", others + [keyed(n, {
            OP: [kf(0, 0, "linear"), kf(1, 6, "hold"), kf(1, 50, "linear"), kf(0, 70)],
            Y: [kf(80, 0, "elastic", (0.6, 0.5)), kf(56, 24, "cubic", (0.4, 0, 1, 1)), kf(30, 70)],
            SX: [kf(0.4, 0, "elastic", (0.8, 0.4)), kf(1, 24, "hold"), kf(1, 70)],
            SY: [kf(0.4, 0, "elastic", (0.8, 0.4)), kf(1, 24, "hold"), kf(1, 70)]})]))
        states.append((sid, aid, 320 + 160 * i, to(s_rest, after_full=True)))
        trans += to(sid, cond_number(vm_id, p["kind"], "equal", i))
    smid = nid()
    sm = (smid, f'<StateMachine name="Motion" id="{smid}">' + layer("Main", s_rest, [(s_rest, rest, 160, "")] + states).replace(
        f'animationId="{rest}" id="{s_rest}"></AnimationState>', f'animationId="{rest}" id="{s_rest}">{trans}</AnimationState>') + '</StateMachine>')
    return artboard("BoosterGain", 120, 110, 2400, body, anims, [], sm=sm, vm=(vm_id, inst))


# ---------- TapHint: two rings ripple outward around the spotlight ----------
def tap_hint():
    r1, r2, dot = nid(), nid(), nid()
    ring = lambda sid: shape(ellipse(80, 80), stroke(YEL, 3), x=60, y=60, name="Ring", sid=sid)
    body = shape(ellipse(16, 16), fill(YEL) + stroke(INK, 2), x=60, y=60, name="Dot", sid=dot) + ring(r1) + ring(r2)

    def ripple(off):
        return {SX: [kf(0.6, 0, "hold"), kf(0.6, off, "cubic", (0, 0, 0.58, 1)), kf(1.4, off + 60, "hold"), kf(1.4, 120)],
                SY: [kf(0.6, 0, "hold"), kf(0.6, off, "cubic", (0, 0, 0.58, 1)), kf(1.4, off + 60, "hold"), kf(1.4, 120)],
                OP: [kf(0, 0, "hold"), kf(1, off, "linear"), kf(0, off + 60, "hold"), kf(0, 120)]}
    keys = [keyed(r1, ripple(0)), keyed(r2, ripple(40)),
            keyed(dot, {SX: [kf(1, 0, "cubic"), kf(1.25, 60, "cubic"), kf(1, 120)], SY: [kf(1, 0, "cubic"), kf(1.25, 60, "cubic"), kf(1, 120)]})]
    aid = nid()
    return artboard("TapHint", 120, 120, 1400, body, [anim(aid, "Ripple", 120, "loop", keys)], [aid])


boards = [lanterns("Lanterns", None, 0), triple_pop(), stars(), chest(), tap_hint(), clear_burst(), basket_full(),
          badge_unlock(), streak_flame(), booster_gain(), win_confetti(), basket_full_still()]
only = os.environ.get("RIVE_ONLY")
doc = '<Rive version="1" kind="fragment">' + "".join(boards) + "".join(ROOTS) + '</Rive>\n'
open(sys.argv[1], "w").write(doc)
print("written", sys.argv[1])
