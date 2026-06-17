"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function InstagramCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Verbindung wird hergestellt …");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // project ID
    const error = searchParams.get("error");

    if (error) {
      setStatus(`❌ Instagram hat die Verbindung abgelehnt: ${error}`);
      return;
    }

    if (!code) {
      setStatus("❌ Kein Autorisierungscode erhalten.");
      return;
    }

    // Exchange code for access token via our API
    fetch("/api/instagram/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.accessToken) {
          // Store token in localStorage
          const config = {
            accessToken: data.accessToken,
            accountId: data.accountId || "",
            username: data.username || ""
          };
          localStorage.setItem("weddingflow.instagram.v1", JSON.stringify(config));
          setStatus("✅ Instagram verbunden! Du wirst weitergeleitet …");

          // Redirect back to project
          setTimeout(() => {
            router.push(state ? `/projects/${state}` : "/projects");
          }, 1500);
        } else {
          setStatus(`❌ ${data.error || "Verbindung fehlgeschlagen."}`);
        }
      })
      .catch(() => setStatus("❌ Server nicht erreichbar."));
  }, [searchParams, router]);

  return (
    <div className="narrow-page" style={{ textAlign: "center", marginTop: 100 }}>
      <div className="form-card">
        <h2>Instagram verbinden</h2>
        <p style={{ marginTop: 16 }}>{status}</p>
        {status.includes("❌") ? (
          <button
            className="button"
            onClick={() => router.push("/settings")}
            style={{ marginTop: 20 }}
            type="button"
          >
            Manuell einrichten
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function InstagramCallbackPage() {
  return (
    <Suspense fallback={<div className="narrow-page" style={{ textAlign: "center", marginTop: 100 }}>Instagram verbinden …</div>}>
      <InstagramCallbackContent />
    </Suspense>
  );
}
