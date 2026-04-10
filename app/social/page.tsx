"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { SOCIAL_POSTS } from "@/lib/demo/data";

const catColor: Record<string, "success"|"warning"|"info"|"purple"|"danger"> = {
  safety: "danger",
  metrics: "success",
  feature: "info",
  build: "purple",
  philosophy: "warning",
};

export default function SocialPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-[800px]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-500/20">
          <Share2 className="h-5 w-5 text-sky-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Build in Public</h1>
          <p className="text-sm text-zinc-600">Pre-generated shareable updates for X/Twitter</p>
        </div>
      </div>

      <div className="space-y-3">
        {SOCIAL_POSTS.map(post => (
          <Card key={post.id} className="group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={catColor[post.category] || "default"}>{post.category}</Badge>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{post.text}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => copy(post.id, post.text)}
                    className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 transition-colors"
                  >
                    {copied === post.id ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied === post.id ? "Copied!" : "Copy"}
                  </button>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.text)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 text-xs text-sky-400 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" /> Post
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
