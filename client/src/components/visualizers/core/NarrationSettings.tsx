"use client";

import { useId } from "react";
import { Volume2 } from "lucide-react";
import { useT } from "@/i18n";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { prefersNaturalVoice, speakSample, useNarrationSettings, voiceLabel, type Pace } from "../lib/narration";
import { NATURAL_VOICE } from "../lib/narration-audio";
import type { SpeechLang } from "../lib/speech-text";
import type { Visual } from "@/lib/types";

/**
 * Shown under the player while narration is on: the language to listen in (Bangla pages), the voice, the speaking
 * speed and a sample. Picking a voice plays the sample right away, so learners can find one they understand easily.
 * The pre-recorded voice (labelled as AI-generated) comes first when its clips are available: English clips anywhere,
 * Bangla clips for a walkthrough whose Bangla is recorded, which also unlocks বাংলা in browsers without a Bangla voice.
 */
export function NarrationSettings({
  pageLang,
  visual,
  onBeforeSample,
}: {
  pageLang: SpeechLang;
  /** the walkthrough shown, to know whether its Bangla is recorded */
  visual?: Visual;
  onBeforeSample?: () => void;
}) {
  const t = useT();
  const { prefs, voices, naturalVoice, banglaClips, banglaAvailable, listen, setPrefs } = useNarrationSettings(pageLang, visual);
  const list = listen === "bn" ? voices.bn : voices.en;
  const wanted = listen === "bn" ? prefs.voiceBn : prefs.voiceEn;
  const natural = true;
  const naturalSelected = prefersNaturalVoice(prefs, list, listen);
  const selected = naturalSelected ? NATURAL_VOICE : ((list.find((v) => v.voiceURI === wanted) ?? list[0])?.voiceURI ?? "");
  const aiNoteId = useId();

  function sample(lang: SpeechLang = listen) {
    onBeforeSample?.(); // a sample must not cut into autoplay mid-step
    speakSample(lang);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted">
      {pageLang === "bn" ? (
        <span className="inline-flex items-center gap-1.5">
          {t.visualPlayer.listenIn}
          <SegmentedControl<SpeechLang>
            size="sm"
            label={t.visualPlayer.listenIn}
            value={listen}
            onChange={(l) => setPrefs({ listen: l })}
            options={[
              { value: "bn", label: "বাংলা" },
              { value: "en", label: "English" },
            ]}
          />
        </span>
      ) : null}
      <label className="inline-flex min-w-0 items-center gap-1.5">
        {t.visualPlayer.voice}
        <select
          value={selected}
          aria-describedby={naturalSelected ? aiNoteId : undefined}
          onChange={(e) => {
            setPrefs(listen === "bn" ? { voiceBn: e.target.value } : { voiceEn: e.target.value });
            sample();
          }}
          className="h-7 min-w-0 max-w-56 truncate rounded-md border border-border bg-surface px-1.5 text-[11px] text-foreground"
        >
          <option value={NATURAL_VOICE}>{t.visualPlayer.naturalVoice}</option>
          {list.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {voiceLabel(v)}
            </option>
          ))}
        </select>
      </label>
      {naturalSelected ? <span id={aiNoteId}>{t.visualPlayer.aiVoice}</span> : null}
      <span className="inline-flex items-center gap-1.5">
        {t.visualPlayer.pace}
        <SegmentedControl<Pace>
          size="sm"
          label={t.visualPlayer.pace}
          value={prefs.pace}
          onChange={(p) => setPrefs({ pace: p })}
          options={[
            { value: "slow", label: t.visualPlayer.paceSlow },
            { value: "normal", label: t.visualPlayer.paceNormal },
            { value: "fast", label: t.visualPlayer.paceFast },
          ]}
        />
      </span>
      <button type="button" onClick={() => sample()} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
        <Volume2 aria-hidden className="size-3.5" />
        {t.visualPlayer.testVoice}
      </button>
      {pageLang === "bn" && !banglaAvailable ? <p className="basis-full">{t.visualPlayer.noBanglaVoice}</p> : null}
    </div>
  );
}
