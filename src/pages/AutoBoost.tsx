import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Eye, Heart, MessageCircle, Bookmark, Share2, Repeat2, Loader2, Save, Zap, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { PageMeta } from "@/components/seo/PageMeta";

type Preset = {
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  reposts: number;
  drip_minutes: number;
  drip_percent_per_run: number;
  mode: "auto" | "manual";
};

const DEFAULTS: Preset = {
  views: 5000,
  likes: 500,
  comments: 0,
  saves: 0,
  shares: 0,
  reposts: 0,
  drip_minutes: 30,
  drip_percent_per_run: 10,
  mode: "manual",
};

const FIELDS: { key: keyof Preset; label: string; icon: typeof Eye }[] = [
  { key: "views", label: "Views", icon: Eye },
  { key: "likes", label: "Likes", icon: Heart },
  { key: "comments", label: "Comments", icon: MessageCircle },
  { key: "saves", label: "Saves", icon: Bookmark },
  { key: "shares", label: "Shares", icon: Share2 },
  { key: "reposts", label: "Reposts", icon: Repeat2 },
];

export default function AutoBoost() {
  const { user } = useAuth();
  const [preset, setPreset] = useState<Preset>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("engagement_presets")
        .select("views,likes,comments,saves,shares,reposts,drip_minutes,drip_percent_per_run,mode")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPreset({
          views: data.views ?? 0,
          likes: data.likes ?? 0,
          comments: data.comments ?? 0,
          saves: data.saves ?? 0,
          shares: data.shares ?? 0,
          reposts: data.reposts ?? 0,
          drip_minutes: data.drip_minutes ?? 0,
          drip_percent_per_run: data.drip_percent_per_run ?? 0,
          mode: (data.mode as "auto" | "manual") ?? "manual",
        });
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const setNum = (key: keyof Preset, value: string) =>
    setPreset((p) => ({ ...p, [key]: Math.max(0, Math.floor(Number(value) || 0)) }));

  const total = FIELDS.reduce((s, f) => s + (preset[f.key] as number), 0);
  const dripActive = preset.drip_minutes > 0 && preset.drip_percent_per_run > 0;
  const runs = dripActive ? Math.ceil(100 / preset.drip_percent_per_run) : 0;
  const totalMinutes = runs * preset.drip_minutes;
  const durationText =
    totalMinutes >= 1440
      ? `${(totalMinutes / 1440).toFixed(1)} din`
      : totalMinutes >= 60
        ? `${(totalMinutes / 60).toFixed(1)} ghante`
        : `${totalMinutes} min`;

  const save = async () => {
    if (!user) return;
    if (preset.mode === "auto" && total === 0) {
      toast.error("Auto mode ke liye kam se kam ek quantity set karo");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("engagement_presets").upsert(
      { user_id: user.id, ...preset },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Auto-boost settings saved");
  };

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4 pb-24">
      <PageMeta
        title="Auto Boost Settings | OrganicSMM Pro"
        description="Set how many views, likes, comments, saves and shares are sent automatically on every new Instagram post."
      />

      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Auto Boost</h1>
          <p className="text-muted-foreground text-sm">
            New post par kitne views / likes / comments / saves / shares jaane chahiye — yahin se manage karo.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> Home</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="w-4 h-4" /> Auto order on new posts</CardTitle>
              <CardDescription>
                On karne par tumhare linked Instagram account ki har nayi post par ye quantities automatically order ho jayengi.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="text-sm">
                <div className="font-medium">{preset.mode === "auto" ? "Auto mode ON" : "Auto mode OFF"}</div>
                <div className="text-muted-foreground text-xs">
                  {preset.mode === "auto" ? "New posts auto-boost honge" : "Manual — tum khud order karoge"}
                </div>
              </div>
              <Switch
                checked={preset.mode === "auto"}
                onCheckedChange={(v) => setPreset((p) => ({ ...p, mode: v ? "auto" : "manual" }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Per-post quantities</CardTitle>
              <CardDescription>Total per post: {total.toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(({ key, label, icon: Icon }) => (
                <div key={key}>
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={preset[key] as number}
                    onChange={(e) => setNum(key, e.target.value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Timer className="w-4 h-4" /> Delivery timing (drip)</CardTitle>
              <CardDescription>
                Ek hi baar sab nahi jayega — thodi-thodi quantity set interval par jayegi (full engagement page jaisa hi organic drip).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Interval (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  value={preset.drip_minutes}
                  onChange={(e) => setNum("drip_minutes", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Har interval me quantity (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={preset.drip_percent_per_run}
                  onChange={(e) => setNum("drip_percent_per_run", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                {dripActive ? (
                  <>
                    Har <b>{preset.drip_minutes} min</b> me har type ki <b>{preset.drip_percent_per_run}%</b> quantity jayegi
                    — approx <b>{runs} runs</b>, pura delivery ~<b>{durationText}</b> me.
                    <div className="text-muted-foreground text-xs mt-1">
                      Example: {preset.views.toLocaleString()} views → ~{Math.max(1, Math.ceil((preset.views * preset.drip_percent_per_run) / 100)).toLocaleString()} views per run.
                    </div>
                  </>
                ) : (
                  <>Interval ya percent 0 hai — order organic engine ke default schedule par chalega (instant nahi, par tumhara custom drip off hai).</>
                )}
              </div>
            </CardContent>
          </Card>

          <Button onClick={save} disabled={saving} className="w-full h-11">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save settings</>}
          </Button>
        </>
      )}
    </div>
  );
}
