const config = require("../config");

function on() {
  return !!(config.kapsoKey && config.kapsoPhoneId);
}

function waTo(phone) {
  const n = String(phone || "").replace(/\D/g, "");
  if (n.length === 10) return "91" + n;
  if (n.startsWith("91") && n.length === 12) return n;
  return n;
}

function payload(phone, code) {
  const to = waTo(phone);
  if (config.kapsoTemplate) {
    return {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: config.kapsoTemplate,
        language: { code: config.kapsoLang },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "otp", index: "0", parameters: [{ type: "text", text: code }] }
        ]
      }
    };
  }
  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: "Your Bhojaa OTP is " + code + ". Do not share this code." }
  };
}

async function sendOtp(phone, code) {
  if (!on()) return false;
  const url = "https://api.kapso.ai/meta/whatsapp/v24.0/" + config.kapsoPhoneId + "/messages";
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-API-Key": config.kapsoKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload(phone, code))
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.log("Kapso OTP failed", res.status, err.slice(0, 300));
    throw Object.assign(new Error("Could not send OTP on WhatsApp"), { status: 502 });
  }
  return true;
}

module.exports = { on, sendOtp };
