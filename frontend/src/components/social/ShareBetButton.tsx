"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { FiShare2, FiCopy, FiCheck, FiExternalLink } from "react-icons/fi";
import {
  buildShareText,
  buildTwitterShareUrl,
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  getMarketUrl,
} from "@/utils/share";

interface ShareBetButtonProps {
  question: string;
  amount: number;
  side: "YES" | "NO";
  marketId: number;
  referralAddress?: string;
}

const PLATFORMS = [
  {
    key: "twitter",
    label: "X (Twitter)",
    emoji: "\ud83d\udc26",
    bg: "bg-[#1DA1F2]/10 border-[#1DA1F2]/20 hover:bg-[#1DA1F2]/20 text-[#1DA1F2]",
    buildUrl: buildTwitterShareUrl,
  },
  {
    key: "telegram",
    label: "Telegram",
    emoji: "\u2708\ufe0f",
    bg: "bg-[#0088cc]/10 border-[#0088cc]/20 hover:bg-[#0088cc]/20 text-[#0088cc]",
    buildUrl: buildTelegramShareUrl,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    emoji: "\ud83d\udcac",
    bg: "bg-[#25D366]/10 border-[#25D366]/20 hover:bg-[#25D366]/20 text-[#25D366]",
    buildUrl: buildWhatsAppShareUrl,
  },
] as const;

export default function ShareBetButton({
  question,
  amount,
  side,
  marketId,
  referralAddress,
}: ShareBetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shareText = buildShareText(question, amount, side, marketId, referralAddress);
  const marketUrl = getMarketUrl(marketId, referralAddress);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(marketUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [marketUrl]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="btn-secondary text-sm inline-flex items-center gap-2"
      >
        <FiShare2 className="w-4 h-4" />
        Share your prediction
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-72 rounded-xl bg-surface-card border border-surface-border shadow-xl shadow-black/40 z-10 p-3">
          {/* Prediction summary */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-hover/50 mb-3">
            <span
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                side === "YES"
                  ? "bg-accent-green/20 text-accent-green"
                  : "bg-accent-red/20 text-accent-red"
              }`}
            >
              {side}
            </span>
            <span className="text-xs text-slate-300">
              {(amount / 1e9).toFixed(4)} ETH
            </span>
          </div>

          {/* Share buttons */}
          <div className="space-y-1.5 mb-2">
            {PLATFORMS.map(({ key, label, emoji, bg, buildUrl }) => (
              <a
                key={key}
                href={buildUrl(shareText, marketUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border transition-colors text-sm ${bg}`}
              >
                <span className="text-base">{emoji}</span>
                <span className="font-medium flex-1">{label}</span>
                <FiExternalLink className="w-3.5 h-3.5 opacity-50" />
              </a>
            ))}
          </div>

          {/* Copy Link */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-hover/30 hover:bg-surface-hover transition-colors text-sm"
          >
            {copied ? (
              <FiCheck className="w-4 h-4 text-accent-green" />
            ) : (
              <FiCopy className="w-4 h-4 text-slate-400" />
            )}
            <span className="font-medium">
              {copied ? "Link Copied!" : "Copy Link"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
