"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util";

interface VaultContextType {
  unlocked: boolean;
  locked: boolean;
  needsSetup: boolean;
  checking: boolean;
  unlock: (masterPassword: string) => Promise<boolean>;
  lock: () => void;
  setup: (masterPassword: string) => Promise<boolean>;
  resetVault: (masterPassword: string) => Promise<boolean>;
  encrypt: (plaintext: string) => string;
  decrypt: (ciphertext: string) => string;
}

const VaultContext = createContext<VaultContextType>(null!);

function deriveKey(password: string, salt: string): Uint8Array {
  let data = decodeUTF8(password + salt);
  for (let i = 0; i < 1000; i++) {
    const hash = nacl.hash(data);
    data = hash.slice(0, 32);
  }
  return data;
}

function generateSalt(): string {
  return encodeBase64(nacl.randomBytes(16));
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(true);
  const [checking, setChecking] = useState(true);
  const [derivedKey, setDerivedKey] = useState<Uint8Array | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/vault/setup");
        const data = await res.json();
        if (data.salt && data.keyCheck) {
          setNeedsSetup(false);
        }
      } catch {} finally {
        setChecking(false);
      }
    };
    check();
  }, []);

  const persistKeyCheck = useCallback(async (salt: string, password: string): Promise<boolean> => {
    const key = deriveKey(password, salt);
    // Use deterministic zero nonce for key verification (no security issue)
    const nonce = new Uint8Array(24);
    const cipher = nacl.secretbox(decodeUTF8("vault-ok"), nonce, key);
    const keyCheck = encodeBase64(nonce) + ":" + encodeBase64(cipher);
    const res = await fetch("/api/vault/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salt, keyCheck }),
    });
    if (res.ok) {
      setDerivedKey(key);
      setUnlocked(true);
      setNeedsSetup(false);
      return true;
    }
    return false;
  }, []);

  const setup = useCallback(async (masterPassword: string): Promise<boolean> => {
    try {
      const salt = generateSalt();
      return await persistKeyCheck(salt, masterPassword);
    } catch { return false; }
  }, [persistKeyCheck]);

  const unlock = useCallback(async (masterPassword: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/vault/setup");
      const data = await res.json();
      if (!data.salt || !data.keyCheck) return false;

      const key = deriveKey(masterPassword, data.salt);
      const [nonceB64, cipherB64] = data.keyCheck.split(":");
      const nonce = decodeBase64(nonceB64);
      const cipher = decodeBase64(cipherB64);

      const decrypted = nacl.secretbox.open(cipher, nonce, key);
      if (decrypted) {
        setDerivedKey(key);
        setUnlocked(true);
        return true;
      }
      return false;
    } catch { return false; }
  }, []);

  const resetVault = useCallback(async (newPassword: string): Promise<boolean> => {
    try {
      // Delete all vault items
      await fetch("/api/vault", { method: "DELETE" });
      // Set new master password
      const salt = generateSalt();
      return await persistKeyCheck(salt, newPassword);
    } catch { return false; }
  }, [persistKeyCheck]);

  const lock = useCallback(() => {
    setDerivedKey(null);
    setUnlocked(false);
  }, []);

  const encrypt = useCallback((plaintext: string): string => {
    if (!derivedKey) throw new Error("Vault locked");
    const nonce = nacl.randomBytes(24);
    const cipher = nacl.secretbox(decodeUTF8(plaintext), nonce, derivedKey);
    return encodeBase64(nonce) + ":" + encodeBase64(cipher);
  }, [derivedKey]);

  const decrypt = useCallback((ciphertext: string): string => {
    if (!derivedKey) throw new Error("Vault locked");
    const [nonceB64, cipherB64] = ciphertext.split(":");
    const nonce = decodeBase64(nonceB64);
    const cipher = decodeBase64(cipherB64);
    const plain = nacl.secretbox.open(cipher, nonce, derivedKey);
    if (!plain) throw new Error("Decryption failed");
    return encodeUTF8(plain);
  }, [derivedKey]);

  return (
    <VaultContext.Provider value={{
      unlocked, locked: !unlocked && !needsSetup && !checking,
      needsSetup, checking,
      unlock, lock, setup, resetVault, encrypt, decrypt,
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  return useContext(VaultContext);
}
