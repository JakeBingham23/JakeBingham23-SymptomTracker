async function authenticate() {
  // 1. Check for hardware and Secure Context (HTTPS/Localhost)
  if (!window.PublicKeyCredential || !window.isSecureContext) {
    console.warn("Biometrics blocked: Requires HTTPS or Localhost.");
    return false;
  }

  try {
    // 2. Check if biometric hardware is actually available on this device
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return false;

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const auth = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname || "localhost",
        userVerification: "required",
        timeout: 60000
      }
    });
    return !!auth;
  } catch (e) {
    // If user cancels or hardware fails, fallback to PIN pad without crashing
    console.error("Biometric Auth Error:", e);
    return false;
  }
}
