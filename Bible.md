# The McMaster-Carr Website Architecture Bible

## Core Philosophy

**Prime Directive**: Speed is measured in user perception, not technical metrics. Every optimization must serve the user's ability to accomplish their task faster.

**Business Context**: Users are working in industrial environments - potentially with dirty gloves, older devices, and poor patience for slow interfaces. The website must be faster than picking up a phone or flipping through a paper catalog.

## Architecture Principles

### 1. Server-Side Rendering (SSR) First
- **Never block the initial render**: HTML arrives ready to display
- Server generates complete HTML before sending to client
- No client-side hydration delays
- Browser receives immediately renderable content

### 2. Aggressive Prefetching Strategy

#### Hover-Based Prefetching
```javascript
// On hover, immediately fetch the destination page
element.addEventListener('mouseenter', () => {
  fetch(targetURL);
});
```

**Key Implementation Details**:
- Start prefetch on `mouseenter`, not `click`
- Cancel prefetch on `mouseleave` to avoid wasting bandwidth
- Store prefetched HTML in memory for instant swap

#### Link Prefetching Rules
- Prefetch ANY link visible in viewport
- Use Intersection Observer to detect visibility
- Only prefetch when link enters view (don't prefetch entire page's links at once)

### 3. HTML Swapping (Pushstate Pattern)

**Critical Behavior**: Page content swaps BEFORE URL changes

**Implementation**:
```javascript
// On click
1. Check if HTML is already prefetched
2. Swap page content immediately
3. Update URL bar (pushState)
4. Update browser history
```

**What to Swap**:
- Only swap the "shell" - the content that changes
- Keep persistent elements (nav, cart, header) untouched
- Identify swappable regions with consistent IDs/classes

### 4. Multi-Layer Caching Strategy

#### Layer 1: CDN Edge Cache
- Use Akamai or similar CDN
- Cache pre-rendered HTML at edge locations
- Serve from closest geographic location
- Include cache headers: `Cache-Control: public, max-age=3600`

#### Layer 2: Service Worker Cache
- Intercept requests at browser level
- Serve from local cache when available
- Enables offline functionality
- Can reduce response time to <10ms

#### Layer 3: Browser Cache
- Standard HTTP caching
- Set aggressive cache headers for static assets
- Use ETags for validation

**Cache Invalidation**: 
- Accept stale-while-revalidate pattern
- Prioritize speed over perfect freshness
- 2-hour revalidation window is acceptable for most content

### 5. Critical CSS Inlining

**Rule**: ALL CSS needed for above-the-fold content must be inline in `<head>`

```html
<head>
  <style>
    /* ALL critical CSS here - no external stylesheet */
    /* This should be minified heavily */
  </style>
</head>
```

**Benefits**:
- Zero render-blocking requests for initial paint
- Browser has CSS before parsing HTML body
- No Flash of Unstyled Content (FOUC)
- Fastest possible Largest Contentful Paint (LCP)

**Implementation**:
- Build process extracts critical CSS
- Inline during server render
- Load non-critical CSS asynchronously later

### 6. Resource Hints (Preloading Strategy)

```html
<head>
  <!-- Preload critical fonts -->
  <link rel="preload" href="/fonts/main.woff2" as="font" crossorigin>
  
  <!-- Preload logo -->
  <link rel="preload" href="/logo.png" as="image">
  
  <!-- DNS Prefetch for external domains -->
  <link rel="dns-prefetch" href="https://images1.mcmaster.com">
  <link rel="dns-prefetch" href="https://cdn.example.com">
  
  <!-- Preconnect for critical third-parties -->
  <link rel="preconnect" href="https://api.example.com">
</head>
```

**When to Use Each**:
- `preload`: Critical resources needed immediately
- `dns-prefetch`: Domains you'll need soon (saves DNS lookup time)
- `preconnect`: Domains where you need full connection setup
- `prefetch`: Low-priority resources for next navigation

### 7. Image Optimization Arsenal

#### Technique 1: CSS Sprites
- Combine multiple images into single file
- Reduces HTTP requests dramatically
- Use CSS background-position to display correct portion

```css
.icon-wrench {
  background: url('/sprites.png') -10px -20px;
  width: 20px;
  height: 20px;
}
```

**When to Use**:
- Icons and small UI elements
- Images that don't change frequently
- When you have 10+ small images on a page

#### Technique 2: Fixed Dimensions
```html
<!-- ALWAYS specify width and height -->
<div style="width: 200px; height: 150px; background-image: url(...)"></div>
```

**Why**: Browser reserves exact space, preventing layout shift

#### Technique 3: Lazy Loading (Smart)
```javascript
// First 10-15 images: eager loading
<img loading="eager" decoding="sync">

// Images below fold: lazy loading
<img loading="lazy" decoding="async">
```

#### Technique 4: Image Prefetching on Hover
```javascript
// When hovering over navigation
onMouseEnter = () => {
  const nextPageImages = getImagesForRoute(href);
  nextPageImages.forEach(img => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = img;
    document.head.appendChild(link);
  });
};
```

### 8. JavaScript Strategy

#### Rule 1: Dependency Injection Per Page
**Never load all JavaScript on all pages**

```javascript
// Server determines required JS for THIS page only
{
  "jsIncludeFilePaths": [
    "/js/product-viewer.js",
    "/js/cart.js"
  ]
}
```

#### Rule 2: Defer Non-Critical JS
```html
<script src="/critical.js"></script>
<script src="/non-critical.js" defer></script>
```

#### Rule 3: Monitor Everything
```javascript
// Use Performance API obsessively
performance.mark('navigation-start');
performance.mark('content-loaded');
performance.measure('load-time', 'navigation-start', 'content-loaded');
```

**Metrics to Track**:
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Interaction to Next Paint (INP)
- Every major user interaction

### 9. Framework Doesn't Matter (But Features Do)

**Critical Understanding**: 
- McMaster uses 15-year-old jQuery/YUI - still blazing fast
- Next.js version loads MORE JavaScript but can be FASTER
- Speed comes from TECHNIQUES not TOOLS

**What Actually Matters**:
1. Can you prefetch routes?
2. Can you swap content without full page reload?
3. Can you inline critical CSS?
4. Can you control resource loading priority?
5. Can you measure performance accurately?

If yes to all: You can build a fast site.

## Advanced Optimization Techniques

### 10. Response Streaming Strategy

**For McMaster's ASP.NET approach**:
```
Response Structure:
1. Metadata blob (JSON for client state)
2. HTML content shell
3. Close connection
```

**Purpose**: Client receives state data BEFORE HTML, can prepare for swap

### 11. Database Query Optimization

```typescript
// Use Promise.all for parallel queries
const [collections, products] = await Promise.all([
  getCollections(),
  getProducts()
]);

// Cache aggressively
const getProducts = unstable_cache(
  async () => db.select().from(products),
  ['products'],
  { revalidate: 7200 } // 2 hours
);
```

### 12. Static Generation Where Possible

```typescript
// Generate static pages at build time
export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map(c => ({
    slug: c.slug
  }));
}
```

**Result**: Zero server compute on request, instant response from CDN

### 13. Client-Side Router Optimization

```typescript
// Next.js example
<Link 
  href="/products"
  prefetch={true}  // Prefetch in viewport
  onMouseEnter={prefetchImages}
  onMouseDown={updateURL}  // Update on press, not release
>
```

**Mouse Down vs Mouse Up**:
- Mouse down = faster perceived speed
- Action happens when you PRESS not when you RELEASE
- MORE accessible (reduces misclick chance for motor disabilities)
- VR standard for a reason

### 14. Image Loading Strategy (Mathematical)

```typescript
let imageCount = 0;

images.forEach(img => {
  const loading = imageCount < 15 ? 'eager' : 'lazy';
  const decoding = imageCount < 15 ? 'sync' : 'async';
  
  renderImage(img, { loading, decoding });
  imageCount++;
});
```

**Logic**:
- First 15 images: Load immediately (above fold)
- After 15: Load as needed (below fold)
- Prevents loading thousands of images unnecessarily

### 15. Intersection Observer for Prefetch

```typescript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      prefetchTimeout = setTimeout(() => {
        router.prefetch(href);
        prefetchImages(href);
      }, 50); // Small delay to avoid prefetch spam
    } else {
      clearTimeout(prefetchTimeout);
    }
  });
});

observer.observe(linkElement);
```

### 16. Request Cancellation

```typescript
let currentPrefetch: AbortController | null = null;

onMouseEnter = () => {
  currentPrefetch = new AbortController();
  fetch(url, { signal: currentPrefetch.signal });
};

onMouseLeave = () => {
  currentPrefetch?.abort();
  currentPrefetch = null;
};
```

**Why**: Don't waste bandwidth on cancelled navigation intent

## Performance Measurement

### Metrics That Actually Matter

1. **User-Perceived Load Time**
   - How long until user sees content?
   - How long until user can interact?

2. **Navigation Speed** 
   - Click to visible content
   - Should be <100ms with prefetch

3. **Image Load Time**
   - Time until images visible
   - More important than JavaScript load

4. **Interaction Responsiveness**
   - Click to page change
   - Form submission to feedback

### Metrics That Don't Matter (As Much)

1. **Lighthouse Score**
   - McMaster scores 61% but feels instant
   - Good for catching issues, not measuring UX

2. **Total JavaScript Size**
   - McMaster: 800KB JS, feels great
   - Next version: 300KB JS, feels better
   - Execution time > download time

3. **Perfect Page Speed Insights**
   - Optimize for REAL users not Google's bot

## Implementation Checklist

### Foundation Layer
- [ ] Server-side render all HTML
- [ ] Implement client-side routing/pushstate
- [ ] Set up CDN with aggressive caching
- [ ] Implement service worker for offline capability
- [ ] Inline all critical CSS
- [ ] Set up performance monitoring

### Optimization Layer  
- [ ] Prefetch on hover
- [ ] Prefetch on viewport intersection
- [ ] Cancel prefetch on mouse leave
- [ ] Static generation where possible
- [ ] Database query optimization + caching
- [ ] Per-page JavaScript bundles

### Image Layer
- [ ] CSS sprites for icons
- [ ] Fixed width/height on all images
- [ ] Smart eager/lazy loading (first 15 eager)
- [ ] Image prefetching on navigation intent
- [ ] Proper image optimization (quality ~65)
- [ ] Sync/async decoding based on priority

### Advanced Layer
- [ ] DNS prefetch for external domains
- [ ] Preconnect for critical resources
- [ ] Response streaming optimization
- [ ] Mouse down navigation (not mouse up)
- [ ] Intersection observer for prefetch
- [ ] Request cancellation on intent change

## Common Pitfalls to Avoid

1. **Don't Over-Optimize Images**: Quality 65 is aggressive but balanced. Going lower costs CPU on decode.

2. **Don't Prefetch Everything**: Only prefetch what user might actually click. Viewport intersection + hover intent.

3. **Don't Block on JavaScript**: Load asynchronously unless critical for initial render.

4. **Don't Ignore Layout Shift**: Fixed image dimensions prevent cumulative layout shift (CLS).

5. **Don't Skip Monitoring**: If you're not measuring, you're guessing.

6. **Don't Trust Lighthouse Alone**: Real user metrics matter more than lab scores.

## The McMaster Philosophy

> "Make the website faster than picking up the phone"

- Speed is a feature, not a bonus
- Optimize for real users in real conditions
- Prefetch aggressively based on intent
- Cache at every possible layer
- Measure everything obsessively
- Framework choice matters less than technique execution

## Next.js Specific Optimizations

### Partial Pre-Rendering (PPR)
```typescript
// next.config.js
experimental: {
  ppr: true
}
```
Enables static shell with dynamic sections

### Route-Based Code Splitting
Automatic - just use Next.js App Router properly

### Font Optimization
```typescript
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
```
Automatic font optimization and inlining

### Image Component
```typescript
<Image
  src="/product.jpg"
  width={200}
  height={150}
  quality={65}
  loading="eager" // or "lazy"
  priority // for above-fold images
/>
```

## The Ultimate Truth

**Speed is not about the framework. Speed is about:**

1. Understanding user intent
2. Prefetching based on that intent  
3. Caching at every layer
4. Minimizing render-blocking resources
5. Measuring obsessively
6. Iterating constantly

You can build this with React, Vue, Svelte, vanilla JS, jQuery, or 15-year-old ASP.NET.

**The techniques transcend the tools.**