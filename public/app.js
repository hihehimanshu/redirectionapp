const form = document.getElementById("shorten-form");
const urlInput = document.getElementById("url");
const slugInput = document.getElementById("slug");
const errorEl = document.getElementById("error");
const resultEl = document.getElementById("result");
const shortUrlEl = document.getElementById("short-url");
const resultMeta = document.getElementById("result-meta");
const copyBtn = document.getElementById("copy-btn");
const submitBtn = document.getElementById("submit-btn");

function setError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function clearError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function showResult(shortUrl, url, slug) {
  shortUrlEl.textContent = shortUrl;
  shortUrlEl.href = shortUrl;
  resultMeta.textContent = `Slug: ${slug} -> ${url}`;
  resultEl.classList.remove("hidden");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  resultEl.classList.add("hidden");

  const url = urlInput.value.trim();
  const slug = slugInput.value.trim();

  submitBtn.disabled = true;
  submitBtn.querySelector("span").textContent = "Minting...";

  try {
    const response = await fetch("/api/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, slug })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Something went wrong.");
    }

    showResult(payload.shortUrl, payload.url, payload.slug);
  } catch (err) {
    setError(err.message || "Could not create the redirect.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector("span").textContent = "Seal the link";
  }
});

copyBtn.addEventListener("click", async () => {
  const shortUrl = shortUrlEl.textContent;
  if (!shortUrl) return;

  try {
    await navigator.clipboard.writeText(shortUrl);
    copyBtn.textContent = "Copied";
    setTimeout(() => {
      copyBtn.textContent = "Copy";
    }, 1200);
  } catch {
    copyBtn.textContent = "Copy failed";
    setTimeout(() => {
      copyBtn.textContent = "Copy";
    }, 1200);
  }
});
