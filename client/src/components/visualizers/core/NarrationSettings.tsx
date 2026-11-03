"use client";

import { useId } from "react";
import { Volume2 } from "lucide-react";
import { useT } from "@/i18n";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { prefersNaturalVoice, speakSample, useNarrationSettings, voiceLabel, type Pace } from "../lib/narration";
import { NATURAL_VOICE } from "../lib/narration-audio";
import type { SpeechLang } from "../lib/speech-text";

/**
 * Shown under the player while narration is on: the language to listen in (Bangla pages), the voice, the speaking
 * speed and a sample. Picking a voice plays the sample right away, so learners can find one they understand easily.
 * English offers the pre-recorded natural voice first (labelled as AI-generated) when its clips are available.
 */
export function NarrationSettings({ pageLang, onBeforeSample }: { pageLang: SpeechLang; onBeforeSample?: () => void }) {
  const t = useT();
  const { prefs, voices, naturalVoice, banglaVoiceAvailable, listen, setPrefs } = useNarrationSettings(pageLang);
  const list = listen === "bn" ? voices.bn : voices.en;
  const wanted = listen === "bn" ? prefs.voiceBn : prefs.voiceEn;
  const natural = listen === "en" && naturalVoice;
  const naturalSelected = natural && prefersNaturalVoice(prefs, voices.en);
  // "" while a stored browser voice is not listed (yet): keeps the select controlled, so every real option can be picked
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
              { value: "bn", label: "বাংলা", disabled: !banglaVoiceAvailable },
              { value: "en", label: "English" },
            ]}
          />
        </span>
      ) : null}
      {list.length > 0 || natural ? (
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
            {selected === "" ? (
              <option value="" disabled>
                …
              </option>
            ) : null}
            {natural ? <option value={NATURAL_VOICE}>{t.visualPlayer.naturalVoice}</option> : null}
            {list.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {voiceLabel(v)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
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
      {pageLang === "bn" && !banglaVoiceAvailable ? <p className="basis-full">{t.visualPlayer.noBanglaVoice}</p> : null}
    </div>
  );
}
