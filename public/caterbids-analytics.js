/* ============================================================
   CaterBids Analytics snippet  (~5 KB, no dependencies)

   Install on CaterBids with ONE tag (see INSTALL.md):
   <script defer src="/caterbids-analytics.js"
           data-endpoint="https://YOUR-PROJECT.supabase.co/functions/v1/track"></script>

   Business events (call these from the marketplace later):
     caterbids.track('listing_viewed', { listing_id: 'abc123' })
     caterbids.track('listing_created')
     caterbids.track('enquiry_or_bid_made', { listing_id: 'abc123' })
     caterbids.track('featured_upgrade_purchased', { listing_id: 'abc123' })
     caterbids.track('plan_subscribed', { plan: 'pro' })

   Consent switch (tracking is ON by default):
     caterbids.consent(false)  -> stops tracking + wipes the visitor ID
     caterbids.consent(true)   -> turns it back on
   ============================================================ */
(function () {
  "use strict";
  if (window.caterbids) return; // never run twice

  var script = document.currentScript;
  var ENDPOINT = (script && script.getAttribute("data-endpoint")) || "";
  if (!ENDPOINT) { console.warn("[caterbids] no data-endpoint set"); return; }

  var CONSENT_KEY = "cb_consent";   // "granted" | "denied"
  var VISITOR_KEY = "cb_vid";
  var FLUSH_MS = 5000;              // send batches every 5s
  var queue = { events: [], clicks: [] };
  var visitorPayload = null;        // attribution info, sent once

  // ---------- consent ------------------------------------------------
  function consentState() {
    try { return localStorage.getItem(CONSENT_KEY) || "granted"; } // default ON
    catch (e) { return "granted"; }
  }
  function tracking() { return consentState() === "granted"; }

  // ---------- visitor identity + attribution ------------------------
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  function getVisitorId() {
    try {
      var id = localStorage.getItem(VISITOR_KEY);
      if (!id) {
        id = uuid();
        localStorage.setItem(VISITOR_KEY, id);
        // First ever visit: capture where they came from.
        var p = new URLSearchParams(location.search);
        var refHost = "";
        try { refHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
        if (refHost === location.hostname) refHost = ""; // internal nav, not a source
        visitorPayload = {
          utm_source: p.get("utm_source"),
          utm_medium: p.get("utm_medium"),
          utm_campaign: p.get("utm_campaign"),
          utm_content: p.get("utm_content"),
          referrer: refHost || null,
          landing_page: location.pathname
        };
      }
      return id;
    } catch (e) { return uuid(); } // storage blocked: session-only id
  }

  function deviceType() {
    var w = Math.min(screen.width, screen.height * 2); // rough but stable
    if (/Mobi|Android/i.test(navigator.userAgent)) return w >= 600 ? "tablet" : "mobile";
    return window.innerWidth < 768 ? "mobile" : window.innerWidth < 1100 ? "tablet" : "desktop";
  }

  var VISITOR_ID = getVisitorId();
  var DEVICE = deviceType();

  // ---------- sending (batched, never blocks the page) ---------------
  function flush(useBeacon) {
    if (!tracking()) { queue = { events: [], clicks: [] }; return; }
    if (!queue.events.length && !queue.clicks.length && !visitorPayload) return;
    var body = JSON.stringify({
      visitor_id: VISITOR_ID,
      device: DEVICE,
      visitor: visitorPayload,
      events: queue.events.splice(0, 100),
      clicks: queue.clicks.splice(0, 100)
    });
    visitorPayload = null;
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    } else {
      fetch(ENDPOINT, { method: "POST", body: body, keepalive: true,
        headers: { "content-type": "application/json" } }).catch(function () {});
    }
  }
  setInterval(flush, FLUSH_MS);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") { noteScrollDepth(); flush(true); }
  });

  // ---------- page views (handles Next.js client-side navigation) ----
  var currentPage = null;
  function pageView() {
    if (location.pathname === currentPage) return;
    if (currentPage !== null) noteScrollDepth(); // finish previous page first
    currentPage = location.pathname;
    maxDepth = 0; depthSent = 0;
    if (tracking()) queue.events.push({ name: "page_view", page: currentPage });
  }
  ["pushState", "replaceState"].forEach(function (m) {
    var orig = history[m];
    history[m] = function () { var r = orig.apply(this, arguments); pageView(); return r; };
  });
  window.addEventListener("popstate", pageView);
  pageView();

  // ---------- clicks --------------------------------------------------
  function describe(el) {
    if (!el || !el.tagName) return null;
    var d = el.tagName.toLowerCase();
    if (el.id) d += "#" + el.id;
    else if (el.className && typeof el.className === "string")
      d += "." + el.className.trim().split(/\s+/).slice(0, 2).join(".");
    var t = (el.textContent || "").trim().slice(0, 40);
    return t ? d + ' "' + t + '"' : d;
  }
  document.addEventListener("click", function (e) {
    if (!tracking()) return;
    var doc = document.documentElement;
    var pw = Math.max(doc.scrollWidth, doc.clientWidth);
    var ph = Math.max(doc.scrollHeight, doc.clientHeight);
    var target = e.target.closest ? (e.target.closest("a,button,[role=button],input,select") || e.target) : e.target;
    queue.clicks.push({
      page: location.pathname,
      x: Math.round(((e.pageX || 0) / pw) * 100),
      y: Math.round(((e.pageY || 0) / ph) * 100),
      element: describe(target)
    });
  }, { passive: true, capture: true });

  // ---------- scroll depth (25/50/75/100) ----------------------------
  var maxDepth = 0, depthSent = 0;
  window.addEventListener("scroll", function () {
    var doc = document.documentElement;
    var total = doc.scrollHeight - window.innerHeight;
    if (total <= 0) { maxDepth = 100; return; }
    var pct = Math.min(100, Math.round(((window.scrollY || 0) / total) * 100));
    if (pct > maxDepth) maxDepth = pct;
  }, { passive: true });
  function noteScrollDepth() {
    if (!tracking()) return;
    var bucket = maxDepth >= 100 ? 100 : maxDepth >= 75 ? 75 : maxDepth >= 50 ? 50 : maxDepth >= 25 ? 25 : 0;
    if (bucket > depthSent) {
      depthSent = bucket;
      queue.events.push({ name: "scroll_depth", page: currentPage, meta: { depth: bucket } });
    }
  }

  // ---------- public API ----------------------------------------------
  var VALID = ["page_view","listing_viewed","listing_created",
               "enquiry_or_bid_made","featured_upgrade_purchased","plan_subscribed"];
  window.caterbids = {
    track: function (name, meta) {
      if (!tracking()) return;
      if (VALID.indexOf(name) === -1) { console.warn("[caterbids] unknown event:", name); return; }
      queue.events.push({ name: name, page: location.pathname, meta: meta || null });
    },
    consent: function (granted) {
      try {
        localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");
        if (!granted) { localStorage.removeItem(VISITOR_KEY); queue = { events: [], clicks: [] }; }
      } catch (e) {}
    }
  };
})();
