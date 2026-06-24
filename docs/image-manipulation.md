---
title: "Vance — Image Manipulation Tools"
parent: Documentation
permalink: /docs/image-manipulation
---

<!-- AUTO-GENERATED from specification/public/en/image-manipulation.md — do not edit here. -->

---
# Vance — Image Manipulation Tools

> Pure-Java image processing on existing Document assets. Complements [Fenchurch](/docs/fenchurch-service): where Fenchurch creates a **new** image, these tools manipulate an **existing** one. Implemented as `ImageManipulationService` + tool-set in `vance-brain`, parallel to Fenchurch's structure, but without an LLM/provider layer — all processing runs locally in the Pod using the [Scrimage](https://sksamuel.github.io/scrimage/)-Library.
>
> Seven tools are in the default tool inventory of every Engine: `image_crop`, `image_resize`, `image_rotate`, `image_flip`, `image_adjust`, `image_filter`, `image_auto_enhance`. The write target is always a Document path — overwriting automatically triggers Document versioning, so each manipulation leaves a recoverable previous version.
>
> See also: [fenchurch-service](/docs/fenchurch-service) | [document-versioning](/docs/document-versioning) | [settings-system](/docs/settings-system) | [user-progress-channel](/docs/user-progress-channel)

---

## 1. Purpose & Scope

**Problem.** Fenchurch delivers fresh images. Once they are in the Document Store, Vance needs an equally clean path to **edit** them — deterministically, quickly, without external API calls, and without the LLM having to write Python code or use an external tool. Typical cases:

- Chat user: "Crop the image to the top-left quadrant", "Make it black and white", "Enlarge it to 1920×1080".
- Magrathea workflows: Normalize image assets (generate thumbnails, uniform aspect ratio) before they go into the final document.
- Document pipelines: Auto-enhance scanned photos, rotate by EXIF hint, filter pass for style consistency.

Image manipulation, just like image generation, is **a single-shot process** without multi-turn reasoning. A Worker Engine would be overkill. The pattern exactly follows Fenchurch's architecture: a Spring `@Service` called by a Tool class, sync, blocking, with heartbeats via [PROCESS_PROGRESS](/docs/user-progress-channel) for longer operations.

**Solution.** Three building blocks:

- `ImageManipulationService` — the single entry point. One method per tool. Handles Load → Op → Write including quota-light (counter), limit check, format inference, heartbeats.
- `ImageManipulationTools` — seven Tool classes, each a thin wrapper around a service method (same style as `ImageGenerateTool`).
- Manuals (to follow after implementation) — explain to the LLM *when* which tool applies and *which* parameters are useful.

**What it is not:**

- **Not a new image generator.** If nothing exists, the LLM calls `image_generate` (Fenchurch). These tools require a Document path as input.
- **No WebP/HEIC support.** Pure Java via `javax.imageio` — PNG, JPEG, GIF, BMP. WebP would mean `scrimage-webp` with libwebp-JNI; this is **explicitly excluded** on Day 1 because it binds the Pod image to glibc and does not justify the build complexity. WebP input will be rejected with a clear `format_unsupported` error.
- **No AI enhancement / upscaling / restoration.** Auto-enhance is classic (histogram stretch + gamma + saturation), not ML. If true AI upscaling is desired later, it will come as a separate tool (`image_enhance_ai`) with a provider call — separate cost class, separate quota.
- **No inpainting / outpainting / variation.** This conceptually belongs to Fenchurch (see §1 there — reserved as an extension path).
- **No batch tool.** Multiple manipulations in one call → multiple tool calls. Marvin / Magrathea parallelize via Lanes, not via collective APIs.
- **No format conversion as a separate tool.** Output format follows input. To convert JPEG → PNG, generate it anew (Fenchurch) or copy via `document_copy`.
- **No watermark / annotation v1.** Easily retrofittable with Scrimage; still not in the v1 inventory.

---

## 2. Architecture

```
┌─ Engine (Arthur / Eddie / Marvin-Worker / …) ─────────────────────┐
│                                                                   │
│  Tool-Call image_crop({path, x, y, width, height})                │
│       │                                                           │
│       ▼                                                           │
│  ImageCropTool ─── delegate ───┐                                  │
│                                 │                                 │
└─────────────────────────────────┼─────────────────────────────────┘
                                  ▼
┌─ ImageManipulationService (per Pod) ──────────────────────────────┐
│                                                                   │
│  1. validate request (path exists, params well-formed)            │
│  2. resolve source DocumentDocument via DocumentService           │
│  3. ensure mimeType ∈ {png, jpeg, gif, bmp}                       │
│  4. read bytes (StorageService.read), enforce maxInputBytes       │
│  5. ImmutableImage.loader().fromBytes(bytes)                      │
│  6. ProgressEmitter.emitStatus(WAITING, "Cropping image …")       │
│  7. start heartbeat scheduler (every 2 s)                         │
│  8. apply operation (Scrimage call)                               │
│  9. enforce maxOutputDimension                                    │
│ 10. encode to outputFormat (= inputFormat)                        │
│ 11. write via DocumentService.createOrReplaceBinary               │
│       → triggers document-versioning archive-on-write             │
│ 12. cancel heartbeat                                              │
│ 13. record metric vance.image.tools.calls{tool, outcome}          │
│ 14. return ToolResult { path, mimeType, width, height, sizeBytes }│
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                  DocumentDocument(path, mime, dimensions)
                                  │
                                  ▼
          Web-/Foot-/Mobile-UI immediately sees the new version,
          previous version is in document_archives.
```

Pure Java, no provider layer. There is no `ImageManipulationProvider` because there is no provider choice — Scrimage is the only implementation. If the feature ever needs more filters, they will be added as methods to the service, not as a new provider.

---

## 3. Library & Dependencies

Exactly two artifacts in `vance-brain/pom.xml`:

```xml
<dependency>
    <groupId>com.sksamuel.scrimage</groupId>
    <artifactId>scrimage-core</artifactId>
    <version>4.x.x</version>
</dependency>
<dependency>
    <groupId>com.sksamuel.scrimage</groupId>
    <artifactId>scrimage-filters</artifactId>
    <version>4.x.x</version>
</dependency>
```

**Explicitly excluded:**

- `scrimage-webp` — brings libwebp as a JNI binary. No need for v1, would bind Pod build image to glibc.
- `scrimage-formats-extra` — brings additional readers we don't need.
- `scrimage-scala_*` — Scala module; we are Pure-Java.

Reason in one sentence: **Pod images remain glibc-free and native-lib-free**. If WebP ever becomes a need, it will be a conscious step with discussion about the base image, not a drive-by.

Scrimage-`core` since Major Version 4 is pure Java, no Scala runtime in the classpath. The `ImmutableImage` API fits the Vance pattern *load → transform → write* — each operation returns a new `ImmutableImage`, no hidden mutation on a shared `BufferedImage` instance.

---

## 4. Tool API

All seven tools are in the default tool inventory, without a Recipe whitelist.

Common fields that every tool has:

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `path` | string | ✓ | Source Document path. Must exist, MIME must be ∈ {png, jpeg, gif, bmp}. |
| `targetPath` | string | ✗ | If set and `≠ path`: result is written as a **new** Document under `targetPath` (no archive of the source). If `null` or `== path`: source is overwritten, Document versioning archives the old version. |

Success response for **every** tool (uniform):

```json
{
  "path": "images/cat.png",
  "mimeType": "image/png",
  "width": 800,
  "height": 600,
  "sizeBytes": 412104,
  "durationMs": 184
}
```

Error response (typed map, no throw — same style as Fenchurch):

```json
{
  "error": "format_unsupported|parameter_invalid|not_an_image|source_not_found|limit_exceeded|target_blocked|processing_error",
  "message": "User-readable explanation",
  "retryable": false
}
```

`retryable` is fixed per `error` value. `processing_error` is the only one with `retryable: true` (transient IO/decoder glitches).

### 4.1 `image_crop`

Crops a rectangular area. Coordinates in pixels, origin top-left.

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `x` | int | ✓ | Left edge, `0 ≤ x < imageWidth`. |
| `y` | int | ✓ | Top edge, `0 ≤ y < imageHeight`. |
| `width` | int | ✓ | `> 0`, `x + width ≤ imageWidth`. |
| `height` | int | ✓ | `> 0`, `y + height ≤ imageHeight`. |

Implementation: `image.subimage(x, y, width, height)`.

### 4.2 `image_resize`

Changes dimensions. Five modes.

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `mode` | enum | ✗ | `exact` (Default) / `width` / `height` / `cover` / `contain`. |
| `width` | int | conditional | Required for `exact`, `width`, `cover`, `contain`. |
| `height` | int | conditional | Required for `exact`, `height`, `cover`, `contain`. |
| `background` | string | ✗ | Only for `contain`: Hex color for padding, e.g., `#ffffff`. Default `#00000000` (transparent for PNG, black for JPEG). |

Mode behavior:

- `exact` — `image.scaleTo(w, h)`. Distorts if aspect ratio doesn't match.
- `width` — Scales to `width`, height proportional. `image.scaleToWidth(w)`.
- `height` — Scales to `height`, width proportional. `image.scaleToHeight(h)`.
- `cover` — Fills the box, crops overflow. `image.cover(w, h)`.
- `contain` — Fits into the box, pads with `background`. `image.fit(w, h, Color)`.

Both output dimensions are checked against `image.tools.max_dimension` (Default 8192).

### 4.3 `image_rotate`

Rotation by any angle.

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `degrees` | number | ✓ | Rotation angle clockwise. Allowed: any value; for `90`/`180`/`270` the service uses `image.rotateLeft()`/`.rotateRight()`/`.flip()` combinations (lossless), for other angles `image.rotate(Radians.fromDegrees(d), background)`. |
| `background` | string | ✗ | Background color for the area created by rotation. Default `#00000000` (transparent for PNG, white for JPEG). |

### 4.4 `image_flip`

Mirroring.

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `axis` | enum | ✓ | `horizontal` (left↔right) / `vertical` (top↔bottom). |

Implementation: `image.flipX()` / `image.flipY()`.

### 4.5 `image_adjust`

Combined tone/color adjustment. Only explicitly set fields are applied; unset fields leave the channel unchanged.

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `brightness` | number | ✗ | `-1.0 … +1.0`. `0` = neutral. `+0.2` ≈ significantly brighter. |
| `contrast` | number | ✗ | `-1.0 … +1.0`. `0` = neutral. |
| `saturation` | number | ✗ | `-1.0 … +1.0`. `-1.0` = grayscale, `0` = neutral, `+1.0` = very highly saturated. |
| `gamma` | number | ✗ | `0.1 … 5.0`. `1.0` = neutral. Values `< 1.0` brighter (higher lights), `> 1.0` darker. |

At least **one** field must be set, otherwise `parameter_invalid`.

The order of application is fixed: `gamma → brightness → contrast → saturation`. Documented so the LLM knows what happens when it sets multiple values simultaneously.

### 4.6 `image_filter`

Dispatcher for effect filters with their own parameter set per filter.

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `filter` | enum | ✓ | Name from the table listed below. |
| `params` | object | ✗ | Filter-specific parameters. If not specified: sensible defaults. |

Available filters v1:

| `filter` | Params | Default Params | Scrimage Class |
|----------|--------|----------------|----------------|
| `blur_gaussian` | `radius` (1–50) | `radius=5` | `GaussianBlurFilter` |
| `sharpen` | — | — | `SharpenFilter` |
| `grayscale` | — | — | `GrayscaleFilter` |
| `sepia` | — | — | `SepiaFilter` |
| `invert` | — | — | `InvertFilter` |
| `edge` | — | — | `EdgeFilter` |
| `emboss` | — | — | `EmbossFilter` |
| `posterize` | `levels` (2–8) | `levels=4` | `PosterizeFilter` |
| `solarize` | — | — | `SolarizeFilter` |
| `threshold` | `threshold` (0–255) | `threshold=128` | `ThresholdFilter` |

This is intentionally a dispatcher instead of ten tools: scaling via the Manual, which provides the table, rather than via the tool list — otherwise, we destroy LLM context efficiency. New filters are added here without creating new Tool classes.

**Day-1 scope limitations on the filter set:** no `blur_box` (Scrimage 4.3.0 has `BoxBlurFilter` only in the `thirdparty/jhlabs/` namespace, not in the maintained `com.sksamuel.scrimage.filter` surface — we are not bringing it in through the JHLabs door); no `intensity` parameter for `sepia` (Scrimage's `SepiaFilter()` is parameter-free). Both gaps are v2 material if a user requests them.

### 4.7 `image_auto_enhance`

The magic wand. No parameters except source/target.

Implementation — see §5.

---

## 5. Auto-Enhance Algorithm

Classic auto-levels chain, deterministic, without external calls. Sequence of steps:

1. **Build histogram** for all three RGB channels separately, 256 bins.
2. **Percentile clip** — for each channel, find the lower and upper `0.5 %` pixel volume. These values are `low`/`high`.
3. **Linear stretch** per channel: `out = clamp((in - low) * 255 / (high - low), 0, 255)`. If `high - low < 8` (extremely flat channel, e.g., monochrome background): skip for this channel, otherwise posterization artifacts may occur.
4. **Gamma correction** `0.95` — slightly brighter in the midtones, compensates for perception after the stretch.
5. **Saturation +10 %** via HSB conversion. Limited to `1.0`.

Implementation: not Scrimage-Composite (Scrimage has **no** auto-levels), but histogram code on `BufferedImage` (via `ImmutableImage.awt()`) + `image.filter(new BrightnessFilter(...))` etc. for the sub-steps.

This chain is intentionally conservative — it improves dull images, largely leaving good images alone. More aggressive pipelines (auto-WB, auto-exposure) are v2 material.

**Settings** (Cascade `tenant → project`, read per call):

| Setting | Default | Meaning |
|---------|---------|---------|
| `image.tools.auto_enhance.percentile_clip` | `0.005` | Percentile value for lows/highs. `0.0` = exact min/max (risky for spikes), `0.02` = aggressive. |
| `image.tools.auto_enhance.gamma` | `0.95` | Gamma factor after stretch. `1.0` effectively disables. |
| `image.tools.auto_enhance.saturation_boost` | `0.10` | Saturation boost. `0.0` disables. |

A Tenant setting `… = 0.0` is just as valid as an override pipeline with more aggressive values.

---

## 6. Format & Output

**Output format follows input format.** A `cat.png` remains PNG, a `photo.jpeg` remains JPEG. Reason: no tool should change the MIME as a side effect (Document renderer, RAG index, RSS sniffer, etc. depend on the MIME).

JPEG quality: fixed `0.92` (Scrimage `JpegWriter().withCompression(92)`). Configurable v2.

PNG encoding: PNG with alpha preservation. Scrimage `PngWriter` default.

GIF/BMP: read+write roundtrip, no optimization; rarely relevant in practice.

**If the input has an unsupported MIME** (e.g., `image/webp`, `image/heic`, `application/pdf`): `format_unsupported` error, no conversion attempt. If the Document path is not an image at all (plaintext, JSON, …): `not_an_image`.

---

## 7. Limits & Protection

All limits are hard reject boundaries, no auto-downscales.

| Limit | Default | Setting Key |
|-------|---------|-------------|
| Max Input Bytes | 20 MB | `image.tools.max_input_bytes` |
| Max Input Dimension (width or height) | 8192 px | `image.tools.max_input_dimension` |
| Max Output Dimension (width or height) | 8192 px | `image.tools.max_output_dimension` |
| Max Output Bytes | 30 MB | `image.tools.max_output_bytes` |

Cascade: `tenant → project`. Project setting may be stricter than Tenant, but not looser (`SettingService` validation on write).

Exceeding a limit → `limit_exceeded` error with the specific limit in the `message`.

Background: a single 30000×30000 PNG can consume several GB as an uncompressed pixel buffer and kill the Pod heap. The limits are not for user harassment but for Pod stability.

---

## 8. Error Handling

Error classes are fixed and typed in the Tool response (see §4):

| `error` | retryable | Trigger |
|---------|-----------|---------|
| `source_not_found` | false | `path` does not exist in the current Project. |
| `not_an_image` | false | Document exists, but is not typed as an image (`mimeType` does not start with `image/`). |
| `format_unsupported` | false | MIME is an image, but not in {png, jpeg, gif, bmp}. Includes WebP, HEIC, SVG, TIFF. |
| `parameter_invalid` | false | Parameter validation: Crop box out of bounds, Resize without dimensions, `image_adjust` without a set field, Filter `filter` enum unknown, etc. |
| `limit_exceeded` | false | Input too large, output would be too large. `message` names the limit. |
| `target_blocked` | false | `targetPath` points to an existing Document of a different type, or to a protected path. |
| `processing_error` | true | Decoder error, IO glitches, unexpected `IOException` during Scrimage operation. Logged with stacktrace, Tool result anonymized. |

`retryable: true` means: the LLM may attempt a second try without further query. `false` means: change plan, do not stubbornly repeat.

---

## 9. Service Architecture

`ImageManipulationService` lives in `vance-brain/src/main/java/de/mhus/vance/brain/image/`. One method per tool, common steps in an `executeOp(...)` helper:

```java
@Service
public class ImageManipulationService {

    public ToolResult crop(CropRequest req, ToolContext ctx) {
        return executeOp(req.path(), req.targetPath(), ctx, "crop",
            img -> img.subimage(req.x(), req.y(), req.width(), req.height()));
    }

    public ToolResult resize(ResizeRequest req, ToolContext ctx) { … }
    public ToolResult rotate(RotateRequest req, ToolContext ctx) { … }
    public ToolResult flip(FlipRequest req, ToolContext ctx) { … }
    public ToolResult adjust(AdjustRequest req, ToolContext ctx) { … }
    public ToolResult filter(FilterRequest req, ToolContext ctx) { … }
    public ToolResult autoEnhance(AutoEnhanceRequest req, ToolContext ctx) { … }

    private ToolResult executeOp(
        String sourcePath,
        @Nullable String targetPath,
        ToolContext ctx,
        String opName,
        Function<ImmutableImage, ImmutableImage> op
    ) {
        // 1. resolve source DocumentDocument
        // 2. validate mime, size, dimensions
        // 3. load ImmutableImage
        // 4. emit PROCESS_PROGRESS, start heartbeat
        // 5. apply op
        // 6. validate output dimensions/bytes
        // 7. encode to inputFormat
        // 8. write via DocumentService.createOrReplaceBinary
        // 9. cancel heartbeat, record metric
        // 10. return ToolResult
    }
}
```

The Tool classes are thin wrappers:

```java
@Component
public class ImageCropTool implements VanceTool {
    @Override public String name() { return "image_crop"; }
    @Override public ToolResult run(Map<String, Object> args, ToolContext ctx) {
        return service.crop(CropRequest.from(args), ctx);
    }
}
```

DTOs (`CropRequest`, `ResizeRequest`, …) are records in the same package; they are **not** in `vance-api` because they are only internal tool argument shapes and do not run over the WS protocol.

`ImageManipulationService` calls `DocumentService` (data sovereignty over Documents) and `StorageService` (indirectly via `DocumentService`). No direct Mongo access. Document versioning automatically comes via the `createOrReplaceBinary` path — the service here does not need to know about it.

---

## 10. Heartbeats

Operations under ~500 ms are the rule (Crop, Flip, Adjust, small Resize). Resize to 8000×8000, Gaussian Blur with `radius=30`, rotation by non-right angles: up to ~5 s.

Threshold for heartbeat emission: Operation starts → `ProgressEmitter.emitStatus(WAITING, "<opName> image …")` directly. If not finished after 2 s: another status heartbeat every 2 s. Exactly like [Fenchurch](/docs/fenchurch-service) §10 — the Web UI renders the spinner without the Tool Result needing to be complete.

---

## 11. Metrics

Exactly two meters (see `MetricService` Convention in CLAUDE.md):

- **`vance.image.tools.calls`** — Counter. Tags: `tool` (e.g., `image_crop`, `image_filter:blur_gaussian` — for `image_filter` the filter name is appended as a suffix with `:`, low-cardinality because enum), `outcome` (`success`, `format_unsupported`, `parameter_invalid`, `not_an_image`, `source_not_found`, `limit_exceeded`, `target_blocked`, `processing_error`).
- **`vance.image.tools.duration`** — Timer. Tag: `tool` (same schema as above). Ends on every outcome, not just success.

No paths, no Document IDs, no User IDs as tags — cardinality explosion. If someone wants to see the volume per Project, the aggregation layer (Grafana, custom pipeline) will add that retrospectively.

---

## 12. Settings (Cascade `tenant → project`)

| Setting Key | Type | Default | Meaning |
|-------------|------|---------|---------|
| `image.tools.enabled` | bool | `true` | Master switch. `false` → all seven tools respond with `disabled` outcome (not in §8 as an error class, but as a counter outcome with user hint). |
| `image.tools.max_input_bytes` | long | `20_000_000` | See §7. |
| `image.tools.max_input_dimension` | int | `8192` | See §7. |
| `image.tools.max_output_dimension` | int | `8192` | See §7. |
| `image.tools.max_output_bytes` | long | `30_000_000` | See §7. |
| `image.tools.auto_enhance.percentile_clip` | double | `0.005` | See §5. |
| `image.tools.auto_enhance.gamma` | double | `0.95` | See §5. |
| `image.tools.auto_enhance.saturation_boost` | double | `0.10` | See §5. |

Setting form under `_vance/setting_forms/image-tools.yaml` (form engine like Fenchurch settings — same style as [setting-forms](/docs/setting-forms)).

---

## 13. Manuals (to follow after implementation)

The tools need Manuals — concise, loaded explanations of *when* which call is correct and which parameter magnitudes make sense. Convention from CLAUDE.md → section "Prompts and Manuals":

- **Routing Manual** `vance-brain/src/main/resources/vance-defaults/manuals/image-tools/image-manipulation.md` — lists the seven tools with one-liner triggers, refers to the detail manuals.
- **Detail Manuals** per logical group:
  - `image-geometry.md` — `image_crop`, `image_resize`, `image_rotate`, `image_flip`. With concrete examples for aspect ratio concerns, `cover` vs. `contain`, EXIF rotation caveats.
  - `image-color.md` — `image_adjust`, `image_auto_enhance`. With hints on when `image_auto_enhance` is sufficient and when manual adjustment is better.
  - `image-filter.md` — `image_filter`. With filter table (effect + sensible parameter ranges) and anti-examples ("do not use `sepia` for pure black and white conversion — use `grayscale`").

Prompt hooks in the Engine prompts (Arthur, Eddie, Ford) will then be one per detail manual; the routing manual itself does not need to be referenced in the prompt, as `manual_read('image-geometry')` is directly addressable. Discovery (`how_do_i`) finds the manuals automatically.

Manuals will be written **after** the tools are implemented — otherwise, we document behavior that might change during the build.

---

## 14. Day-1 Scope Delimitation

What is **not** in v1 (with a one-sentence justification to clarify if it's parked or discarded):

- **WebP / HEIC / SVG / TIFF Read+Write** — parked, will only come with real demand and accepted native-lib footprint.
- **Watermark / Text Overlay** — parked, easily retrofittable with Scrimage, but no urgent use case.
- **Composite (combining multiple images)** — parked; Vance workflows currently do not produce a need for combining.
- **AI Enhancement / Upscaling / Restoration** — deliberately separated; its own tool family with provider call, its own quota.
- **Batch operations in one call** — discarded; multiple tool calls in sequence are the correct granularity from an LLM perspective.
- **Auto-EXIF Rotation on Read** — parked; if Foot/Web users upload photos, this might change. Currently, we rely on the Document path without rotation magic.
- **Format Convert as a separate tool** — discarded; output follows input, conversion happens via regenerate (Fenchurch) or `document_copy`.

---

## 15. Open Points

- **EXIF preservation.** Scrimage does not guarantee EXIF preservation during roundtrip. Irrelevant for purely generated images, relevant for user uploads. A concrete decision will be made when the first user photo goes through the system.
- **Animated GIFs.** Scrimage only processes the first frame. Output is static. If this becomes an issue: `scrimage-formats-extra` or custom loop logic later. Day 1: first frame, documented in the Manual.
- **Color Space.** We assume sRGB. Adobe RGB or ProPhoto images are rendered without conversion (Scrimage default). No practical problem so far.
