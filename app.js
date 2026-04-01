const FORM_URL = "https://luuqcoffeevan.github.io/g-ncel-form/";
const SUBMIT_URL =
  "https://script.google.com/macros/s/AKfycbxxGSy1uO7_EPLnShlgz_GWsVqZfJjNXG2AoGKpE6IpOhq3uOe5E5S9fXKA_DUgrFkF_Q/exec";
const SUBMIT_TIMEOUT_MS = 15000;
const RATING_FIELDS = [
  "puan_hizmet",
  "puan_ürün_kalitesi",
  "puan_temizlik",
  "puan_lavabo_temizligi",
  "puan_ortam",
];

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const buildQrUrl = (value) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
    value
  )}`;

const syncQr = () => {
  const images = document.querySelectorAll("[data-qr-img]");
  const links = document.querySelectorAll("[data-form-link]");
  const downloads = document.querySelectorAll("[data-qr-download]");
  const qrUrl = buildQrUrl(FORM_URL);

  links.forEach((link) => {
    link.href = FORM_URL;
  });

  downloads.forEach((link) => {
    link.href = qrUrl;
  });

  images.forEach((img) => {
    img.src = qrUrl;
    img.alt = `QR: ${FORM_URL}`;
  });
};

document.addEventListener("DOMContentLoaded", () => {
  syncQr();

  const form = document.querySelector("[data-form]");
  const success = document.querySelector("[data-success]");
  const toggle = document.querySelector("[data-toggle='survey']");
  const survey = document.querySelector("[data-survey]");

  const setStatus = (type, title, message) => {
    if (!success) return;
    success.hidden = false;
    success.classList.remove("is-success", "is-error", "is-loading");
    success.classList.add(type);
    success.innerHTML = `
      <div class="success-title">${title}</div>
      <div class="success-text">${message}</div>
    `;
  };

  if (toggle && survey) {
    const openText = "Hizmet Değerlendirmesini Aç";
    const closeText = "Hizmet Değerlendirmesini Kapat";

    toggle.addEventListener("click", () => {
      const isHidden = survey.hasAttribute("hidden");
      if (isHidden) {
        survey.removeAttribute("hidden");
        toggle.textContent = closeText;
        toggle.setAttribute("aria-expanded", "true");
      } else {
        survey.setAttribute("hidden", "");
        toggle.textContent = openText;
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (form) {
    const submitBtn = form.querySelector("button[type='submit']");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = new FormData(form);
      const messageValue = normalizeText(payload.get("mesaj"));
      const noteValue = normalizeText(payload.get("anket_yorum"));
      const selectedRatings = RATING_FIELDS.filter((name) =>
        normalizeText(payload.get(name))
      ).length;

      if (!messageValue) {
        setStatus(
          "is-error",
          "Mesaj gerekli",
          "Lütfen mesaj alanını doldurup tekrar deneyin."
        );
        return;
      }

      if (selectedRatings > 0 && selectedRatings < RATING_FIELDS.length) {
        setStatus(
          "is-error",
          "Eksik değerlendirme",
          "Değerlendirme açıldıysa tüm puan alanlarını doldurun."
        );
        return;
      }

      payload.set("mesaj", messageValue);
      payload.set("anket_yorum", noteValue);

      // Legacy backend compatibility: some scripts may expect ASCII key names.
      const productScore = normalizeText(payload.get("puan_ürün_kalitesi"));
      if (productScore) {
        payload.append("puan_urun_kalitesi", productScore);
      }

      // Keep lavabo score visible even when backend schema is still old.
      const lavaboScore = normalizeText(payload.get("puan_lavabo_temizligi"));
      if (lavaboScore) {
        payload.append("puan_lavabo", lavaboScore);
        payload.append("lavabo_temizligi", lavaboScore);
        payload.append("ek_lavabo_temizligi", lavaboScore);

        if (!noteValue) {
          payload.set("anket_yorum", `Lavabo Temizliği: ${lavaboScore}`);
        }
      }

      payload.append("user_agent", navigator.userAgent);
      payload.append("page", window.location.href);
      setStatus("is-loading", "Gönderiliyor", "Lütfen birkaç saniye bekleyin.");

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Gönderiliyor...";
      }

      let timeoutId;
      const controller = new AbortController();

      try {
        timeoutId = window.setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

        const response = await fetch(SUBMIT_URL, {
          method: "POST",
          body: payload,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }

        const responseText = normalizeText(await response.text()).toLowerCase();
        if (responseText !== "ok") {
          throw new Error(`UNEXPECTED_RESPONSE_${responseText || "EMPTY"}`);
        }

        setStatus("is-success", "Teşekkürler!", "Geri bildiriminiz başarıyla kaydedildi.");
        form.reset();
      } catch (error) {
        const message =
          error?.name === "AbortError"
            ? "İstek zaman aşımına uğradı. Lütfen tekrar deneyin."
            : "Gönderim doğrulanamadı. Lütfen tekrar deneyin.";
        setStatus("is-error", "Gönderim başarısız", message);
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Gönder";
        }

        if (survey && toggle) {
          survey.setAttribute("hidden", "");
          toggle.textContent = "Hizmet Değerlendirmesini Aç";
          toggle.setAttribute("aria-expanded", "false");
        }
      }
    });
  }
});
