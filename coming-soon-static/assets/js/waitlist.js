(function () {
  const config = window.CATERBIDS_STATIC_CONFIG || {};
  const form = document.querySelector("[data-waitlist-form]");
  const emailInput = document.querySelector("[data-waitlist-email]");
  const message = document.querySelector("[data-waitlist-message]");
  const submit = document.querySelector("[data-waitlist-submit]");
  const honeypot = document.querySelector("[data-waitlist-website]");

  function setMessage(text, tone) {
    if (!message) return;
    message.textContent = text;
    message.dataset.tone = tone || "neutral";
  }

  function isReadyForSupabase() {
    return Boolean(config.supabaseUrl && config.supabaseAnonKey && config.waitlistTable);
  }

  function normaliseEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function addToSupabase(email) {
    const endpoint = `${String(config.supabaseUrl).replace(/\/$/, "")}/rest/v1/${encodeURIComponent(config.waitlistTable)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        email,
        source: "coming_soon_landing_page",
        consent_to_updates: true
      })
    });

    if (response.status === 409) {
      return { duplicate: true };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (/duplicate|unique|23505/i.test(text)) {
        return { duplicate: true };
      }
      throw new Error(text || `Supabase waitlist insert failed with ${response.status}`);
    }

    return { duplicate: false };
  }

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const email = normaliseEmail(emailInput && emailInput.value);

    if (honeypot && honeypot.value) {
      setMessage("Thanks, you are on the list.", "success");
      form.reset();
      return;
    }

    if (!validEmail(email)) {
      setMessage("Please enter a valid email address.", "error");
      return;
    }

    if (!isReadyForSupabase()) {
      const contactEmail = config.contactEmail || "caterbidsuk@gmail.com";
      setMessage(`Waitlist signup is not connected yet. Email ${contactEmail} and we will add you manually.`, "error");
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Joining...";
    }

    try {
      const result = await addToSupabase(email);
      if (result && result.duplicate) {
        setMessage("You're already signed up for launch updates.", "success");
      } else {
        setMessage("You’re on the launch list. We’ll notify you when CaterBidsUK goes live.", "success");
      }
      form.reset();
    } catch (error) {
      console.warn("CaterBidsUK waitlist signup failed:", error);
      setMessage("We could not add you just now. Please try again in a moment.", "error");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Notify Me at Launch";
      }
    }
  });
})();
